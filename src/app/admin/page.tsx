"use client";
import { clientFetch } from "@/lib/client-fetch";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Shield, Download, LogOut, RefreshCw } from "lucide-react";
import {
  DEFAULT_CONFIG,
  time,
  type PublicRun,
  type Config,
  type BoardEntry,
} from "@/lib/types";
import { levels } from "@/data/levels";
export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [runs, setRuns] = useState<PublicRun[]>([]),
    [entries, setEntries] = useState<BoardEntry[]>([]),
    [config, setConfig] = useState<Config>(DEFAULT_CONFIG),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [mode, setMode] = useState("local"),
    [reset, setReset] = useState("");
  const load = useCallback(async (initial = false) => {
    try {
      const res = await clientFetch("/api/admin");
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAuthenticated(true);
      setRuns(data.runs);
      setEntries(data.entries);
      setMode(data.mode);
      if (initial) setConfig(data.config);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load(true);
    const timer = setInterval(() => void load(false), 15000);
    return () => clearInterval(timer);
  }, [load]);
  async function action(body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await clientFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load(true);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function exportCSV() {
    const safe = (value: unknown) => {
      let s = String(value ?? "");
      if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const rows = [
      [
        "Rank",
        "Player",
        "Team",
        "Player ID",
        "Session",
        "Score",
        "Elapsed seconds",
        "Levels",
        "Hints",
        "Status",
      ],
      ...entries.map((e, i) => [
        i + 1,
        e.name,
        e.team,
        runs.find((r) => r.id === e.id)?.playerId,
        e.id,
        e.score,
        e.elapsed,
        e.completed,
        e.hints,
        e.finished ? "Escaped" : "Incomplete",
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.map(safe).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "nexus-event-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const fields: [keyof Omit<Config, "enabled">, string][] = [
    ["duration", "MISSION TIMER (SECONDS)"],
    ["levelPoints", "SECTOR COMPLETION"],
    ["puzzlePoints", "PROTOCOL COMPLETION"],
    ["firstBonus", "FIRST ATTEMPT BONUS"],
    ["hintPenalty", "HINT PENALTY"],
    ["wrongPenalty", "INCORRECT PENALTY"],
    ["timeBonus", "PER REMAINING MINUTE"],
  ];
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/">
          <Shield size={25} />
          <span>
            NEXUS—09<small>MISSION CONTROL</small>
          </span>
        </a>
        <a className="back-link" style={{ margin: 0 }} href="/">
          <ArrowLeft size={14} /> BACK TO FACILITY
        </a>
      </header>
      <main className="page-width admin-page">
        {loading ? (
          <p className="micro">ESTABLISHING SECURE CONNECTION…</p>
        ) : !authenticated ? (
          <form
            className="admin-login"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await action({
                type: "login",
                email: form.get("email"),
                password: form.get("password"),
              });
            }}
          >
            <span className="eyebrow">RESTRICTED ACCESS</span>
            <h1>Mission control.</h1>
            <p>
              Supabase administrators sign in with their allowlisted email.
              Local practice uses the server’s configured admin password.
            </p>
            <label htmlFor="email">EMAIL (COMPETITION MODE)</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
            />
            <label htmlFor="password">ADMIN PASSWORD</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <button className="button primary full" disabled={busy}>
              AUTHENTICATE <Shield size={16} />
            </button>
            {error && (
              <div className="admin-error" role="alert">
                {error}
              </div>
            )}
            <p>
              Local access is disabled until LOCAL_ADMIN_PASSWORD is set in the
              server environment.
            </p>
          </form>
        ) : (
          <>
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  EVENT OPERATIONS // {mode.toUpperCase()} MODE
                </span>
                <h1>
                  Mission control<span className="cyan">.</span>
                </h1>
              </div>
              <button
                className="button"
                disabled={busy}
                onClick={() => void action({ type: "logout" })}
              >
                <LogOut size={15} /> SIGN OUT
              </button>
            </div>
            {error && (
              <div className="admin-error" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="completion-banner" role="status">
                {notice}
              </div>
            )}
            <div className="admin-summary">
              <div>
                <span>REGISTERED</span>
                <strong>{runs.length}</strong>
              </div>
              <div>
                <span>RECENTLY PLAYING (60S)</span>
                <strong>
                  {
                    runs.filter(
                      (r) =>
                        !r.ended &&
                        Date.now() - r.updated < 60000 &&
                        Date.now() < r.started + r.duration * 1000,
                    ).length
                  }
                </strong>
              </div>
              <div>
                <span>ACTIVE MISSIONS</span>
                <strong>
                  {
                    runs.filter(
                      (r) =>
                        !r.ended && Date.now() < r.started + r.duration * 1000,
                    ).length
                  }
                </strong>
              </div>
              <div>
                <span>ESCAPED</span>
                <strong>{runs.filter((r) => r.stage === 18).length}</strong>
              </div>
            </div>
            <div className="level-stats">
              {levels.map((l, i) => (
                <div key={l.name}>
                  {l.name}
                  <b>
                    {runs.filter((r) => r.stage >= (i + 1) * 3).length}
                    <small> COMPLETE</small>
                  </b>
                </div>
              ))}
            </div>
            <form
              className="admin-config"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await action({ type: "configure", config }))
                  setNotice(
                    "Configuration saved. Timer and scoring apply to new missions; sector availability applies immediately.",
                  );
              }}
            >
              <h2>Event configuration</h2>
              <p className="admin-notice">
                Timer and scoring are snapshotted when a mission starts. Level
                availability applies immediately. Active timers continue while a
                sector is disabled.
              </p>
              <div className="config-grid">
                {fields.map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      value={config[key]}
                      min={key === "duration" ? 60 : 0}
                      max={
                        key === "duration"
                          ? 14400
                          : key === "timeBonus"
                            ? 100
                            : 1000
                      }
                      required
                      onChange={(e) =>
                        setConfig((v) => ({
                          ...v,
                          [key]: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="enabled-levels">
                {levels.map((l, i) => (
                  <label key={l.name}>
                    <input
                      type="checkbox"
                      checked={config.enabled[i]}
                      onChange={(e) =>
                        setConfig((v) => ({
                          ...v,
                          enabled: v.enabled.map((b, j) =>
                            j === i ? e.target.checked : b,
                          ),
                        }))
                      }
                    />
                    {i + 1}. {l.name}
                  </label>
                ))}
              </div>
              <button className="button primary" disabled={busy}>
                SAVE CONFIGURATION
              </button>
            </form>
            <div className="section-heading">
              <h2>Operators & live standings</h2>
              <button className="button" onClick={() => void load()}>
                <RefreshCw size={14} /> REFRESH
              </button>
            </div>
            <div className="table-wrap admin-table">
              <table>
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>OPERATOR</th>
                    <th>SCORE</th>
                    <th>TIME</th>
                    <th>SECTORS</th>
                    <th>HINTS</th>
                    <th>PROGRESS</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id}>
                      <td>{i + 1}</td>
                      <td>
                        <strong>{e.name}</strong>
                        <small>
                          {e.team || "Independent"} · {e.id.slice(0, 8)}
                        </small>
                      </td>
                      <td>{e.score}</td>
                      <td>{time(e.elapsed)}</td>
                      <td>{e.completed}/6</td>
                      <td>{e.hints}</td>
                      <td>
                        {reset === e.id ? (
                          <div className="action-row">
                            <button
                              className="button danger"
                              disabled={busy}
                              onClick={async () => {
                                if (
                                  await action({
                                    type: "reset-player",
                                    id: e.id,
                                  })
                                ) {
                                  setReset("");
                                  setNotice(
                                    "Player progress reset. Their session identity is preserved.",
                                  );
                                }
                              }}
                            >
                              CONFIRM RESET
                            </button>
                            <button onClick={() => setReset("")}>CANCEL</button>
                          </div>
                        ) : (
                          <button
                            className="button"
                            onClick={() => setReset(e.id)}
                          >
                            RESET PLAYER
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!entries.length && (
                <p style={{ padding: 20 }} className="muted">
                  No registered operators.
                </p>
              )}
            </div>
            <div className="admin-bottom">
              <button className="button" onClick={exportCSV}>
                <Download size={15} /> EXPORT RESULTS CSV
              </button>
              <div className="reset-event">
                <input
                  aria-label="Type RESET EVENT to confirm"
                  placeholder="Type RESET EVENT"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
                <button
                  className="button danger"
                  disabled={busy || confirmation !== "RESET EVENT"}
                  onClick={async () => {
                    if (
                      await action({
                        type: "reset-event",
                        confirm: confirmation,
                      })
                    ) {
                      setConfirmation("");
                      setNotice(
                        "Event reset. All player records have been removed.",
                      );
                    }
                  }}
                >
                  RESET ENTIRE EVENT
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
