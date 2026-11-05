import { createHash } from "node:crypto";
import { type Marche, marches } from "@projet/db/schema";
import { eq, sql } from "drizzle-orm";

import { base } from "./base";
import { type ContratCiril, getAccessList, getContrats, urlFinancesDepuisAcces } from "./ciril";
import { env } from "./env";

/** AAAA-MM-JJ ou AAAAMMJJ CIRIL → ISO AAAA-MM-JJ ; autre valeur → null. */
function enDate(v: string | undefined): string | null {
  if (!v) return null;
  const direct = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const compact = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return null;
}

function enMontant(v: string | undefined): string | null {
  if (!v) return null;
  const nombre = Number(v.replace(",", "."));
  if (!Number.isFinite(nombre)) return null;
  return nombre.toFixed(2);
}

function enReconduction(v: string | undefined): boolean | null {
  if (!v) return null;
  const n = v.trim().toUpperCase();
  if (!n) return null;
  if (n.includes("TACITE")) return true;
  if (n.includes("EXPRES")) return false;
  return null;
}

type MappingMarche = Omit<Marche, "id" | "luLe">;

/**
 * Projette un contrat CIRIL vers une ligne `marches`. Les champs non fournis
 * par l'export CIRIL restent `null` : CCAP/garantie/réception viennent plus
 * tard (saisie manuelle ou autres webservices).
 */
export function projeter(contrat: ContratCiril): MappingMarche {
  const reference = contrat.numeroContrat?.trim() ?? "";
  const objet = [contrat.libelleContrat, contrat.objetContrat].filter(Boolean).join(" - ") || null;
  const payload = JSON.stringify(contrat);
  const empreinte = createHash("sha256").update(payload).digest("hex");
  return {
    reference,
    objet,
    titulaire: contrat.nomTiers ?? null,
    service: null,
    notifieLe: enDate(contrat.dateSouscription),
    debuteLe: enDate(contrat.dateDebut),
    finitLe: enDate(contrat.dateFin),
    montantInitial: enMontant(contrat.montantTTC),
    montantAvenants: null,
    montantRevisions: null,
    montantRetenues: null,
    montantDisponible: null,
    reconductionTacite: enReconduction(contrat.modeRenouvellement),
    reconductionsMax: null,
    aBonsDeCommande: false,
    garantieFinitLe: null,
    receptionneLe: null,
    solde: Boolean(enDate(contrat.dateSolde)),
    actif: true,
    empreinte,
  };
}

export type ResultatSynchro = {
  pointAcces: string;
  recus: number;
  inseres: number;
  misAJour: number;
  inchanges: number;
};

/**
 * Synchronise les marchés depuis CIRIL : ouvre une session, récupère les
 * contrats, et fait un upsert par `reference`. `luLe` est écrit à chaque
 * passage, `empreinte` permet de compter ce qui a vraiment bougé.
 */
export async function synchroniserDepuisCiril(
  opts: { requete?: string } = {},
): Promise<ResultatSynchro> {
  const e = env();
  if (!e.CIRIL_URL || !e.CIRIL_UTILISATEUR || !e.CIRIL_MOT_DE_PASSE) {
    throw new Error("CIRIL_URL, CIRIL_UTILISATEUR et CIRIL_MOT_DE_PASSE requis");
  }
  const urlAcces = `${e.CIRIL_URL.replace(/\/$/, "")}/cgi-bin/ws.exe/cgi-bin/acces.exe?ws`;
  const points = await getAccessList({
    url: urlAcces,
    utilisateur: e.CIRIL_UTILISATEUR,
    motDePasse: e.CIRIL_MOT_DE_PASSE,
  });
  const finances = points.find((p) => p.netApplication === "Finances");
  if (!finances) throw new Error("Aucun point d'accès Finances pour cet utilisateur CIRIL");

  const contrats = await getContrats({
    urlFinances: urlFinancesDepuisAcces(finances.urlAbsolue),
    acces: finances.urlAbsolue,
    requete: opts.requete,
  });

  const db = base();
  let inseres = 0;
  let misAJour = 0;
  let inchanges = 0;

  for (const contrat of contrats) {
    const ligne = projeter(contrat);
    if (!ligne.reference) continue;
    const existant = await db.query.marches.findFirst({
      where: eq(marches.reference, ligne.reference),
      columns: { empreinte: true },
    });
    if (!existant) {
      await db.insert(marches).values(ligne);
      inseres += 1;
    } else if (existant.empreinte !== ligne.empreinte) {
      await db
        .update(marches)
        .set({ ...ligne, luLe: sql`now()` })
        .where(eq(marches.reference, ligne.reference));
      misAJour += 1;
    } else {
      await db
        .update(marches)
        .set({ luLe: sql`now()` })
        .where(eq(marches.reference, ligne.reference));
      inchanges += 1;
    }
  }

  return {
    pointAcces: `${finances.client ?? ""} / ${finances.schema ?? ""}`.trim(),
    recus: contrats.length,
    inseres,
    misAJour,
    inchanges,
  };
}
