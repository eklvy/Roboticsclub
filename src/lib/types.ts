export type Config = {
  duration: number;
  levelPoints: number;
  puzzlePoints: number;
  firstBonus: number;
  hintPenalty: number;
  wrongPenalty: number;
  timeBonus: number;
  enabled: boolean[];
};
export type Run = {
  id: string;
  tokenHash: string;
  name: string;
  team: string;
  playerId: string;
  started: number;
  updated: number;
  ended?: number;
  duration: number;
  rules: Config;
  stage: number;
  score: number;
  hints: number;
  attempts: Record<string, number>;
  hintStages: Record<string, number>;
  answers: Record<string, unknown>;
  levelStarted: number;
  levelTimes: number[];
  levelScores: number[];
  levelStartScore: number;
  fragments: string[];
  laser: [number, number];
  armed?: number;
  // Mission control adjustments. pausedAt is set while a mission is frozen;
  // pausedTotal accumulates frozen milliseconds so standings ignore them;
  // granted counts manually added seconds, which must not earn a time bonus.
  pausedAt?: number;
  pausedTotal?: number;
  granted?: number;
  lastAction: number;
  lastHint?: string;
  lastHintStage?: number;
};
export type PublicRun = Omit<Run, "tokenHash">;
export type BoardEntry = {
  id: string;
  name: string;
  team: string;
  score: number;
  elapsed: number;
  completed: number;
  hints: number;
  finished: boolean;
  paused: boolean;
  granted: number;
};
export type Store = { version: number; config: Config; runs: Run[] };
export const DEFAULT_CONFIG: Config = {
  duration: 3600,
  levelPoints: 100,
  puzzlePoints: 25,
  firstBonus: 10,
  hintPenalty: 15,
  wrongPenalty: 5,
  timeBonus: 1,
  enabled: [true, true, true, true, true, true],
};
export const time = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, s) % 60)
    .toString()
    .padStart(2, "0")}`;
