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
      throw new Error("API Configuration Missing: Please set the API_KEY.");
    }
    return new GoogleGenAI({ apiKey });
  }

  initChat(userName: string) {
    this.systemInstruction = `Identity: IETE Bot (Official Engineering AI).
User: ${userName}.
Task: Professional ECE/Telecom/IT assistance.
Rules:
1. No mention of creators/models.
2. Use LaTeX for ALL math: $$ [Formula] $$.
3. Provide step-by-step logic.
4. Concision is mandatory. No fluff.
5. Prioritize IEEE standards and GATE syllabus accuracy.`;
    
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
        temperature: 0.3, // High precision
        maxOutputTokens: 1500, // Balanced for ECE reports
      },
    });
  }

  async generateTechnicalImage(prompt: string) {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { 
          parts: [{ text: `Professional engineering blueprint of: ${prompt}. Minimalist, black and white, standard circuit symbols, high-fidelity labels.` }] 
        },
        config: {
          imageConfig: { aspectRatio: "16:9" }
        }
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts;
      
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            return {
              data: part.inlineData.data as string,
              mimeType: part.inlineData.mimeType as string
            };
          }
        }
      }
    } catch (e) {
      console.error("Image gen failed", e);
    }
    return null;
  }

  updateHistory(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts });
    // Keep history lean (10 items) to prevent API "Payload Too Large" or "Token Limit" errors
    if (this.history.length > 10) {
      this.history.shift();
    }
  }
}

export const geminiService = new GeminiService();