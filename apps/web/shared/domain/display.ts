export const PAGE_SIZE = 10;

export type Page<T> = {
  rows: T[];
  total: number;
  page: number;
  pages: number;
};

export function paginate<T>(elements: T[], page: number): Page<T> {
  const pages = Math.max(1, Math.ceil(elements.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * PAGE_SIZE;
  return {
    rows: elements.slice(start, start + PAGE_SIZE),
    total: elements.length,
    page: current,
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

export function formatDate(iso: string | null): string {
  if (iso === null) return "Non renseignée";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
