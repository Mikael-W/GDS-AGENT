import { describe, expect, it } from "vitest";

import { requireRecentHeartbeat, SILENCE_PLANIFICATEUR_MS, verifier } from "@/server/utils/health";

describe("/health/ready", () => {
  it("est prêt quand tous les contrôles passent", async () => {
    const { ok, body } = await verifier({ getDb: async () => {} });
    expect(ok).toBe(true);
    expect(body).toEqual({ statut: "ok", controles: { getDb: "ok" } });
  });

  it("nomme le contrôle en échec", async () => {
    const { ok, body } = await verifier({
      getDb: async () => {
        throw new TypeError("connexion refusée");
      },
    });
    expect(ok).toBe(false);
    expect(body.controles.getDb).toBe("erreur : TypeError");
  });

  it("tient le planificateur pour arrêté sans battement récent", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(() => requireRecentHeartbeat(undefined, now)).toThrow("aucun battement");
    expect(() =>
      requireRecentHeartbeat(new Date(now.getTime() - SILENCE_PLANIFICATEUR_MS - 1), now),
    ).toThrow("planificateur silencieux");
    expect(() => requireRecentHeartbeat(new Date(now.getTime() - 60_000), now)).not.toThrow();
  });
});
