const API_URL = "https://r3bel-production.up.railway.app/chat";
export async function sendMessage(messages) {
    const lastMessage = messages[messages.length - 1];
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message: lastMessage.content,
        }),
    });
    if (!response.ok) {
        throw new Error("Failed to get response");
    }
    const data = await response.json();
    return {
        reply: data.response, // 🔥 THIS IS THE FIX
    };
}
