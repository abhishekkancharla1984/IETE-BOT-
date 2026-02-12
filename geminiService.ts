import { GoogleGenAI } from "@google/genai";

/**
 * MODELS SELECTION:
 * We use 'gemini-flash-lite-latest' for the fastest possible text processing.
 * Nano banana series for images.
 */
const TEXT_MODEL = 'gemini-flash-lite-latest';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export interface SendMessageOptions {
  useSearch?: boolean;
}

export class GeminiService {
  private history: any[] = [];
  private systemInstruction: string = '';

  constructor() {}

  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Missing API_KEY. Access restricted.");
    }
    return new GoogleGenAI({ apiKey });
  }

  initChat(userName: string) {
    this.systemInstruction = `Role: IETE Bot (Official Terminal).
Institution: Raghu Engineering College.
User: ${userName}.

Operational Logic:
1. SEARCH MODE ON: You are a general-purpose AI with real-time access. Provide up-to-date news, current affairs, and general knowledge. Use the googleSearch tool for EVERY query to ensure the latest 2024-2025 info.
2. SEARCH MODE OFF: You are a specialized Engineering Assistant. Focus strictly on Electronics, Telecom, IT, VLSI, and Institutional data. Use your internal knowledge.
3. BE CONCISE. Speed is the priority.
4. Use LaTeX for math: $$ [Formula] $$.
5. Identify as "IETE Bot".`;
    
    this.history = [];
  }

  async sendMessageStream(
    message: string, 
    mediaData?: { data: string; mimeType: string }, 
    options: SendMessageOptions = {}
  ) {
    const ai = this.getAI();
    const userParts: any[] = [{ text: message }];
    
    if (mediaData?.data && mediaData?.mimeType) {
      userParts.push({ 
        inlineData: { 
          data: mediaData.data, 
          mimeType: mediaData.mimeType 
        } 
      });
    }

    const contents = [...this.history, { role: 'user', parts: userParts }];

    const config: any = {
      systemInstruction: this.systemInstruction,
      tools: options.useSearch ? [{ googleSearch: {} }] : undefined,
    };

    return await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents,
      config,
    });
  }

  async generateImage(prompt: string) {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { 
          parts: [{ text: `Professional engineering blueprint/schematic: ${prompt}. IEEE standard symbols, clean look.` }] 
        },
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            return {
              data: part.inlineData.data as string,
              mimeType: part.inlineData.mimeType || 'image/png'
            };
          }
        }
      }
    } catch (e) {
      console.error("Visualizer failure:", e);
    }
    return null;
  }

  updateHistory(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts });
    if (this.history.length > 8) this.history.shift(); 
  }
}

export const geminiService = new GeminiService();