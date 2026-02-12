import { GoogleGenAI } from "@google/genai";

/**
 * MODELS SELECTION:
 * We use 'gemini-3-flash-preview' for ultra-fast latency.
 * Pro models are slower due to complex reasoning; Flash is optimized for speed.
 */
const TEXT_MODEL = 'gemini-3-flash-preview';
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
    this.systemInstruction = `Role: IETE Bot.
Institution: Raghu Engineering College.
User: ${userName}.
Capabilities: Expert in Engineering (Electronics, Telecom, IT) AND General Knowledge/Current Affairs.

Response Protocol:
1. BE FAST AND CONCISE. Users want quick answers.
2. If "Deep Research" is on, use search for 2024-2025 news/events.
3. Use LaTeX for math: $$ [Formula] $$.
4. Balance technical depth with general clarity.

Operational Rule: Respond ONLY to the specific query provided. Do not repeat instructions.`;
    
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

    /**
     * OPTIMIZATION FOR SPEED:
     * 1. Use gemini-3-flash-preview.
     * 2. Set thinkingBudget to 0 to disable thinking-related latency.
     */
    const config: any = {
      systemInstruction: this.systemInstruction,
      tools: options.useSearch ? [{ googleSearch: {} }] : undefined,
      thinkingConfig: { thinkingBudget: 0 } 
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
          parts: [{ text: `Professional engineering blueprint/schematic: ${prompt}. IEEE standard symbols, clean technical look.` }] 
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
    if (this.history.length > 10) this.history.shift(); // Keep history lean for speed
  }
}

export const geminiService = new GeminiService();