import { useState } from "react";
import { PencilSimple, Trash, Plus } from "@phosphor-icons/react";
import { useApi } from "../../shared/hooks/useApi.ts";
import { useToastStore } from "../../shared/store/toastStore.ts";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import type { CompanyNote } from "../../shared/types.ts";

type Props = {
  companyId: string;
  initialNote: CompanyNote | null;
};

export default function CompanyNoteSection({ companyId, initialNote }: Props) {
  const api = useApi();
  const [note, setNote] = useState<CompanyNote | null>(initialNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  function startEdit() {
    setDraft(note?.content ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft("");
  }

  async function saveNote() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const saved = await api.put<CompanyNote>(`/notes/${companyId}`, { content: draft });
      setNote(saved);
      setEditing(false);
      setDraft("");
      useToastStore.getState().addToast("Note saved", "success");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote() {
    try {
      await api.del(`/notes/${companyId}`);
      setNote(null);
      useToastStore.getState().addToast("Note deleted", "success");
    } catch {
      // error toast already shown by useApi
    }
  }

  return (
    <div className="companies-detail-shell radius-shell p-5">
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete note?"
        description="This will permanently remove your note for this company."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={deleteNote}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="dashboard-kicker">Research</p>
          <h2 className="dashboard-title mt-1 text-lg">Notes</h2>
        </div>
        {!editing && note && (
          <div className="flex items-center gap-2">
            <button onClick={startEdit} className="companies-action-secondary">
              <PencilSimple size={14} /> Edit
            </button>
            <button onClick={() => setConfirmDeleteOpen(true)} className="companies-action-secondary">
              <Trash size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            className="settings-input settings-textarea w-full"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={5000}
            placeholder="Write your investment thesis, research notes, or commentary…"
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs companies-meta">{draft.length} / 5,000</span>
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="companies-action-secondary">
                Cancel
              </button>
              <button onClick={saveNote} disabled={saving || !draft.trim()} className="companies-action-primary">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : note ? (
        <p className="text-sm companies-meta" style={{ whiteSpace: "pre-wrap" }}>
          {note.content}
        </p>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm companies-muted">No notes yet.</p>
          <button onClick={startEdit} className="companies-action-primary">
            <Plus size={14} /> Add Note
          </button>
        </div>
      )}
    </div>
  );
}
