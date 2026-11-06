import { describe, expect, it } from "vitest";

import { requireRecentHeartbeat, SCHEDULER_SILENCE_MS, verify } from "@/server/utils/health";

describe("/health/ready", () => {
  it("is ready when all checks pass", async () => {
    const { ok, body } = await verify({ getDb: async () => {} });
    expect(ok).toBe(true);
    expect(body).toEqual({ statut: "ok", controles: { getDb: "ok" } });
  });

  it("names the failing check", async () => {
    const { ok, body } = await verify({
      getDb: async () => {
        throw new TypeError("connexion refusée");
      },
    });
    expect(ok).toBe(false);
    expect(body.controles.getDb).toBe("erreur : TypeError");
  });

  it("considers the scheduler stopped without a recent heartbeat", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(() => requireRecentHeartbeat(undefined, now)).toThrow("aucun battement");
    expect(() =>
      requireRecentHeartbeat(new Date(now.getTime() - SCHEDULER_SILENCE_MS - 1), now),
    ).toThrow("planificateur silencieux");
    expect(() => requireRecentHeartbeat(new Date(now.getTime() - 60_000), now)).not.toThrow();
  });
});
