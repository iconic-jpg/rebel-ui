import type { ChatMessage } from "../../types/chat.js";

interface Props {
  messages: ChatMessage[];
}

export default function MessageList({ messages }: Props) {
  return (
    <div className="message-list">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`message ${msg.role === "user" ? "user" : "assistant"}`}
        >
          {msg.content}
        </div>
      ))}
    </div>
  );
}
