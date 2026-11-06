export const FRESHNESS_THRESHOLD_MS = 26 * 3_600_000;

export type FreshnessState = "conforme" | "attention" | "retard";

export type Fraicheur = {
  state: FreshnessState;
  title: string;
  details: string;
};

const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });
const heure = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short", timeZone: "Europe/Paris" });

export function freshness(lastRead: Date | null, now: Date): Fraicheur {
  if (!lastRead) {
    return {
      state: "attention",
      title: "Aucune lecture de CIRIL",
      details: "Les données de CIRIL n'ont pas encore été lues.",
    };
  }

  const quand = `${day.format(lastRead)} à ${heure.format(lastRead)}`;
  const age = now.getTime() - lastRead.getTime();

  if (age > FRESHNESS_THRESHOLD_MS) {
    return { state: "retard", title: "Données anciennes", details: `Dernière lecture le ${quand}` };
  }
  return { state: "conforme", title: "Données à jour", details: `Lues dans CIRIL le ${quand}` };
}
