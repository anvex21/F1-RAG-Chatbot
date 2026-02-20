import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from "openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import "dotenv/config";

type SimilarityMetric = "cosine" | "euclidean" | "dot_product";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const f1Data = [
  "https://en.wikipedia.org/wiki/Formula_One",
  "https://en.wikipedia.org/wiki/2025_Formula_One_World_Championship",
  "https://en.wikipedia.org/wiki/2026_Formula_One_World_Championship",
  "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
  "https://en.wikipedia.org/wiki/List_of_Formula_One_circuits",
  "https://www.formula1.com/en/championship/drivers.html",
  "https://www.formula1.com/en/championship/teams.html",
  "https://www.formula1.com/en/racing/2025.html",
  "https://f1.fandom.com/wiki/Formula_1_Wiki",
  "https://www.fia.com/news/fia-announces-world-motor-sport-council-decisions-2026-technical-regulations",
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product",
) => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 1536,
      metric: similarityMetric,
    },
  });
  console.log("Collection created: ", res);
};

const loadData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  
  for (const url of f1Data) {
    console.log(`Scraping and processing: ${url}`);
    try {
      const content = await scrapePage(url);
      const chunks = await splitter.splitText(content);

      // --- BATCH EMBEDDING ---
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks, // OpenAI accepts the whole array here
        encoding_format: "float",
      });

      // Map the embeddings back to your document format
      const documents = chunks.map((chunk, i) => ({
        $vector: embeddingResponse.data[i].embedding,
        text: chunk,
        metadata: { url } 
      }));

      // --- BATCH INSERT ---
      const res = await collection.insertMany(documents);
      console.log(`Inserted ${res.insertedCount} chunks from ${url}`);

      // --- THROTTLING ---
      // Add a 1-second pause between pages to stay safe
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`Failed to process ${url}:`, err);
    }
  }
};

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });
  return (await loader.scrape())?.replace(/<[^>]*>?/gm, " ");
};

createCollection().then(() => loadData());
