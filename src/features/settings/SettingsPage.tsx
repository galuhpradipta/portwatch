import { useLoaderData } from "react-router";
import { useState } from "react";
import { useApi } from "../../shared/hooks/useApi.ts";
import { useAuthStore } from "../../shared/store/authStore.ts";

type MeData = {
  id: string;
  email: string;
  displayName: string;
  headcountDropThreshold: number;
};

export default function SettingsPage() {
  const me = useLoaderData() as MeData;
  const api = useApi();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [displayName, setDisplayName] = useState(me.displayName);
  const [threshold, setThreshold] = useState(me.headcountDropThreshold ?? 10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/auth/me", { displayName, headcountDropThreshold: threshold });
      if (token) {
        setAuth({ id: me.id, email: me.email, displayName }, token);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-white mb-6">Settings</h1>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        {/* Display name */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-app-accent)]/50"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
          <input
            type="email"
            value={me.email}
            disabled
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/40 cursor-not-allowed"
          />
        </div>

        {/* Headcount drop threshold */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Headcount Drop Alert Threshold
          </label>
          <p className="text-xs text-white/40 mb-3">
            Alert when headcount drops by more than {threshold}%
          </p>
          <input
            type="range"
            min={1}
            max={50}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[var(--color-app-accent)]"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>1%</span>
            <span className="text-white font-medium">{threshold}%</span>
            <span>50%</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 rounded-lg bg-[var(--color-app-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
