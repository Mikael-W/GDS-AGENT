import { describe, expect, it } from "vitest";

import { financeUrlFromAccess, getAccessList, getContrats } from "@/server/utils/ciril";

const url = process.env.CIRIL_URL;
const user = process.env.CIRIL_UTILISATEUR;
const password = process.env.CIRIL_MOT_DE_PASSE;

/**
 * Contrat CIRIL : appel réel à la sandbox (lecture seule). Sans credentials,
 * les tests sont ignorés : utile pour les clones vierges.
 */
const credentials = url && user && password ? { url, user, password } : null;

describe.skipIf(!credentials)("CIRIL (sandbox)", () => {
  it("getAccessList opens a Finances session with a non-empty key", async () => {
    if (!credentials) return;
    const url = `${credentials.url.replace(/\/$/, "")}/cgi-bin/ws.exe/cgi-bin/acces.exe?ws`;
    const points = await getAccessList({
      url,
      user: credentials.user,
      password: credentials.password,
    });
    expect(points.length).toBeGreaterThan(0);
    const finance = points.find((p) => p.netApplication === "Finances");
    expect(finance).toBeDefined();
    expect(finance?.absoluteUrl).toMatch(/^https:\/\/.+\/cgi-bin\/web2java\.exe\?/);
    expect(finance?.key.length).toBeGreaterThan(20);
  }, 30_000);

  it("getContrats returns at least one usable contract", async () => {
    if (!credentials) return;
    const accessUrl = `${credentials.url.replace(/\/$/, "")}/cgi-bin/ws.exe/cgi-bin/acces.exe?ws`;
    const points = await getAccessList({
      url: accessUrl,
      user: credentials.user,
      password: credentials.password,
    });
    const finance = points.find((p) => p.netApplication === "Finances");
    if (!finance) throw new Error("point d'accès Finances absent");
    const contracts = await getContrats({
      financeUrl: financeUrlFromAccess(finance.absoluteUrl),
      access: finance.absoluteUrl,
    });
    expect(contracts.length).toBeGreaterThan(0);
    const first = contracts[0];
    expect(first?.numeroContrat?.length).toBeGreaterThan(0);
  }, 60_000);
});
