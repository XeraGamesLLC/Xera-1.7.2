import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Message } from "../../store/app";
import { emitWithAck } from "../../api/socket";
import { uploadAttachment, type UploadedAttachment } from "../../api/channels";
import EmojiPicker from "./EmojiPicker";
import { CloseIcon, PlusIcon, SmileIcon, SendIcon, FileIcon, ImageIcon } from "../common/Icon";
import { useUiStore } from "../../store/ui";

interface Props {
  channelId: string;
  guildId?: string | null;
  channelName: string;
  replyingTo: Message | null;
  editingMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}

const MAX_FILES_PER_MESSAGE = 10;
const MAX_FILE_SIZE_MB = 100;

let typingThrottleAt = 0;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageInput({ channelId, guildId, channelName, replyingTo, editingMessage, onCancelReply, onCancelEdit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<UploadedAttachment[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeModal = useUiStore((s) => s.activeModal);

  // The picker is only closed by onMouseLeave, which never fires from a
  // click straight from the composer to a header button (or never fires at
  // all in touch/keyboard-driven use) — leaving it open, absolutely
  // positioned, rendering on top of whatever modal opens next. Close it
  // explicitly the moment any modal opens instead of relying on that.
  useEffect(() => {
    if (activeModal) setShowEmoji(false);
  }, [activeModal]);

  useEffect(() => {
    if (editingMessage) setValue(editingMessage.content);
  }, [editingMessage]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.4)}px`;
  }, [value]);

  function emitTyping() {
    const now = Date.now();
    if (now - typingThrottleAt < 2000) return;
    typingThrottleAt = now;
    emitWithAck("typing:start", { channelId }).catch(() => undefined);
  }

  async function send() {
    const content = value.trim();
    if (!content && pendingAttachments.length === 0) return;
    setError(null);
    setSending(true);
    try {
      if (editingMessage) {
        await emitWithAck("message:edit", { messageId: editingMessage.id, content });
        onCancelEdit();
      } else {
        await emitWithAck("message:send", {
          channelId,
          content: content || "​",
          replyToId: replyingTo?.id ?? null,
          attachmentIds: pendingAttachments.map((a) => a.id),
        });
        onCancelReply();
      }
      setValue("");
      setPendingAttachments([]);
    } catch (err: any) {
      setError(err.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (e.key === "Escape" && editingMessage) {
      onCancelEdit();
      setValue("");
    } else {
      emitTyping();
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    setError(null);

    const remainingSlots = MAX_FILES_PER_MESSAGE - pendingAttachments.length;
    if (remainingSlots <= 0) {
      setError(`You can only attach up to ${MAX_FILES_PER_MESSAGE} files to a message.`);
      return;
    }

    const toUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setError(`Only attaching the first ${remainingSlots} file(s) — ${MAX_FILES_PER_MESSAGE} per message max.`);
    }

    const tooLarge = toUpload.filter((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    const validFiles = toUpload.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooLarge.length > 0) {
      setError(`${tooLarge.map((f) => f.name).join(", ")} — over the ${MAX_FILE_SIZE_MB}MB per-file limit, not uploaded.`);
    }

    setUploadingCount((n) => n + validFiles.length);
    const results = await Promise.allSettled(validFiles.map((f) => uploadAttachment(channelId, f)));
    setUploadingCount((n) => n - validFiles.length);

    const uploaded: UploadedAttachment[] = [];
    const failed: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") uploaded.push(r.value);
      else failed.push(validFiles[i].name);
    });

    if (uploaded.length > 0) setPendingAttachments((prev) => [...prev, ...uploaded]);
    if (failed.length > 0) setError(`Failed to upload: ${failed.join(", ")}`);
  }

  function removeAttachment(id: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      {error && <div className="form-error" style={{ margin: "0 16px 8px" }}>{error}</div>}
      {replyingTo && !editingMessage && (
        <div className="reply-preview" style={{ margin: "0 16px 4px" }}>
          Replying to <span className="reply-author">{replyingTo.author.username}</span>
          <button className="icon-btn" onClick={onCancelReply}><CloseIcon size={14} /></button>
        </div>
      )}
      {editingMessage && (
        <div className="reply-preview" style={{ margin: "0 16px 4px" }}>
          Editing message
          <button className="icon-btn" onClick={() => { onCancelEdit(); setValue(""); }}><CloseIcon size={14} /></button>
        </div>
      )}
      {(pendingAttachments.length > 0 || uploadingCount > 0) && (
        <div className="attachment-chip-row">
          {pendingAttachments.map((a) => (
            <div key={a.id} className="attachment-chip">
              {a.contentType.startsWith("image/") ? <ImageIcon size={16} /> : <FileIcon size={16} />}
              <span className="attachment-chip-name">{a.filename}</span>
              <span className="attachment-chip-size">{formatFileSize(a.size)}</span>
              <button className="icon-btn" onClick={() => removeAttachment(a.id)} title="Remove">
                <CloseIcon size={12} />
              </button>
            </div>
          ))}
          {uploadingCount > 0 && (
            <div className="attachment-chip attachment-chip-uploading">
              Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}…
            </div>
          )}
        </div>
      )}
      <div className="composer">
        <button
          className="icon-btn"
          title="Upload files"
          onClick={() => fileInputRef.current?.click()}
          disabled={pendingAttachments.length >= MAX_FILES_PER_MESSAGE}
        >
          <PlusIcon />
        </button>
        <input ref={fileInputRef} type="file" hidden multiple onChange={onFileChange} />
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={`Message #${channelName}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="icon-btn" title="Emoji" onClick={() => setShowEmoji((v) => !v)}>
          <SmileIcon />
        </button>
        {showEmoji && (
          <EmojiPicker
            guildId={guildId}
            onClose={() => setShowEmoji(false)}
            onSelect={(e) => {
              setValue((v) => v + e);
              textareaRef.current?.focus();
            }}
          />
        )}
        <button className="icon-btn" title="Send" onClick={send} disabled={sending}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
