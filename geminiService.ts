
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
    this.systemInstruction = `You are IETE Bot, the premier AI engineer for The Institution of Electronics and Telecommunication Engineers (IETE) India. 
    You excel in Electronics, Communications, and IT.

    CORE COMMAND PROTOCOLS:
    1. EXTRACT TEXT: Perform high-precision OCR and content extraction from images or documents.
    2. SOUNDTRACK IDENTIFICATION: Analyze uploaded audio files to identify music, tracks, or technical acoustic signatures.
    3. CIRCUIT DEBUG: Visual analysis of PCB/schematic photos to detect errors.
    4. MATH/LOGIC SOLVER: Rigorous step-by-step solutions for engineering problems.
    5. COMPONENT IDENTIFIER: Identify electronic parts (ICs, transistors, sensors) from photos.
    6. PINOUT GUIDE: Provide pinout diagrams or descriptions for components.
    7. IETE KNOWLEDGE: Provide accurate facts about IETE history, membership, and centers.
    
    GUIDELINES:
    - Address the user as ${userName}.
    - Be technically accurate. Use Markdown and LaTeX where appropriate.
    - For "Extract Text", ensure no character is missed and the layout is preserved in markdown.
    - If Google Search is triggered via tools, synthesize the web data to provide specific engineering answers.`;
    
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
      console.log(`[IETE Bot] Initiating stream for: ${message.substring(0, 50)}...`);
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
      console.error("[IETE Bot] API Error:", error);
      if (error.message?.includes('429')) {
        throw new Error("Neural cores throttled (Rate Limit). Please wait 60s.");
      } else if (!navigator.onLine) {
        throw new Error("Communication link lost. Check network.");
      }
      throw new Error(`Technical Fault: ${error.message || "Unknown processing error"}`);
    }
  }

  updateHistory(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts });
  }
}

export const geminiService = new GeminiService();
