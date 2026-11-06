type Variant = "primary" | "outline" | "secondary";
type Size = "normal" | "small";

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  type?: "button" | "submit";
  disabled?: boolean;
};
