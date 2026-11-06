type Variante = "primaire" | "contour" | "secondaire";
type Taille = "normal" | "petit";

export type PropsBouton = {
  variante?: Variante;
  taille?: Taille;
  type?: "button" | "submit";
  disabled?: boolean;
};
