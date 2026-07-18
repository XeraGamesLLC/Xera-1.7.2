import { useState, type FormEvent } from "react";
import { useUiStore } from "../../store/ui";
import { createCategory } from "../../api/guilds";
import { apiErrorMessage } from "../../api/client";
import { CloseIcon } from "../common/Icon";

export default function CreateCategoryModal({ guildId }: { guildId: string }) {
  const closeModal = useUiStore((s) => s.closeModal);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createCategory(guildId, name);
      closeModal();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create category"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-card">
      <button className="modal-close" onClick={closeModal}><CloseIcon size={14} /></button>
      <h1 style={{ color: "var(--header-primary)", marginTop: 0 }}>Create a Category</h1>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-field">
          <label>Category name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={100} autoFocus placeholder="NEW CATEGORY" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading || !name}>
          {loading ? "Working…" : "Create Category"}
        </button>
      </form>
    </div>
  );
}
