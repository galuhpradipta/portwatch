import { useLoaderData } from "react-router";
import { useState } from "react";
import { Field } from "@base-ui/react/field";
import { Slider } from "@base-ui/react/slider";
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
      <h1 className="text-xl font-semibold text-app-text mb-6">Settings</h1>

      <div className="card-panel rounded-xl p-6 space-y-6">
        {/* Display name */}
        <Field.Root>
          <Field.Label className="block text-sm font-medium text-app-text-muted mb-2">
            Display Name
          </Field.Label>
          <Field.Control
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-app-surface border border-app-border rounded-lg px-4 py-2 text-sm text-app-text placeholder:text-app-text-dim focus:outline-none focus:border-[var(--color-app-accent)]/50"
          />
        </Field.Root>

        {/* Email (read-only) */}
        <Field.Root>
          <Field.Label className="block text-sm font-medium text-app-text-muted mb-2">
            Email
          </Field.Label>
          <Field.Control
            type="email"
            value={me.email}
            disabled
            className="w-full bg-app-surface border border-app-border rounded-lg px-4 py-2 text-sm text-app-text-dim cursor-not-allowed"
          />
        </Field.Root>

        {/* Headcount drop threshold */}
        <div>
          <label className="block text-sm font-medium text-app-text-muted mb-1">
            Headcount Drop Alert Threshold
          </label>
          <p className="text-xs text-app-text-dim mb-3">
            Alert when headcount drops by more than {threshold}%
          </p>
          <Slider.Root
            value={threshold}
            onValueChange={(val) => setThreshold(val as number)}
            min={1}
            max={50}
            className="w-full py-2"
          >
            <Slider.Control className="flex items-center w-full h-5 relative cursor-pointer">
              <Slider.Track className="relative h-1.5 w-full rounded-full bg-app-border">
                <Slider.Indicator className="absolute h-full rounded-full bg-[var(--color-app-accent)]" />
                <Slider.Thumb
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--color-app-accent)] shadow-sm border-2 border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-accent)]/40"
                  getAriaValueText={(formattedValue) => `${formattedValue} percent`}
                />
              </Slider.Track>
            </Slider.Control>
          </Slider.Root>
          <div className="flex justify-between text-xs text-app-text-dim mt-1">
            <span>1%</span>
            <span className="text-app-text font-medium">{threshold}%</span>
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
