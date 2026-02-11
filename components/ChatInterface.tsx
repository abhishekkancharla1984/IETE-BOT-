import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { UserProfile, Message } from '../types';
import { geminiService } from '../geminiService';

interface ChatInterfaceProps { user: UserProfile; }

type ToolkitAction = 
  | 'extract' | 'solve' | 'debug' | 'visualize' 
  | 'viva' | 'code' | 'formula' | 'project' | 'pinout'
  | 'datasheet' | 'simulation' | 'research' | 'examprep' | 'units'
  | 'boolean' | 'hdl' | 'transform' | 'analog' | 'modulation' | 'rf'
  | 'gate_pyq' | 'control_sys' | 'micro_c';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ data: string; mimeType: string } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const BOT_LOGO = "https://jit.ac.in/assets/uploads/2022/12/IETE-logo.png";

  useEffect(() => {
    const getGreeting = () => {
      const h = new Date().getHours();
      return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    };

    const initialId = 'init-' + Date.now();
    setMessages([{ id: initialId, role: 'assistant', content: '', timestamp: new Date() }]);
    geminiService.initChat(user.name);

    if (!process.env.API_KEY) {
      setConfigError("API KEY NOT FOUND: Check Vercel environment variables.");
    }

    const welcome = `Terminal authenticated. Hello, ${user.name}. IETE Bot v4.0 is active. Core ECE modules and Signal analysis tools are pre-loaded below.`;
    let current = "";
    const words = welcome.split(" ");
    let i = 0;
    
    setIsTyping(true);
    const interval = setInterval(() => {
      if (i < words.length) {
        current += (i === 0 ? "" : " ") + words[i];
        setMessages(prev => prev.map(m => m.id === initialId ? { ...m, content: current } : m));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [user.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, isTyping]);

  const handleActionClick = async (type: ToolkitAction) => {
    if (isLoading || isTyping) return;
    let context = input.trim();
    
    if (type === 'visualize') {
      const topic = context || prompt("Diagram Subject (e.g., PCM Transmitter):");
      if (topic) await processVisualizer(topic);
      return;
    }

    if (type === 'extract' && !selectedMedia) {
       fileInputRef.current?.click();
       return;
    }

    if (!context && !selectedMedia) {
       context = prompt(`Engineering context for ${type.replace('_', ' ').toUpperCase()}:`) || "";
       if (!context) return;
    }

    executeTool(type, selectedMedia || undefined, context);
  };

  const processVisualizer = async (topic: string) => {
    setIsLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, 
      { id: Date.now().toString(), role: 'user', content: `Schematic Request: ${topic}`, timestamp: new Date() },
      { id: assistantId, role: 'assistant', content: `Compiling blueprint...`, timestamp: new Date() }
    ]);

    try {
      const result = await geminiService.generateTechnicalImage(topic);
      if (result) {
        setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { 
          ...msg, content: `Institutional Schematic for **${topic}** compiled.`, 
          image: { data: result.data, mimeType: result.mimeType } 
        } : msg));
      } else {
        throw new Error("Generation timed out.");
      }
    } catch (e: any) {
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Error: ${e.message}` } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const executeTool = async (type: ToolkitAction, media?: { data: string; mimeType: string }, customText?: string) => {
    let promptText = "";
    const subject = customText || "";
    const useSearch = ['research', 'gate_pyq', 'datasheet'].includes(type);

    switch(type) {
      case 'modulation': promptText = `Communication Analysis: Explain ${subject} modulation. Calculate BW, SNR, and draw the constellation mapping in text.`; break;
      case 'control_sys': promptText = `Control Systems: For the transfer function ${subject}, find Stability, Poles/Zeros, and determine the Routh-Hurwitz criteria.`; break;
      case 'micro_c': promptText = `Embedded Systems: Write production-ready Embedded C for ${subject}. Target: 8051 or Arduino.`; break;
      case 'transform': promptText = `Signal Analysis: Solve ${subject} using Laplace/Z-Transform. Provide ROC.`; break;
      case 'extract': promptText = `ECE OCR: Identify all components and values in this image. Output a formal BOM table.`; break;
      case 'gate_pyq': promptText = `GATE ECE Exam: Provide previous year analysis for ${subject} with solution shortcuts.`; break;
      default: promptText = `Perform professional engineering analysis on: ${subject}`;
    }

    setSelectedMedia(null);
    setInput('');
    await processMessage(promptText, media, useSearch);
  };

  const processMessage = async (text: string, media?: { data: string; mimeType: string }, useSearch: boolean = false) => {
    if (isLoading || isTyping) return;
    setIsLoading(true);
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date(), image: media };
    setMessages(prev => [...prev, userMsg]);
    
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      let fullContent = '';
      const stream = await geminiService.sendMessageStream(text, media, useSearch);
      
      for await (const chunk of stream) {
        fullContent += chunk.text || "";
        const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const newSources = grounding?.map((c: any) => ({
          title: c.web?.title || 'Engineering Resource',
          uri: c.web?.uri || ''
        })).filter((s: any) => s.uri);

        setMessages(prev => prev.map((msg: Message): Message => 
          msg.id === assistantId ? { 
            ...msg, 
            content: fullContent,
            sources: newSources?.length ? newSources : msg.sources
          } : msg
        ));
      }
      geminiService.updateHistory('user', [{ text }, ...(media ? [{ inlineData: media }] : [])]);
      geminiService.updateHistory('model', [{ text: fullContent }]);
    } catch (error: any) {
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Link Failure: ${error.message}` } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedMedia) || isLoading || isTyping) return;
    const txt = input;
    const media = selectedMedia;
    setInput('');
    setSelectedMedia(null);
    processMessage(txt, media || undefined);
  };

  return (
    <div className="flex-1 flex flex-col theme-glass-card rounded-[2rem] overflow-hidden h-[calc(100vh-180px)] relative">
      {configError && <div className="bg-red-600/90 text-white text-[9px] py-1 text-center font-bold absolute top-0 w-full z-50 animate-pulse">{configError}</div>}
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 chat-blueprint relative">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-white border border-black/10 shadow-sm overflow-hidden p-0.5">
                {msg.role === 'user' ? <span className="font-black text-blue-900 text-sm">{user.name[0]}</span> : <img src={BOT_LOGO} className="w-full h-full object-contain" alt="IETE" />}
              </div>
              <div className="flex flex-col gap-2">
                <div className={`rounded-2xl px-5 py-3.5 shadow-md border backdrop-blur-md ${msg.role === 'user' ? 'bg-blue-900 text-white border-blue-800' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-color)]'}`}>
                  <div className="markdown-body prose prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                      {msg.sources.map((s, i) => <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-blue-500/10 px-2 py-1 rounded text-blue-400 font-bold hover:brightness-125 transition-all">{s.title}</a>)}
                    </div>
                  )}
                </div>
                {msg.image && (
                  <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-white/5 p-1 shadow-xl">
                    <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto max-h-[400px] object-contain rounded-lg" alt="Analysis" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 md:p-6 bg-[var(--header-bg)] border-t border-[var(--border-color)] z-20">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[8px] font-black bg-blue-900 px-2 py-1 rounded text-white tracking-tighter">ECE TOOLS</span>
            {[
              { id: 'modulation', label: 'Modulation', icon: '📡' },
              { id: 'control_sys', label: 'Control Systems', icon: '🌀' },
              { id: 'micro_c', label: 'Embedded C', icon: '💻' },
              { id: 'transform', label: 'Transforms', icon: '📈' },
              { id: 'gate_pyq', label: 'GATE ECE', icon: '🎓' },
              { id: 'extract', label: 'BOM Extractor', icon: '📑' },
              { id: 'visualize', label: 'Diagram Gen', icon: '🎨' },
            ].map(t => (
              <button key={t.id} onClick={() => handleActionClick(t.id as ToolkitAction)} className="flex items-center gap-2 px-3 py-2 bg-[var(--input-bg)] rounded-xl border border-[var(--border-color)] text-[9px] font-black uppercase tracking-widest hover:border-blue-500 transition-all shadow-sm whitespace-nowrap active:scale-95">
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {selectedMedia && (
          <div className="mb-4 flex items-center gap-3 p-2 bg-blue-500/5 rounded-xl border border-blue-500/20 animate-in slide-in-from-left-2">
            <div className="relative group">
              <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-14 w-14 rounded-lg object-cover border-2 border-blue-500" alt="Buffer" />
              <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Image Attached for Analysis</p>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 max-w-5xl mx-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const b64 = (reader.result as string).split(',')[1];
                setSelectedMedia({ data: b64, mimeType: file.type });
              };
              reader.readAsDataURL(file);
            }
          }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-blue-500 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value.slice(0, 4000))}
            placeholder="Type technical query..."
            className="flex-1 px-5 py-3.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-blue-900/50 text-sm transition-all"
            disabled={isLoading || isTyping}
          />
          <button type="submit" disabled={isLoading || isTyping || (!input.trim() && !selectedMedia)} className="px-8 py-3.5 bg-gradient-to-br from-blue-700 to-blue-950 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-95 disabled:opacity-20 flex items-center justify-center min-w-[120px]">
            {isLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" /> : "TRANSMIT"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;