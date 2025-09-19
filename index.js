// index.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = "publicidad123"; // El mismo que pusiste en Meta
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // De Render (Meta)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // De Render (OpenAI)

// Webhook verification
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// Webhook to receive messages
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      // Aseguramos que realmente existe el evento
      const webhookEvent = entry.messaging && entry.messaging[0];
      if (!webhookEvent) continue;

      const sender = webhookEvent.sender?.id;
      const text = webhookEvent.message?.text;

      if (sender && text) {
        try {
          console.log("Mensaje recibido:", text);

          // Llamar a OpenAI con el Prompt Maestro
          const gptResponse = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-5",
                messages: [
                  {
                    role: "system",
                    content:
                      "Eres el asistente comercial 24/7 de CV Canada Immigration. Usa este prompt maestro: ... (aquí pega el Prompt Maestro completo)",
                  },
                  { role: "user", content: text },
                ],
              }),
            }
          ).then((r) => r.json());

          const reply =
            gptResponse.choices?.[0]?.message?.content ||
            "Lo siento, no entendí tu mensaje.";

          console.log("Respuesta generada:", reply);

          // Responder al cliente en Messenger
          await fetch(
            `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: sender },
                message: { text: reply },
              }),
            }
          );
        } catch (error) {
          console.error("Error procesando mensaje:", error);
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
