import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ children, ...props }) {
    return _jsx("button", { ...props, children: children });
}
