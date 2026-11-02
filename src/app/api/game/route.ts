import { sameOrigin } from "@/lib/server/origin";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { transact, production } from "@/lib/server/store";
import { act, hash, newRun, publicRun, board } from "@/lib/server/engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const register = z.object({
  type: z.literal("register"),
  name: z.string().trim().min(2).max(32),
  team: z.string().trim().max(40).default(""),
  playerId: z.string().trim().max(40).default(""),
});
const command = z.object({
  type: z.enum(["submit", "hint", "move", "arm"]),
  stage: z.number().int().min(0).max(17),
  answer: z
    .union([
      z.string().max(250),
      z.array(z.union([z.string().max(20), z.number()])).max(100),
    ])
    .optional(),
});
export async function GET(req: NextRequest) {
  try {
    return await transact((s) => {
      if (req.nextUrl.searchParams.has("leaderboard"))
        return NextResponse.json(
          { entries: board(s), mode: production ? "competition" : "local" },
          { headers: { "Cache-Control": "no-store" } },
        );
      const token = req.cookies.get("nexus-session")?.value;
      const run = token
        ? s.runs.find((r) => r.tokenHash === hash(token))
        : undefined;
      return NextResponse.json(
        {
          run: run ? publicRun(run) : null,
          config: s.config,
          mode: production ? "competition" : "local",
          serverTime: Date.now(),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }, false);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req))
      return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
    if (Number(req.headers.get("content-length") ?? 0) > 16000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 16000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    if (body.type === "register") {
      const input = register.parse(body),
        token = randomBytes(32).toString("hex");
      return await transact((s) => {
        const oldToken = req.cookies.get("nexus-session")?.value;
        const existing = oldToken
          ? s.runs.find((r) => r.tokenHash === hash(oldToken))
          : undefined;
        if (
          existing &&
          !existing.ended &&
          Date.now() < existing.started + existing.duration * 1000
        )
          return NextResponse.json(
            { error: "An active mission already exists. Resume your mission." },
            { status: 409 },
          );
        const run = newRun(
          input.name,
          input.team,
          input.playerId,
          token,
          s.config,
        );
        s.runs.push(run);
        const response = NextResponse.json({
          run: publicRun(run),
          config: s.config,
          mode: production ? "competition" : "local",
          serverTime: Date.now(),
        });
        response.cookies.set("nexus-session", token, {
          httpOnly: true,
          sameSite: "strict",
          secure: req.nextUrl.protocol === "https:",
          maxAge: 604800,
          path: "/",
        });
        return response;
      });
    }
    const action = command.parse(body);
    return await transact((s) => {
      const token = req.cookies.get("nexus-session")?.value;
      const run = token
        ? s.runs.find((r) => r.tokenHash === hash(token))
        : undefined;
      if (!run)
        return NextResponse.json(
          { error: "Session not found. Identify yourself to begin." },
          { status: 401 },
        );
      const result = act(run, action, s.config);
      return NextResponse.json({
        ...result,
        run: publicRun(run),
        config: s.config,
        serverTime: Date.now(),
      });
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Invalid terminal input."
            : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
