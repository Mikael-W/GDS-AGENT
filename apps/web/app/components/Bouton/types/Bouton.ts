export type Variante = "primaire" | "contour" | "secondaire";
export type Taille = "normal" | "petit";

export type PropsBouton = {
  variante?: Variante;
  taille?: Taille;
  type?: "button" | "submit";
  disabled?: boolean;
};
