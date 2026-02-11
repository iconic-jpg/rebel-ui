export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | null;
}

interface ChatResponse {
  reply: ChatMessage;
}

export async function sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/chat/", {
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
