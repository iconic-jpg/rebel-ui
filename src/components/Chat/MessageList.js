import { jsx as _jsx } from "react/jsx-runtime";
export default function MessageList({ messages }) {
    return (_jsx("div", { className: "message-list", children: messages.map((msg, idx) => (_jsx("div", { className: `message ${msg.role === "user" ? "user" : "assistant"}`, children: msg.content }, idx))) }));
}
