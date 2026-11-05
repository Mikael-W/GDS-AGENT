import { describe, expect, it } from "vitest";

import { getAccessList, getContrats, urlFinancesDepuisAcces } from "@/server/utils/ciril";

const url = process.env.CIRIL_URL;
const utilisateur = process.env.CIRIL_UTILISATEUR;
const motDePasse = process.env.CIRIL_MOT_DE_PASSE;

/**
 * Contrat CIRIL : appel réel à la sandbox (lecture seule). Sans credentials,
 * les tests sont ignorés : utile pour les clones vierges.
 */
const credentials = url && utilisateur && motDePasse ? { url, utilisateur, motDePasse } : null;

describe.skipIf(!credentials)("CIRIL (sandbox)", () => {
  it("getAccessList ouvre une session Finances avec une clé non vide", async () => {
    if (!credentials) return;
    const url = `${credentials.url.replace(/\/$/, "")}/cgi-bin/ws.exe/cgi-bin/acces.exe?ws`;
    const points = await getAccessList({
      url,
      utilisateur: credentials.utilisateur,
      motDePasse: credentials.motDePasse,
    });
    expect(points.length).toBeGreaterThan(0);
    const finances = points.find((p) => p.netApplication === "Finances");
    expect(finances).toBeDefined();
    expect(finances?.urlAbsolue).toMatch(/^https:\/\/.+\/cgi-bin\/web2java\.exe\?/);
    expect(finances?.cle.length).toBeGreaterThan(20);
  }, 30_000);

  it("getContrats renvoie au moins un marché exploitable", async () => {
    if (!credentials) return;
    const urlAcces = `${credentials.url.replace(/\/$/, "")}/cgi-bin/ws.exe/cgi-bin/acces.exe?ws`;
    const points = await getAccessList({
      url: urlAcces,
      utilisateur: credentials.utilisateur,
      motDePasse: credentials.motDePasse,
    });
    const finances = points.find((p) => p.netApplication === "Finances");
    if (!finances) throw new Error("point d'accès Finances absent");
    const contrats = await getContrats({
      urlFinances: urlFinancesDepuisAcces(finances.urlAbsolue),
      acces: finances.urlAbsolue,
    });
    expect(contrats.length).toBeGreaterThan(0);
    const premier = contrats[0];
    expect(premier?.numeroContrat?.length).toBeGreaterThan(0);
  }, 60_000);
});
