import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Message } from "../../store/app";
import { emitWithAck } from "../../api/socket";
import { uploadAttachment } from "../../api/channels";
import EmojiPicker from "./EmojiPicker";

interface Props {
  channelId: string;
  guildId?: string | null;
  channelName: string;
  replyingTo: Message | null;
  editingMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}

let typingThrottleAt = 0;

export default function MessageInput({ channelId, guildId, channelName, replyingTo, editingMessage, onCancelReply, onCancelEdit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [pendingFileNames, setPendingFileNames] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!content && pendingAttachmentIds.length === 0) return;
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
          attachmentIds: pendingAttachmentIds,
        });
        onCancelReply();
      }
      setValue("");
      setPendingAttachmentIds([]);
      setPendingFileNames([]);
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
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const attachment = await uploadAttachment(channelId, file);
      setPendingAttachmentIds((ids) => [...ids, attachment.id]);
      setPendingFileNames((names) => [...names, attachment.filename]);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Upload failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      {error && <div className="form-error" style={{ margin: "0 16px 8px" }}>{error}</div>}
      {replyingTo && !editingMessage && (
        <div className="reply-preview" style={{ margin: "0 16px 4px" }}>
          Replying to <span className="reply-author">{replyingTo.author.username}</span>
          <button className="icon-btn" onClick={onCancelReply}>✕</button>
        </div>
      )}
      {editingMessage && (
        <div className="reply-preview" style={{ margin: "0 16px 4px" }}>
          Editing message
          <button className="icon-btn" onClick={() => { onCancelEdit(); setValue(""); }}>✕</button>
        </div>
      )}
      {pendingFileNames.length > 0 && (
        <div className="reply-preview" style={{ margin: "0 16px 4px" }}>
          Attached: {pendingFileNames.join(", ")}
        </div>
      )}
      <div className="composer">
        <button className="icon-btn" title="Upload a file" onClick={() => fileInputRef.current?.click()}>
          ＋
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={onFileChange} />
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={`Message #${channelName}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="icon-btn" title="Emoji" onClick={() => setShowEmoji((v) => !v)}>
          🙂
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
          ➤
        </button>
      </div>
    </div>
  );
}
