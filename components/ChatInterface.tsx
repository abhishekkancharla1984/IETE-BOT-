import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { UserProfile, Message } from '../types';
import { geminiService } from '../geminiService';

interface ChatInterfaceProps { user: UserProfile; }

type ToolkitAction = 
  | 'extract' | 'debug' | 'visualize' | 'boolean' | 'gate_pyq' 
  | 'direct' | 'step_by_step' | 'viva' | 'pinout' | 'hdl' | 'project' | 'datasheet' | 'formula_ocr';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ data: string; mimeType: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const BOT_LOGO = "https://jit.ac.in/assets/uploads/2022/12/IETE-logo.png";

  useEffect(() => {
    const getGreeting = () => {
      const h = new Date().getHours();
      if (h < 12) return "Good morning";
      if (h < 17) return "Good afternoon";
      return "Good evening";
    };

    const initialId = 'init-' + Date.now();
    setMessages([{ id: initialId, role: 'assistant', content: '', timestamp: new Date() }]);
    geminiService.initChat(user.name);

    const timeGreeting = getGreeting();
    const welcome = `Neural Link established. ${timeGreeting}, ${user.name}. All institutional engineering modules (Logic, Vision, Research) are now online. How may I assist your design or calculation today?`;
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
    }, 20);

    return () => clearInterval(interval);
  }, [user.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, isTyping]);

  const handleActionClick = async (type: ToolkitAction) => {
    if (isLoading || isTyping) return;
    
    // Tools that prioritize visual data (Camera Trigger)
    if ((type === 'formula_ocr' || type === 'debug' || type === 'extract') && !selectedMedia) {
       fileInputRef.current?.click();
       return;
    }

    let promptSuffix = "";
    let context = input.trim();

    switch(type) {
      case 'formula_ocr':
        promptSuffix = "OCR MODULE: Extract and digitize all technical text and mathematical formulas from the attached image. Use standalone LaTeX blocks for equations.";
        break;
      case 'step_by_step': 
        promptSuffix = "STEP-BY-STEP DERIVATION: Provide a comprehensive stage-by-stage solution for: " + context; 
        break;
      case 'direct': 
        promptSuffix = "DIRECT TECHNICAL FACT: Provide the final result/value only for: " + context; 
        break;
      case 'debug': 
        promptSuffix = "CIRCUIT DIAGNOSTIC: Analyze this visual feed or description for flaws: " + context; 
        break;
      case 'extract': 
        promptSuffix = "PARAMETER EXTRACTION: Tabulate all electrical and physical parameters found in: " + context; 
        break;
      case 'boolean': 
        promptSuffix = "LOGIC SIMPLIFICATION: Provide K-Map and simplified Boolean logic for: " + context; 
        break;
      case 'gate_pyq': 
        promptSuffix = "GATE PYQ SEARCH: Solve a relevant Graduate Aptitude Test in Engineering question for: " + context; 
        break;
      case 'pinout':
        promptSuffix = "IC PINOUT GURU: Provide the standard pinout and functional mapping for: " + context;
        break;
      case 'hdl':
        promptSuffix = "HDL ARCHITECT: Generate optimized Verilog/VHDL code and testbench for: " + context;
        break;
      case 'project':
        promptSuffix = "PROJECT BOT: Generate a full engineering project blueprint for: " + context;
        break;
      case 'datasheet':
        promptSuffix = "DATASHEET RESEARCH: Search and summarize key performance metrics for: " + context;
        break;
      case 'viva':
        promptSuffix = "VIVA PREP: Generate 5 high-level viva questions and answers for: " + context;
        break;
      case 'visualize':
        if (!context) {
          const topic = prompt("Enter Schematic Topic to Visualize:");
          if (topic) await processVisualizer(topic);
          return;
        }
        await processVisualizer(context);
        return;
      default:
        promptSuffix = context;
    }

    if (!context && !selectedMedia) {
       const userContext = prompt(`Enter ${type.toUpperCase().replace('_', ' ')} query:`) || "";
       if (!userContext) return;
       promptSuffix = promptSuffix.replace(context, userContext);
    }

    const useSearch = ['gate_pyq', 'datasheet', 'pinout'].includes(type);
    
    await processMessage(promptSuffix, selectedMedia || undefined, useSearch);
    setSelectedMedia(null);
    setInput('');
  };

  const processVisualizer = async (topic: string) => {
    setIsLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, 
      { id: Date.now().toString(), role: 'user', content: `Requesting Blueprint: ${topic}`, timestamp: new Date() },
      { id: assistantId, role: 'assistant', content: `Synthesizing institutional schematic...`, timestamp: new Date() }
    ]);

    try {
      const result = await geminiService.generateImage(topic);
      if (result) {
        setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { 
          ...msg, content: `Institutional blueprint for **${topic}** rendered.`, 
          image: { data: result.data, mimeType: result.mimeType } 
        } : msg));
      }
    } catch (e: any) {
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Visualization Failure: ${e.message}` } : msg));
    } finally {
      setIsLoading(false);
    }
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
      const stream = await geminiService.sendMessageStream(text, media, { useSearch });
      
      for await (const chunk of stream) {
        fullContent += chunk.text || "";
        const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const newSources = grounding?.map((c: any) => ({
          title: c.web?.title || 'Institutional Source',
          uri: c.web?.uri || ''
        })).filter((s: any) => s.uri);

        setMessages(prev => prev.map((msg: Message): Message => 
          msg.id === assistantId ? { 
            ...msg, 
            content: fullContent,
            sources: newSources?.length ? [...(msg.sources || []), ...newSources] : msg.sources
          } : msg
        ));
      }
      geminiService.updateHistory('user', [{ text }, ...(media ? [{ inlineData: media }] : [])]);
      geminiService.updateHistory('model', [{ text: fullContent }]);
    } catch (error: any) {
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Link Transmission Failure: ${error.message}` } : msg));
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
    <div className="flex-1 flex flex-col theme-glass-card rounded-[2rem] md:rounded-[2.5rem] overflow-hidden h-[calc(100vh-120px)] md:h-[calc(100vh-180px)] border-white/5">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 chat-blueprint">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 md:gap-3 max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-white border border-black/10 shadow-lg overflow-hidden p-0.5">
                {msg.role === 'user' ? <span className="font-black text-blue-900 text-xs md:text-sm uppercase">{user.name[0]}</span> : <img src={BOT_LOGO} className="w-full h-full object-contain" alt="IETE" />}
              </div>
              <div className="flex flex-col gap-2 overflow-hidden">
                <div className={`rounded-2xl md:rounded-3xl px-4 md:px-6 py-3 md:py-5 shadow-2xl border backdrop-blur-xl transition-all ${msg.role === 'user' ? 'bg-blue-950 text-white border-blue-800' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-color)]'}`}>
                  <div className="markdown-body prose prose-invert max-w-none text-[13px] md:text-[15px] leading-relaxed break-words overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                    {msg.id.startsWith('init-') && isTyping && <span className="typing-cursor"></span>}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-white/10 flex flex-wrap gap-2">
                      {msg.sources.map((s, i) => <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] md:text-[10px] bg-blue-500/10 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-blue-400 font-black border border-blue-500/20 hover:bg-blue-500/30 transition-all uppercase tracking-widest">{s.title}</a>)}
                    </div>
                  )}
                </div>
                {msg.image && (
                  <div className="rounded-xl md:rounded-2xl border border-[var(--border-color)] overflow-hidden bg-white/5 p-1 md:p-1.5 shadow-2xl transform hover:scale-[1.01] transition-transform">
                    <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto max-h-[400px] md:max-h-[600px] object-contain rounded-lg md:rounded-xl" alt="Technical Visualization" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reorganized & Complete Engineering Power Toolkit */}
      <div className="px-3 md:px-6 py-3 md:py-4 bg-black/40 border-t border-white/5 overflow-x-auto no-scrollbar shadow-inner">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2">
              <span className="text-[8px] md:text-[9px] font-black bg-blue-600 text-white px-1.5 md:px-2 py-0.5 rounded uppercase">Vision</span>
              <button onClick={() => handleActionClick('formula_ocr')} className="iete-tool-btn border-blue-500/50 bg-blue-500/10">📝 OCR</button>
              <button onClick={() => handleActionClick('debug')} className="iete-tool-btn">🛠️ Debug</button>
              <button onClick={() => handleActionClick('extract')} className="iete-tool-btn">📄 Table</button>
              <button onClick={() => handleActionClick('visualize')} className="iete-tool-btn">🎨 Schematic</button>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-2 md:pl-3">
              <span className="text-[8px] md:text-[9px] font-black bg-emerald-600 text-white px-1.5 md:px-2 py-0.5 rounded uppercase">Design</span>
              <button onClick={() => handleActionClick('step_by_step')} className="iete-tool-btn border-emerald-500/50 bg-emerald-500/10">🔢 Step</button>
              <button onClick={() => handleActionClick('boolean')} className="iete-tool-btn">🧮 K-Map</button>
              <button onClick={() => handleActionClick('hdl')} className="iete-tool-btn">💻 HDL</button>
              <button onClick={() => handleActionClick('project')} className="iete-tool-btn">🏗️ Project</button>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-2 md:pl-3">
              <span className="text-[8px] md:text-[9px] font-black bg-rose-600 text-white px-1.5 md:px-2 py-0.5 rounded uppercase">Res</span>
              <button onClick={() => handleActionClick('gate_pyq')} className="iete-tool-btn">🎓 GATE</button>
              <button onClick={() => handleActionClick('datasheet')} className="iete-tool-btn">📑 Sheet</button>
              <button onClick={() => handleActionClick('pinout')} className="iete-tool-btn">📍 Pinout</button>
              <button onClick={() => handleActionClick('viva')} className="iete-tool-btn">🎤 Viva</button>
              <button onClick={() => handleActionClick('direct')} className="iete-tool-btn">🎯 Direct</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-8 bg-[var(--header-bg)] border-t border-[var(--border-color)]">
        {selectedMedia && (
          <div className="mb-4 md:mb-6 flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-blue-900/10 rounded-2xl md:rounded-3xl border border-blue-900/30 animate-in slide-in-from-bottom-2">
            <div className="relative group">
              <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-14 w-14 md:h-20 md:w-20 rounded-xl md:rounded-2xl object-cover border-2 border-blue-500 shadow-2xl" />
              <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-xl hover:bg-red-700 transition-all">
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="flex flex-col">
              <h4 className="text-[9px] md:text-[11px] font-black text-blue-400 uppercase tracking-widest">Feed Initialized</h4>
              <p className="text-[8px] md:text-[10px] text-[var(--text-secondary)]">Ready for Analysis.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 md:gap-4 w-full max-w-7xl mx-auto">
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
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-3 md:p-5 rounded-xl md:rounded-3xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-blue-500 hover:border-blue-500/30 transition-all shadow-inner group flex-shrink-0"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Type query..."
            className="flex-1 min-w-0 px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-3xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-blue-900/50 text-xs md:text-sm transition-all shadow-inner placeholder:text-white/20"
            disabled={isLoading || isTyping}
          />
          <button 
            type="submit" 
            disabled={isLoading || isTyping || (!input.trim() && !selectedMedia)} 
            className="px-4 md:px-10 py-3 md:py-5 bg-gradient-to-br from-blue-700 to-blue-950 text-white rounded-xl md:rounded-3xl font-black uppercase text-[10px] md:text-[12px] tracking-[0.1em] md:tracking-[0.3em] shadow-2xl hover:brightness-125 hover:shadow-blue-500/20 transition-all disabled:opacity-30 disabled:grayscale flex-shrink-0"
          >
            {isLoading ? <div className="w-4 h-4 md:w-5 md:h-5 border-2 md:border-3 border-t-transparent border-white rounded-full animate-spin" /> : "TRANSMIT"}
          </button>
        </form>
      </div>
      
      <style>{`
        .iete-tool-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.4rem 0.8rem;
          border-radius: 0.8rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
          transition: all 0.2s;
        }
        @media (min-width: 768px) {
          .iete-tool-btn {
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 1rem;
            font-size: 10px;
            letter-spacing: 0.05em;
          }
        }
        .iete-tool-btn:hover {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
        }
        .iete-tool-btn:active {
          transform: translateY(0);
          background: rgba(59, 130, 246, 0.25);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;