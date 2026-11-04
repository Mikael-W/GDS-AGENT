import { describe, expect, it } from "vitest";

import { exigerBattementRecent, SILENCE_PLANIFICATEUR_MS, verifier } from "@/lib/sante";

describe("/health/ready", () => {
  it("est prêt quand tous les contrôles passent", async () => {
    const { ok, corps } = await verifier({ base: async () => {} });
    expect(ok).toBe(true);
    expect(corps).toEqual({ statut: "ok", controles: { base: "ok" } });
  });

  it("nomme le contrôle en échec", async () => {
    const { ok, corps } = await verifier({
      base: async () => {
        throw new TypeError("connexion refusée");
      },
    });
    expect(ok).toBe(false);
    expect(corps.controles.base).toBe("erreur : TypeError");
  });

  it("tient le planificateur pour arrêté sans battement récent", () => {
    const maintenant = new Date("2026-10-17T12:00:00Z");
    expect(() => exigerBattementRecent(undefined, maintenant)).toThrow("aucun battement");
    expect(() =>
      exigerBattementRecent(
        new Date(maintenant.getTime() - SILENCE_PLANIFICATEUR_MS - 1),
        maintenant,
      ),
    ).toThrow("planificateur silencieux");
    expect(() =>
      exigerBattementRecent(new Date(maintenant.getTime() - 60_000), maintenant),
    ).not.toThrow();
  });
});
