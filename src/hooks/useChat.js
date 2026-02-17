import { useState } from "react";
import { sendMessage as apiSendMessage } from "../api/chat.js";
export default function useChat() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    async function sendMessage(content) {
        const userMessage = {
            role: "user",
            content,
            timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setLoading(true);
        setError(null);
        try {
            const { reply } = await apiSendMessage(updatedMessages);
            const assistantMessage = {
                role: "assistant",
                content: reply,
                timestamp: new Date().toISOString(),
            };
            setMessages([...updatedMessages, assistantMessage]);
        }
        catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError("Unknown error");
            }
        }
        finally {
            setLoading(false);
        }
    }
    return { messages, sendMessage, loading, error };
}
