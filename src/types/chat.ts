export type Role = "user" | "assistant";

export type ContextMode = "web" | "cyber";

export interface ChatMessage {
  role: Role;
  content: string;
  timestamp?: string;

}

export interface ChatRequest {
  message: string;
  context: ContextMode;
  code?: string;
}

export interface ChatResponse {
  reply: string;
}
