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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  
  const BOT_LOGO = "https://jit.ac.in/assets/uploads/2022/12/IETE-logo.png";
  const COLLEGE_LOGO = "https://www.aicjitf.org/wp-content/uploads/2021/12/rec.png";

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
    const welcome = `Hey ${user.name}! 👋 Welcome to the IETE Terminal. ${timeGreeting}. I am IETE Bot, the official AI assistant for Raghu Engineering College. I'm ready to assist you with electronics, telecommunications, and technical research. How can we innovate today?`;
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
    
    // Toggle action
    if (activeAction === type) {
      setActiveAction(null);
      return;
    }

    setActiveAction(type);

    // If it's a vision tool and no image is selected, prompt for one
    if (['formula_ocr', 'debug', 'extract', 'text_extract'].includes(type) && !selectedMedia) {
       setShowUploadOptions(true);
    }
  };

  const processVisualizer = async (topic: string) => {
    setIsLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, 
      { id: Date.now().toString(), role: 'user', content: `Blueprint Request: ${topic}`, timestamp: new Date() },
      { id: assistantId, role: 'assistant', content: `Synthesizing institutional schematic...`, timestamp: new Date() }
    ]);

    try {
      const result = await geminiService.generateImage(topic);
      if (result) {
        setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { 
          ...msg, content: `Institutional blueprint for **${topic}** rendered.`, 
          image: { data: result.data, mimeType: result.mimeType } 
        } : msg));
      } else {
        throw new Error("Failed to generate visual.");
      }
    } catch (e: any) {
      setMessages(prev => prev.map((msg: Message): Message => msg.id === assistantId ? { ...msg, content: `Visualization Failure: ${e.message}` } : msg));
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
      const stream = await geminiService.sendMessageStream(text, media, { useSearch });
      
      for await (const chunk of stream) {
        fullContent += chunk.text || "";
        const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const newSources = grounding?.map((c: any) => ({
          title: c.web?.title || 'Research Source',
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
      setActiveAction(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isTyping) return;

    let textToProcess = input.trim();
    const media = selectedMedia;

    if (activeAction) {
      if (activeAction === 'visualize') {
        const topic = textToProcess || prompt("Enter Schematic Topic to Visualize:") || "";
        if (topic) await processVisualizer(topic);
        setInput('');
        setSelectedMedia(null);
        return;
      }

      let promptPrefix = "";
      switch(activeAction) {
        case 'formula_ocr': promptPrefix = "OCR MODULE: Extract and digitize all technical text and mathematical formulas. Output LaTeX blocks: "; break;
        case 'text_extract': promptPrefix = "TEXT EXTRACTION: Transcribe all readable text precisely from image: "; break;
        case 'step_by_step': promptPrefix = "STEP-BY-STEP DERIVATION: Provide stage-by-stage solution for: "; break;
        case 'direct': promptPrefix = "DIRECT TECHNICAL FACT: Provide final result only for: "; break;
        case 'debug': promptPrefix = "CIRCUIT DIAGNOSTIC: Analyze visual/description for flaws: "; break;
        case 'extract': promptPrefix = "PARAMETER EXTRACTION: Tabulate parameters found in: "; break;
        case 'boolean': promptPrefix = "LOGIC SIMPLIFICATION: Provide K-Map and simplified logic for: "; break;
        case 'gate_pyq': promptPrefix = "GATE PYQ SEARCH: Solve a relevant GATE question for: "; break;
        case 'pinout': promptPrefix = "IC PINOUT GURU: Provide standard pinout mapping for: "; break;
        case 'hdl': promptPrefix = "HDL ARCHITECT: Generate Verilog/VHDL code and testbench for: "; break;
        case 'project': promptPrefix = "PROJECT BOT: Generate full project blueprint for: "; break;
        case 'datasheet': promptPrefix = "DATASHEET RESEARCH: Summarize key performance metrics for: "; break;
        case 'viva': promptPrefix = "VIVA PREP: Generate 5 viva questions/answers for: "; break;
      }
      textToProcess = promptPrefix + (textToProcess || "the provided context");
    }

    if (!textToProcess && !media) return;

    const useSearch = ['gate_pyq', 'datasheet', 'pinout'].includes(activeAction || '');
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
      case 'formula_ocr': return '📝 OCR MODE';
      case 'text_extract': return '🔍 EXTRACT MODE';
      case 'debug': return '🛠️ DEBUG MODE';
      case 'extract': return '📄 TABLE MODE';
      case 'visualize': return '🎨 BLUEPRINT MODE';
      case 'step_by_step': return '🔢 STEP MODE';
      case 'boolean': return '🧮 LOGIC MODE';
      case 'hdl': return '💻 HDL MODE';
      case 'project': return '🏗️ PROJECT MODE';
      case 'gate_pyq': return '🎓 GATE MODE';
      case 'datasheet': return '📑 SHEET MODE';
      case 'pinout': return '📍 PINOUT MODE';
      case 'viva': return '🎤 VIVA MODE';
      default: return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col theme-glass-card rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] border-white/5 w-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-8 space-y-5 md:space-y-8 chat-blueprint w-full max-w-full">
        
        {/* Institutional Top Banner */}
        <div className="flex flex-col items-center justify-center py-6 md:py-8 mb-4 md:mb-8 border-b border-white/10 bg-white/5 rounded-2xl md:rounded-3xl animate-in fade-in duration-700 mx-1">
           <img 
            src={COLLEGE_LOGO} 
            alt="Raghu Engineering College" 
            className="h-10 md:h-16 object-contain mb-3 filter drop-shadow-md"
          />
          <div className="text-center px-4">
            <h3 className="text-[10px] md:text-sm font-black text-blue-400 uppercase tracking-[0.1em] md:tracking-[0.2em]">Raghu Engineering College</h3>
            <p className="text-[8px] md:text-[10px] text-[var(--text-secondary)] uppercase font-medium tracking-widest mt-1">Institutional Student Terminal • IETE Forum</p>
          </div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
            <div className={`flex gap-2 md:gap-3 max-w-[96%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-white border border-black/10 shadow-lg overflow-hidden p-0.5 mt-1">
                {msg.role === 'user' ? (
                  <span className="font-black text-blue-900 text-xs md:text-sm uppercase">{user.name[0]}</span>
                ) : (
                  <img src={BOT_LOGO} className="w-full h-full object-contain" alt="IETE" />
                )}
              </div>
              <div className="flex flex-col gap-2 overflow-hidden min-w-0">
                <div className={`rounded-xl md:rounded-3xl px-4 md:px-6 py-3 md:py-5 shadow-2xl border backdrop-blur-xl transition-all ${msg.role === 'user' ? 'bg-blue-950 text-white border-blue-800' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-color)]'}`}>
                  <div className="markdown-body prose prose-invert max-w-none text-[13px] md:text-[15px] leading-relaxed break-words overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                    {msg.id.startsWith('init-') && isTyping && <span className="typing-cursor"></span>}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                      {msg.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] md:text-[10px] bg-blue-500/10 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-blue-400 font-black border border-blue-500/20 hover:bg-blue-500/30 transition-all uppercase tracking-tighter truncate max-w-[120px] md:max-w-none">
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {msg.image && (
                  <div className="rounded-xl md:rounded-2xl border border-[var(--border-color)] overflow-hidden bg-white/5 p-1 md:p-1.5 shadow-2xl transform hover:scale-[1.01] transition-transform">
                    <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto max-h-[400px] md:max-h-[600px] object-contain rounded-lg md:rounded-xl" alt="Engineering Schematic" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolkit Section */}
      <div className="px-3 md:px-6 py-3 md:py-4 bg-black/40 border-t border-white/5 overflow-x-auto no-scrollbar shadow-inner">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2">
              <span className="text-[7px] md:text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Vision</span>
              <button onClick={() => handleActionClick('formula_ocr')} className={`iete-tool-btn ${activeAction === 'formula_ocr' ? 'iete-tool-active' : ''}`}>📝 OCR</button>
              <button onClick={() => handleActionClick('text_extract')} className={`iete-tool-btn ${activeAction === 'text_extract' ? 'iete-tool-active' : ''}`}>🔍 Extract</button>
              <button onClick={() => handleActionClick('debug')} className={`iete-tool-btn ${activeAction === 'debug' ? 'iete-tool-active' : ''}`}>🛠️ Debug</button>
              <button onClick={() => handleActionClick('extract')} className={`iete-tool-btn ${activeAction === 'extract' ? 'iete-tool-active' : ''}`}>📄 Table</button>
              <button onClick={() => handleActionClick('visualize')} className={`iete-tool-btn ${activeAction === 'visualize' ? 'iete-tool-active' : ''}`}>🎨 Blueprint</button>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-2 md:pl-3">
              <span className="text-[7px] md:text-[8px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Logic</span>
              <button onClick={() => handleActionClick('step_by_step')} className={`iete-tool-btn ${activeAction === 'step_by_step' ? 'iete-tool-active' : ''}`}>🔢 Step</button>
              <button onClick={() => handleActionClick('boolean')} className={`iete-tool-btn ${activeAction === 'boolean' ? 'iete-tool-active' : ''}`}>🧮 Logic</button>
              <button onClick={() => handleActionClick('hdl')} className={`iete-tool-btn ${activeAction === 'hdl' ? 'iete-tool-active' : ''}`}>💻 HDL</button>
              <button onClick={() => handleActionClick('project')} className={`iete-tool-btn ${activeAction === 'project' ? 'iete-tool-active' : ''}`}>🏗️ Project</button>
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-2 md:pl-3">
              <span className="text-[7px] md:text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Data</span>
              <button onClick={() => handleActionClick('gate_pyq')} className={`iete-tool-btn ${activeAction === 'gate_pyq' ? 'iete-tool-active' : ''}`}>🎓 GATE</button>
              <button onClick={() => handleActionClick('datasheet')} className={`iete-tool-btn ${activeAction === 'datasheet' ? 'iete-tool-active' : ''}`}>📑 Sheets</button>
              <button onClick={() => handleActionClick('pinout')} className={`iete-tool-btn ${activeAction === 'pinout' ? 'iete-tool-active' : ''}`}>📍 Pins</button>
              <button onClick={() => handleActionClick('viva')} className={`iete-tool-btn ${activeAction === 'viva' ? 'iete-tool-active' : ''}`}>🎤 Viva</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-6 bg-[var(--header-bg)] border-t border-[var(--border-color)] relative">
        {/* Active Action Badge */}
        {activeAction && (
          <div className="absolute -top-10 left-6 flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-t-xl text-[9px] font-black uppercase tracking-widest animate-in slide-in-from-bottom-2">
            {getActionLabel(activeAction)}
            <button onClick={() => setActiveAction(null)} className="ml-1 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Choice Menu for Upload */}
        {showUploadOptions && (
          <div ref={uploadMenuRef} className="absolute bottom-24 left-4 md:left-6 bg-[var(--card-bg)] border border-blue-500/30 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] p-2 flex flex-col gap-1 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-200 backdrop-blur-3xl min-w-[160px]">
            <button 
              onClick={() => {
                cameraInputRef.current?.click();
                setShowUploadOptions(false);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue-500/10 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-[0.1em] transition-all group"
            >
              <div className="bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              Take Photo
            </button>
            <button 
              onClick={() => {
                fileInputRef.current?.click();
                setShowUploadOptions(false);
              }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-500/10 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-[0.1em] transition-all group"
            >
               <div className="bg-emerald-500/20 p-2 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              Browse Files
            </button>
          </div>
        )}

        {selectedMedia && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-blue-900/10 rounded-2xl border border-blue-900/30 animate-in slide-in-from-bottom-2">
            <div className="relative group">
              <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-12 w-12 md:h-16 md:w-16 rounded-xl object-cover border-2 border-blue-500 shadow-xl" />
              <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-all">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="flex flex-col">
              <h4 className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest">Feed Ready</h4>
              <p className="text-[8px] md:text-[9px] text-[var(--text-secondary)]">Institutional Vision active.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 md:gap-3 w-full max-w-full">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

          <button 
            type="button" 
            onClick={() => setShowUploadOptions(!showUploadOptions)} 
            className={`p-3 md:p-5 rounded-xl md:rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-all flex-shrink-0 flex items-center justify-center relative overflow-hidden group ${showUploadOptions ? 'ring-2 ring-blue-500 border-blue-500/50 text-blue-500' : 'hover:text-blue-500'}`}
          >
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <svg className="w-5 h-5 md:w-6 md:h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={activeAction ? `Provide input for ${activeAction.replace('_', ' ')}...` : "Transmit technical query..."}
            className="flex-1 min-w-0 px-4 md:px-6 py-3 md:py-5 rounded-xl md:rounded-2xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-blue-900/50 text-xs md:text-sm transition-all shadow-inner"
            disabled={isLoading || isTyping}
          />
          <button 
            type="submit" 
            disabled={isLoading || isTyping || (!input.trim() && !selectedMedia && !activeAction)} 
            className="px-4 md:px-8 py-3 md:py-5 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[12px] tracking-widest shadow-xl disabled:opacity-30 transition-all flex-shrink-0 active:scale-95"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" /> : "SEND"}
          </button>
        </form>
      </div>
      
      <style>{`
        .iete-tool-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.4rem 0.6rem;
          border-radius: 0.6rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
          transition: all 0.2s;
        }
        @media (min-width: 768px) {
          .iete-tool-btn {
            gap: 0.4rem;
            padding: 0.5rem 0.8rem;
            border-radius: 0.8rem;
            font-size: 10px;
          }
        }
        .iete-tool-btn:hover {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
        }
        .iete-tool-active {
          background: rgba(59, 130, 246, 0.3) !important;
          border-color: rgba(59, 130, 246, 1) !important;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ChatInterface;