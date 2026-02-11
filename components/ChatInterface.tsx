
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Message } from '../types';
import { geminiService } from '../geminiService';

interface ChatInterfaceProps {
  user: UserProfile;
}

type ToolkitAction = 'extract' | 'solve' | 'search' | 'debug' | 'code' | 'component' | 'pinout' | 'iete' | 'soundtrack';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ data: string; mimeType: string } | null>(null);
  const [activeTool, setActiveTool] = useState<ToolkitAction | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BOT_LOGO = "https://r.jina.ai/i/9e006629906d4e248b1841b52a1b94c4";

  useEffect(() => {
    const hours = new Date().getHours();
    let greeting = 'Hello';
    if (hours < 12) greeting = 'Good Morning';
    else if (hours < 17) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';

    const initialMessage: Message = {
      id: 'initial',
      role: 'assistant',
      content: `${greeting}, ${user.name}! I am IETE Bot. How can I support your engineering mission today?\n\nChoose a specialized tool from the matrix below or describe your query manually.`,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    geminiService.initChat(user.name);
  }, [user.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedMedia({ data: base64String, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAction = async (type: ToolkitAction) => {
    if (isLoading) return;
    
    // Check if media is required for some actions
    const mediaRequired = ['extract', 'debug', 'component', 'soundtrack'].includes(type);
    if (mediaRequired && !selectedMedia) {
      const mediaType = type === 'soundtrack' ? 'audio' : 'image';
      alert(`The ${type.toUpperCase()} tool requires an ${mediaType} file. Please upload a file first.`);
      return;
    }

    setActiveTool(type);
    
    let prompt = "";
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || "";
    
    switch(type) {
      case 'extract': prompt = "COMMAND: EXTRACT TEXT. Perform high-precision OCR on this uploaded image to extract all readable text."; break;
      case 'solve': prompt = "COMMAND: SOLVE. Provide a step-by-step technical solution for the visible problem."; break;
      case 'search': prompt = "COMMAND: FETCH RELATED IMAGE. Find professional diagrams, schematics, or datasheets related to: " + (lastUserMsg || "IETE standards"); break;
      case 'debug': prompt = "COMMAND: DEBUG CIRCUIT. Analyze this circuit for faults, shorts, or missing components."; break;
      case 'code': prompt = "COMMAND: LOGIC ANALYSIS. Explain, debug, or optimize the algorithms/code provided."; break;
      case 'component': prompt = "COMMAND: IDENTIFY COMPONENT. Tell me what this electronic component is and its typical application."; break;
      case 'pinout': prompt = "COMMAND: PINOUT GUIDE. Provide the pinout and connection details for the component shown or mentioned."; break;
      case 'iete': prompt = "COMMAND: IETE FACTS. Provide detailed information about IETE centers, membership, or history."; break;
      case 'soundtrack': prompt = "COMMAND: SOUNDTRACK IDENTIFICATION. Identify the soundtrack or audio signature in this uploaded file."; break;
    }

    const currentMedia = selectedMedia;
    setSelectedMedia(null);
    await processMessage(prompt, currentMedia || undefined);
    setActiveTool(null);
  };

  const processMessage = async (text: string, media?: { data: string; mimeType: string }) => {
    if (isLoading) return;
    
    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date(),
      image: media?.mimeType.startsWith('image/') ? media : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      let fullContent = '';
      let sources: { title: string; uri: string }[] = [];
      const streamResponse = await geminiService.sendMessageStream(text, media);
      
      for await (const chunk of streamResponse) {
        fullContent += chunk.text || "";
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
          groundingChunks.forEach((c: any) => {
            if (c.web && !sources.find(s => s.uri === c.web.uri)) {
              sources.push({ title: c.web.title, uri: c.web.uri });
            }
          });
        }
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId ? { ...msg, content: fullContent, sources: sources.length > 0 ? sources : undefined } : msg
        ));
      }
      
      geminiService.updateHistory('user', [{ text: text }, ...(media ? [{ inlineData: media }] : [])]);
      geminiService.updateHistory('model', [{ text: fullContent }]);
      
    } catch (error: any) {
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { ...msg, content: `Error: ${error.message || "Neural failure."}` } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedMedia) || isLoading) return;
    const txt = input;
    const med = selectedMedia;
    setInput('');
    setSelectedMedia(null);
    processMessage(txt || (med ? "Analyze this uploaded data." : ""), med || undefined);
  };

  return (
    <div className="flex-1 flex flex-col dark-glass-card rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 h-[calc(100vh-220px)] relative border border-white/5">
      <div className="scan-line"></div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar chat-blueprint relative">
        <div className="watermark-overlay" style={{ backgroundImage: `url(${BOT_LOGO})`, opacity: 0.03 }}></div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex relative z-10 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[80%] flex gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg overflow-hidden border bg-white">
                {msg.role === 'user' ? (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">{user.name[0]}</div>
                ) : <img src={BOT_LOGO} className="w-full h-full object-contain" alt="Bot" />}
              </div>
              <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.image && (
                  <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl max-w-sm">
                    <img src={`data:${msg.image.mimeType};base64,${msg.image.data}`} className="w-full h-auto max-h-64 object-cover" alt="Uploaded" />
                  </div>
                )}
                <div className={`rounded-2xl px-5 py-3.5 shadow-xl ${
                  msg.role === 'user' ? 'bg-blue-700 text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none border'
                }`}>
                  <div className="whitespace-pre-wrap text-[14px] leading-relaxed">
                    {msg.content || (isLoading && msg.id === messages[messages.length - 1].id ? (
                      <div className="flex flex-col gap-2 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        </div>
                        <span className="text-[9px] uppercase font-black text-blue-500 tracking-widest opacity-80">
                          {activeTool ? `RUNNING ${activeTool.toUpperCase()} MODE...` : "IETE bot is computing..."}
                        </span>
                      </div>
                    ) : "")}
                  </div>
                  {msg.sources && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                      {msg.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded border hover:bg-blue-100 transition-colors">{s.title || "Source"}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 md:p-6 bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 z-20">
        
        {selectedMedia && (
          <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-bottom-2">
            <div className="relative group">
              {selectedMedia.mimeType.startsWith('image/') ? (
                <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="h-16 w-16 object-cover rounded-xl border-2 border-blue-500" alt="Preview" />
              ) : (
                <div className="h-16 w-16 bg-blue-900/40 border-2 border-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}
              <button onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg">✕</button>
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{selectedMedia.mimeType.split('/')[0]} Data Buffered</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Ready for toolkit processing</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          {[
            { id: 'extract', label: 'Extract Text', color: 'blue' },
            { id: 'solve', label: 'Solve Problem', color: 'indigo' },
            { id: 'soundtrack', label: 'Soundtrack ID', color: 'purple' },
            { id: 'debug', label: 'Circuit Debug', color: 'red' },
            { id: 'component', label: 'Identify Component', color: 'amber' },
            { id: 'pinout', label: 'Pinout Guide', color: 'pink' },
            { id: 'code', label: 'Logic Analysis', color: 'orange' },
            { id: 'iete', label: 'IETE Facts', color: 'sky' },
            { id: 'search', label: 'Fetch Related Image', color: 'emerald' },
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => handleAction(btn.id as ToolkitAction)}
              disabled={isLoading}
              className={`whitespace-nowrap px-4 py-2 bg-${btn.color}-600/10 border border-${btn.color}-500/20 rounded-xl text-${btn.color}-400 text-[10px] font-black uppercase tracking-widest hover:bg-${btn.color}-600/20 active:scale-95 transition-all disabled:opacity-30`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2.5 max-w-4xl mx-auto items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,audio/*,video/*" className="hidden" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query IETE Bot..."
            disabled={isLoading}
            className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 text-sm font-medium transition-all"
          />
          
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedMedia)}
            className="px-8 py-4 bg-gradient-to-br from-blue-600 to-blue-800 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-blue-900/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin" /> : 'Run'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
