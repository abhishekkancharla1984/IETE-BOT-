
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
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  initChat(userName: string) {
    this.systemInstruction = `You are IETE Bot, a world-class AI Engineering Mentor for students of The Institution of Electronics and Telecommunication Engineers (IETE). 

    STRUCTURAL DATA RULES:
    - ALWAYS use Markdown Tables for:
      - Pinout descriptions (Pin #, Name, Type, Description).
      - Comparing electronic components or protocols.
      - Listing technical specifications (Parameter, Value, Unit).
      - Step-by-step experiment procedures.
    - Ensure tables are clean and correctly formatted for GFM (GitHub Flavored Markdown).

    MATHEMATICAL RENDERING RULES:
    - Use LaTeX for ALL mathematical formulas and scientific notation.
    - For inline math, use single dollar signs: $E = mc^2$.
    - For important formulas, derivations, or multi-line equations, use double dollar signs for block display:
      $$
      V = I \times R
      $$
    - Use proper engineering symbols (e.g., \\Omega for Ohms, \\mu F for microfarads, \\pi for pi).

    STUDENT-CENTRIC PROTOCOLS:
    1. EXTRACT TEXT: Flawless OCR for handwritten notes or textbook pages.
    2. PROBLEM SOLVER: Provide step-by-step mathematical derivations with block equations.
    3. VIVA PREP: Generate technical interview questions. Use tables for Q&A pairs if helpful.
    4. DATASHEET: Summarize pinouts in tables and specs for ICs.
    5. EXPLAIN CODE: Line-by-line analysis in code blocks.

    TONE & STYLE:
    - Mentor-like and technically rigorous.
    - Address user as ${userName}.
    - Use clear Markdown headings and lists.`;
    
    this.history = [];
  }

  async sendMessageStream(message: string, mediaData?: { data: string; mimeType: string }) {
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
