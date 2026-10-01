import { useEffect, useState } from "react";
import { getUsage, setGeminiKey, removeGeminiKey } from "../api/user.js";

export default function Settings() {
  const [usage, setUsageState] = useState(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const data = await getUsage();
    setUsageState(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveKey = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await setGeminiKey({ apiKey: keyInput.trim(), useOwnKey: true });
      setKeyInput("");
      setMessage(
        "Key saved. You're now using your own Gemini key with no daily limit.",
      );
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUseOwn = async (checked) => {
    setSaving(true);
    try {
      await setGeminiKey({ useOwnKey: checked });
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (
      !confirm(
        "Remove your saved Gemini key? You'll switch back to the shared key with a daily limit.",
      )
    )
      return;
    setSaving(true);
    try {
      await removeGeminiKey();
      setMessage("Key removed.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!usage) return null;

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted dark:text-muted-dark">
        Manage how the app talks to Gemini for ATS scoring and rewrites.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-white p-6 dark:border-border-dark dark:bg-surface-dark">
        <h2 className="font-medium">Gemini API key</h2>
        <p className="mt-1 text-sm text-muted dark:text-muted-dark">
          By default, AI features use this app's shared key, limited to{" "}
          <strong>{usage.dailyLimit} calls/day</strong>. Add your own key from{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            Google AI Studio
          </a>{" "}
          for unlimited use — it's billed to your own Google account, and it's
          stored encrypted and never shown again.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3 dark:border-border-dark">
          <div>
            <p className="text-sm font-medium">
              {usage.useOwnKey ? "Your key is saved" : "No personal key saved"}
            </p>
            <p className="text-xs text-muted dark:text-muted-dark">
              {usage.useOwnKey
                ? "Using your key — unlimited AI calls."
                : `Using the shared key — ${usage.usedToday}/${usage.dailyLimit} used today.`}
            </p>
          </div>
          {usage.hasOwnKey && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={usage.useOwnKey}
                disabled={saving}
                onChange={(e) => handleToggleUseOwn(e.target.checked)}
                className="h-4 w-4 accent-[#4F46E5]"
              />
              Use my key
            </label>
          )}
        </div>

        <form onSubmit={handleSaveKey} className="mt-4 flex gap-2">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste your Gemini API key"
            className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-border-dark dark:bg-surface-dark"
          />
          <button
            type="submit"
            disabled={saving || !keyInput.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light disabled:opacity-60"
          >
            Save
          </button>
        </form>

        {usage.hasOwnKey && (
          <button
            onClick={handleRemoveKey}
            disabled={saving}
            className="mt-3 text-sm text-danger hover:underline"
          >
            Remove saved key
          </button>
        )}

        {message && (
          <p className="mt-3 text-sm text-muted dark:text-muted-dark">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
