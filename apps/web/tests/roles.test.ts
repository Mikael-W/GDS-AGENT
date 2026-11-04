import { describe, expect, it } from "vitest";

import { roleDepuisJeton } from "@/lib/roles";

function jeton(contenu: object): string {
  return `entete.${Buffer.from(JSON.stringify(contenu)).toString("base64url")}.signature`;
}

describe("rôle lu dans le jeton Keycloak", () => {
  it("donne owner à qui entre par le fournisseur AI Sisters", () => {
    expect(roleDepuisJeton(jeton({ identity_provider: "aisisters" }))).toBe("owner");
  });

  it("donne membre par un autre fournisseur, sans fournisseur, et pour tout jeton illisible", () => {
    expect(roleDepuisJeton(jeton({ identity_provider: "client-entra" }))).toBe("membre");
    expect(roleDepuisJeton(jeton({ realm_access: { roles: ["owner"] } }))).toBe("membre");
    expect(roleDepuisJeton(jeton({}))).toBe("membre");
    expect(roleDepuisJeton("pas-un-jeton")).toBe("membre");
    expect(roleDepuisJeton("a.%%%.c")).toBe("membre");
    expect(roleDepuisJeton(undefined)).toBe("membre");
  });
});
