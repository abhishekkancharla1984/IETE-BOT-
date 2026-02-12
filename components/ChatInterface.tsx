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
  | 'direct' | 'step_by_step' | 'viva' | 'pinout' | 'hdl' | 'project' | 'datasheet' | 'formula_ocr'
  | 'text_extract' | 'formulas_only' | 'unit_converter' | 'lab_assistant' | 'component_finder' | 'code_explainer';

interface ToolCategory {
  name: string;
  color: string;
  tools: ToolkitAction[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ data: string; mimeType: string } | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [activeAction, setActiveAction] = useState<ToolkitAction | null>(null);
  const [deepSearch, setDeepSearch] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  
  const BOT_LOGO = "https://jit.ac.in/assets/uploads/2022/12/IETE-logo.png";
  const COLLEGE_LOGO = "https://www.aicjitf.org/wp-content/uploads/2021/12/rec.png";

  const categories: ToolCategory[] = [
    { name: 'Study', color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400', tools: ['formulas_only', 'viva', 'gate_pyq', 'step_by_step', 'lab_assistant'] },
    { name: 'Analysis', color: 'border-blue-500/30 bg-blue-500/5 text-blue-400', tools: ['debug', 'code_explainer', 'boolean', 'extract', 'formula_ocr'] },
    { name: 'Design', color: 'border-purple-500/30 bg-purple-500/5 text-purple-400', tools: ['visualize', 'hdl', 'project', 'pinout', 'component_finder'] },
    { name: 'Utility', color: 'border-amber-500/30 bg-amber-500/5 text-amber-400', tools: ['unit_converter', 'datasheet', 'text_extract', 'direct'] }
  ];

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

    const greeting = getGreeting();
    const welcome = `${greeting}, ${user.name}! 👋 Terminal online. I am IETE Bot. ${deepSearch ? 'Current Affairs & General Search mode enabled.' : 'Specialized Engineering mode enabled.'} Type your message and click EXECUTE.`;
    
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
    }, 10);

    return () => clearInterval(interval);
  }, [user.name, deepSearch]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setShowUploadOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleActionClick = (type: ToolkitAction) => {
    if (isLoading || isTyping) return;
    setActiveAction(prev => prev === type ? null : type);
    if (['formula_ocr', 'debug', 'extract', 'text_extract'].includes(type) && !selectedMedia) {
       setShowUploadOptions(true);
    }
  };

  const processVisualizer = async (topic: string) => {
    setIsLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, 
      { id: Date.now().toString(), role: 'user', content: `[BLUEPRINT] ${topic}`, timestamp: new Date() },
      { id: assistantId, role: 'assistant', content: `Rendering technical schematic for: ${topic}...`, timestamp: new Date() }
    ]);

    try {
      const result = await geminiService.generateImage(topic);
      if (result) {
        setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { 
          ...msg, content: `Schematic for **${topic}** complete.`, 
          image: { data: result.data, mimeType: result.mimeType } 
        } : msg));
      } else {
        throw new Error("Render pipe failure.");
      }
    } catch (e: any) {
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Error: ${e.message}` } : msg));
    } finally {
      setIsLoading(false);
      setActiveAction(null);
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
      const stream = await geminiService.sendMessageStream(text, media, { useSearch: useSearch || deepSearch });
      
      for await (const chunk of stream) {
        fullContent += chunk.text || "";
        const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const newSources = grounding?.map((c: any) => ({
          title: c.web?.title || 'External Source',
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
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Connection reset: ${error.message}` } : msg));
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  /**
   * CENTRAL EXECUTION POINT:
   * Only sends request when Execute is clicked.
   */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isTyping) return;

    let textToProcess = input.trim();
    const media = selectedMedia;

    if (activeAction) {
      if (activeAction === 'visualize') {
        const topic = textToProcess || prompt("Enter Schematic Topic:") || "";
        if (topic) await processVisualizer(topic);
        setInput('');
        setSelectedMedia(null);
        return;
      }

      let prefix = "";
      switch(activeAction) {
        case 'formulas_only': prefix = "[FORMULA REPOSITORY] "; break;
        case 'unit_converter': prefix = "[UNIT CONVERSION] "; break;
        case 'lab_assistant': prefix = "[LAB ASSISTANT] "; break;
        case 'component_finder': prefix = "[IC FINDER] "; break;
        case 'code_explainer': prefix = "[EXPLAIN CODE] "; break;
        case 'formula_ocr': prefix = "[OCR] "; break;
        case 'text_extract': prefix = "[TEXT EXTRACT] "; break;
        case 'step_by_step': prefix = "[STEPS] "; break;
        case 'direct': prefix = "[DIRECT] "; break;
        case 'debug': prefix = "[DEBUG] "; break;
        case 'extract': prefix = "[TABLE] "; break;
        case 'boolean': prefix = "[LOGIC] "; break;
        case 'gate_pyq': prefix = "[GATE] "; break;
        case 'pinout': prefix = "[PINOUT] "; break;
        case 'hdl': prefix = "[HDL] "; break;
        case 'project': prefix = "[PROJECT] "; break;
        case 'datasheet': prefix = "[DATASHEET] "; break;
        case 'viva': prefix = "[VIVA] "; break;
      }
      textToProcess = prefix + (textToProcess || "Analysis request.");
    }

    if (!textToProcess && !media) return;

    const useSearch = ['gate_pyq', 'datasheet', 'pinout', 'component_finder'].includes(activeAction || '') || deepSearch;
    setInput('');
    setSelectedMedia(null);
    await processMessage(textToProcess, media || undefined, useSearch);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = (reader.result as string).split(',')[1];
        setSelectedMedia({ data: b64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
    setShowUploadOptions(false);
  };

  const getActionLabel = (action: ToolkitAction) => {
    switch(action) {
      case 'formulas_only': return 'Formulas';
      case 'unit_converter': return 'Convert';
      case 'lab_assistant': return 'Lab';
      case 'component_finder': return 'IC Find';
      case 'code_explainer': return 'Explain';
      case 'formula_ocr': return 'OCR';
      case 'text_extract': return 'Text';
      case 'debug': return 'Debug';
      case 'extract': return 'Table';
      case 'visualize': return 'Draw';
      case 'step_by_step': return 'Steps';
      case 'boolean': return 'Logic';
      case 'hdl': return 'HDL';
      case 'project': return 'Project';
      case 'gate_pyq': return 'GATE';
      case 'datasheet': return 'Sheets';
      case 'pinout': return 'Pinout';
      case 'viva': return 'Viva';
      case 'direct': return 'Direct';
      default: return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col theme-glass-card rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] border-white/5 w-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-8 space-y-5 md:space-y-8 chat-blueprint w-full max-w-full">
        <div className="flex flex-col items-center justify-center py-6 md:py-8 mb-4 border-b border-white/10 bg-white/5 rounded-2xl md:rounded-3xl mx-1">
           <img src={COLLEGE_LOGO} alt="Raghu Engineering College" className="h-10 md:h-14 object-contain mb-3" />
          <div className="text-center">
            <h3 className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest">Raghu Engineering College</h3>
            <p className="text-[8px] md:text-[9px] text-[var(--text-secondary)] uppercase font-medium mt-1">IETE AI Terminal</p>
          </div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
            <div className={`flex gap-2 md:gap-3 max-w-[96%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-white border border-black/10 overflow-hidden mt-1 shadow-lg">
                {msg.role === 'user' ? (
                  <span className="font-black text-blue-900 text-[10px] uppercase">{user.name[0]}</span>
                ) : (
                  <img src={BOT_LOGO} className="w-full h-full object-contain p-1" alt="IETE" />
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <div className={`rounded-xl md:rounded-2xl px-4 md:px-5 py-3 shadow-xl border backdrop-blur-xl ${msg.role === 'user' ? 'bg-blue-950 text-white border-blue-800' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-color)]'}`}>
                  <div className="markdown-body prose prose-invert max-w-none text-[13px] md:text-[14px] leading-relaxed break-words">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                    {msg.id.startsWith('init-') && isTyping && <span className="typing-cursor"></span>}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-white/5 flex flex-wrap gap-1">
                      {msg.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-blue-400 truncate max-w-[120px]">
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {msg.image && (
                  <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5 p-1 shadow-xl">
                    <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto max-h-[400px] object-contain rounded-lg" alt="Output" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* REORGANIZED CATEGORY TOOLKIT */}
      <div className="px-3 md:px-6 py-3 bg-black/50 border-t border-white/5 overflow-x-auto no-scrollbar">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-1 border-b border-white/10">
            <button 
              onClick={() => setDeepSearch(!deepSearch)} 
              className={`iete-tool-btn min-w-[130px] border-2 ${deepSearch ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'border-white/10 opacity-60'}`}
            >
              {deepSearch ? '⚡ SEARCH: ON' : '🌐 SEARCH: OFF'}
            </button>
            <div className="h-4 w-px bg-white/10 mx-1"></div>
            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap">
              {deepSearch ? 'GENERAL & CURRENT AFFAIRS ACTIVE' : 'ENGINEERING SPECIALIZED ACTIVE'}
            </p>
          </div>

          <div className="flex flex-nowrap gap-3 md:gap-5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <div key={cat.name} className={`flex flex-col gap-1.5 p-2 rounded-xl border ${cat.color} min-w-max`}>
                <span className="text-[7px] font-black uppercase tracking-tighter ml-1 opacity-80">{cat.name}</span>
                <div className="flex items-center gap-1.5">
                  {cat.tools.map((tool) => (
                    <button 
                      key={tool} 
                      onClick={() => handleActionClick(tool)} 
                      className={`tool-pill ${activeAction === tool ? 'tool-pill-active' : ''}`}
                    >
                      {getActionLabel(tool)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 md:p-6 bg-[var(--header-bg)] border-t border-[var(--border-color)] relative">
        {showUploadOptions && (
          <div ref={uploadMenuRef} className="absolute bottom-24 left-4 md:left-6 bg-[var(--card-bg)] border border-blue-500/30 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-[100] animate-in fade-in slide-in-from-bottom-4 backdrop-blur-3xl min-w-[180px]">
            <button onClick={() => { cameraInputRef.current?.click(); setShowUploadOptions(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-500/10 rounded-xl text-[10px] font-black text-blue-400 uppercase transition-all">
              Capture Feed
            </button>
            <button onClick={() => { fileInputRef.current?.click(); setShowUploadOptions(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-500/10 rounded-xl text-[10px] font-black text-emerald-400 uppercase transition-all">
              Attach File
            </button>
          </div>
        )}

        {selectedMedia && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-blue-900/20 rounded-xl border border-blue-500/30 animate-in slide-in-from-bottom-2">
            <div className="relative flex-shrink-0">
              <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-12 w-12 rounded-lg object-cover border border-blue-500" />
              <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <p className="text-[9px] font-black text-blue-400 uppercase">Input Feed Attached</p>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 md:gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

          <button type="button" onClick={() => setShowUploadOptions(!showUploadOptions)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-all ${showUploadOptions ? 'text-blue-500 ring-2 ring-blue-500/30' : 'hover:text-blue-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>

          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={activeAction ? `Mode: ${getActionLabel(activeAction)}...` : (deepSearch ? "Query Search/News..." : "Query Engineering...")}
            className={`flex-1 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[var(--input-bg)] border transition-all text-xs outline-none ${activeAction ? 'border-blue-500/50' : 'border-[var(--border-color)] focus:border-blue-900/50'}`}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || isTyping || (!input.trim() && !selectedMedia && !activeAction)} className="px-5 md:px-8 py-3 md:py-4 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-30 active:scale-95 transition-all">
            {isLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" /> : "EXECUTE"}
          </button>
        </form>
      </div>
      
      <style>{`
        .iete-tool-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.4rem 0.6rem;
          border-radius: 0.6rem;
          background: rgba(255, 255, 255, 0.04);
          color: white;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .tool-pill {
          padding: 0.35rem 0.6rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: inherit;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .tool-pill:hover { background: rgba(255, 255, 255, 0.2); }
        .tool-pill-active { background: white !important; color: black !important; border-color: white !important; box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ChatInterface;