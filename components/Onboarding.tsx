
import React, { useState } from 'react';

interface OnboardingProps {
  onStart: (name: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [isEntering, setIsEntering] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsEntering(true);
      onStart(name.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-6 animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-lg p-8 md:p-10 theme-glass-card rounded-[2.5rem] relative overflow-hidden text-center">
        
        <div className="mb-8 flex flex-col items-center relative z-10">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl p-2 border border-black/5 mb-4 transform hover:scale-105 transition-transform">
             <img 
              src="https://r.jina.ai/i/9e006629906d4e248b1841b52a1b94c4" 
              alt="IETE" 
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase mb-1 text-[var(--text-primary)]">IETE Bot</h2>
          <p className="text-[var(--accent-color)] font-bold text-[9px] uppercase tracking-[0.4em]">v3.4 Terminal</p>
        </div>
        
        <p className="text-[var(--text-secondary)] text-sm mb-10 leading-relaxed font-medium">
          Identify yourself to access the professional engineering terminal.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-5 relative z-10">
          <div className="text-left">
            <input
              type="text"
              id="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-6 py-4 rounded-2xl bg-black/5 border border-black/10 text-[var(--text-primary)] text-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder:opacity-30 font-semibold"
              required
              autoComplete="off"
            />
          </div>
          
          <button
            type="submit"
            disabled={isEntering || !name.trim()}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-black rounded-2xl shadow-lg transition-all transform active:scale-[0.97] disabled:opacity-50 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
          >
            {isEntering ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              "Access Neural Link →"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
