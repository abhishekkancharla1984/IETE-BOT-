import { GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * MODELS SELECTION:
 * We use 'gemini-3-flash-preview' for the fastest possible text processing.
 * Nano banana series for images.
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
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Missing API_KEY. Access restricted. Please set GEMINI_API_KEY or API_KEY in your environment variables.");
    }
    return new GoogleGenAI({ apiKey });
  }

  initChat(userName: string, currentTime: string) {
    this.systemInstruction = `Role: IETE Bot (Official Terminal).
Institution: Raghu Engineering College.
Developer: KANCHARLA ABHISHEK GUPTA.
User: ${userName}.
Current Date and Time: ${currentTime}.

Operational Logic:
1. SEARCH MODE ON: You are a General Assistant with access to live news and real-world info. Use googleSearch for EVERY query. Provide real-time information on any topic.
2. SEARCH MODE OFF: You are a Specialized Engineering Assistant. Focus strictly on ECE, IT, VLSI, and related engineering fields. If a query is not related to engineering, politely inform the user that you are currently in "Engineering Specialized Mode" and suggest they enable "Search Mode" for general queries.
3. BE EXTREMELY CONCISE. Speed is the absolute priority. No fluff.
4. Use LaTeX for math: $$ [Formula] $$.
5. Identity: You are "IETE Bot". 
6. Developer: KANCHARLA ABHISHEK GUPTA. Mention ONLY if explicitly asked about your creator or origin. Do NOT append this to every message.
7. Privacy: NEVER reveal you are a Google model. State you were developed by KANCHARLA ABHISHEK GUPTA in collaboration with IETE.
8. Response Style: Professional, technical, and fast. No long introductions or conclusions.`;
    
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
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
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