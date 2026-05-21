import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Env } from "../../config/env.js";
import { AI_PROMPTS } from "./prompts.js";
import type { ReviewLLMResult } from "./types.js";
import { BadRequestError } from "../../utils/errors.js";
import { parseJsonResponse } from "../../utils/parseJsonResponse.js";

export class GeminiService {
  private client: GoogleGenerativeAI | null;

  constructor(private env: Env) {
    this.client = env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(env.GEMINI_API_KEY)
      : null;
  }

  private requireClient(): GoogleGenerativeAI {
    if (!this.client) {
      throw new BadRequestError(
        "Gemini API key is not configured. Set GEMINI_API_KEY in your environment."
      );
    }
    return this.client;
  }

  async generateReview(context: string): Promise<ReviewLLMResult> {
    const client = this.requireClient();
    const model = client.getGenerativeModel({
      model: this.env.GEMINI_MODEL,
      systemInstruction: AI_PROMPTS.systemReview,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(AI_PROMPTS.reviewTemplate(context));
    const text = result.response.text();

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return parseJsonResponse<ReviewLLMResult>(text);
  }

  async chat(context: string, question: string, history: string): Promise<string> {
    try {
      const client = this.requireClient();
      const model = client.getGenerativeModel({
        model: this.env.GEMINI_MODEL,
        systemInstruction: AI_PROMPTS.chatSystem,
        generationConfig: {
          temperature: 0.4,
        },
      });

      const result = await model.generateContent(
        AI_PROMPTS.chatUser(context, question, history)
      );

      const response = result.response;
      const text = response.text();
      if (text) return text;

      const blockReason = response.candidates?.[0]?.finishReason;
      throw new Error(
        blockReason
          ? `Gemini blocked the response (${blockReason}). Try a shorter question.`
          : "Gemini returned an empty response."
      );
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      const message = error instanceof Error ? error.message : "Gemini request failed";
      throw new Error(`Chat failed: ${message}`);
    }
  }
}
