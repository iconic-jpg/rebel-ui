import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ children, ...props }: SelectProps) {
  return <select {...props}>{children}</select>;
}
