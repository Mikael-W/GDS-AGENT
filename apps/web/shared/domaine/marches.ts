export const TAILLE_PAGE = 10;

export type MarcheListe = {
  reference: string;
  objet: string | null;
  titulaire: string | null;
  service: string | null;
  debuteLe: string | null;
  finitLe: string | null;
  montantInitial: string | null;
  montantAvenants: string | null;
  lots: number;
};

export type EtatMarche = "en_cours" | "termines" | "tous";

export type CriteresMarches = {
  recherche: string;
  service: string;
  etat: EtatMarche;
};

export type SyntheseMarches = {
  actifs: number;
  lots: number;
  montantNotifie: number;
};

export type PageMarches = {
  lignes: MarcheListe[];
  total: number;
  page: number;
  pages: number;
};

const eurosEnCentimes = (montant: string | null): number =>
  montant === null ? 0 : Math.round(Number(montant) * 100);

const sansAccent = (texte: string): string =>
  texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function montantNotifie(marche: MarcheListe): number {
  return eurosEnCentimes(marche.montantInitial) + eurosEnCentimes(marche.montantAvenants);
}

export function estEnCours(marche: MarcheListe, aujourdhui: string): boolean {
  return marche.finitLe === null || marche.finitLe >= aujourdhui;
}

export function synthese(marches: MarcheListe[], aujourdhui: string): SyntheseMarches {
  const actifs = marches.filter((m) => estEnCours(m, aujourdhui));
  return {
    actifs: actifs.length,
    lots: actifs.reduce((total, m) => total + m.lots, 0),
    montantNotifie: actifs.reduce((total, m) => total + montantNotifie(m), 0),
  };
}

export function services(marches: MarcheListe[]): string[] {
  const noms = marches.flatMap((m) => (m.service ? [m.service] : []));
  return [...new Set(noms)].sort((a, b) => a.localeCompare(b, "fr"));
}

export function filtrer(
  marches: MarcheListe[],
  criteres: CriteresMarches,
  aujourdhui: string,
): MarcheListe[] {
  const recherche = sansAccent(criteres.recherche.trim());
  return marches.filter((m) => {
    if (criteres.service && m.service !== criteres.service) return false;
    if (criteres.etat === "en_cours" && !estEnCours(m, aujourdhui)) return false;
    if (criteres.etat === "termines" && estEnCours(m, aujourdhui)) return false;
    if (!recherche) return true;
    return [m.objet, m.reference, m.titulaire].some((champ) =>
      sansAccent(champ ?? "").includes(recherche),
    );
  });
}

export function paginer(marches: MarcheListe[], page: number): PageMarches {
  const pages = Math.max(1, Math.ceil(marches.length / TAILLE_PAGE));
  const courante = Math.min(Math.max(1, page), pages);
  const debut = (courante - 1) * TAILLE_PAGE;
  return {
    lignes: marches.slice(debut, debut + TAILLE_PAGE),
    total: marches.length,
    page: courante,
    pages,
  };
}

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formaterMontant(centimes: number): string {
  return euro.format(centimes / 100);
}

export function formaterMontantCompact(centimes: number): string {
  const euros = centimes / 100;
  if (euros < 1_000_000) return formaterMontant(centimes);
  return `${(euros / 1_000_000).toFixed(1).replace(".", ",")} M€`;
}

const moisAnnee = (date: string): string => `${date.slice(5, 7)}/${date.slice(0, 4)}`;

export function formaterPeriode(debuteLe: string | null, finitLe: string | null): string {
  if (debuteLe && finitLe) return `${moisAnnee(debuteLe)} au ${moisAnnee(finitLe)}`;
  if (debuteLe) return `Depuis ${moisAnnee(debuteLe)}`;
  if (finitLe) return `Jusqu'à ${moisAnnee(finitLe)}`;
  return "Non renseignée";
}
