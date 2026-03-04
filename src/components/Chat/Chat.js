import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MessageList from "./MessageList.js";
import MessageInput from "./MessageInput.js";
import useChat from "../../hooks/useChat.js";
export default function Chat() {
    const { messages, sendMessage, loading, error } = useChat();
    return (_jsxs("div", { className: "chat", children: [_jsx("header", { className: "chat-header", children: _jsx("h1", { children: "Rebel" }) }), _jsx(MessageList, { messages: messages }), error && _jsx("div", { className: "error", children: error }), _jsx(MessageInput, { onSend: sendMessage, disabled: loading }), loading && _jsx("div", { className: "loading", children: "Rebel is thinking\u2026" })] }));
}
