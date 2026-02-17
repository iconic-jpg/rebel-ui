import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export default function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState("");
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim())
            return;
        onSend(text);
        setText("");
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "input-wrapper", children: [_jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), placeholder: "Type your message...", disabled: disabled }), _jsx("button", { type: "submit", className: "send-button", disabled: disabled, children: "Send" })] }));
}
