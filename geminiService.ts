
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-3-flash-preview';

export interface GroundingSource {
  title: string;
  uri: string;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private history: any[] = [];
  private systemInstruction: string = '';

  constructor() {
    // Correct initialization: always use named parameter and direct process.env access.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  initChat(userName: string) {
    this.systemInstruction = `You are IETE Bot, a world-class AI Engineering Mentor for students of The Institution of Electronics and Telecommunication Engineers (IETE). 

    STRUCTURAL DATA RULES:
    - ALWAYS use Markdown Tables for technical specs, pinouts, and comparisons.
    - Ensure tables are clean and correctly formatted for GFM.

    MATHEMATICAL RENDERING RULES:
    - Use LaTeX for ALL mathematical formulas.
    - Inline: $E = mc^2$.
    - Block: 
      $$
      V = I \times R
      $$
    - Use proper engineering symbols (e.g., \\Omega for Ohms).

    STUDENT-CENTRIC PROTOCOLS:
    1. EXTRACT TEXT: Flawless OCR for handwritten notes.
    2. PROBLEM SOLVER: Step-by-step mathematical derivations.
    3. VIVA PREP: Generate technical interview questions.
    4. DATASHEET: Summarize pinouts in tables.
    5. EXPLAIN CODE: Line-by-line analysis in code blocks.

    TONE & STYLE:
    - Mentor-like, technically rigorous, and encouraging.
    - Address user as ${userName}.
    - Use clear Markdown headings and lists.`;
    
    this.history = [];
  }

  async sendMessageStream(message: string, mediaData?: { data: string; mimeType: string }) {
    if (!process.env.API_KEY) {
      throw new Error("Configuration Error: API Key not found. Please set API_KEY in your Vercel project settings.");
    }

    const userParts: any[] = [{ text: message }];
    
    if (mediaData) {
      userParts.push({
        inlineData: {
          data: mediaData.data,
          mimeType: mediaData.mimeType
        }
      });
    }

    const contents = [
      ...this.history,
      { role: 'user', parts: userParts }
    ];

    try {
      // Use generateContentStream with googleSearch tool enabled.
      const response = await this.ai.models.generateContentStream({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction: this.systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: 0.4, 
        },
      });
      return response;
    } catch (error: any) {
      if (error.message?.includes('429')) {
        throw new Error("Neural cores throttled (Rate Limit). Please wait 60s.");
      }
      throw new Error(`Technical Fault: ${error.message || "Unknown processing error"}`);
    }
  }

  updateHistory(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts });
  }
}

export const geminiService = new GeminiService();
