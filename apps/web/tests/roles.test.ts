import { describe, expect, it } from "vitest";

import { roleDepuisJeton } from "@/server/utils/roles";

function token(content: object): string {
  return `entete.${Buffer.from(JSON.stringify(content)).toString("base64url")}.signature`;
}

describe("role read from the Keycloak token", () => {
  it("gives owner to whoever enters through the AI Sisters provider", () => {
    expect(roleDepuisJeton(token({ identity_provider: "aisisters" }))).toBe("owner");
  });

  it("gives member for another provider, no provider, and any unreadable token", () => {
    expect(roleDepuisJeton(token({ identity_provider: "client-entra" }))).toBe("membre");
    expect(roleDepuisJeton(token({ realm_access: { roles: ["owner"] } }))).toBe("membre");
    expect(roleDepuisJeton(token({}))).toBe("membre");
    expect(roleDepuisJeton("pas-un-jeton")).toBe("membre");
    expect(roleDepuisJeton("a.%%%.c")).toBe("membre");
    expect(roleDepuisJeton(undefined)).toBe("membre");
  });
});
