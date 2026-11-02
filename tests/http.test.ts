import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const base = process.env.TEST_BASE_URL;
test(
  "live HTTP: cookies, isolation, origin, hints, locking, admin protection and full escape",
  { skip: !base },
  async () => {
    let cookie = "";
    const post = async (
      body: unknown,
      cookieValue = cookie,
      origin = base!,
    ) => {
      await new Promise((r) => setTimeout(r, 210));
      const res = await fetch(base + "/api/game", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Cookie: cookieValue,
        },
        body: JSON.stringify(body),
      });
      return { res, data: await res.json() };
    };
    const registration = await post({
      type: "register",
      name: "QA Operator",
      team: "Automated verification",
    });
    assert.equal(registration.res.status, 200);
    const setCookie = registration.res.headers.get("set-cookie")!;
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=strict/i);
    cookie = setCookie.split(";")[0];
    assert.equal(registration.data.run.stage, 0);
    assert.ok(!("tokenHash" in registration.data.run));
    assert.equal(
      (await post({ type: "submit", stage: 3, answer: "POWER" })).res.status,
      400,
    );
    assert.equal(
      (
        await post(
          { type: "submit", stage: 0, answer: "42" },
          cookie,
          "https://attacker.invalid",
        )
      ).res.status,
      403,
    );
    assert.equal(
      (
        await post(
          { type: "submit", stage: 0, answer: "42" },
          "nexus-session=fake",
        )
      ).res.status,
      401,
    );
    const wrong = await post({ type: "submit", stage: 0, answer: "99" });
    assert.equal(wrong.data.ok, false);
    assert.equal(wrong.data.run.score, -5);
    const hint = await post({ type: "hint", stage: 0 });
    assert.equal(hint.data.run.hints, 1);
    assert.equal(hint.data.run.score, -20);
    let current = 0;
    const submit = async (answer: unknown) => {
      const { res, data } = await post({
        type: "submit",
        stage: current,
        answer,
      });
      assert.equal(res.status, 200, JSON.stringify(data));
      assert.equal(data.ok, true, data.message);
      current = data.run.stage;
      return data;
    };
    for (const answer of [
      "42",
      "NEXUS",
      "4205",
      "POWER",
      "SOS",
      "OPEN",
      [0, 1, 2, 1, 1, 3, 0, 1, 2],
      "F2",
      "CADB",
      "RRDDLLDDRRRRRD".split(""),
      "RRRDDLLDDRRRRD".split(""),
    ])
      await submit(answer);
    const resumed = await (
      await fetch(base + "/api/game", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(resumed.run.stage, 11);
    assert.equal(resumed.run.hints, 1);
    for (const direction of [
      "R",
      "R",
      "R",
      "R",
      "R",
      "D",
      "D",
      "D",
      "D",
      "D",
    ]) {
      const phase = Date.now() % 2400;
      if (phase < 1250 || phase > 1800)
        await new Promise((r) => setTimeout(r, (1250 - phase + 2400) % 2400));
      const result = await post({ type: "move", stage: 11, answer: direction });
      assert.equal(result.data.ok, true, result.data.message);
      current = result.data.run.stage;
    }
    assert.equal(current, 12);
    await submit("04");
    await submit(["AUTH", "AUDIT", "ISOLATE", "RESTORE"]);
    await submit("auth POWER");
    await submit("isolate ORION");
    await submit("restore access");
    await submit(["42", "POWER", "CADB", "VECTOR", "ROOT"]);
    await submit("42-POWER-CADB");
    assert.equal((await post({ type: "arm", stage: 17 })).data.ok, true);
    const final = await submit("CADB");
    assert.equal(final.run.stage, 18);
    assert.ok(final.run.ended);
    const standings = await (
      await fetch(base + "/api/game?leaderboard=1")
    ).json();
    assert.ok(
      standings.entries.some(
        (r: { id: string; finished: boolean }) =>
          r.id === final.run.id && r.finished,
      ),
    );
    assert.equal((await fetch(base + "/api/admin")).status, 401);
    const adminBody = { type: "configure", config: {} };
    const adminDenied = await fetch(base + "/api/admin", {
      method: "POST",
      headers: { Origin: base!, "Content-Type": "application/json" },
      body: JSON.stringify(adminBody),
    });
    assert.equal(adminDenied.status, 401);
    if (process.env.TEST_LOCAL_ADMIN === "1") {
      const password = readFileSync(".env.local", "utf8").match(
        /^LOCAL_ADMIN_PASSWORD=(.+)$/m,
      )![1];
      const login = await fetch(base + "/api/admin", {
        method: "POST",
        headers: { Origin: base!, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "login", password }),
      });
      assert.equal(login.status, 200);
      const adminCookie = login.headers.get("set-cookie")!.split(";")[0];
      const admin = await fetch(base + "/api/admin", {
        headers: { Cookie: adminCookie },
      });
      assert.equal(admin.status, 200);
      const data = await admin.json();
      assert.ok(data.runs.length > 0);
      const forged = await fetch(base + "/api/admin", {
        headers: { Cookie: "nexus-admin=9999999999999.forged" },
      });
      assert.equal(forged.status, 401);
    }
  },
);
