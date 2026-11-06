import { describe, expect, it } from "vitest";

import { roleFromToken } from "@/server/utils/roles";

function token(content: object): string {
  return `entete.${Buffer.from(JSON.stringify(content)).toString("base64url")}.signature`;
}

describe("role read from the Keycloak token", () => {
  it("gives owner to whoever enters through the AI Sisters provider", () => {
    expect(roleFromToken(token({ identity_provider: "aisisters" }))).toBe("owner");
  });

  it("gives member for another provider, no provider, and any unreadable token", () => {
    expect(roleFromToken(token({ identity_provider: "client-entra" }))).toBe("membre");
    expect(roleFromToken(token({ realm_access: { roles: ["owner"] } }))).toBe("membre");
    expect(roleFromToken(token({}))).toBe("membre");
    expect(roleFromToken("pas-un-jeton")).toBe("membre");
    expect(roleFromToken("a.%%%.c")).toBe("membre");
    expect(roleFromToken(undefined)).toBe("membre");
  });
});
