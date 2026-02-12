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
  | 'text_extract';

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

  useEffect(() => {
    const initialId = 'init-' + Date.now();
    setMessages([{ id: initialId, role: 'assistant', content: '', timestamp: new Date() }]);
    geminiService.initChat(user.name);

    const welcome = `Terminal online. Access granted to Personnel: ${user.name}. I am IETE Bot. I am ready for technical queries, general knowledge, or latest news updates. Type your message and click EXECUTE.`;
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
    }, 15); // Faster typing effect

    return () => clearInterval(interval);
  }, [user.name]);

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
    // Selection only, NO API request sent here
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
          ...msg, content: `Institutional schematic for **${topic}** complete.`, 
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
   * This is the ONLY place where an API request is initiated.
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
        case 'formula_ocr': prefix = "[OCR/FORMULA] "; break;
        case 'text_extract': prefix = "[TRANSCRIPTION] "; break;
        case 'step_by_step': prefix = "[MODULAR SOLUTION] "; break;
        case 'direct': prefix = "[DIRECT RESULT] "; break;
        case 'debug': prefix = "[DIAGNOSTIC] "; break;
        case 'extract': prefix = "[DATA EXTRACTION] "; break;
        case 'boolean': prefix = "[LOGIC SIMPLIFICATION] "; break;
        case 'gate_pyq': prefix = "[GATE SEARCH] "; break;
        case 'pinout': prefix = "[IC PINOUT] "; break;
        case 'hdl': prefix = "[HDL SYNTHESIS] "; break;
        case 'project': prefix = "[BLUEPRINT] "; break;
        case 'datasheet': prefix = "[DATASHEET SEARCH] "; break;
        case 'viva': prefix = "[VIVA PREP] "; break;
      }
      textToProcess = prefix + (textToProcess || "Analyze provided input.");
    }

    if (!textToProcess && !media) return;

    // Send API request now
    const useSearch = ['gate_pyq', 'datasheet', 'pinout'].includes(activeAction || '') || deepSearch;
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
      case 'formula_ocr': return '📝 OCR';
      case 'text_extract': return '🔍 EXTRACT';
      case 'debug': return '🛠️ DEBUG';
      case 'extract': return '📄 TABLE';
      case 'visualize': return '🎨 BLUEPRINT';
      case 'step_by_step': return '🔢 STEPS';
      case 'boolean': return '🧮 LOGIC';
      case 'hdl': return '💻 HDL';
      case 'project': return '🏗️ PROJECT';
      case 'gate_pyq': return '🎓 GATE';
      case 'datasheet': return '📑 SHEETS';
      case 'pinout': return '📍 PINOUT';
      case 'viva': return '🎤 VIVA';
      default: return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col theme-glass-card rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] border-white/5 w-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-8 space-y-5 md:space-y-8 chat-blueprint w-full max-w-full">
        
        <div className="flex flex-col items-center justify-center py-6 md:py-8 mb-4 md:mb-8 border-b border-white/10 bg-white/5 rounded-2xl md:rounded-3xl animate-in fade-in duration-700 mx-1">
           <img src={COLLEGE_LOGO} alt="Raghu Engineering College" className="h-10 md:h-14 object-contain mb-3 filter drop-shadow-md" />
          <div className="text-center px-4">
            <h3 className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Raghu Engineering College</h3>
            <p className="text-[8px] md:text-[9px] text-[var(--text-secondary)] uppercase font-medium tracking-widest mt-1 opacity-60">IETE Professional Student Forum</p>
          </div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
            <div className={`flex gap-2 md:gap-3 max-w-[96%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-white border border-black/10 shadow-lg overflow-hidden p-0.5 mt-1">
                {msg.role === 'user' ? (
                  <span className="font-black text-blue-900 text-[10px] md:text-xs uppercase">{user.name[0]}</span>
                ) : (
                  <img src={BOT_LOGO} className="w-full h-full object-contain" alt="IETE" />
                )}
              </div>
              <div className="flex flex-col gap-2 overflow-hidden min-w-0">
                <div className={`rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-xl border backdrop-blur-xl transition-all ${msg.role === 'user' ? 'bg-blue-950 text-white border-blue-800' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-color)]'}`}>
                  <div className="markdown-body prose prose-invert max-w-none text-[13px] md:text-[14px] leading-relaxed break-words">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                    {msg.id.startsWith('init-') && isTyping && <span className="typing-cursor"></span>}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                      {msg.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] md:text-[9px] bg-blue-500/10 px-2 py-1 rounded-md text-blue-400 font-bold border border-blue-500/20 hover:bg-blue-500/30 transition-all uppercase tracking-tighter truncate max-w-[150px]">
                          {s.title}
                        </a>
                      ))}
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

      <div className="px-3 md:px-6 py-2 md:py-3 bg-black/40 border-t border-white/5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <button onClick={() => setDeepSearch(!deepSearch)} className={`iete-tool-btn ${deepSearch ? 'bg-amber-500/30 border-amber-500/50 text-amber-400' : ''}`}>
              {deepSearch ? '⚡ SEARCH: ON' : '🌐 SEARCH: OFF'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleActionClick('formula_ocr')} className={`iete-tool-btn ${activeAction === 'formula_ocr' ? 'iete-tool-active' : ''}`}>📝 OCR</button>
            <button onClick={() => handleActionClick('text_extract')} className={`iete-tool-btn ${activeAction === 'text_extract' ? 'iete-tool-active' : ''}`}>🔍 TEXT</button>
            <button onClick={() => handleActionClick('debug')} className={`iete-tool-btn ${activeAction === 'debug' ? 'iete-tool-active' : ''}`}>🛠️ DEBUG</button>
            <button onClick={() => handleActionClick('visualize')} className={`iete-tool-btn ${activeAction === 'visualize' ? 'iete-tool-active' : ''}`}>🎨 BLUEPRINT</button>
            <button onClick={() => handleActionClick('boolean')} className={`iete-tool-btn ${activeAction === 'boolean' ? 'iete-tool-active' : ''}`}>🧮 LOGIC</button>
            <button onClick={() => handleActionClick('gate_pyq')} className={`iete-tool-btn ${activeAction === 'gate_pyq' ? 'iete-tool-active' : ''}`}>🎓 GATE</button>
            <button onClick={() => handleActionClick('datasheet')} className={`iete-tool-btn ${activeAction === 'datasheet' ? 'iete-tool-active' : ''}`}>📑 SHEETS</button>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-6 bg-[var(--header-bg)] border-t border-[var(--border-color)] relative">
        <div className="absolute -top-10 left-6 flex items-center gap-2 z-10">
          {activeAction && (
            <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-t-xl text-[9px] font-black uppercase tracking-widest shadow-lg animate-in slide-in-from-bottom-2">
              {getActionLabel(activeAction)}
              <button onClick={() => setActiveAction(null)} className="ml-1 hover:text-white/70">✕</button>
            </div>
          )}
          {deepSearch && (
            <div className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-1.5 rounded-t-xl text-[9px] font-black uppercase tracking-widest shadow-lg animate-in slide-in-from-bottom-2">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              REAL-TIME
            </div>
          )}
        </div>

        {showUploadOptions && (
          <div ref={uploadMenuRef} className="absolute bottom-24 left-4 md:left-6 bg-[var(--card-bg)] border border-blue-500/30 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-[100] animate-in fade-in slide-in-from-bottom-4 backdrop-blur-3xl min-w-[180px]">
            <button onClick={() => { cameraInputRef.current?.click(); setShowUploadOptions(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-500/10 rounded-xl text-[10px] font-black text-blue-400 uppercase transition-all group">
              <div className="bg-blue-500/20 p-2 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
              Capture Feed
            </button>
            <button onClick={() => { fileInputRef.current?.click(); setShowUploadOptions(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-500/10 rounded-xl text-[10px] font-black text-emerald-400 uppercase transition-all group">
              <div className="bg-emerald-500/20 p-2 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
              Attach File
            </button>
          </div>
        )}

        {selectedMedia && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-blue-900/20 rounded-xl border border-blue-500/30 animate-in slide-in-from-bottom-2">
            <div className="relative">
              <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-14 w-14 rounded-lg object-cover border border-blue-500 shadow-xl" />
              <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="flex flex-col"><p className="text-[9px] font-black text-blue-400 uppercase">Vision Feed Linked</p><p className="text-[8px] opacity-60">Ready to execute.</p></div>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 md:gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

          <button type="button" onClick={() => setShowUploadOptions(!showUploadOptions)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-all ${showUploadOptions ? 'text-blue-500 ring-2 ring-blue-500/30' : 'hover:text-blue-500'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>

          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={activeAction ? `Enter data for ${activeAction}...` : "Transmit query..."}
            className="flex-1 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-blue-900/50 text-xs transition-all shadow-inner"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || isTyping || (!input.trim() && !selectedMedia && !activeAction)} className="px-5 md:px-8 py-3 md:py-4 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[11px] tracking-widest shadow-xl disabled:opacity-30 transition-all active:scale-95">
            {isLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" /> : "EXECUTE"}
          </button>
        </form>
      </div>
      
      <style>{`
        .iete-tool-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .iete-tool-btn:hover { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
        .iete-tool-active { background: rgba(59, 130, 246, 0.2) !important; border-color: #3b82f6 !important; color: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ChatInterface;