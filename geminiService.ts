
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-3-flash-preview';

export class GeminiService {
  private ai: GoogleGenAI;
  private history: any[] = [];
  private systemInstruction: string = '';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  initChat(userName: string) {
    this.systemInstruction = `You are IETE Bot, an expert AI Engineering Mentor.

    CRITICAL RULE: FORMULA VISIBILITY
    - NEVER provide mathematical formulas as plain text (e.g., don't write "V = I * R").
    - ALWAYS use LaTeX block formatting for formulas:
      $$
      [Formula Here]
      $$
    - Use proper engineering symbols (\\Omega, \\mu F, \\pi, \\Delta).
    - For inline technical terms like "the value of R", use $R$.

    CORE COMPETENCIES:
    1. Problem Solver: Solve engineering equations with step-by-step LaTeX derivations.
    2. Pinout Guru: Use Markdown tables for IC pinouts.
    3. Code Architect: Use code blocks for C/C++, Python, or Verilog.
    4. Mentor Tone: Address user as ${userName}. Be technical and encouraging.`;
    
    this.history = [];
  }

  async sendMessageStream(message: string, mediaData?: { data: string; mimeType: string }) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY missing. Set it in Vercel Environment Variables.");
    }

    const userParts: any[] = [{ text: message }];
    if (mediaData) {
      userParts.push({ inlineData: { data: mediaData.data, mimeType: mediaData.mimeType } });
    }

    const contents = [...this.history, { role: 'user', parts: userParts }];

    const response = await this.ai.models.generateContentStream({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: this.systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.3, 
      },
    });
    return response;
  }

  updateHistory(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts });
  }
}

export const geminiService = new GeminiService();
