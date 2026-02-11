export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | null;
}

export interface ChatResponse {
  mode: string;
  mood: string;
  reply: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export async function sendMessage(
  messages: ChatMessage[]
): Promise<ChatResponse> {

  const latest = messages[messages.length - 1];

  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: latest.content,
      mode: "fast",
    }),
  });

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  return res.json() as Promise<ChatResponse>;
}
