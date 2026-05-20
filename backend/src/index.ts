import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { loadEnv } from "./config/env.js";
import { createContainer } from "./services/container.js";
import { createApp } from "./app.js";

// Load root .env first, then backend/.env (backend wins)
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const env = loadEnv();
const container = createContainer(env);
const app = createApp(env, container);

const server = createServer(app);
server.requestTimeout = 120_000;
server.headersTimeout = 125_000;

server.listen(env.PORT, () => {
  console.log(`PR Review API running on http://localhost:${env.PORT}`);
  console.log(
    env.GEMINI_API_KEY
      ? `Gemini: configured (model: ${env.GEMINI_MODEL})`
      : "Gemini: NOT configured — set GEMINI_API_KEY in backend/.env"
  );
});
