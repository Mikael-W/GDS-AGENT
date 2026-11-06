import { createHash } from "node:crypto";
import { type Contract, contracts } from "@projet/db/schema";
import { eq, sql } from "drizzle-orm";
import { type CirilContract, financeUrlFromAccess, getAccessList, getContrats } from "./ciril";
import { getDb } from "./db";
import { env } from "./env";
import { journal, type SynchronizationReport } from "./synchronizations";

/** AAAA-MM-JJ ou AAAAMMJJ CIRIL → ISO AAAA-MM-JJ ; autre valeur → null. */
function toDate(v: string | undefined): string | null {
  if (!v) return null;
  const direct = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const compact = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return null;
}

function toAmount(v: string | undefined): string | null {
  if (!v) return null;
  const count = Number(v.replace(",", "."));
  if (!Number.isFinite(count)) return null;
  return count.toFixed(2);
}

function toRenewal(v: string | undefined): boolean | null {
  if (!v) return null;
  const n = v.trim().toUpperCase();
  if (!n) return null;
  if (n.includes("TACITE")) return true;
  if (n.includes("EXPRES")) return false;
  return null;
}

type ContractMapping = Omit<Contract, "id" | "readAt">;

/**
 * Projette un contrat CIRIL vers une ligne `marches`. Les champs non fournis
 * par l'export CIRIL restent `null` : CCAP/garantie/réception viennent plus
 * tard (saisie manuelle ou autres webservices).
 */
export function project(contract: CirilContract): ContractMapping {
  const reference = contract.numeroContrat?.trim() ?? "";
  const subject =
    [contract.libelleContrat, contract.objetContrat].filter(Boolean).join(" - ") || null;
  const payload = JSON.stringify(contract);
  const fingerprint = createHash("sha256").update(payload).digest("hex");
  return {
    reference,
    subject,
    holder: contract.nomTiers ?? null,
    service: null,
    notifiedOn: toDate(contract.dateSouscription),
    startsOn: toDate(contract.dateDebut),
    endsOn: toDate(contract.dateFin),
    initialAmount: toAmount(contract.montantTTC),
    amendmentsAmount: null,
    revisionsAmount: null,
    withholdingsAmount: null,
    availableAmount: null,
    tacitRenewal: toRenewal(contract.modeRenouvellement),
    maxRenewals: null,
    hasPurchaseOrders: false,
    warrantyEndsOn: null,
    receivedOn: null,
    settled: Boolean(toDate(contract.dateSolde)),
    active: true,
    fingerprint,
  };
}

export type SynchronizationResult = SynchronizationReport & {
  accessPoint: string;
  unchanged: number;
};

/**
 * Synchronise les marchés depuis CIRIL : ouvre une session, récupère les
 * contrats, et fait un upsert par `reference`. `luLe` est écrit à chaque
 * passage, `empreinte` permet de compter ce qui a vraiment bougé.
 */
export function synchronizeFromCiril(
  opts: { query?: string } = {},
): Promise<SynchronizationResult> {
  return journal(() => copyContracts(opts));
}

async function copyContracts(opts: { query?: string }): Promise<SynchronizationResult> {
  const e = env();
  if (!e.CIRIL_URL || !e.CIRIL_UTILISATEUR || !e.CIRIL_MOT_DE_PASSE) {
    throw new Error("CIRIL_URL, CIRIL_UTILISATEUR et CIRIL_MOT_DE_PASSE requis");
  }
  const accessUrl = `${e.CIRIL_URL.replace(/\/$/, "")}/cgi-bin/ws.exe/cgi-bin/acces.exe?ws`;
  const points = await getAccessList({
    url: accessUrl,
    user: e.CIRIL_UTILISATEUR,
    password: e.CIRIL_MOT_DE_PASSE,
  });
  const finance = points.find((p) => p.netApplication === "Finances");
  if (!finance) throw new Error("Aucun point d'accès Finances pour cet utilisateur CIRIL");

  const cirilContracts = await getContrats({
    financeUrl: financeUrlFromAccess(finance.absoluteUrl),
    access: finance.absoluteUrl,
    query: opts.query,
  });

  const db = getDb();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const contract of cirilContracts) {
    const row = project(contract);
    if (!row.reference) continue;
    const existing = await db.query.contracts.findFirst({
      where: eq(contracts.reference, row.reference),
      columns: { fingerprint: true },
    });
    if (!existing) {
      await db.insert(contracts).values(row);
      inserted += 1;
    } else if (existing.fingerprint !== row.fingerprint) {
      await db
        .update(contracts)
        .set({ ...row, readAt: sql`now()` })
        .where(eq(contracts.reference, row.reference));
      updated += 1;
    } else {
      await db
        .update(contracts)
        .set({ readAt: sql`now()` })
        .where(eq(contracts.reference, row.reference));
      unchanged += 1;
    }
  }

  return {
    accessPoint: `${finance.client ?? ""} / ${finance.schema ?? ""}`.trim(),
    received: cirilContracts.length,
    inserted,
    updated,
    unchanged,
  };
}
