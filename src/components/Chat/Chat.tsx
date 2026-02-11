import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import useChat from "../../hooks/useChat";

export default function Chat() {
  const { messages, sendMessage, loading, error } = useChat();

  return (
    <div className="chat">
      <header className="chat-header">
        <h1>Rebel</h1>
      </header>

      <MessageList messages={messages} />

      {error && <div className="error">{error}</div>}

      <MessageInput onSend={sendMessage} disabled={loading} />

      {loading && <div className="loading">Rebel is thinking…</div>}
    </div>
  );
}
