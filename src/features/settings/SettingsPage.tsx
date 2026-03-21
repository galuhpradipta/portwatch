import { useLoaderData } from "react-router";
import { useState } from "react";
import { Field } from "@base-ui/react/field";
import { useApi } from "../../shared/hooks/useApi.ts";
import { useAuthStore } from "../../shared/store/authStore.ts";
import PageSectionShell from "../../components/PageSectionShell.tsx";

type MeData = {
  id: string;
  email: string;
  displayName: string;
  headcountDropThreshold: number;
};

function clampThreshold(value: number): number {
  return Math.min(50, Math.max(1, value));
}

export default function SettingsPage() {
  const me = useLoaderData() as MeData;
  const api = useApi();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [displayName, setDisplayName] = useState(me.displayName);
  const [thresholdInput, setThresholdInput] = useState(
    String(clampThreshold(me.headcountDropThreshold ?? 10)),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const parsedThreshold = Number.parseInt(thresholdInput, 10);
  const threshold =
    Number.isFinite(parsedThreshold) && !Number.isNaN(parsedThreshold)
      ? clampThreshold(parsedThreshold)
      : null;

  async function handleSave() {
    const nextThreshold = threshold ?? 10;

    setSaving(true);
    setSaved(false);

    try {
      await api.put("/auth/me", {
        displayName: displayName.trim(),
        headcountDropThreshold: nextThreshold,
      });

      if (token) {
        setAuth({ id: me.id, email: me.email, displayName: displayName.trim() }, token);
      }

      setThresholdInput(String(nextThreshold));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 space-y-1">
        <p className="dashboard-kicker">Account control</p>
        <h1 className="dashboard-title text-2xl">Settings</h1>
        <p className="dashboard-copy text-sm">
          Keep identity details current and set the alert threshold with a single, explicit value.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <PageSectionShell className="settings-panel p-5 md:p-6">
          <div className="mb-5">
            <p className="dashboard-kicker">Account</p>
            <p className="dashboard-copy mt-1 text-sm">
              Basic profile details used across the workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field.Root>
              <Field.Label className="settings-label">Display Name</Field.Label>
              <Field.Control
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="settings-input"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label className="settings-label">Email</Field.Label>
              <Field.Control
                type="email"
                value={me.email}
                disabled
                className="settings-input settings-input-readonly"
              />
            </Field.Root>
          </div>
        </PageSectionShell>

        <PageSectionShell className="settings-panel p-5 md:p-6">
          <div className="mb-5">
            <p className="dashboard-kicker">Alert Settings</p>
            <p className="dashboard-copy mt-1 text-sm">
              Trigger an alert when headcount drops beyond the threshold below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Field.Root>
              <Field.Label className="settings-label">Headcount Drop Threshold</Field.Label>
              <div className="settings-input-wrap">
                <Field.Control
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  step={1}
                  value={thresholdInput}
                  onChange={(event) => {
                    setSaved(false);
                    setThresholdInput(event.target.value);
                  }}
                  onBlur={() => {
                    if (threshold !== null) {
                      setThresholdInput(String(threshold));
                    }
                  }}
                  className="settings-input settings-input-with-suffix"
                />
                <span className="settings-input-suffix">%</span>
              </div>
            </Field.Root>

            <div className="settings-threshold-note">
              <span className="dashboard-kicker">Allowed range</span>
              <span className="dashboard-data mt-2 text-lg">
                {threshold ?? "—"}%
              </span>
              <span className="dashboard-copy mt-1 text-xs">Min 1, max 50</span>
            </div>
          </div>
        </PageSectionShell>

        <PageSectionShell className="settings-panel p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="dashboard-kicker">Save</p>
              <p className="dashboard-copy mt-1 text-sm">
                Save the current profile and alert threshold in one update.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || threshold === null}
              className="dashboard-action settings-save-action px-4 py-2 text-sm"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </PageSectionShell>
      </div>
    </div>
  );
}
