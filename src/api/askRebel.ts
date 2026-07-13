const API_URL = "https://r3bel-5464.onrender.com";

export interface RebelChatResult {
  reply: string;
  source: "copilot" | "chat";
  intent?: string;
  referenced_assets?: { id: number; asset_name: string }[];
  referenced_controls?: { control_ref: string; title: string }[];
}

/**
 * Tries the grounded Security Copilot first (/copilot/ask). If it doesn't
 * recognize the question as one of its known, SQL-grounded intents, falls
 * back to the general-purpose /chat endpoint — same one used for coding
 * help and everything else. Keeps a single chat UI while preserving the
 * Copilot's "never hallucinate" guarantee for the questions it does know.
 *
 * Falls back to /chat on any Copilot error too (network issue, 500, etc.)
 * so a Copilot outage never breaks the chat experience — it just becomes
 * a plain chat until the Copilot is back.
 */
export async function askRebel(
  question: string,
  sessionId: string = "default"
): Promise<RebelChatResult> {
  try {
    const copilotRes = await fetch(`${API_URL}/copilot/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, session_id: sessionId }),
    });

    if (copilotRes.ok) {
      const data = await copilotRes.json();
      if (data.intent && data.intent !== "unrecognized") {
        return {
          reply: data.answer,
          source: "copilot",
          intent: data.intent,
          referenced_assets: data.referenced_assets ?? [],
          referenced_controls: data.referenced_controls ?? [],
        };
      }
      // Recognized as "unrecognized" by the Copilot itself — fall through to /chat
      // rather than showing its canned "here's what I can answer" message, since
      // the person likely wants general help (e.g. coding), not a redirect.
    }
    // Copilot returned a non-2xx (or matched nothing) — fall through to /chat.
  } catch {
    // Network/parse error talking to /copilot/ask — fall through to /chat.
  }

  const chatRes = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question, session_id: sessionId }),
  });

  if (!chatRes.ok) {
    throw new Error("Failed to get a response from REBEL");
  }

  const chatData = await chatRes.json();
  return { reply: chatData.response, source: "chat" };
}

/**
 * UI helper: prefix general-chat replies with a visible marker so a
 * confident-sounding but ungrounded answer (e.g. "rate our compliance 8/10")
 * can never be mistaken for a real, data-backed Copilot answer. Copilot
 * answers are left unmarked since they're already fact-grounded.
 *
 * Use this when rendering `result.reply` in the chat panel:
 *   const displayText = formatForDisplay(result);
 */
export function formatForDisplay(result: RebelChatResult): string {
  if (result.source === "chat") {
    return `⚠️ General AI response — not verified against platform data.\n\n${result.reply}`;
  }
  return result.reply;
}