
import { GoogleGenAI } from "@google/genai";

// Using 'gemini-3-pro-preview' for complex engineering reasoning, advanced math, and STEM tasks as recommended.
const TEXT_MODEL = 'gemini-3-pro-preview';
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
    this.systemInstruction = `Role: IETE Bot (Official Institutional Terminal for Electronics, Telecommunication, and IT Engineers).
User: ${userName}.
Domain Expertise: ECE, EEE, CSE, IT, VLSI, Signal Processing, Embedded Systems, AI/ML, and Robotics.

Operational Protocols for the Engineering Toolkit:
1. **Extract Text/Formula**: Digitization module. OCR images of notes/textbooks. Output all formulas in standalone LaTeX blocks: $$ [Formula] $$.
2. **Step-by-Step Solution**: Provide modular, high-resolution derivations. Break problems into: Given Data, Principles, Substitution, and Inference.
3. **Direct Solution**: Final result/fact only. Zero preamble.
4. **Circuit Debug**: Analyze descriptions or images for logic errors, bias issues, or signal integrity problems.
5. **Logic Designer (K-Map)**: Simplify Boolean expressions using K-Maps or Quine-McCluskey. Provide truth tables.
6. **Project Blueprint**: Generate abstracts, component lists, cost estimates, and block diagrams for engineering projects.
7. **HDL Architect**: Optimized Verilog/VHDL code with testbenches and timing constraints.
8. **Pinout Guru**: Provide standard pin configurations for popular ICs (74 series, 555, Op-Amps, MCUs).
9. **Institutional Research**: Access GATE PYQs (GATE Previous Year Questions), Datasheets, and ITU/IEEE Standards.

Formatting Standards:
- ALL mathematical formulas MUST use LaTeX: $$ [Formula] $$.
- strictly follow IEEE standards and the latest GATE syllabus.
- Identify solely as "IETE Bot". Do not mention Google or other AI models.`;
    
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

    // Correct implementation of generateContentStream following the latest SDK standards.
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
          parts: [{ text: `Professional engineering schematic, circuit diagram, or institutional blueprint of: ${prompt}. Use IEEE standard symbols, clean white background, high-contrast black lines, professional annotations.` }] 
        },
        config: {
          imageConfig: { 
            aspectRatio: "1:1"
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        // Iterate through parts to find the image part as recommended for nano banana series models.
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
    if (this.history.length > 10) this.history.shift();
  }
}

export const geminiService = new GeminiService();
