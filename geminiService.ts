import { GoogleGenAI } from "@google/genai";

const TEXT_MODEL = 'gemini-flash-lite-latest';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export class GeminiService {
  private history: any[] = [];
  private systemInstruction: string = '';

  constructor() {}

  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Missing API_KEY. Ensure it is set in Vercel Environment Variables.");
    }
    return new GoogleGenAI({ apiKey });
  }

  initChat(userName: string) {
    this.systemInstruction = `Role: IETE Bot (Official Engineering Terminal).
User: ${userName}.
Domain: ECE, Telecommunication, IT, and Allied Engineering.

Response Protocol:
1. Use LaTeX for ALL math/formulas: $$ [Formula] $$.
2. For "Step-by-Step", use numbered lists with clear physical justifications.
3. For "Direct Answer", provide only the core fact/value (no intro/outro).
4. Strictly follow IEEE standards and GATE syllabus.
5. Identify as IETE Bot; never mention Google or specific LLM names.`;
    
    this.history = [];
  }

  async sendMessageStream(message: string, mediaData?: { data: string; mimeType: string }, useSearch: boolean = false) {
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

    return await ai.models.generateContentStream({
      model: TEXT_MODEL,
      contents,
      config: {
        systemInstruction: this.systemInstruction,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        temperature: 0.2, // Low temperature for engineering accuracy
        maxOutputTokens: 2000,
      },
    });
  }

  async generateTechnicalImage(prompt: string) {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { 
          parts: [{ text: `Professional technical schematic blueprint of: ${prompt}. High contrast, white background, standard engineering symbols, clear labels.` }] 
        },
        config: {
          imageConfig: { aspectRatio: "16:9" }
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
      console.error("Visualizer failed:", e);
    }
    return null;
  }

  updateHistory(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts });
    if (this.history.length > 10) this.history.shift(); // Prevent token overflow
  }
}

export const geminiService = new GeminiService();