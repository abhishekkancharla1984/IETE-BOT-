
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { UserProfile, Message } from '../types';
import { geminiService } from '../geminiService';

interface ChatInterfaceProps { user: UserProfile; }

type ToolkitAction = 
  | 'extract' | 'solve' | 'debug' | 'component' 
  | 'viva' | 'datasheet' | 'code' | 'formula' 
  | 'project' | 'study' | 'pinout';

const TypewriterText: React.FC<{ text: string; isStreaming: boolean; onFinished?: () => void }> = ({ text, isStreaming, onFinished }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const typingSpeed = 10;

  useEffect(() => {
    if (text.length > currentIndex) {
      const timeout = setTimeout(() => {
        const charsToTake = text.length - currentIndex > 50 ? 20 : (text.length - currentIndex > 20 ? 8 : 2);
        const nextText = text.substring(0, currentIndex + charsToTake);
        setDisplayedText(nextText);
        setCurrentIndex(currentIndex + charsToTake);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else if (text.length > 0 && !isStreaming && currentIndex >= text.length) {
      onFinished?.();
    }
  }, [text, currentIndex, isStreaming, onFinished]);

  return (
    <div className="markdown-body">
      <ReactMarkdown 
        remarkPlugins={[remarkMath, remarkGfm]} 
        rehypePlugins={[rehypeKatex]}
      >
        {displayedText}
      </ReactMarkdown>
      {(isStreaming || (text.length > 0 && displayedText.length < text.length)) && (
        <span className="inline-block w-2 h-4 ml-1 bg-[var(--accent-color)] animate-pulse align-middle">_</span>
      )}
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ data: string; mimeType: string } | null>(null);
  const [activeTool, setActiveTool] = useState<ToolkitAction | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const BOT_LOGO = "https://r.jina.ai/i/9e006629906d4e248b1841b52a1b94c4";

  useEffect(() => {
    const hours = new Date().getHours();
    let greeting = 'Good evening';
    if (hours < 12) greeting = 'Good morning';
    else if (hours < 17) greeting = 'Good afternoon';

    const initialMessage: Message = {
      id: 'initial',
      role: 'assistant',
      content: `${greeting}, ${user.name}. I am your IETE AI Assistant. I've updated my neural toolkit for your technical queries. How can I help you today?`,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    geminiService.initChat(user.name);
  }, [user.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, suggestions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const media = { data: base64String, mimeType: file.type };
        setSelectedMedia(media);
        if (activeTool) executeTool(activeTool, media);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleActionClick = (type: ToolkitAction) => {
    if (isLoading) return;
    if (selectedMedia) executeTool(type, selectedMedia);
    else setActiveTool(type);
  };

  const executeTool = async (type: ToolkitAction, media: { data: string; mimeType: string }) => {
    if (isLoading) return;
    setIsLoading(true);
    let prompt = "";
    switch(type) {
      case 'extract': prompt = "Extract all text and layout precisely from this image."; break;
      case 'solve': prompt = "Solve the technical engineering problem shown in this image step-by-step. Use block LaTeX for formulas."; break;
      case 'debug': prompt = "Analyze this circuit/schematic for errors or grounding issues."; break;
      case 'component': prompt = "Identify this electronic component and provide its key operating specs."; break;
      case 'viva': prompt = "Generate likely viva questions with answers based on this topic."; break;
      case 'datasheet': prompt = "Summarize the official datasheet specifications for this component."; break;
      case 'code': prompt = "Explain this code snippet line-by-line using code blocks."; break;
      case 'formula': prompt = "Provide all relevant engineering formulas for this topic using LaTeX."; break;
      case 'project': prompt = "Suggest innovative IETE project ideas for this concept."; break;
      case 'study': prompt = "Summarize this technical content and provide 3 key flashcards."; break;
      case 'pinout': prompt = "Provide a detailed pinout diagram and description using LaTeX formatting."; break;
      default: prompt = "Process this media content.";
    }
    setSelectedMedia(null);
    setActiveTool(null);
    await processMessage(prompt, media);
  };

  const generateSuggestions = (lastResponse: string) => {
    const low = lastResponse.toLowerCase();
    const options: string[] = [];
    if (low.includes('formula')) options.push('Solve an example', 'Variable definitions', 'Next Concept');
    else if (low.includes('viva')) options.push('Harder questions', 'Mock Interview', 'Explain terms');
    else if (low.includes('code')) options.push('Optimize it', 'Convert to C++', 'Dry run');
    else if (low.includes('project')) options.push('Component list', 'Block diagram', 'Budgeting');
    else options.push('Explain simpler', 'See related tools', 'More details');
    
    setSuggestions(options.slice(0, 3));
  };

  const processMessage = async (text: string, media?: { data: string; mimeType: string }) => {
    if (isLoading && !media) return;
    setIsLoading(true);
    setSuggestions([]);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      image: media?.mimeType.startsWith('image/') ? media : undefined
    };
    setMessages(prev => [...prev, userMessage]);
    
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      let fullContent = '';
      let groundingSources: { title: string; uri: string }[] = [];
      const streamResponse = await geminiService.sendMessageStream(text, media);
      
      for await (const chunk of streamResponse) {
        // Correct access to property .text
        fullContent += chunk.text || "";
        
        // Extract search grounding metadata if present in this chunk
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
          groundingMetadata.groundingChunks.forEach((c: any) => {
            if (c.web?.uri && c.web?.title) {
              const newSource = { title: c.web.title, uri: c.web.uri };
              if (!groundingSources.some(s => s.uri === newSource.uri)) {
                groundingSources.push(newSource);
              }
            }
          });
        }

        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: fullContent, 
                sources: groundingSources.length > 0 ? [...groundingSources] : msg.sources 
              } 
            : msg
        ));
      }
      geminiService.updateHistory('user', [{ text }, ...(media ? [{ inlineData: media }] : [])]);
      geminiService.updateHistory('model', [{ text: fullContent }]);
    } catch (error: any) {
      setMessages(prev => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: `System Error: ${error.message}` } : msg));
    } finally {
      setIsLoading(false);
      setActiveTool(null);
    }
  };

  const handleSuggestionClick = (opt: string) => {
    if (isLoading) return;
    processMessage(opt);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedMedia) || isLoading) return;
    const txt = input;
    const med = selectedMedia;
    setInput('');
    setSelectedMedia(null);
    setActiveTool(null);
    processMessage(txt || "Analyzing engineering data...", med || undefined);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex-1 flex flex-col theme-glass-card rounded-[2rem] overflow-hidden h-[calc(100vh-180px)] relative transition-all duration-300">
      <div className="scan-line"></div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar chat-blueprint relative z-10">
        <div className="watermark-overlay"></div>
        {messages.map((msg, idx) => {
          const isLatest = idx === messages.length - 1;
          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[90%] md:max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg border ${msg.role === 'user' ? 'bg-[var(--accent-color)] border-[var(--accent-color)]' : 'bg-white border-black/10'}`}>
                  {msg.role === 'user' ? <span className="text-white font-black text-xs">{user.name[0]}</span> : <img src={BOT_LOGO} className="w-full h-full object-contain p-1.5" alt="Bot" />}
                </div>
                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.image && (
                    <div className="rounded-2xl overflow-hidden border border-black/10 shadow-lg max-w-sm">
                      <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto max-h-60 object-cover" alt="Data" />
                    </div>
                  )}
                  <div className={`rounded-2xl px-5 py-3.5 shadow-md transition-all duration-300 relative ${
                    msg.role === 'user' ? 'bg-[var(--accent-color)] text-white rounded-tr-none shadow-blue-500/20' : 'bg-[var(--card-bg)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-color)]'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <>
                        <TypewriterText text={msg.content} isStreaming={isLoading && isLatest} onFinished={() => isLatest && generateSuggestions(msg.content)} />
                        {/* Render grounding sources if they exist */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-[var(--border-color)] animate-in fade-in duration-500">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-50">Sources & Grounding:</p>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-black/5 hover:bg-black/10 px-2 py-1 rounded border border-black/5 flex items-center gap-1 transition-colors no-underline">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth={2} /></svg>
                                  {s.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap text-[14px] font-medium">{msg.content}</div>
                    )}
                    
                    {msg.content && (
                      <button 
                        onClick={() => handleCopy(msg.content)}
                        className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 p-2 text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-all"
                        title="Copy text"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {suggestions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 justify-start pl-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-4">
            {suggestions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(opt)}
                className="px-4 py-2 bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 text-[var(--accent-color)] text-[11px] font-black uppercase tracking-wider rounded-full hover:bg-[var(--accent-color)] hover:text-white transition-all transform active:scale-95 shadow-sm"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-[var(--header-bg)] border-t border-[var(--border-color)] z-20">
        
        {/* Toolkit Matrix */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-3 no-scrollbar">
          {[
            { id: 'solve', label: 'Math Solver', icon: '🧠' },
            { id: 'formula', label: 'Formulas', icon: 'π' },
            { id: 'viva', label: 'Viva Prep', icon: '🎤' },
            { id: 'datasheet', label: 'Datasheet', icon: '📋' },
            { id: 'code', label: 'Explain Code', icon: '💻' },
            { id: 'project', label: 'Project Guru', icon: '🚀' },
            { id: 'study', label: 'Study Mode', icon: '📚' },
            { id: 'debug', label: 'Debug', icon: '⚡' },
            { id: 'extract', label: 'Extract', icon: '📄' },
            { id: 'component', label: 'Part ID', icon: '🔍' },
            { id: 'pinout', label: 'Pinout', icon: '🔌' },
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => handleActionClick(btn.id as ToolkitAction)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm active:scale-95 ${
                activeTool === btn.id 
                  ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]' 
                  : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-black/10'
              }`}
            >
              <span className="text-base">{btn.icon}</span> {btn.label}
            </button>
          ))}
        </div>

        {/* Action Dock */}
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Uplink Media" className="p-4 bg-[var(--input-bg)] rounded-2xl text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-all flex-shrink-0 border border-[var(--border-color)] shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2} /></svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeTool ? `Mode: ${activeTool.toUpperCase()}. Add context...` : "Type engineering query..."}
            disabled={isLoading}
            className="flex-1 px-5 py-4 rounded-2xl bg-[var(--input-bg)] text-[var(--text-primary)] outline-none text-sm font-semibold placeholder:opacity-40 border border-[var(--border-color)] focus:border-[var(--accent-color)]/50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedMedia)}
            className="px-8 py-4 bg-[var(--accent-color)] text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 hover:brightness-110 disabled:opacity-30"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" /> : "Execute"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
