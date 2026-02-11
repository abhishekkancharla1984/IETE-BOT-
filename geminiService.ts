import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-flash-lite-latest';

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

  initChat(userName: string) {
    this.systemInstruction = `You are IETE Bot, an expert AI Engineering Mentor.

    CRITICAL RULE: FORMULA VISIBILITY
    - NEVER provide mathematical formulas as plain text.
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
      throw new Error("Missing Gemini API Key. Go to Vercel Project Settings > Environment Variables and add API_KEY.");
    }

    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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