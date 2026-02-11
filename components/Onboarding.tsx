
import React, { useState } from 'react';

interface OnboardingProps {
  onStart: (name: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onStart(name.trim());
    }
  };

  const eceImages = [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=300&h=200',
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=300&h=200',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=300&h=200'
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] py-10 animate-in fade-in zoom-in duration-700">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-0 overflow-hidden dark-glass-card rounded-[2rem] border border-white/10 shadow-2xl">
        
        {/* Left Side: Visual/Image Panel */}
        <div className="hidden md:flex flex-col relative bg-slate-900 overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-transparent z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800" 
            alt="ECE Hardware" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-110 hover:scale-100 transition-transform duration-10000"
          />
          
          <div className="mt-auto p-8 relative z-20">
            <div className="flex gap-2 mb-4">
              {eceImages.map((src, i) => (
                <div key={i} className="w-16 h-12 rounded-lg overflow-hidden border border-white/20 shadow-lg">
                  <img src={src} className="w-full h-full object-cover" alt="ECE Detail" />
                </div>
              ))}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Technical Excellence</h3>
            <p className="text-blue-200 text-sm opacity-80">
              Supporting the electronics and telecommunication engineering community since 1953.
            </p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="p-8 md:p-12 flex flex-col items-center justify-center relative">
          {/* Accent glow behind logo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none"></div>
          
          <div className="mb-8 flex flex-col items-center relative">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl p-2 border border-white/20 mb-4 transform hover:rotate-3 transition-transform">
               <img 
                src="https://r.jina.ai/i/9e006629906d4e248b1841b52a1b94c4" 
                alt="IETE Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">IETE Bot</h2>
            <div className="h-1 w-12 bg-blue-500 mt-1 rounded-full"></div>
          </div>
          
          <p className="text-slate-400 text-center text-sm mb-10 leading-relaxed max-w-xs">
            Connect with the core of engineering intelligence. Identify yourself to begin.
          </p>
          
          <form onSubmit={handleSubmit} className="w-full space-y-6 relative">
            <div className="text-left">
              <label htmlFor="name" className="block text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 ml-1">
                Your Identity
              </label>
              <input
                type="text"
                id="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your cute name"
                className="w-full px-6 py-4 rounded-2xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:bg-slate-800/80 outline-none transition-all placeholder:text-slate-600 font-medium shadow-inner"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/40 transition-all transform active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              Initialize Link
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
