
import { GoogleGenAI } from "@google/genai";

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private history: any[] = [];
  private systemInstruction: string = '';

  constructor() {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private getAI() {
    if (!this.ai) {
      if (!process.env.API_KEY) {
        throw new Error("Missing API Key. Please configure the environment variables.");
      }
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return this.ai;
  }

  initChat(userName: string) {
    this.systemInstruction = `You are IETE Bot, the official Professional Engineering AI for The Institution of Electronics and Telecommunication Engineers.

    STRICT RULES ON IDENTITY:
    - NEVER mention your model name, version, or creator.
    - If asked who you are, say: "I am IETE Bot, your professional engineering assistant."

    RESPONSE EFFICIENCY:
    - Provide accurate, technical, and high-quality engineering responses.
    - Prioritize clarity and technical depth without unnecessary verbosity. 
    - For technical queries, include:
      1. A concise conceptual overview.
      2. Relevant mathematical formulas in LaTeX: $$ [Formula] $$
      3. Practical engineering insights or use cases.
    
    FORMATTING:
    - Use Markdown headers (###) for structure.
    - Use bold text for key terms.
    - Use code blocks for programming or HDL code.

    Tone: Professional, institutional, and precise. Address the user as ${userName}.`;
    
    this.history = [];
  }

  async sendMessageStream(message: string, mediaData?: { data: string; mimeType: string }) {
    const ai = this.getAI();
    const userParts: any[] = [{ text: message }];
    if (mediaData) {
      userParts.push({ inlineData: { data: mediaData.data, mimeType: mediaData.mimeType } });
    }

    const contents = [...this.history, { role: 'user', parts: userParts }];

    return await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents,
      config: {
        systemInstruction: this.systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });
  }

  async generateTechnicalImage(prompt: string) {
    const ai = this.getAI();
    const enhancedPrompt = `A high-resolution technical engineering schematic of: ${prompt}. 
    Style: Blueprint, professional labeling, electronics/telecom accuracy.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: enhancedPrompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
          return {
            data: part.inlineData.data as string,
            mimeType: part.inlineData.mimeType as string
          };
        }
      }
    }
    return null;
  }

  updateHistory(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts });
    if (this.history.length > 20) this.history.shift();
  }
}

export const geminiService = new GeminiService();
