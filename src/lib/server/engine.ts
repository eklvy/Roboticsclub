// This module is imported only by server routes and tests. Never import it into a client component.
import { randomUUID, createHash } from "node:crypto";
import {
  DEFAULT_CONFIG,
  type Run,
  type Store,
  type Config,
  type BoardEntry,
} from "../types";
import { MAZE, PROGRAM_MAZE, LASER_MAZE, DIRECTIONS } from "../../data/levels";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const freshStore = (): Store => ({
  version: 0,
  config: structuredClone(DEFAULT_CONFIG),
  runs: [],
});
export function newRun(
  name: string,
  team: string,
  playerId: string,
  token: string,
  config: Config,
  now = Date.now(),
): Run {
  return {
    id: randomUUID(),
    tokenHash: hash(token),
    name,
    team,
    playerId,
    started: now,
    updated: now,
    duration: config.duration,
    rules: structuredClone(config),
    stage: 0,
    score: 0,
    hints: 0,
    attempts: {},
    hintStages: {},
    answers: {},
    levelStarted: now,
    levelTimes: [],
    levelScores: [],
    levelStartScore: 0,
    fragments: [],
    laser: [0, 0],
    lastAction: 0,
  };
}
export function publicRun(run: Run) {
  const { tokenHash: _, ...safe } = run;
  return safe;
}
export function board(store: Store, now = Date.now()): BoardEntry[] {
  return store.runs
    .map((r) => ({
      id: r.id,
      name: r.name,
      team: r.team,
      score: r.score,
      elapsed: Math.floor(
        ((r.ended ?? Math.min(now, r.started + r.duration * 1000)) -
          r.started) /
          1000,
      ),
      completed: Math.floor(r.stage / 3),
      hints: r.hints,
      finished: r.stage === 18,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.elapsed - b.elapsed ||
        a.hints - b.hints ||
        a.id.localeCompare(b.id),
    );
}
const HINTS = [
  [
    "Look at the differences between adjacent numbers.",
    "The differences grow by two: 4, 6, 8, 10.",
    "Add 12 to the last number.",
  ],
  [
    "The logs have a second message.",
    "Read only the first highlighted letter on each line.",
    "The password names the facility’s network: N E X U S.",
  ],
  [
    "Combine two discoveries from this room.",
    "Frequency first, then a two-digit password length.",
    "The frequency is 42; NEXUS contains 05 letters.",
  ],
  [
    "ASCII encodes letters as numbers.",
    "Convert each eight-bit byte separately.",
    "The first two bytes spell PO; the word supplies electricity.",
  ],
  [
    "Each cluster is one letter.",
    "Three short signals mean S; three long signals mean O.",
    "It is the international distress signal, SOS.",
  ],
  [
    "Undo the encryption, one letter at a time.",
    "Move each letter three places backward.",
    "R becomes O, S becomes P, H becomes E, Q becomes N.",
  ],
  [
    "The route snakes through every tile.",
    "Travel right across the top, left across the middle, then right across the bottom.",
    "Top connections: up/right, left/right, left/down. Middle: right/down, left/right, up/left. Bottom: up/right, left/right, left/down.",
  ],
  [
    "An open circuit stops the current.",
    "Look for a component with the full 12 V across it.",
    "F2 has a 12 V drop: isolate F2.",
  ],
  [
    "Find the only component with no dependency.",
    "Begin with C, then A.",
    "Coolant → ground → load → bus: C A D B.",
  ],
  [
    "Work around the walls, not through them.",
    "Go right twice, down twice, left twice, then down twice.",
    "From there go right five times and down to extraction.",
  ],
  [
    "Trace the corridor before adding commands.",
    "Begin R R R D D L L D D.",
    "Finish with R R R R D.",
  ],
  [
    "A laser cycle lasts 2.4 seconds.",
    "The field is off during the second half of each cycle.",
    "Wait above row three for the green signal, then cross twice quickly.",
  ],
  [
    "Check signature and privilege escalation.",
    "Look for an unsigned command before the doors seal.",
    "Entry 04 runs sudo lockdown --all with signature NONE.",
  ],
  [
    "This is a chain of dependencies.",
    "AUTH comes first; RESTORE is last.",
    "AUTH → AUDIT → ISOLATE → RESTORE.",
  ],
  [
    "Type help, then inspect status.",
    "Authenticate using the vault’s decoded word.",
    "Run auth POWER, then isolate ORION, then restore access.",
  ],
  [
    "The map gives the room order.",
    "Begin with 42 and POWER.",
    "The order is 42 → POWER → CADB → VECTOR → ROOT.",
  ],
  [
    "Use the journal, not a new password.",
    "Join three fragments with hyphens.",
    "The format is 42-POWER-CADB.",
  ],
  [
    "Recall the maintenance relay sequence.",
    "You have 12 seconds after arming.",
    "Activate C, then A, then D, then B.",
  ],
];
export type Action = {
  type: "submit" | "hint" | "move" | "arm";
  stage: number;
  answer?: unknown;
};
function normalized(a: unknown) {
  return typeof a === "string" ? a.trim().toUpperCase() : "";
}
export function pathValid(path: unknown, grid: string[]) {
  if (!Array.isArray(path) || path.length > 100) return false;
  let x = 0,
    y = 0;
  for (const d of path) {
    const delta = DIRECTIONS[String(d)];
    if (!delta) return false;
    x += delta[0];
    y += delta[1];
    if (!grid[y] || grid[y][x] !== ".") return false;
  }
  return x === 5 && y === 5;
}
// Ports: 0 up, 1 right, 2 down, 3 left. Each component is rotated from its base geometry.
export const BASE_PORTS = [
  [0, 1],
  [0, 2],
  [0, 1],
  [0, 1],
  [0, 2],
  [0, 1],
  [0, 1],
  [0, 2],
  [0, 1],
];
export function circuitValid(answer: unknown) {
  if (
    !Array.isArray(answer) ||
    answer.length !== 9 ||
    answer.some((n) => !Number.isInteger(n) || n < 0 || n > 3)
  )
    return false;
  const ports = BASE_PORTS.map((p, i) => p.map((n) => (n + answer[i]) % 4));
  if (!ports[0].includes(0) || !ports[8].includes(2)) return false;
  const seen = new Set<number>();
  let tile = 0,
    incoming = 0;
  while (!seen.has(tile)) {
    seen.add(tile);
    const out = ports[tile].find((p) => p !== incoming)!;
    if (tile === 8 && out === 2) return seen.size === 9;
    const x = tile % 3,
      y = Math.floor(tile / 3),
      [dx, dy] = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ][out];
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || nx > 2 || ny < 0 || ny > 2) return false;
    tile = ny * 3 + nx;
    incoming = (out + 2) % 4;
    if (!ports[tile].includes(incoming)) return false;
  }
  return false;
}
const fragments = ["42", "POWER", "CADB", "VECTOR", "ROOT"];
function complete(run: Run, now: number) {
  const stage = run.stage,
    cfg = run.rules;
  run.score +=
    cfg.puzzlePoints + (run.attempts[stage] === 1 ? cfg.firstBonus : 0);
  run.stage++;
  if (run.stage % 3 === 0) {
    run.score += cfg.levelPoints;
    run.levelTimes.push(Math.floor((now - run.levelStarted) / 1000));
    run.levelScores.push(run.score - run.levelStartScore);
    run.levelStartScore = run.score;
    run.levelStarted = now;
    if (run.stage < 18) run.fragments.push(fragments[run.stage / 3 - 1]);
  }
  if (run.stage === 18) {
    run.ended = now;
    run.score +=
      Math.floor(Math.max(0, run.duration - (now - run.started) / 1000) / 60) *
      cfg.timeBonus;
  }
  return {
    ok: true,
    message:
      run.stage === 18
        ? "LOCKDOWN TERMINATED. Escape successful."
        : run.stage % 3 === 0
          ? "SECTOR RESTORED. New access fragment recovered."
          : "Protocol accepted. Next system unlocked.",
  };
}
export function act(
  run: Run,
  action: Action,
  config: Config,
  now = Date.now(),
): { ok: boolean; message: string; hint?: string } {
  if (run.stage >= 18) throw new Error("This mission is already complete.");
  if (now >= run.started + run.duration * 1000)
    throw new Error("Mission timer expired. Start a new mission.");
  if (action.stage !== run.stage)
    throw new Error("Your terminal is out of sync. Refresh the mission.");
  if (!config.enabled[Math.floor(run.stage / 3)])
    throw new Error("This sector is temporarily disabled by mission control.");
  if (now - run.lastAction < 180)
    throw new Error(
      "Terminal busy. Wait a moment before sending another command.",
    );
  run.lastAction = now;
  run.updated = now;
  const s = run.stage,
    k = String(s),
    a = normalized(action.answer);
  if (action.type === "hint") {
    const count = run.hintStages[k] ?? 0;
    if (count >= 3)
      return {
        ok: true,
        message: "All intelligence for this protocol has been revealed.",
        hint: HINTS[s][2],
      };
    run.hintStages[k] = count + 1;
    run.hints++;
    run.score -= run.rules.hintPenalty;
    run.lastHint = HINTS[s][count];
    run.lastHintStage = s;
    return {
      ok: true,
      message: `Intelligence decrypted. −${run.rules.hintPenalty} points.`,
      hint: HINTS[s][count],
    };
  }
  if (action.type === "arm") {
    if (s !== 17) throw new Error("No emergency release at this terminal.");
    run.armed = now;
    return {
      ok: true,
      message: "Escape mechanism armed. 12 seconds remaining.",
    };
  }
  if (action.type === "move") {
    if (s !== 11)
      throw new Error("Live drone controls are not available here.");
    const delta = DIRECTIONS[a];
    if (!delta) throw new Error("Unknown direction.");
    const [x, y] = run.laser,
      nx = x + delta[0],
      ny = y + delta[1];
    if (!LASER_MAZE[ny] || LASER_MAZE[ny][nx] !== ".")
      return { ok: false, message: "Obstacle detected. Choose a clear tile." };
    const hot = now % 2400 < 1200;
    if (hot && (y === 2 || ny === 2)) {
      run.laser = [0, 0];
      run.score -= run.rules.wrongPenalty;
      run.attempts[k] = (run.attempts[k] ?? 0) + 1;
      return { ok: false, message: "Laser contact. Drone returned to dock." };
    }
    run.laser = [nx, ny];
    if (nx === 5 && ny === 5) {
      run.attempts[k] = (run.attempts[k] ?? 0) + 1;
      run.answers[k] = "extracted";
      return complete(run, now);
    }
    return {
      ok: true,
      message: hot ? "Laser field active." : "Laser field clear. Move now.",
    };
  }
  if (action.type !== "submit") throw new Error("Unsupported terminal action.");
  // Terminal commands are stateful: authorization and isolation are required before restoration.
  if (s === 14) {
    const command = String(action.answer ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const low = command.toLowerCase();
    if (low === "help")
      return {
        ok: true,
        message:
          "help | status | auth <power-key> | isolate ORION | restore access",
      };
    if (low === "status")
      return {
        ok: true,
        message: `AUTH: ${run.answers.auth ? "VERIFIED" : "REQUIRED"} / ORION: ${run.answers.isolated ? "ISOLATED" : "CONNECTED"}`,
      };
    if (low === "auth power") {
      run.answers.auth = true;
      return {
        ok: true,
        message: "Identity verified. Root channel established.",
      };
    }
    if (low === "isolate orion" && run.answers.auth) {
      run.answers.isolated = true;
      return { ok: true, message: "ORION isolated. Restore access to finish." };
    }
    if (low === "restore access" && run.answers.auth && run.answers.isolated) {
      run.attempts[k] = (run.attempts[k] ?? 0) + 1;
      run.answers[k] = command;
      return complete(run, now);
    }
    run.attempts[k] = (run.attempts[k] ?? 0) + 1;
    run.score -= run.rules.wrongPenalty;
    return {
      ok: false,
      message:
        "Command denied. Check syntax and authorization with help / status.",
    };
  }
  run.attempts[k] = (run.attempts[k] ?? 0) + 1;
  const exact: Record<number, string> = {
    0: "42",
    1: "NEXUS",
    2: "4205",
    3: "POWER",
    4: "SOS",
    5: "OPEN",
    7: "F2",
    8: "CADB",
    12: "04",
    13: "AUTH,AUDIT,ISOLATE,RESTORE",
    15: "42,POWER,CADB,VECTOR,ROOT",
    16: "42-POWER-CADB",
  };
  let valid =
    s in exact &&
    (Array.isArray(action.answer)
      ? action.answer.join(",").toUpperCase()
      : a) === exact[s];
  if (s === 6) valid = circuitValid(action.answer);
  if (s === 9) valid = pathValid(action.answer, MAZE);
  if (s === 10) valid = pathValid(action.answer, PROGRAM_MAZE);
  if (s === 17) valid = !!run.armed && now - run.armed <= 12000 && a === "CADB";
  if (valid) {
    run.answers[k] = action.answer;
    return complete(run, now);
  }
  run.score -= run.rules.wrongPenalty;
  return {
    ok: false,
    message:
      s === 17
        ? "Release rejected. Check relay order and re-arm if time expired."
        : "ACCESS DENIED. Recheck the evidence and try again.",
  };
}
