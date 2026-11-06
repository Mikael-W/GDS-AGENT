export const PAGE_SIZE = 10;

export type Page<T> = {
  rows: T[];
  total: number;
  page: number;
  pages: number;
};

export function paginate<T>(elements: T[], page: number): Page<T> {
  const pages = Math.max(1, Math.ceil(elements.length / PAGE_SIZE));
  const courante = Math.min(Math.max(1, page), pages);
  const debut = (courante - 1) * PAGE_SIZE;
  return {
    rows: elements.slice(debut, debut + PAGE_SIZE),
    total: elements.length,
    page: courante,
    pages,
  };
}

export function plural(count: number, mot: string): string {
  return `${count} ${mot}${count > 1 ? "s" : ""}`;
}

export function parisDay(instant: Date): string {
  return instant.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
}

export function parisToday(): string {
  return parisDay(new Date());
}
