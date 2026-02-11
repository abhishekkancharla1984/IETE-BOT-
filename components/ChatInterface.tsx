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
  | 'datasheet' | 'simulation' | 'research' | 'examprep' | 'units';

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
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return "Good morning";
      if (hour >= 12 && hour < 17) return "Good afternoon";
      if (hour >= 17 && hour < 21) return "Good evening";
      return "Hello";
    };

    const initialMessage: Message = {
      id: 'initial',
      role: 'assistant',
      content: '', 
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    geminiService.initChat(user.name);

    if (!process.env.API_KEY) {
      setConfigError("System Configuration Required: Please set the API_KEY environment variable.");
    }

    const welcomeText = `${getGreeting()}, ${user.name}! I am IETE Bot, your professional engineering assistant.\n\nI am equipped with specialized tools for circuit debugging, formula analysis, and research documentation. How can I assist your engineering work today?`;
    
    let currentText = "";
    const words = welcomeText.split(" ");
    let i = 0;
    
    setIsTyping(true);
    const interval = setInterval(() => {
      if (i < words.length) {
        currentText += (i === 0 ? "" : " ") + words[i];
        setMessages([{ ...initialMessage, content: currentText }]);
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
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
    }
  }, [messages, isLoading, isTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setSelectedMedia({ data: base64Data, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleActionClick = async (type: ToolkitAction) => {
    if (isLoading || isTyping) return;
    
    // Check if there is already text in the input box to "link" with the tool
    let context = input.trim();
    
    if (type === 'visualize') {
      const topic = context || prompt("Describe the technical diagram you need (e.g., 'Internal architecture of 8085'):");
      if (topic) await processVisualizer(topic);
      return;
    }

    // If tool requires an image and none is selected, trigger file picker
    if ((type === 'extract' || type === 'debug') && !selectedMedia && !context) {
       fileInputRef.current?.click();
       return;
    }

    // If no context exists in the input box, prompt for it
    if (!context && !selectedMedia) {
       context = prompt(`Enter the subject for ${type.toUpperCase()}:`) || "";
       if (!context) return;
    }

    executeTool(type, selectedMedia || undefined, context);
  };

  const processVisualizer = async (topic: string) => {
    setIsLoading(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Requesting high-fidelity technical diagram for: ${topic}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: `Rendering technical visualization...`, timestamp: new Date() }]);

    try {
      const imageResult = await geminiService.generateTechnicalImage(topic);
      if (imageResult) {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId 
            ? { ...msg, content: `Generated technical visualization for **${topic}**.`, image: imageResult } 
            : msg
        ));
      } else {
        throw new Error("Visualization pipeline failed.");
      }
    } catch (e: any) {
      setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: `Error: ${e.message}` } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const executeTool = async (type: ToolkitAction, media?: { data: string; mimeType: string }, customText?: string) => {
    let toolPrompt = "";
    const subject = customText || "";

    switch(type) {
      case 'extract': toolPrompt = `Perform deep technical data extraction. Identify all components, values, and text from this source: ${subject}`; break;
      case 'solve': toolPrompt = `Provide a step-by-step mathematical solution for the following engineering problem. Include LaTeX formulas: ${subject}`; break;
      case 'debug': toolPrompt = `Analyze this circuit/design for potential faults, short circuits, or logical errors. Suggest specific hardware fixes: ${subject}`; break;
      case 'pinout': toolPrompt = `Provide a detailed pin-functional description and electrical characteristics for this component: ${subject}`; break;
      case 'datasheet': toolPrompt = `Synthesize a datasheet summary for: ${subject}. Include typical ratings and standard application circuits.`; break;
      case 'simulation': toolPrompt = `Generate a simulation script (Python/Matlab/Spice) to model the behavior of: ${subject}`; break;
      case 'research': toolPrompt = `Act as a research assistant. Provide an IEEE format abstract and outline for: ${subject}`; break;
      case 'examprep': toolPrompt = `Generate 5 high-difficulty technical MCQs with deep explanations for GATE/IES prep on: ${subject}`; break;
      case 'formula': toolPrompt = `List all primary governing equations and physical constants associated with: ${subject}`; break;
      case 'code': toolPrompt = `Develop professional, optimized engineering code/firmware for: ${subject}`; break;
      case 'viva': toolPrompt = `Conduct a technical viva session. Ask me challenging questions about: ${subject}`; break;
      case 'units': toolPrompt = `Perform unit conversions and dimensional analysis for: ${subject}`; break;
      case 'project': toolPrompt = `Create a full engineering project roadmap (BOM, Circuit, Logic) for: ${subject}`; break;
      default: toolPrompt = `Analyze: ${subject}`;
    }

    setSelectedMedia(null);
    setInput('');
    await processMessage(toolPrompt, media);
  };

  const processMessage = async (text: string, media?: { data: string; mimeType: string }) => {
    if (isLoading || isTyping) return;
    setIsLoading(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      image: media
    };
    setMessages(prev => [...prev, userMessage]);
    
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      let fullContent = '';
      const stream = await geminiService.sendMessageStream(text, media);
      
      for await (const chunk of stream) {
        fullContent += chunk.text || "";
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId ? { 
            ...msg, 
            content: fullContent,
            sources: chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
                title: c.web?.title || 'Resource',
                uri: c.web?.uri
            })).filter((s: any) => s.uri)
          } : msg
        ));
      }
      geminiService.updateHistory('user', [{ text }, ...(media ? [{ inlineData: media }] : [])]);
      geminiService.updateHistory('model', [{ text: fullContent }]);
    } catch (error: any) {
      setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: `Error: ${error.message}` } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedMedia) || isLoading || isTyping) return;
    const txt = input || (selectedMedia ? "Extract technical data from this image." : "");
    const media = selectedMedia;
    setInput('');
    setSelectedMedia(null);
    processMessage(txt, media || undefined);
  };

  return (
    <div className="flex-1 flex flex-col theme-glass-card rounded-[2rem] overflow-hidden h-[calc(100vh-180px)] relative">
      {configError && <div className="bg-red-600 text-white text-[10px] py-1 text-center font-bold">{configError}</div>}
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 chat-blueprint relative">
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
        {messages.map((msg, index) => {
          const isLast = index === messages.length - 1;
          const showCursor = isLast && isTyping && msg.role === 'assistant';
          
          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
              <div className={`flex gap-4 max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg bg-white border border-black/10 overflow-hidden p-0.5">
                  {msg.role === 'user' ? <span className="font-bold text-blue-900 text-sm">{user.name[0]}</span> : <img src={BOT_LOGO} className="w-full h-full object-contain" alt="IETE" />}
                </div>
                <div className="flex flex-col gap-3">
                  <div className={`rounded-2xl px-6 py-4 shadow-md border backdrop-blur-sm ${
                    msg.role === 'user' ? 'bg-blue-900 text-white border-blue-800 rounded-tr-none' : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-color)] rounded-tl-none'
                  }`}>
                    <div className={`markdown-body prose prose-invert max-w-none ${showCursor ? 'typing-cursor' : ''}`}>
                      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                        {msg.sources.map((source, idx) => (
                          <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[9px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-bold truncate max-w-[150px]">
                            {source.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.image && (
                    <div className="rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-xl bg-black/30 p-1">
                      <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto rounded-xl max-h-[500px] object-contain bg-white" alt="Output" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && !isTyping && (
          <div className="flex justify-start items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-900/10 animate-pulse"></div>
            <div className="h-4 w-32 bg-blue-900/10 rounded animate-pulse"></div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-[var(--header-bg)] border-t border-[var(--border-color)] z-20">
        {selectedMedia && (
          <div className="mb-4 flex items-center gap-2">
            <div className="relative group">
              <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-16 w-16 rounded-lg object-cover border-2 border-blue-500 shadow-lg" alt="Preview" />
              <button 
                onClick={() => setSelectedMedia(null)} 
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">Image Loaded</p>
          </div>
        )}

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: 'extract', label: 'Extract', icon: '🔍' },
            { id: 'debug', label: 'Circuit Debug', icon: '🛠️' },
            { id: 'visualize', label: 'Diagram', icon: '🎨' },
            { id: 'solve', label: 'Solve', icon: '🧠' },
            { id: 'formula', label: 'Equations', icon: 'π' },
            { id: 'datasheet', label: 'Datasheet', icon: '📑' },
            { id: 'simulation', label: 'Simulate', icon: '🧪' },
            { id: 'examprep', label: 'GATE Prep', icon: '📚' },
            { id: 'research', label: 'Research', icon: '📝' },
            { id: 'code', label: 'Code', icon: '💻' },
            { id: 'pinout', label: 'Pinout', icon: '🔌' },
          ].map(tool => (
            <button 
              key={tool.id} 
              onClick={() => handleActionClick(tool.id as ToolkitAction)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-[10px] font-black uppercase tracking-wider hover:bg-blue-900/10 hover:border-blue-500/50 transition-all disabled:opacity-50 whitespace-nowrap active:scale-95 shadow-sm"
              disabled={isLoading || isTyping}
            >
              <span>{tool.icon}</span> {tool.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 max-w-5xl mx-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-blue-500 disabled:opacity-50 transition-colors shadow-inner"
            disabled={isLoading || isTyping}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your query or use the toolkit..."
            className="flex-1 px-5 py-3.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] outline-none focus:border-blue-900/50 text-sm disabled:opacity-50 transition-all shadow-inner"
            disabled={isLoading || isTyping}
          />
          <button type="submit" disabled={isLoading || isTyping || (!input.trim() && !selectedMedia)} className="px-8 py-3.5 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:brightness-110 transition-all disabled:opacity-30 shadow-lg active:scale-95 min-w-[100px]">
            {isLoading ? <div className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin mx-auto" /> : "Transmit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;