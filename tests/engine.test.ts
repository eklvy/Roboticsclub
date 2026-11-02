import test from "node:test";
import assert from "node:assert/strict";
import {
  act,
  board,
  circuitValid,
  freshStore,
  newRun,
  pathValid,
  publicRun,
} from "../src/lib/server/engine";
import { DEFAULT_CONFIG } from "../src/lib/types";
import { MAZE, PROGRAM_MAZE } from "../src/data/levels";
const start = 1800000000000;
const fresh = () =>
  newRun(
    "Operator",
    "Team",
    "42",
    "secret",
    structuredClone(DEFAULT_CONFIG),
    start,
  );
const manual = "RRDDLLDDRRRRRD".split("");
const programmed = "RRRDDLLDDRRRRD".split("");
const solution: [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] = [0, 1, 2, 1, 1, 3, 0, 1, 2];
test("all 18 protocols, including stateful terminal, timed laser and final release", () => {
  const run = fresh();
  let now = start + 1000;
  const submit = (answer: unknown) => {
    now += 500;
    const result = act(
      run,
      { type: "submit", stage: run.stage, answer },
      DEFAULT_CONFIG,
      now,
    );
    assert.equal(result.ok, true, result.message);
  };
  for (const answer of [
    "42",
    "NEXUS",
    "4205",
    "POWER",
    "SOS",
    "OPEN",
    solution,
    "F2",
    "CADB",
    manual,
    programmed,
  ])
    submit(answer);
  assert.equal(run.stage, 11);
  for (const direction of ["R", "R", "R", "R", "R", "D", "D", "D", "D", "D"]) {
    now += 500;
    if (now % 2400 < 1200) now += 1200 - (now % 2400);
    const result = act(
      run,
      { type: "move", stage: 11, answer: direction },
      DEFAULT_CONFIG,
      now,
    );
    assert.equal(result.ok, true, result.message);
  }
  assert.equal(run.stage, 12);
  submit("04");
  submit(["AUTH", "AUDIT", "ISOLATE", "RESTORE"]);
  submit("help");
  assert.equal(run.stage, 14);
  submit("auth POWER");
  submit("isolate ORION");
  submit("restore access");
  assert.deepEqual(run.fragments, ["42", "POWER", "CADB", "VECTOR", "ROOT"]);
  submit(run.fragments);
  submit("42-POWER-CADB");
  now += 500;
  act(run, { type: "arm", stage: 17 }, DEFAULT_CONFIG, now);
  submit("CADB");
  assert.equal(run.stage, 18);
  assert.ok(run.ended);
  assert.equal(run.levelTimes.length, 6);
  assert.ok(run.score > 1200);
  assert.equal(run.hints, 0);
  assert.throws(
    () =>
      act(
        run,
        { type: "submit", stage: 17, answer: "CADB" },
        DEFAULT_CONFIG,
        now + 500,
      ),
    /already complete/,
  );
});
test("wrong answers, three-stage hints, score penalties and first-attempt bonus", () => {
  const run = fresh();
  assert.equal(
    act(
      run,
      { type: "submit", stage: 0, answer: "99" },
      DEFAULT_CONFIG,
      start + 1000,
    ).ok,
    false,
  );
  assert.equal(run.score, -5);
  for (let i = 0; i < 3; i++)
    assert.ok(
      act(
        run,
        { type: "hint", stage: 0 },
        DEFAULT_CONFIG,
        start + 1500 + i * 500,
      ).hint,
    );
  assert.equal(run.hints, 3);
  assert.equal(run.score, -50);
  act(run, { type: "hint", stage: 0 }, DEFAULT_CONFIG, start + 3000);
  assert.equal(run.hints, 3);
  assert.equal(run.score, -50);
  act(
    run,
    { type: "submit", stage: 0, answer: "42" },
    DEFAULT_CONFIG,
    start + 3500,
  );
  assert.equal(run.score, -25);
});
test("sector locks, disabled levels, rate limiting and server timestamps", () => {
  const run = fresh();
  assert.throws(
    () =>
      act(
        run,
        { type: "submit", stage: 3, answer: "POWER" },
        DEFAULT_CONFIG,
        start + 1000,
      ),
    /out of sync/,
  );
  assert.throws(
    () =>
      act(
        run,
        { type: "submit", stage: 0, answer: "42" },
        { ...DEFAULT_CONFIG, enabled: [false, true, true, true, true, true] },
        start + 1000,
      ),
    /disabled/,
  );
  act(run, { type: "hint", stage: 0 }, DEFAULT_CONFIG, start + 1000);
  assert.throws(
    () =>
      act(
        run,
        { type: "submit", stage: 0, answer: "42" },
        DEFAULT_CONFIG,
        start + 1050,
      ),
    /busy/,
  );
  assert.throws(
    () =>
      act(
        run,
        { type: "submit", stage: 0, answer: "42" },
        DEFAULT_CONFIG,
        start + 3600000,
      ),
    /expired/,
  );
});
test("circuit and paths validate actual geometry, not just destination", () => {
  assert.equal(circuitValid(solution), true);
  assert.equal(circuitValid([0, 0, 0, 0, 0, 0, 0, 0, 0]), false);
  assert.equal(circuitValid([0]), false);
  assert.equal(circuitValid(Array(9).fill(4)), false);
  assert.equal(pathValid(manual, MAZE), true);
  assert.equal(pathValid(programmed, PROGRAM_MAZE), true);
  assert.equal(pathValid(["D", ...manual], MAZE), false);
  assert.equal(pathValid(["TELEPORT"], MAZE), false);
});
test("laser collision resets drone and costs points", () => {
  const r = fresh();
  r.stage = 11;
  r.laser = [0, 1];
  const result = act(
    r,
    { type: "move", stage: 11, answer: "D" },
    DEFAULT_CONFIG,
    start + 2500,
  );
  assert.equal(result.ok, false);
  assert.deepEqual(r.laser, [0, 0]);
  assert.equal(r.score, -5);
});
test("terminal cannot restore before authentication and isolation", () => {
  const r = fresh();
  r.stage = 14;
  assert.equal(
    act(
      r,
      { type: "submit", stage: 14, answer: "restore access" },
      DEFAULT_CONFIG,
      start + 1000,
    ).ok,
    false,
  );
  assert.equal(r.stage, 14);
  assert.equal(r.score, -5);
});
test("final release requires arming and expires after 12 seconds", () => {
  const r = fresh();
  r.stage = 17;
  assert.equal(
    act(
      r,
      { type: "submit", stage: 17, answer: "CADB" },
      DEFAULT_CONFIG,
      start + 1000,
    ).ok,
    false,
  );
  act(r, { type: "arm", stage: 17 }, DEFAULT_CONFIG, start + 1500);
  assert.equal(
    act(
      r,
      { type: "submit", stage: 17, answer: "CADB" },
      DEFAULT_CONFIG,
      start + 14000,
    ).ok,
    false,
  );
  assert.equal(r.stage, 17);
});
test("resume serialization preserves mission state but public state excludes token hash", () => {
  const r = fresh();
  act(
    r,
    { type: "submit", stage: 0, answer: "42" },
    DEFAULT_CONFIG,
    start + 1000,
  );
  const loaded = JSON.parse(JSON.stringify(r));
  assert.equal(loaded.stage, 1);
  assert.equal(loaded.answers[0], "42");
  assert.equal(loaded.score, 35);
  assert.ok(!("tokenHash" in publicRun(r)));
});
test("standings rank by score then time then hints and never leak identifiers", () => {
  const s = freshStore();
  s.runs = [fresh(), fresh(), fresh()];
  s.runs.forEach((r, i) => {
    r.id = String(i);
    r.score = 100;
    r.ended = start + 10000;
    r.hints = 2 - i;
  });
  s.runs[0].ended = start + 20000;
  assert.deepEqual(
    board(s).map((r) => r.id),
    ["2", "1", "0"],
  );
  assert.ok(!("playerId" in board(s)[0]));
  s.runs[0].score = 101;
  assert.equal(board(s)[0].id, "0");
});
test("rules are frozen per session while sector availability remains live", () => {
  const r = fresh();
  const changed = { ...DEFAULT_CONFIG, puzzlePoints: 999 };
  act(r, { type: "submit", stage: 0, answer: "42" }, changed, start + 1000);
  assert.equal(r.score, 35);
});
