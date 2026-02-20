import OpenAI from "openai";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

// Use a model that exists on most API accounts (gpt-4 is often unavailable)
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

type SimpleMessage = { role: "user" | "assistant" | "system"; content: string };

function getMessageText(msg: unknown): string {
  if (!msg || typeof msg !== "object") return "";
  const m = msg as Record<string, unknown>;
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.parts)) {
    return (m.parts as Array<{ type?: string; text?: unknown }>)
      .filter((p) => p.type === "text")
      .map((p) => (typeof p.text === "string" ? p.text : typeof p.text === "object" && p.text !== null && "text" in (p.text as object) ? String((p.text as { text: unknown }).text) : ""))
      .join("");
  }
  return "";
}

/** Normalize client messages to simple { role, content } so we avoid Zod errors from UI/parts shape. */
function toSimpleModelMessages(messages: unknown[]): SimpleMessage[] {
  const out: SimpleMessage[] = [];
  const allowedRoles = new Set(["user", "assistant", "system"]);
  for (const msg of messages ?? []) {
    if (!msg || typeof msg !== "object") continue;
    const m = msg as Record<string, unknown>;
    const role = typeof m.role === "string" && allowedRoles.has(m.role) ? m.role as "user" | "assistant" | "system" : null;
    if (!role) continue;
    const content = getMessageText(msg);
    if (content.trim()) out.push({ role, content });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = getMessageText((messages ?? [])[(messages ?? []).length - 1]) || " ";
    let docContext = "";
    const embedding = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });
    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding.data[0].embedding,
        },
        limit: 10,
      });
      const documents = await cursor.toArray();
      const docsMap = documents?.map((doc) => doc.text);
      docContext = JSON.stringify(docsMap);
    } catch (error) {
      console.log(error);
      docContext = "";
    }

    const systemPrompt = `You are an AI assistant who knows everything about Formula One. 
        Use the below context to augment what you know about Formula One racing. 
        The context will provide you with the most recent page data from wikipedia, 
        the official F1 website and others. 

        If the context doesn't include the information you need answer based on your 
        existing knowledge and don't mention the source of your information or 
        what the context does or doesn't include. 

        Format responses using markdown where applicable and don't return 
        images. 
        --------
        START CONTEXT
        ${docContext} 
        END CONTEXT
        --------`;

    const modelMessages = toSimpleModelMessages(messages ?? []);

    const result = streamText({
      model: openai(CHAT_MODEL),
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : null;
    const openaiError =
      error &&
      typeof error === "object" &&
      "error" in error &&
      (error as { error: unknown }).error &&
      typeof (error as { error: Record<string, unknown> }).error === "object"
        ? (error as { error: { message?: string; type?: string } }).error
        : null;
    console.error("[chat] OpenAI error:", openaiError ?? message ?? error);
    return new Response(
      openaiError?.message ?? message ?? "Internal error",
      { status: 500 }
    );
  }
}
