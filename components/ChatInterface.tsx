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
  | 'datasheet' | 'simulation' | 'research' | 'examprep' 
  | 'boolean' | 'hdl' | 'transform' | 'analog' | 'modulation' 
  | 'direct' | 'step_by_step' | 'control_sys';

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
      setConfigError("SYSTEM ERROR: API_KEY is missing from environment.");
    }

    const welcome = `Terminal online. ${getGreeting()}, Engineer ${user.name}. IETE Bot v4.5 active. Engineering toolkit pre-loaded. Access Neural Link for specialized modules.`;
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
    }, 12);

    return () => clearInterval(interval);
  }, [user.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedMedia({ data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleActionClick = async (type: ToolkitAction) => {
    if (isLoading || isTyping) return;
    let context = input.trim();
    
    if (type === 'visualize') {
      const topic = context || prompt("Enter Circuit/System to visualize (e.g., 'BJT Common Emitter'):");
      if (topic) await processVisualizer(topic);
      return;
    }

    if ((type === 'extract' || type === 'debug') && !selectedMedia) {
       fileInputRef.current?.click();
       return;
    }

    if (!context && !selectedMedia) {
       context = prompt(`Enter ${type.replace('_', ' ').toUpperCase()} subject:`) || "";
       if (!context) return;
    }

    executeTool(type, selectedMedia || undefined, context);
  };

  const processVisualizer = async (topic: string) => {
    setIsLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, 
      { id: Date.now().toString(), role: 'user', content: `Render Schematic: ${topic}`, timestamp: new Date() },
      { id: assistantId, role: 'assistant', content: `Generating institutional blueprint for ${topic}...`, timestamp: new Date() }
    ]);

    try {
      const result = await geminiService.generateTechnicalImage(topic);
      if (result) {
        setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { 
          ...msg, content: `Visual representation of **${topic}** complete.`, 
          image: { data: result.data, mimeType: result.mimeType } 
        } : msg));
      }
    } catch (e: any) {
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Render Fail: ${e.message}` } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const executeTool = async (type: ToolkitAction, media?: { data: string; mimeType: string }, customText?: string) => {
    let promptText = "";
    const subject = customText || "";
    const useSearch = ['research', 'datasheet', 'gate_pyq'].includes(type);

    switch(type) {
      case 'direct': promptText = `DIRECT ANSWER ONLY: Provide a concise technical answer for: ${subject}`; break;
      case 'step_by_step': promptText = `Provide a detailed, step-by-step mathematical derivation/solution for: ${subject}. Justify each step physically.`; break;
      case 'boolean': promptText = `Logic Minimization: Simplify the expression ${subject}. Provide Truth Table and reduced K-Map.`; break;
      case 'hdl': promptText = `HDL Synthesis: Generate professional Verilog code and a testbench for: ${subject}.`; break;
      case 'transform': promptText = `Signal Analysis: Solve the following using Laplace or Z-Transform: ${subject}. Mention the ROC.`; break;
      case 'modulation': promptText = `Communication Theory: Analyze ${subject} modulation. Calculate BW, Power efficiency, and provide the wave equations.`; break;
      case 'debug': promptText = `CIRCUIT DEBUG: Analyze the attached image or description for design flaws, missing connections, or incorrect component values: ${subject}`; break;
      case 'extract': promptText = `TEXT/BOM EXTRACT: Extract all technical data, component values, and text from the attached source. Provide it in an IEEE table format.`; break;
      case 'viva': promptText = `VIVA PREP: Ask me 5 high-level technical questions on ${subject} to prepare for my lab practical.`; break;
      case 'control_sys': promptText = `Control Systems: For ${subject}, find the Transfer Function, determine stability using Routh-Hurwitz, and describe the frequency response.`; break;
      default: promptText = `Engineering Analysis: ${subject}`;
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
          title: c.web?.title || 'Tech Reference',
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
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Neural Link Interrupted: ${error.message}` } : msg));
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
      {configError && <div className="bg-red-600/90 text-white text-[9px] py-1 text-center font-bold absolute top-0 w-full z-50 animate-pulse uppercase tracking-widest">{configError}</div>}
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 chat-blueprint relative">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex gap-3 max-w-[92%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-white border border-black/10 shadow-sm overflow-hidden p-0.5">
                {msg.role === 'user' ? <span className="font-black text-blue-900 text-sm uppercase">{user.name[0]}</span> : <img src={BOT_LOGO} className="w-full h-full object-contain" alt="IETE" />}
              </div>
              <div className="flex flex-col gap-2">
                <div className={`rounded-2xl px-5 py-4 shadow-md border backdrop-blur-md transition-all ${msg.role === 'user' ? 'bg-blue-950 text-white border-blue-900' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-color)]'}`}>
                  <div className="markdown-body prose prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                      {msg.sources.map((s, i) => <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-blue-500/10 px-2 py-1 rounded text-blue-400 font-bold hover:bg-blue-500/30 transition-all uppercase">{s.title}</a>)}
                    </div>
                  )}
                </div>
                {msg.image && (
                  <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-white/5 p-1 shadow-2xl">
                    <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto max-h-[500px] object-contain rounded-lg" alt="Schematic" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 md:p-6 bg-[var(--header-bg)] border-t border-[var(--border-color)] z-20">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[9px] font-black bg-blue-900 text-white px-2 py-1 rounded-sm whitespace-nowrap">MODULES</span>
            {[
              { id: 'direct', label: 'Direct Ans', icon: '🎯' },
              { id: 'step_by_step', label: 'Step-by-Step', icon: '🔢' },
              { id: 'extract', label: 'Text/BOM Extract', icon: '📄' },
              { id: 'debug', label: 'Circuit Debug', icon: '🛠️' },
              { id: 'boolean', label: 'Logic/K-Map', icon: '🧮' },
              { id: 'hdl', label: 'HDL/Verilog', icon: '⚡' },
              { id: 'transform', label: 'Transforms', icon: '📉' },
              { id: 'modulation', label: 'Modulation', icon: '📡' },
              { id: 'viva', label: 'Viva Prep', icon: '🎤' },
              { id: 'visualize', label: 'Schematic Gen', icon: '🎨' },
            ].map(t => (
              <button key={t.id} onClick={() => handleActionClick(t.id as ToolkitAction)} className="flex items-center gap-2 px-3 py-2 bg-[var(--input-bg)] rounded-xl border border-[var(--border-color)] text-[9px] font-black uppercase tracking-widest hover:border-blue-500 hover:bg-blue-900/10 transition-all shadow-sm whitespace-nowrap active:scale-95">
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {selectedMedia && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-blue-900/10 rounded-2xl border border-blue-900/30 animate-in slide-in-from-left-4">
            <div className="relative">
              <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-16 w-16 rounded-xl object-cover border-2 border-blue-500 shadow-lg" alt="Input" />
              <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-xl hover:scale-110 transition-transform">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Media Signal Loaded</p>
              <p className="text-[9px] text-[var(--text-secondary)]">Ready for OCR and Circuit Analysis</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-3 max-w-6xl mx-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-blue-500 transition-all hover:bg-blue-500/5 shadow-inner"
            title="Attach Schematic/Image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value.slice(0, 4000))}
            placeholder="Input engineering query or formula..."
            className="flex-1 px-6 py-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-blue-900/50 text-sm transition-all shadow-inner font-medium"
            disabled={isLoading || isTyping}
          />
          <button 
            type="submit" 
            disabled={isLoading || isTyping || (!input.trim() && !selectedMedia)} 
            className="px-10 py-4 bg-gradient-to-br from-blue-800 to-blue-950 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] shadow-xl hover:brightness-125 active:scale-[0.96] disabled:opacity-20 flex items-center justify-center transition-all min-w-[150px]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-3 border-t-transparent border-white rounded-full animate-spin" />
            ) : "TRANSMIT"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;