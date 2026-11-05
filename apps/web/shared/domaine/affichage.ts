export const TAILLE_PAGE = 10;

export type Page<T> = {
  lignes: T[];
  total: number;
  page: number;
  pages: number;
};

export function paginer<T>(elements: T[], page: number): Page<T> {
  const pages = Math.max(1, Math.ceil(elements.length / TAILLE_PAGE));
  const courante = Math.min(Math.max(1, page), pages);
  const debut = (courante - 1) * TAILLE_PAGE;
  return {
    lignes: elements.slice(debut, debut + TAILLE_PAGE),
    total: elements.length,
    page: courante,
    pages,
  };
}

export function pluriel(nombre: number, mot: string): string {
  return `${nombre} ${mot}${nombre > 1 ? "s" : ""}`;
}
