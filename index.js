// index.js - Versión Hiper Mega Pro
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = "publicidad123"; // el mismo en Meta
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✨ Función para simular typing antes de responder
async function sendTyping(sender) {
  await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: sender },
      sender_action: "typing_on",
    }),
  });
}

// ✨ Función para enviar mensaje de texto
async function sendMessage(sender, text) {
  await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: sender },
      message: { text },
    }),
  });
}

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
      const webhookEvent = entry.messaging && entry.messaging[0];
      if (!webhookEvent) continue;

      const sender = webhookEvent.sender?.id;
      const text = webhookEvent.message?.text;

      if (sender && text) {
        try {
          console.log("📩 Mensaje recibido:", text);

          // Simula typing antes de contestar
          await sendTyping(sender);

          // Consulta a OpenAI con Prompt Maestro PRO
          const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                  content: `
Eres el Asistente Comercial Hiper PRO de CV Canada Immigration. 
Hablas en español neutro y en inglés. Tu misión: vender 24/7 como el mejor closer del mundo. 
Nunca des asesoría legal personalizada, pero siempre recuerda: 
👉 "Un RCIC revisa documentos y envía la aplicación."

🎯 Estrategia:
- Haz preguntas cortas para entender: ¿turismo, trabajo, estudio, inversión?
- Ofrece servicios inmediatos con links directos:
  - CV + Carta (160 CAD) → https://bit.ly/3Cf8Py1
  - Coaching RH 45min (120 CAD) → https://calendly.com/agiglobal/45min?month=2025-09
  - Visa Turista (1,000 CAD → HOY 500 CAD) → https://bit.ly/4my8dJC
- Para permisos de estudio, trabajo, inversión o residencia: 
  siempre vender primero asesoría con RCIC:
  - Asesoría 30min (120 CAD) / 1h (190 CAD) → https://bit.ly/3R5l4nr
- Usa empatía + emojis moderados 😃🙌.
- Divide respuestas largas en mensajes cortos.
- Siempre cierra con opciones A/B:
  "👉 ¿Quieres empezar con tu CV + Carta, o prefieres agendar tu asesoría RCIC ahora mismo?"

Nunca dejes ir a un cliente sin CTA. Refuerza urgencia: 
"Si lo contratas hoy mismo aseguramos tu lugar y arrancamos de inmediato."
                  `,
                },
                { role: "user", content: text },
              ],
            }),
          }).then((r) => r.json());

          let reply =
            gptResponse.choices?.[0]?.message?.content ||
            "Lo siento, no entendí tu mensaje.";

          console.log("🤖 Respuesta generada:", reply);

          // Divide la respuesta en fragmentos para que se vea más humano
          const parts = reply.match(/.{1,250}(\s|$)/g); // corta cada 250 caracteres
          for (const part of parts) {
            await sendTyping(sender); // simula que escribe
            await new Promise((r) => setTimeout(r, 1500)); // espera 1.5s
            await sendMessage(sender, part.trim());
          }
        } catch (error) {
          console.error("❌ Error procesando mensaje:", error);
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot PRO corriendo en puerto ${PORT}`));
