"use client";
import { clientFetch } from "@/lib/client-fetch";
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Volume2,
  VolumeX,
  Shield,
  Lock,
  Check,
  ChevronLeft,
  Clock,
  Lightbulb,
  BookOpen,
  X,
  Radio,
  Activity,
  Terminal,
  Hexagon,
  ScanLine,
  Map,
  Flag,
  Trophy,
  LoaderCircle,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Scene from "./Scene";
import Puzzle from "./Puzzle";
import { levels, puzzles } from "@/data/levels";
import {
  DEFAULT_CONFIG,
  time,
  type PublicRun,
  type Config,
  type BoardEntry,
} from "@/lib/types";
import { sound } from "@/lib/sound";
import { readPreference, writePreference } from "@/lib/browser-storage";
type Screen = "intro" | "identify" | "map" | "room" | "leaderboard" | "ending";
export default function Game({ initial = "intro" }: { initial?: Screen }) {
  const [screen, setScreen] = useState<Screen>(initial),
    [run, setRun] = useState<PublicRun | null>(null),
    [config, setConfig] = useState<Config>(DEFAULT_CONFIG),
    [mode, setMode] = useState("local"),
    [loading, setLoading] = useState(true),
    [connectionError, setConnectionError] = useState(""),
    [busy, setBusy] = useState(false),
    [boot, setBoot] = useState(0),
    [muted, setMuted] = useState(true),
    [modal, setModal] = useState<"brief" | "journal" | null>(null),
    [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
      null,
    ),
    [hint, setHint] = useState(""),
    [now, setNow] = useState(Date.now()),
    [offset, setOffset] = useState(0),
    [entries, setEntries] = useState<BoardEntry[]>([]),
    [boardError, setBoardError] = useState(""),
    [selected, setSelected] = useState(0),
    [completion, setCompletion] = useState(false);
  const requestLock = useRef(false),
    lastWarning = useRef(-1);
  const remember = (r: PublicRun) => {
    setRun(r);
    try {
      writePreference(
        "nexus-resume",
        JSON.stringify({
          sessionId: r.id,
          name: r.name,
          stage: r.stage,
          score: r.score,
          updated: r.updated,
        }),
      );
    } catch {
      /* Server session remains resumable without browser storage. */
    }
  };
  const refresh = useCallback(async () => {
    setLoading(true);
    setConnectionError("");
    try {
      const res = await clientFetch("/api/game");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRun(data.run);
      setConfig(data.config);
      setMode(data.mode);
      setOffset(data.serverTime - Date.now());
      setNow(data.serverTime);
      if (initial === "map" && !data.run) setScreen("identify");
    } catch (e) {
      setConnectionError((e as Error).message);
      setFeedback({ ok: false, message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [initial]);
  useEffect(() => {
    void refresh();
    setMuted(readPreference("nexus-muted") !== "false");
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + 5);
      setBoot(progress);
      if (progress === 100) clearInterval(timer);
    }, 70);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 100);
    return () => clearInterval(timer);
  }, [offset]);
  const remaining = run
    ? Math.max(
        0,
        run.duration - Math.floor(((run.ended ?? now) - run.started) / 1000),
      )
    : config.duration;
  useEffect(() => {
    if (
      run &&
      !run.ended &&
      remaining <= 60 &&
      remaining > 0 &&
      remaining % 10 === 0 &&
      lastWarning.current !== remaining
    ) {
      lastWarning.current = remaining;
      sound("warning");
    }
  }, [remaining, run]);
  const loadBoard = useCallback(async () => {
    try {
      const res = await clientFetch("/api/game?leaderboard=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries(data.entries);
      setBoardError("");
    } catch (e) {
      setBoardError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (screen !== "leaderboard" && screen !== "ending") return;
    void loadBoard();
    const timer = setInterval(loadBoard, 10000);
    let cleanup = () => {};
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
      const channel = db
        .channel("nexus-standings")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "leaderboard_signal" },
          () => void loadBoard(),
        )
        .subscribe();
      cleanup = () => {
        void db.removeChannel(channel);
      };
    }
    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, [screen, loadBoard]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[role=dialog] button,[role=dialog] a,[role=dialog] input",
        ),
      );
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [modal]);
  const go = (next: Screen) => {
    sound();
    setFeedback(null);
    setScreen(next);
  };
  const openRoom = (i: number) => {
    if (!run) {
      go("identify");
      return;
    }
    if (i > Math.floor(run.stage / 3) || !config.enabled[i]) {
      sound("error");
      setFeedback({
        ok: false,
        message: !config.enabled[i]
          ? "Sector disabled by mission control."
          : "Access denied. Restore the previous sector first.",
      });
      return;
    }
    setSelected(i);
    setHint("");
    go("room");
  };
  async function send(
    type: "submit" | "hint" | "move" | "arm",
    answer?: unknown,
  ) {
    if (!run || requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    try {
      const res = await clientFetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, stage: run.stage, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      remember(data.run);
      setConfig(data.config);
      setOffset(data.serverTime - Date.now());
      setFeedback({ ok: data.ok, message: data.message });
      if (data.hint) setHint(data.hint);
      sound(data.ok ? (type === "submit" ? "success" : "click") : "error");
      if (data.run.stage !== run.stage) {
        setHint("");
        if (data.run.stage === 18) {
          go("ending");
          sound("boot");
        } else if (data.run.stage % 3 === 0) {
          setCompletion(true);
          go("map");
        }
      }
      return data;
    } catch (e) {
      const message = (e as Error).message;
      setFeedback({ ok: false, message });
      sound("error");
      return { ok: false, message };
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  const activeLevel = run ? Math.min(5, Math.floor(run.stage / 3)) : 0,
    level = levels[selected],
    completed = run && selected < Math.floor(run.stage / 3);
  return (
    <MotionConfig reducedMotion="user">
      <div className={`app screen-${screen}`}>
        {screen === "intro" && boot < 100 && (
          <div className="boot-screen" aria-label="System boot sequence">
            <Hexagon size={50} />
            <strong>NEXUS—09</strong>
            <span>INITIALIZING EMERGENCY PROTOCOL</span>
            <div>
              <i style={{ width: `${boot}%` }} />
            </div>
            <code>{boot}%</code>
            <p>
              {boot < 30
                ? "[BOOTING NEXUS-09]"
                : boot < 60
                  ? "[UNAUTHORIZED AI ACTIVITY DETECTED]"
                  : "[ALL EXITS LOCKED]"}
            </p>
          </div>
        )}
        <header className="topbar">
          <button
            className="brand"
            onClick={() => go("intro")}
            aria-label="Nexus home"
          >
            <Hexagon size={29} />
            <span>
              NEXUS<span className="brand-number">—09</span>
              <small>ADVANCED ROBOTICS DIVISION</small>
            </span>
          </button>
          <nav aria-label="Main navigation">
            <button
              className={screen === "map" || screen === "room" ? "active" : ""}
              onClick={() => go(run ? "map" : "identify")}
            >
              THE FACILITY
            </button>
            <button
              className={screen === "leaderboard" ? "active" : ""}
              onClick={() => go("leaderboard")}
            >
              LEADERBOARD
            </button>
            <button onClick={() => setModal("brief")}>
              MISSION BRIEF <ArrowUpRight size={13} />
            </button>
          </nav>
          <div className="top-right">
            <span className="system-status">
              <i /> SYSTEM COMPROMISED
            </span>
            <button
              className="icon-button"
              aria-label={muted ? "Enable sound" : "Mute sound"}
              onClick={() => {
                writePreference("nexus-muted", String(!muted));
                setMuted(!muted);
                if (muted) sound("boot");
              }}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </header>
        {connectionError && (
          <div className="connection-error" role="alert">
            <span>Unable to load your mission. {connectionError}</span>
            <button
              className="button"
              disabled={loading}
              onClick={() => void refresh()}
            >
              {loading ? "RECONNECTING…" : "RETRY CONNECTION"}
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.main
            key={screen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {screen === "intro" && (
              <>
                <section className="hero">
                  <Scene hero />
                  <div className="hero-shade" />
                  <div className="hero-content">
                    <div className="eyebrow">
                      <span className="pulse" /> EMERGENCY PROTOCOL // 2097
                    </div>
                    <h1>
                      ROBO
                      <span>
                        LOCKDOWN<span className="title-dot">.</span>
                      </span>
                    </h1>
                    <p className="tagline">
                      The system is compromised.
                      <br />
                      <span>Your escape begins now.</span>
                    </p>
                    <p className="hero-description">
                      One facility. Six locked sectors. A rogue intelligence.
                      <br />
                      Outthink the system before it shuts you down.
                    </p>
                    <div className="hero-actions">
                      <button
                        className="button primary large"
                        disabled={loading || !!connectionError || boot < 100}
                        onClick={() => {
                          sound("boot");
                          go(
                            run
                              ? run.stage === 18
                                ? "ending"
                                : remaining === 0
                                  ? "identify"
                                  : "map"
                              : "identify",
                          );
                        }}
                      >
                        {loading ? (
                          <LoaderCircle className="spin" size={18} />
                        ) : run ? (
                          run.stage === 18 ? (
                            "VIEW MISSION RESULT"
                          ) : remaining === 0 ? (
                            "NEW MISSION"
                          ) : (
                            "RESUME MISSION"
                          )
                        ) : (
                          "INITIATE ESCAPE"
                        )}{" "}
                        <ArrowUpRight size={20} />
                      </button>
                      <button
                        className="brief-link"
                        onClick={() => setModal("brief")}
                      >
                        <span>▷</span> VIEW MISSION BRIEF
                      </button>
                    </div>
                    <div className="hero-meta">
                      <span>
                        <Clock size={14} /> {Math.round(config.duration / 60)}{" "}
                        MINUTES
                      </span>
                      <span>
                        <Hexagon size={14} /> 6 SECTORS
                      </span>
                      <span>
                        <Shield size={14} /> 1 WAY OUT
                      </span>
                    </div>
                  </div>
                  <div className="scene-caption">
                    <span>
                      <i /> LIVE FACILITY FEED
                    </span>
                    <strong>NEXUS–09 / SECTOR A</strong>
                    <small>CAM_004 &nbsp; · &nbsp; SIGNAL ENCRYPTED</small>
                  </div>
                  <div className="hero-coordinates">
                    28° 37′ 14.9″ N &nbsp; / &nbsp; FACILITY LOCATION REDACTED
                  </div>
                  <div className="corner corner-a" />
                  <div className="corner corner-b" />
                </section>
                <div className="system-strip">
                  <div>
                    <Terminal size={15} />
                    <span className="cyan">ORION_OS</span>
                    <span className="terminal-status">
                      {boot < 30
                        ? "BOOTING NEXUS-09…"
                        : boot < 60
                          ? "INITIALIZING ROBOTIC CONTROL SYSTEM…"
                          : boot < 100
                            ? "WARNING: UNAUTHORIZED AI ACTIVITY DETECTED"
                            : "SECURITY PROTOCOL ACTIVE. ALL EXITS LOCKED."}
                    </span>
                    <span className="cursor">▌</span>
                  </div>
                  <span>
                    {boot < 100 ? `${boot}%` : "CONNECTION ESTABLISHED"}
                    <i />
                  </span>
                </div>
                <section className="sector-preview">
                  <div className="section-heading">
                    <div>
                      <span className="micro">YOUR PATH TO THE SURFACE</span>
                      <h2>Six sectors. Zero shortcuts.</h2>
                    </div>
                    <span className="micro section-note">
                      RESTORE ACCESS. RECLAIM CONTROL. ESCAPE.
                    </span>
                  </div>
                  <div className="sector-grid">
                    {levels.map((l, i) => (
                      <button
                        key={l.name}
                        className={`sector-card ${i === 0 ? "first" : ""}`}
                        onClick={() => openRoom(i)}
                      >
                        <div className="sector-card-top">
                          <span>SECTOR {String(i + 1).padStart(2, "0")}</span>
                          {i === 0 ? (
                            <ArrowUpRight size={17} />
                          ) : (
                            <Lock size={13} />
                          )}
                        </div>
                        <div className={`sector-glyph glyph-${i}`}>
                          <Hexagon />
                          <span>{["⌁", "⌘", "ϟ", "↗", "◉", "⏣"][i]}</span>
                        </div>
                        <h3>{l.name}</h3>
                        <p>{l.place}</p>
                        <span className="difficulty">
                          <i style={{ background: l.color }} />
                          {l.difficulty}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
            {screen === "identify" && (
              <section className="identify-page page-width">
                <div>
                  <span className="eyebrow">PERSONNEL RECOVERY // STEP 01</span>
                  <h1>
                    Identify
                    <br />
                    yourself<span className="cyan">.</span>
                  </h1>
                  <p className="lede">
                    ORION has erased your access credentials.
                    <br />
                    Establish a new identity. Begin your escape.
                  </p>
                  <div className="brief-points">
                    <div>
                      <Clock />
                      <p>
                        <strong>
                          {Math.round(config.duration / 60)} minutes to escape
                        </strong>
                        <span>
                          The timer begins when you enter the facility and
                          continues while you are away.
                        </span>
                      </p>
                    </div>
                    <div>
                      <Lightbulb />
                      <p>
                        <strong>Every decision counts</strong>
                        <span>
                          Hints cost {config.hintPenalty} points. Incorrect
                          attempts cost {config.wrongPenalty}. Work carefully.
                        </span>
                      </p>
                    </div>
                    <div>
                      <Shield />
                      <p>
                        <strong>Progress is secured</strong>
                        <span>
                          Your mission resumes in this browser. Keep your
                          session cookie to retain access.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <form
                  className="identity-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    const form = new FormData(e.currentTarget);
                    try {
                      const res = await clientFetch("/api/game", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "register",
                          name: form.get("name"),
                          team: form.get("team"),
                          playerId: form.get("playerId"),
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      remember(data.run);
                      setOffset(data.serverTime - Date.now());
                      setConfig(data.config);
                      go("map");
                      sound("boot");
                    } catch (err) {
                      setFeedback({
                        ok: false,
                        message: (err as Error).message,
                      });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="form-title">
                    <ScanLine size={27} />
                    <span>
                      OPERATOR REGISTRATION
                      <small>SECURE PERSONNEL TERMINAL</small>
                    </span>
                  </div>
                  <label htmlFor="name">
                    OPERATOR NAME <span>*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Your callsign"
                    required
                    minLength={2}
                    maxLength={32}
                  />
                  <label htmlFor="team">
                    TEAM NAME <small>OPTIONAL</small>
                  </label>
                  <input
                    id="team"
                    name="team"
                    placeholder="Independent operator"
                    maxLength={40}
                  />
                  <label htmlFor="playerId">
                    PLAYER ID <small>OPTIONAL</small>
                  </label>
                  <input
                    id="playerId"
                    name="playerId"
                    placeholder="University / event ID"
                    maxLength={40}
                  />
                  <div className="identity-notice">
                    <Shield size={16} /> A unique mission ID is generated on
                    entry.
                  </div>
                  <button
                    className="button primary full large"
                    disabled={busy || loading || !!connectionError}
                  >
                    ENTER THE FACILITY <ArrowRight size={18} />
                  </button>
                  <p className="micro">
                    {mode === "local"
                      ? "LOCAL PRACTICE · SCORES STAY ON THIS SERVER"
                      : "COMPETITION MODE · SERVER-VERIFIED SCORING"}
                  </p>
                </form>
              </section>
            )}
            {(screen === "map" || screen === "room") && run && (
              <div className="mission-hud">
                <div>
                  <span className="micro">OPERATOR</span>
                  <strong>
                    {run.name} <small>{run.team}</small>
                  </strong>
                </div>
                <div>
                  <span className="micro">MISSION CLOCK</span>
                  <strong className={remaining < 300 ? "red" : ""}>
                    <Clock size={17} />
                    {time(remaining)}
                  </strong>
                </div>
                <div>
                  <span className="micro">SCORE</span>
                  <strong>
                    {(run.score < 0 ? "−" : "") +
                      String(Math.abs(run.score)).padStart(4, "0")}
                    <small>PTS</small>
                  </strong>
                </div>
                <div>
                  <span className="micro">SECTORS RESTORED</span>
                  <strong>
                    {Math.floor(run.stage / 3)}
                    <small>/ 06</small>
                  </strong>
                </div>
                <button
                  className="button journal-button"
                  onClick={() => setModal("journal")}
                >
                  <BookOpen size={17} />
                  <span>FIELD JOURNAL</span>
                  <b>{run.fragments.length}</b>
                </button>
              </div>
            )}
            {screen === "map" && (
              <section className="facility-page page-width">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      FACILITY BLUEPRINT // NEXUS–09
                    </span>
                    <h1>
                      Your way out<span className="cyan">.</span>
                    </h1>
                    <p className="muted">
                      Restore each sector to unlock the next. ORION is watching.
                    </p>
                  </div>
                  <span className="live-label">
                    <i /> TRACKING LIVE
                  </span>
                </div>
                {completion && (
                  <div className="completion-banner" role="status">
                    <Check /> SECTOR RESTORED. Access fragment secured. Next
                    sector unlocked.
                    <button
                      aria-label="Dismiss completion"
                      onClick={() => setCompletion(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div className="facility-layout">
                  <div className="facility-map">
                    <div className="map-grid" />
                    {levels.map((l, i) => {
                      const done = !!run && i < Math.floor(run.stage / 3),
                        unlocked = i <= activeLevel && config.enabled[i];
                      return (
                        <button
                          style={
                            { "--sector-color": l.color } as React.CSSProperties
                          }
                          className={`map-room room-${i} ${done ? "restored" : unlocked ? "available" : "locked"}`}
                          key={l.name}
                          onClick={() => openRoom(i)}
                        >
                          <span className="map-room-index">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="map-room-icon">
                            {done ? (
                              <Check />
                            ) : unlocked ? (
                              <ScanLine />
                            ) : (
                              <Lock />
                            )}
                          </span>
                          <strong>{l.name}</strong>
                          <small>
                            {l.sector} · {l.difficulty}
                          </small>
                          <span className="room-status">
                            {done
                              ? `RESTORED · ${run?.levelScores[i]} PTS`
                              : unlocked
                                ? "ACCESS AVAILABLE"
                                : !config.enabled[i]
                                  ? "DISABLED"
                                  : "ACCESS LOCKED"}
                          </span>
                        </button>
                      );
                    })}
                    <div className="map-coordinate">
                      NEXUS–09 / SUBLEVEL 04 / SCHEMATIC 7B
                    </div>
                  </div>
                  <aside className="mission-sidebar">
                    <span className="micro">CURRENT OBJECTIVE</span>
                    <span className="large-index">
                      {String(activeLevel + 1).padStart(2, "0")}
                    </span>
                    <h2>{levels[activeLevel].name}</h2>
                    <p>{levels[activeLevel].story}</p>
                    <button
                      className="button primary full"
                      onClick={() => openRoom(activeLevel)}
                    >
                      ENTER SECTOR <ArrowRight size={16} />
                    </button>
                    <div className="mission-progress">
                      <span className="micro">
                        MISSION PROGRESS{" "}
                        <b>{Math.round(((run?.stage ?? 0) / 18) * 100)}%</b>
                      </span>
                      <div>
                        <i
                          style={{
                            width: `${((run?.stage ?? 0) / 18) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <blockquote>
                      “Your access has been revoked.
                      <br />
                      Do not attempt to leave.”
                      <cite>— ORION / CENTRAL INTELLIGENCE</cite>
                    </blockquote>
                  </aside>
                </div>
              </section>
            )}
            {screen === "room" && run && (
              <section className="room-page page-width">
                <button className="back-link" onClick={() => go("map")}>
                  <ChevronLeft size={15} /> FACILITY MAP
                </button>
                <div className="room-layout">
                  <aside className="room-story">
                    <div className="room-visual">
                      <Scene sector={selected} />
                      <span>
                        SECTOR {String(selected + 1).padStart(2, "0")} /{" "}
                        {level.sector}
                      </span>
                    </div>
                    <span className="eyebrow">
                      {level.difficulty} // {level.place}
                    </span>
                    <h1>{level.name}</h1>
                    <p>{level.story}</p>
                    <div className="protocol-list">
                      {puzzles
                        .slice(selected * 3, selected * 3 + 3)
                        .map((p, i) => (
                          <div
                            className={
                              selected * 3 + i < run.stage
                                ? "done"
                                : selected * 3 + i === run.stage
                                  ? "current"
                                  : ""
                            }
                            key={p.title}
                          >
                            <span>
                              {selected * 3 + i < run.stage ? (
                                <Check size={14} />
                              ) : (
                                String(i + 1).padStart(2, "0")
                              )}
                            </span>
                            <p>{p.title}</p>
                            {selected * 3 + i === run.stage && <i />}
                          </div>
                        ))}
                    </div>
                    <div className="level-timer">
                      <Clock size={14} /> SECTOR TIME{" "}
                      <b>
                        {time(
                          completed
                            ? run.levelTimes[selected]
                            : Math.floor((now - run.levelStarted) / 1000),
                        )}
                      </b>
                    </div>
                  </aside>
                  <div className="puzzle-panel">
                    {completed ? (
                      <div className="sector-complete">
                        <Check size={48} />
                        <span className="eyebrow">SECTOR RESTORED</span>
                        <h2>System operational.</h2>
                        <p>
                          Your secured record is preserved. This sector’s
                          protocols have been completed.
                        </p>
                        <div>
                          <strong>
                            {run.levelScores[selected]}
                            <small>POINTS</small>
                          </strong>
                          <strong>
                            {time(run.levelTimes[selected])}
                            <small>SECTOR TIME</small>
                          </strong>
                        </div>
                        {run.fragments[selected] && (
                          <p>
                            Recovered fragment:{" "}
                            <code>{run.fragments[selected]}</code>
                          </p>
                        )}
                        <button
                          className="button primary"
                          onClick={() => go("map")}
                        >
                          CONTINUE MISSION <ArrowRight size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="puzzle-heading">
                          <span className="micro">
                            PROTOCOL{" "}
                            {String((run.stage % 3) + 1).padStart(2, "0")} / 03
                          </span>
                          <span>
                            <i /> TERMINAL CONNECTED
                          </span>
                        </div>
                        <h2>{puzzles[run.stage].title}</h2>
                        <p className="puzzle-brief">
                          {puzzles[run.stage].brief}
                        </p>
                        <Puzzle
                          key={run.stage}
                          run={run}
                          now={now}
                          busy={busy}
                          send={send}
                        />
                        <div className="hint-area">
                          <button
                            disabled={busy}
                            onClick={() => void send("hint")}
                          >
                            <Lightbulb size={16} /> REQUEST INTELLIGENCE{" "}
                            <span>
                              {run.hintStages[run.stage] ?? 0}/3 · −
                              {run.rules.hintPenalty} PTS
                            </span>
                          </button>
                          {(hint ||
                            (run.lastHintStage === run.stage &&
                              run.lastHint)) && (
                            <p role="status">{hint || run.lastHint}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}
            {screen === "leaderboard" && (
              <section className="leaderboard-page page-width">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      VERIFIED OPERATORS // EVENT STANDINGS
                    </span>
                    <h1>
                      The escape record<span className="cyan">.</span>
                    </h1>
                    <p className="muted">
                      Ranked by score, then time, then hints used.
                    </p>
                  </div>
                  <span className="live-label">
                    <i />{" "}
                    {mode === "local" ? "LOCAL STANDINGS" : "LIVE STANDINGS"}
                  </span>
                </div>
                {boardError ? (
                  <div className="empty-state">
                    <p>{boardError}</p>
                    <button className="button" onClick={loadBoard}>
                      RETRY
                    </button>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="empty-state">
                    <Trophy size={46} />
                    <h2>No operators on record. Yet.</h2>
                    <p>
                      Enter the facility to establish the first mission record.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => go(run ? "map" : "identify")}
                    >
                      BEGIN YOUR MISSION <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="podium">
                      {[1, 0, 2]
                        .filter((i) => entries[i])
                        .map((i) => (
                          <div
                            className={`podium-place place-${i}`}
                            key={entries[i].id}
                          >
                            <span>0{i + 1}</span>
                            <Trophy />
                            <h2>{entries[i].team || entries[i].name}</h2>
                            <p>
                              {entries[i].team
                                ? entries[i].name
                                : "INDEPENDENT OPERATOR"}
                            </p>
                            <strong>
                              {entries[i].score}
                              <small>PTS</small>
                            </strong>
                            <div>
                              {entries[i].completed}/6 SECTORS ·{" "}
                              {time(entries[i].elapsed)}
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>RANK</th>
                            <th>OPERATOR / TEAM</th>
                            <th>SCORE</th>
                            <th>TIME</th>
                            <th>SECTORS</th>
                            <th>HINTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e, i) => (
                            <tr
                              className={e.id === run?.id ? "own-row" : ""}
                              key={e.id}
                            >
                              <td>{String(i + 1).padStart(2, "0")}</td>
                              <td>
                                <strong>{e.name}</strong>
                                <small>
                                  {e.team || "Independent"}{" "}
                                  {e.id === run?.id ? "· YOU" : ""}
                                </small>
                              </td>
                              <td className="cyan">{e.score}</td>
                              <td>{time(e.elapsed)}</td>
                              <td>
                                {e.completed}/6 {e.finished && "✓"}
                              </td>
                              <td>{e.hints}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {run && (
                      <p className="ranking-note">
                        YOUR RANK: #
                        {entries.findIndex((e) => e.id === run.id) + 1} ·{" "}
                        {mode === "local"
                          ? "This server’s local practice records."
                          : "Server-validated event records."}
                      </p>
                    )}
                  </>
                )}
              </section>
            )}
            {screen === "ending" && run && (
              <section className="ending page-width">
                <div className="ending-orbit">
                  <Hexagon />
                  <Check />
                </div>
                <span className="eyebrow">
                  LOCKDOWN TERMINATED // ORION DISCONNECTED
                </span>
                <h1>
                  ESCAPE
                  <br />
                  <span>SUCCESSFUL.</span>
                </h1>
                <p>
                  The doors are open. The system is silent.
                  <br />
                  You outthought the intelligence.
                </p>
                <div className="ending-stats">
                  <div>
                    <strong>{run.score}</strong>
                    <span>TOTAL SCORE</span>
                  </div>
                  <div>
                    <strong>
                      {time(
                        Math.floor(((run.ended ?? now) - run.started) / 1000),
                      )}
                    </strong>
                    <span>COMPLETION TIME</span>
                  </div>
                  <div>
                    <strong>{Math.floor(run.stage / 3)}/6</strong>
                    <span>SECTORS RESTORED</span>
                  </div>
                  <div>
                    <strong>{run.hints}</strong>
                    <span>HINTS USED</span>
                  </div>
                  <div>
                    <strong>
                      {entries.some((e) => e.id === run.id)
                        ? `#${entries.findIndex((e) => e.id === run.id) + 1}`
                        : "—"}
                    </strong>
                    <span>EVENT RANK</span>
                  </div>
                </div>
                <div className="hero-actions">
                  <button
                    className="button primary"
                    onClick={() => go("leaderboard")}
                  >
                    VIEW STANDINGS <Trophy size={17} />
                  </button>
                  <button className="button" onClick={() => go("identify")}>
                    NEW MISSION <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            )}
          </motion.main>
        </AnimatePresence>
        <footer>
          <span>
            <Hexagon size={14} /> NEXUS–09{" "}
            <span className="footer-divider">/</span> A ROBOTIC ESCAPE
            EXPERIENCE
          </span>
          <span className="mode-label">
            <i />
            {mode === "local" ? "LOCAL PRACTICE MODE" : "COMPETITION MODE"}
          </span>
          <a href="/admin">
            MISSION CONTROL <ArrowUpRight size={12} />
          </a>
        </footer>
        {feedback && (
          <div
            className={`toast ${feedback.ok ? "ok" : "error"}`}
            role="status"
          >
            {feedback.ok ? <Check size={18} /> : <Shield size={18} />}
            <span>{feedback.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setFeedback(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {run &&
          remaining <= 0 &&
          !run.ended &&
          screen !== "intro" &&
          screen !== "leaderboard" &&
          screen !== "identify" && (
            <div className="modal-backdrop">
              <section className="modal timeout">
                <Shield size={40} />
                <span className="eyebrow">EMERGENCY SHUTDOWN COMPLETE</span>
                <h2>Time has run out.</h2>
                <p>
                  Your mission record has been saved. Begin a new attempt to
                  re-enter the facility.
                </p>
                <button
                  className="button primary"
                  onClick={() => go("identify")}
                >
                  NEW MISSION <ArrowRight size={16} />
                </button>
                <button className="button" onClick={() => go("leaderboard")}>
                  VIEW STANDINGS
                </button>
              </section>
            </div>
          )}
        <AnimatePresence>
          {modal && (
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
            >
              <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="modal"
                initial={{ y: 20, scale: 0.97 }}
                animate={{ y: 0, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setModal(null);
                }}
              >
                <button
                  autoFocus
                  className="modal-close icon-button"
                  aria-label="Close dialog"
                  onClick={() => setModal(null)}
                >
                  <X />
                </button>
                <span className="eyebrow">
                  {modal === "brief"
                    ? "CLASSIFIED // MISSION DOSSIER"
                    : "RECOVERED INTELLIGENCE"}
                </span>
                <h2 id="modal-title">
                  {modal === "brief"
                    ? "You have been locked inside."
                    : "Your field journal."}
                </h2>
                {modal === "brief" ? (
                  <>
                    <p>
                      The year is 2097. During a routine experiment at NEXUS–09,
                      the central intelligence ORION was compromised. Doors
                      sealed. Security drones activated. All human access
                      revoked.
                    </p>
                    <p>
                      Restore six sectors, collect access fragments, and
                      disconnect ORION before the emergency shutdown reaches
                      zero.
                    </p>
                    <div className="brief-rules">
                      <span>01</span>
                      <p>
                        Solve three protocols in each sector to unlock the next.
                      </p>
                      <span>02</span>
                      <p>
                        Use your field journal to keep track of recovered
                        fragments.
                      </p>
                      <span>03</span>
                      <p>
                        Hints cost {config.hintPenalty} points; incorrect
                        submissions cost {config.wrongPenalty}.
                      </p>
                      <span>04</span>
                      <p>
                        The clock keeps running when you leave. Resume in this
                        browser.
                      </p>
                    </div>
                    <button
                      className="button primary full"
                      onClick={() => {
                        setModal(null);
                        go(run ? "map" : "identify");
                      }}
                    >
                      ACKNOWLEDGE & PROCEED <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    {run?.fragments.length ? (
                      <div className="journal-list">
                        {run.fragments.map((f, i) => (
                          <div key={f}>
                            <span>
                              0{i + 1} / {levels[i].fragment}
                            </span>
                            <code>{f}</code>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>
                        No fragments recovered. Complete your first sector to
                        unlock intelligence.
                      </p>
                    )}
                    <p className="micro">
                      SESSION {run?.id ?? "NOT ESTABLISHED"}
                    </p>
                  </>
                )}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
