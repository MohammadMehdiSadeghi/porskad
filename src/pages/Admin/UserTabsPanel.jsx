import { useEffect, useState } from "react";
import { Save, RotateCcw, Wrench, ToggleLeft, Unlock, MonitorCog } from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import {
  USER_TABS,
  USER_TABS_SETTINGS_KEY,
  DEFAULT_USER_TABS_CONFIG,
  DEFAULT_MAINTENANCE_MESSAGE,
  TAB_STATE_ON,
  TAB_STATE_MAINTENANCE,
  TAB_STATE_DISABLED,
  loadUserTabsConfigFromDb,
  normalizeUserTabsConfig,
} from "../../lib/userTabs";

// ═══════════════════════════════════════════════════════
// تب «کنترل تب‌های کاربری» در پنل گاد — هویت Carbon خودش،
// نه دیزاین سایت. سه حالت: فعال / بروزرسانی / غیرفعال.
// ═══════════════════════════════════════════════════════

const MODE_META = {
  [TAB_STATE_ON]: { label: "Active", tag: "sa-tag-green", Icon: Unlock },
  [TAB_STATE_MAINTENANCE]: { label: "Maintenance", tag: "sa-tag-yellow", Icon: Wrench },
  [TAB_STATE_DISABLED]: { label: "Disabled", tag: "sa-tag-red", Icon: ToggleLeft },
};

export default function UserTabsPanel() {
  const [cfg, setCfg] = useState(DEFAULT_USER_TABS_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_system_settings");
        if (!alive) return;
        if (!error && data) setCfg(normalizeUserTabsConfig(data[USER_TABS_SETTINGS_KEY]));
      } catch {
        /* defaults remain */
      } finally {
        if (alive) {
          setLoaded(true);
          setDirty(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function setTabState(tabId, state) {
    setCfg((c) => ({ ...c, [tabId]: { ...c[tabId], state } }));
    setDirty(true);
  }

  function setTabMessage(tabId, message) {
    setCfg((c) => ({ ...c, [tabId]: { ...c[tabId], message } }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const normalized = normalizeUserTabsConfig(cfg);
      const { error } = await supabase.rpc("update_system_settings", {
        p_settings: { [USER_TABS_SETTINGS_KEY]: normalized },
      });
      if (error) throw error;
      setCfg(normalized);
      await loadUserTabsConfigFromDb();
      setDirty(false);
      toast.push("User tab states saved and applied to all users.", "success");
    } catch (e) {
      toast.push("Save failed: " + (e?.message || e), "error");
    } finally {
      setSaving(false);
    }
  }

  function handleResetAll() {
    setCfg(JSON.parse(JSON.stringify(DEFAULT_USER_TABS_CONFIG)));
    setDirty(true);
    toast.push("Defaults loaded — press Save to apply.", "info");
  }

  if (!loaded) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--sa-text-2)" }}>
        Loading tab configuration…
      </div>
    );
  }

  const blockedCount = USER_TABS.filter((t) => cfg[t.id]?.state && cfg[t.id].state !== TAB_STATE_ON).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* ─── Header strip ─── */}
      <div className="sa-card">
        <div className="sa-card-header" style={{ padding: "1rem 1.25rem 0.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <MonitorCog size={20} style={{ color: "var(--sa-link)" }} />
            <div>
              <div className="sa-section-title" style={{ margin: 0 }}>
                User Tab Control
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--sa-text-1)" }}>
                Enable, set maintenance mode, or hide each user-facing tab. Maintenance shows a
                notification box; Disabled removes the tab from the user sidebar.
              </div>
            </div>
          </div>
          {blockedCount > 0 && (
            <span className="sa-tag sa-tag-orange">
              {blockedCount} tab{blockedCount > 1 ? "s" : ""} restricted
            </span>
          )}
        </div>
        <div className="sa-card-body" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", paddingTop: "0.75rem" }}>
          {dirty && (
            <span style={{ alignSelf: "center", fontSize: "0.78rem", fontWeight: 600, color: "var(--sa-orange)", marginRight: "auto" }}>
              ● Unsaved changes
            </span>
          )}
          <button type="button" className="sa-btn sa-btn-secondary sa-btn-sm" onClick={handleResetAll}>
            <RotateCcw size={13} style={{ display: "inline", verticalAlign: "-2px", marginLeft: "0.35rem" }} />
            Reset defaults
          </button>
          <button
            type="button"
            className="sa-btn sa-btn-primary sa-btn-sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{ opacity: saving || !dirty ? 0.6 : 1, cursor: saving || !dirty ? "not-allowed" : "pointer" }}
          >
            <Save size={13} style={{ display: "inline", verticalAlign: "-2px", marginLeft: "0.35rem" }} />
            {saving ? "Saving…" : "Save configuration"}
          </button>
        </div>
      </div>

      {/* ─── Tab rows ─── */}
      {USER_TABS.map((tab) => {
        const entry = cfg[tab.id] || { state: TAB_STATE_ON, message: "" };
        const meta = MODE_META[entry.state] || MODE_META[TAB_STATE_ON];
        const StateIcon = meta.Icon;
        return (
          <div className="sa-card" key={tab.id} style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ minWidth: "12rem", flex: "1 1 12rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.95rem", color: "var(--sa-text-0)" }}>
                  <StateIcon size={15} style={{ color: "var(--sa-text-2)" }} />
                  {tab.label}
                </div>
                <code dir="ltr" style={{ fontSize: "0.75rem", color: "var(--sa-text-2)" }}>
                  {tab.path}
                </code>
              </div>

              <span className={`sa-tag ${meta.tag}`}>{meta.label}</span>

              <div className="sa-perms" style={{ marginTop: 0, marginLeft: "auto" }}>
                {[TAB_STATE_ON, TAB_STATE_MAINTENANCE, TAB_STATE_DISABLED].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`sa-perm ${entry.state === st ? "active" : "inactive"}`}
                    onClick={() => setTabState(tab.id, st)}
                  >
                    {MODE_META[st].label}
                  </button>
                ))}
              </div>
            </div>

            {entry.state === TAB_STATE_MAINTENANCE && (
              <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--sa-text-1)" }}>
                    Maintenance message (shown inside the notification box)
                  </label>
                  <button
                    type="button"
                    className="sa-btn sa-btn-ghost sa-btn-sm"
                    onClick={() => setTabMessage(tab.id, DEFAULT_MAINTENANCE_MESSAGE)}
                  >
                    Use prepared text
                  </button>
                </div>
                <textarea
                  className="sa-textarea"
                  rows={3}
                  dir="rtl"
                  value={entry.message}
                  onChange={(e) => setTabMessage(tab.id, e.target.value)}
                  placeholder={DEFAULT_MAINTENANCE_MESSAGE}
                  style={{ width: "100%", fontFamily: "inherit" }}
                />
              </div>
            )}

            <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--sa-text-2)" }}>
              {entry.state === TAB_STATE_DISABLED &&
                "Removed from the user sidebar; opening the URL directly shows the disabled notice."}
              {entry.state === TAB_STATE_MAINTENANCE &&
                "Tab stays in the sidebar; the user sees the maintenance notice box with your message."}
              {entry.state === TAB_STATE_ON && "Tab is fully available to all regular users."}
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: "0.75rem", color: "var(--sa-text-2)", lineHeight: 1.7 }}>
        ⚙ Stored via the security-definer RPC <code dir="ltr">update_system_settings</code> (superadmin
        only) under <code dir="ltr">user_tabs_config</code>. Users see the new state on refresh or tab
        switch. Admin panels (Dashboard, Users, Settings, God Panel) are never gated.
      </div>
    </div>
  );
}
