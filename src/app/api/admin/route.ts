import { sameOrigin } from "@/lib/server/origin";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { database, production, transact } from "@/lib/server/store";
import { board, newRun, publicRun } from "@/lib/server/engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const failures = new Map<string, { count: number; since: number }>();
function sign(value: string) {
  return createHmac("sha256", process.env.LOCAL_ADMIN_PASSWORD ?? "disabled")
    .update(value)
    .digest("hex");
}
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
async function authorized(req: NextRequest) {
  const token = req.cookies.get("nexus-admin")?.value;
  if (!token) return false;
  if (production) {
    const { data, error } = await database().auth.getUser(token);
    return (
      !error &&
      !!data.user?.email &&
      process.env.ADMIN_EMAILS?.split(",")
        .map((s) => s.trim().toLowerCase())
        .includes(data.user.email.toLowerCase())
    );
  }
  if (!process.env.LOCAL_ADMIN_PASSWORD) return false;
  const [expires, signature] = token.split(".");
  return Number(expires) > Date.now() && equal(sign(expires), signature ?? "");
}
export async function GET(req: NextRequest) {
  if (!(await authorized(req)))
    return NextResponse.json(
      { error: "Administrator authentication required." },
      { status: 401 },
    );
  try {
    return await transact(
      (s) =>
        NextResponse.json({
          config: s.config,
          runs: s.runs.map(publicRun),
          entries: board(s),
          mode: production ? "competition" : "local",
        }),
      false,
    );
  } catch {
    return NextResponse.json(
      { error: "Event database unavailable." },
      { status: 503 },
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    if (!sameOrigin(req))
      return NextResponse.json({ error: "Origin rejected." }, { status: 403 });
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 16000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    if (body.type === "logout") {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete("nexus-admin");
      return res;
    }
    if (body.type === "login") {
      const input = z
        .object({
          password: z.string().min(1).max(200),
          email: z.string().max(200).optional(),
        })
        .parse(body);
      // Fail closed after repeated attempts; production Supabase Auth also applies its own rate limits.
      const key = production
        ? (input.email ?? "unknown").toLowerCase()
        : "local";
      const limit = failures.get(key);
      if (limit && Date.now() - limit.since < 60000 && limit.count >= 5)
        return NextResponse.json(
          { error: "Too many login attempts. Wait one minute." },
          { status: 429 },
        );
      let token = "";
      if (production) {
        const { data, error } = await database().auth.signInWithPassword({
          email: input.email ?? "",
          password: input.password,
        });
        if (
          !error &&
          data.user.email &&
          process.env.ADMIN_EMAILS?.split(",")
            .map((s) => s.trim().toLowerCase())
            .includes(data.user.email.toLowerCase())
        )
          token = data.session.access_token;
      } else if (
        process.env.LOCAL_ADMIN_PASSWORD &&
        equal(input.password, process.env.LOCAL_ADMIN_PASSWORD)
      ) {
        const expires = String(Date.now() + 3600000);
        token = expires + "." + sign(expires);
      }
      if (!token) {
        failures.set(key, {
          count:
            limit && Date.now() - limit.since < 60000 ? limit.count + 1 : 1,
          since:
            limit && Date.now() - limit.since < 60000
              ? limit.since
              : Date.now(),
        });
        return NextResponse.json(
          {
            error:
              "Invalid credentials or administrator access not configured.",
          },
          { status: 401 },
        );
      }
      failures.delete(key);
      const res = NextResponse.json({ ok: true });
      res.cookies.set("nexus-admin", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: req.nextUrl.protocol === "https:",
        maxAge: 3600,
        path: "/",
      });
      return res;
    }
    if (!(await authorized(req)))
      return NextResponse.json(
        { error: "Administrator authentication required." },
        { status: 401 },
      );
    return await transact((s) => {
      if (body.type === "configure") {
        s.config = z
          .object({
            duration: z.number().int().min(60).max(14400),
            levelPoints: z.number().int().min(0).max(1000),
            puzzlePoints: z.number().int().min(0).max(1000),
            firstBonus: z.number().int().min(0).max(1000),
            hintPenalty: z.number().int().min(0).max(1000),
            wrongPenalty: z.number().int().min(0).max(1000),
            timeBonus: z.number().int().min(0).max(100),
            enabled: z.array(z.boolean()).length(6),
          })
          .parse(body.config);
      } else if (body.type === "reset-player") {
        const i = s.runs.findIndex((r) => r.id === body.id);
        if (i < 0) throw new Error("Player not found.");
        const r = s.runs[i];
        const reset = newRun(r.name, r.team, r.playerId, "temporary", s.config);
        reset.tokenHash = r.tokenHash;
        reset.id = r.id;
        s.runs[i] = reset;
      } else if (
        body.type === "reset-event" &&
        body.confirm === "RESET EVENT"
      ) {
        s.runs = [];
      } else throw new Error("Invalid administrative action.");
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Check your configuration values."
            : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
