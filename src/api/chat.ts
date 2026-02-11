export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | null;
}

interface ChatResponse {
  reply: ChatMessage;
}

const API_URL = import.meta.env.VITE_API_URL;

export async function sendMessage(
  messages: ChatMessage[]
): Promise<ChatResponse> {
  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.statusText}`);
    }

    return res.json();
  } catch (err) {
    console.error("Error sending message:", err);
    throw err;
  }
}
