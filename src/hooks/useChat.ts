import { useState } from "react";
import type { ChatMessage } from "../types/chat";
import { sendMessage as apiSendMessage } from "../api/chat";

export default function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(content: string) {
    const userMessage: ChatMessage = {
      role: "user",
      content,

    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);
    setError(null);

    try {
      const { reply } = await apiSendMessage(updatedMessages); // no context
      setMessages([...updatedMessages, reply]);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return { messages, sendMessage, loading, error }; // only these
}
