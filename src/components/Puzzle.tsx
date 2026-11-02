"use client";
import { useState, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Play,
  RotateCcw,
  Terminal,
  Check,
  Radio,
  Power,
  Delete,
} from "lucide-react";
import {
  puzzles,
  MAZE,
  PROGRAM_MAZE,
  LASER_MAZE,
  DIRECTIONS,
} from "@/data/levels";
import type { PublicRun } from "@/lib/types";
import { sound } from "@/lib/sound";
type Props = {
  run: PublicRun;
  busy: boolean;
  now: number;
  send: (
    type: "submit" | "hint" | "move" | "arm",
    answer?: unknown,
  ) => Promise<{ ok?: boolean; message?: string } | undefined>;
};
const arrows = { U: ArrowUp, D: ArrowDown, L: ArrowLeft, R: ArrowRight };
export default function Puzzle({ run, busy, send, now }: Props) {
  const s = run.stage,
    p = puzzles[s];
  const [answer, setAnswer] = useState(""),
    [rot, setRot] = useState([2, 0, 0, 0, 0, 2, 2, 0, 0]),
    [path, setPath] = useState<string[]>([]),
    [pos, setPos] = useState<[number, number]>([0, 0]),
    [order, setOrder] = useState<string[]>([]),
    [byte, setByte] = useState(""),
    [decoded, setDecoded] = useState(""),
    [shift, setShift] = useState(0),
    [transcript, setTranscript] = useState([
      "NEXUS secure shell v9.7",
      "Connection intercepted. Type help for available commands.",
    ]),
    [running, setRunning] = useState(false),
    [mazeMessage, setMazeMessage] = useState("");
  const grid = s === 10 ? PROGRAM_MAZE : s === 11 ? LASER_MAZE : MAZE,
    robot = s === 11 ? run.laser : pos;
  const move = (d: string) => {
    if (busy || running) return;
    sound();
    if (s === 11) {
      void send("move", d);
      return;
    }
    if (s === 10) {
      setPath((v) => (v.length < 100 ? [...v, d] : v));
      return;
    }
    const [dx, dy] = DIRECTIONS[d],
      x = pos[0] + dx,
      y = pos[1] + dy;
    if (grid[y]?.[x] !== ".") {
      setMazeMessage("Obstacle detected. Choose a clear tile.");
      sound("error");
      return;
    }
    setMazeMessage("");
    setPos([x, y]);
    setPath((v) => [...v, d]);
  };
  useEffect(() => {
    if (![9, 10, 11].includes(s)) return;
    const listener = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,button")) return;
      const key: Record<string, string> = {
        ArrowUp: "U",
        ArrowDown: "D",
        ArrowLeft: "L",
        ArrowRight: "R",
      };
      if (key[e.key]) {
        e.preventDefault();
        move(key[e.key]);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  });
  const submit = (value: unknown = answer) => {
    void send("submit", value);
  };
  const select = (value: string) => {
    sound();
    setOrder((v) =>
      v.includes(value) ? v.filter((x) => x !== value) : [...v, value],
    );
  };
  const textInput = (placeholder = "Enter response") => (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="micro" htmlFor="answer">
        {p.label}
      </label>
      <div className="input-row">
        <input
          id="answer"
          autoComplete="off"
          spellCheck={false}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          required
        />
        <button className="button primary" disabled={busy}>
          VERIFY <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
  const queueControls = (
    <div className="direction-pad">
      {(["U", "L", "D", "R"] as const).map((d) => {
        const Icon = arrows[d];
        return (
          <button
            key={d}
            aria-label={
              { U: "Move up", L: "Move left", D: "Move down", R: "Move right" }[
                d
              ]
            }
            disabled={busy || running}
            onClick={() => move(d)}
          >
            <Icon size={21} />
          </button>
        );
      })}
    </div>
  );
  return (
    <div className="puzzle-content">
      {p.kind === "text" && (
        <>
          <div className="signal-display">{p.clue}</div>
          {textInput()}
        </>
      )}
      {p.kind === "logs" && (
        <>
          <div className="terminal-log">
            {[
              "Network recovery daemon initialized",
              "Emergency diagnostic bridge active",
              "Xenon cooling loop holding steady",
              "User authentication cache inaccessible",
              "Security console awaiting recovery",
            ].map((line, i) => (
              <div key={line}>
                <span className="log-time">[09:{41 + i}:07]</span>{" "}
                <strong>{line[0]}</strong>
                {line.slice(1)}
              </div>
            ))}
          </div>
          {textInput("Recovery password")}
        </>
      )}
      {p.kind === "keypad" && (
        <div className="keypad-wrap">
          <div className="keypad-display" aria-live="polite">
            {answer.padEnd(4, "_")}
          </div>
          <div className="keypad">
            {"123456789".split("").map((n) => (
              <button
                key={n}
                onClick={() => {
                  sound();
                  setAnswer((v) => (v + n).slice(0, 4));
                }}
              >
                {n}
              </button>
            ))}
            <button aria-label="Clear code" onClick={() => setAnswer("")}>
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setAnswer((v) => (v + "0").slice(0, 4))}>
              0
            </button>
            <button
              aria-label="Delete digit"
              onClick={() => setAnswer((v) => v.slice(0, -1))}
            >
              <Delete size={18} />
            </button>
          </div>
          <button
            className="button primary full"
            disabled={busy || answer.length !== 4}
            onClick={() => submit()}
          >
            ACTIVATE TERMINAL <Power size={16} />
          </button>
        </div>
      )}
      {p.kind === "binary" && (
        <>
          <div className="binary-signal">
            {p.clue?.split(" ").map((b) => (
              <button key={b} onClick={() => setByte(b)}>
                {b}
              </button>
            ))}
          </div>
          <div className="decoder">
            <label className="micro" htmlFor="byte">
              BYTE CONVERTER
            </label>
            <div className="input-row">
              <input
                id="byte"
                value={byte}
                maxLength={8}
                onChange={(e) => setByte(e.target.value.replace(/[^01]/g, ""))}
                placeholder="Select or type 8 bits"
              />
              <button
                className="button"
                disabled={!/^[01]{8}$/.test(byte)}
                onClick={() =>
                  setDecoded(
                    `${parseInt(byte, 2)} → ${String.fromCharCode(parseInt(byte, 2))}`,
                  )
                }
              >
                DECODE
              </button>
            </div>
            <output>{decoded || "Awaiting 8-bit input…"}</output>
          </div>
          {textInput("Assemble the decoded word")}
        </>
      )}
      {p.kind === "morse" && (
        <>
          <div className="signal-display morse">{p.clue}</div>
          <div className="morse-guide">
            <Radio size={18} /> SIGNAL CAPTURE · 3 SHORT / 3 LONG / 3 SHORT
          </div>
          <details>
            <summary>Morse field reference</summary>
            <p>
              A ·− &nbsp; E · &nbsp; I ·· &nbsp; N −· &nbsp; O −−− &nbsp; R ·−·
              &nbsp; S ··· &nbsp; T − &nbsp; U ··−
            </p>
          </details>
          {textInput("Beacon message")}
        </>
      )}
      {p.kind === "cipher" && (
        <>
          <div className="cipher">
            <span className="micro">ENCRYPTED TRANSMISSION</span>
            <div className="cipher-word">R S H Q</div>
            <label htmlFor="shift">Reverse shift: {shift}</label>
            <input
              id="shift"
              type="range"
              min="0"
              max="25"
              value={shift}
              onChange={(e) => setShift(+e.target.value)}
            />
            <output>
              {"RSHQ"
                .split("")
                .map((c) =>
                  String.fromCharCode(
                    ((c.charCodeAt(0) - 65 - shift + 26) % 26) + 65,
                  ),
                )
                .join(" ")}
            </output>
          </div>
          {textInput("Decrypted command")}
        </>
      )}
      {p.kind === "circuit" && (
        <>
          <div className="circuit-label">↓ SOURCE / 12 V</div>
          <div className="circuit-board">
            {rot.map((r, i) => (
              <button
                key={i}
                aria-label={`Rotate conduit ${i + 1}, rotation ${r * 90} degrees`}
                onClick={() => {
                  sound();
                  setRot((v) => v.map((n, j) => (i === j ? (n + 1) % 4 : n)));
                }}
              >
                <svg
                  viewBox="0 0 100 100"
                  style={{ transform: `rotate(${r * 90}deg)` }}
                >
                  <path
                    d={
                      i === 1 || i === 4 || i === 7
                        ? "M50 0V100"
                        : "M50 0V50H100"
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="10"
                    fill="#0a1019"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
                <span>{String(i + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <div className="circuit-label output">OUTPUT / DOOR ↓</div>
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => submit(rot)}
          >
            TEST CIRCUIT <Power size={16} />
          </button>
        </>
      )}
      {p.kind === "fault" && (
        <>
          <div className="fault-board">
            {[
              ["R1", "0 V", "100 Ω"],
              ["F2", "12 V", "1 A fuse"],
              ["R3", "0 V", "220 Ω"],
              ["L4", "0 V", "Status LED"],
            ].map(([id, voltage, label]) => (
              <button
                className={answer === id ? "selected" : ""}
                key={id}
                onClick={() => setAnswer(id)}
              >
                <span className="component-symbol">
                  {id === "F2" ? "─[∿]─" : id === "L4" ? "─▷|─" : "─▱─"}
                </span>
                <b>{id}</b>
                <span>{label}</span>
                <strong>{voltage}</strong>
              </button>
            ))}
          </div>
          <button
            className="button primary full"
            disabled={!answer || busy}
            onClick={() => submit()}
          >
            ISOLATE COMPONENT
          </button>
        </>
      )}
      {(p.kind === "switches" ||
        p.kind === "logic" ||
        p.kind === "fragments" ||
        p.kind === "final") && (
        <>
          {p.kind === "final" && (
            <div className="arm-panel">
              <span className="micro">RELEASE WINDOW</span>
              <strong>
                {run.armed
                  ? `${Math.max(0, 12 - (now - run.armed) / 1000).toFixed(1)}s`
                  : "DISARMED"}
              </strong>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => {
                  setOrder([]);
                  void send("arm");
                }}
              >
                ARM ESCAPE MECHANISM
              </button>
            </div>
          )}
          <div className="sequence-slots">
            {Array.from({ length: p.kind === "fragments" ? 5 : 4 }, (_, i) => (
              <span key={i}>
                {order[i] || "·"}
                <small>{i + 1}</small>
              </span>
            ))}
          </div>
          <div className="sequence-controls">
            {(p.kind === "logic"
              ? ["RESTORE", "ISOLATE", "AUTH", "AUDIT"]
              : p.kind === "fragments"
                ? [...run.fragments].reverse()
                : ["A", "B", "C", "D"]
            ).map((v) => (
              <button
                key={v}
                className={order.includes(v) ? "selected" : ""}
                onClick={() => select(v)}
              >
                {v}
                {order.includes(v) && <Check size={14} />}
              </button>
            ))}
          </div>
          <div className="action-row">
            <button className="button" onClick={() => setOrder([])}>
              <RotateCcw size={15} /> RESET
            </button>
            <button
              className="button primary"
              disabled={
                busy || order.length !== (p.kind === "fragments" ? 5 : 4)
              }
              onClick={() =>
                submit(
                  p.kind === "switches" || p.kind === "final"
                    ? order.join("")
                    : order,
                )
              }
            >
              {" "}
              {p.kind === "final"
                ? "OPEN ESCAPE HATCH"
                : "VERIFY SEQUENCE"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
      {[9, 10, 11].includes(s) && (
        <>
          <div className="maze-status">
            <span>
              {s === 11
                ? now % 2400 < 1200
                  ? "● LASER ACTIVE"
                  : "● FIELD CLEAR"
                : s === 10
                  ? "PROGRAM MODE"
                  : "MANUAL MODE"}
            </span>
            <span>
              X {robot[0]} / Y {robot[1]}
            </span>
          </div>
          <div
            className={`maze ${s === 11 && now % 2400 < 1200 ? "laser-hot" : ""}`}
          >
            {grid.map((row, y) =>
              row.split("").map((cell, x) => (
                <div
                  className={`maze-cell ${cell === "#" ? "wall" : ""} ${s === 11 && y === 2 ? "laser-row" : ""} ${x === 5 && y === 5 ? "exit" : ""}`}
                  key={`${x},${y}`}
                >
                  {robot[0] === x && robot[1] === y ? (
                    <span className="robot-icon">▣</span>
                  ) : x === 5 && y === 5 ? (
                    <span>↗</span>
                  ) : x === 0 && y === 0 ? (
                    <span className="dock">+</span>
                  ) : null}
                </div>
              )),
            )}
          </div>
          {queueControls}
          <p className="maze-message" role="status">
            {mazeMessage || "Dock [0,0] → Extraction [5,5]"}
          </p>
          {s === 10 && (
            <div className="command-queue" aria-label="Command queue">
              {path.length ? (
                path.map((d, i) => {
                  const Icon = arrows[d as keyof typeof arrows];
                  return (
                    <button
                      key={i}
                      aria-label={`Remove command ${i + 1}`}
                      disabled={running}
                      onClick={() =>
                        setPath((v) => v.filter((_, j) => i !== j))
                      }
                    >
                      <Icon size={15} />
                      <small>{i + 1}</small>
                    </button>
                  );
                })
              ) : (
                <span>Add directional commands above…</span>
              )}
            </div>
          )}
          {s !== 11 && (
            <div className="action-row">
              <button
                className="button"
                disabled={running}
                onClick={() => {
                  setPath([]);
                  setPos([0, 0]);
                }}
              >
                <RotateCcw size={16} /> RESET
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  running ||
                  (s === 9 && (pos[0] !== 5 || pos[1] !== 5)) ||
                  !path.length
                }
                onClick={async () => {
                  if (s === 10) {
                    setRunning(true);
                    let x = 0,
                      y = 0;
                    setPos([0, 0]);
                    for (const d of path) {
                      const [dx, dy] = DIRECTIONS[d];
                      if (grid[y + dy]?.[x + dx] !== ".") break;
                      x += dx;
                      y += dy;
                      setPos([x, y]);
                      await new Promise((r) => setTimeout(r, 100));
                    }
                    setRunning(false);
                  }
                  submit(path);
                }}
              >
                <Play size={16} />
                {s === 10 ? "EXECUTE PROGRAM" : "CONFIRM EXTRACTION"}
              </button>
            </div>
          )}
        </>
      )}
      {p.kind === "investigate" && (
        <div className="investigation">
          {[
            ["01", "09:41:02", "health.check", "SIGNED"],
            ["02", "09:41:04", "sync.backup", "SIGNED"],
            ["03", "09:41:07", "service.rotate_keys", "SIGNED"],
            ["04", "09:41:09", "sudo lockdown --all", "NONE"],
            ["05", "09:41:10", "doors.seal", "SYSTEM"],
            ["06", "09:41:12", "alert.dispatch", "SIGNED"],
          ].map(([id, t, cmd, sig]) => (
            <button key={id} disabled={busy} onClick={() => submit(id)}>
              <span>{id}</span>
              <time>{t}</time>
              <code>{cmd}</code>
              <small className={sig === "NONE" ? "red" : ""}>{sig}</small>
            </button>
          ))}
        </div>
      )}
      {p.kind === "terminal" && (
        <div className="shell">
          <div className="shell-top">
            <Terminal size={14} /> NEXUS / ROOT ACCESS
          </div>
          <div className="shell-output" role="log">
            {transcript.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!answer.trim()) return;
              const cmd = answer;
              setAnswer("");
              setTranscript((v) => [...v, `operator@nexus:~$ ${cmd}`]);
              const result = await send("submit", cmd);
              if (result?.message)
                setTranscript((v) => [...v, result.message!]);
            }}
          >
            <label htmlFor="command">❯</label>
            <input
              id="command"
              aria-label="Terminal command"
              autoComplete="off"
              spellCheck={false}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="help"
            />
            <button disabled={busy} aria-label="Execute terminal command">
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
