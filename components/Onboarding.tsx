import React, { useState } from 'react';

interface OnboardingProps {
  onStart: (name: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const BOT_LOGO = "https://lh3.googleusercontent.com/d/1okR_9jrXleV9_e83vWb-THZq3re2k7eM";
  // Updated with the user-provided institutional image URL
  const COLLEGE_DETAILS_IMG = "https://lh3.googleusercontent.com/d/1SsS4eSlD3EqwNs8gOLMuOCNflh_bTx0n";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isEntering) {
      setIsEntering(true);
      onStart(name.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-4 md:py-8 animate-in fade-in zoom-in duration-300 w-full px-4 overflow-hidden">
      <div className="w-full max-w-lg theme-glass-card rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden text-center flex flex-col shadow-2xl border-white/10">
        
        {/* Institutional Visual Header - Adjusted for better fit with small space */}
        <div className="w-full h-44 md:h-64 overflow-hidden border-b border-white/10 bg-black/40 relative flex items-center justify-center p-2">
          {/* Background Blurred Version for depth */}
          <div 
            className="absolute inset-0 opacity-20 blur-xl scale-110"
            style={{ 
              backgroundImage: `url(${COLLEGE_DETAILS_IMG})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          
          <img 
            src={COLLEGE_DETAILS_IMG} 
            alt="Institutional Campus" 
            className="relative z-10 w-full h-full object-contain brightness-110 transition-all duration-1000 transform hover:scale-[1.02] shadow-2xl rounded-lg"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
        </div>

        <div className="p-6 md:p-10 flex flex-col items-center">
          <div className="mb-4 md:mb-6 flex flex-col items-center relative z-10 -mt-14 md:-mt-16">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-[#020617] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] p-1.5 border-4 border-[#0f172a] mb-3 transform hover:rotate-3 transition-transform relative group">
               <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse"></div>
               <img 
                src={BOT_LOGO} 
                alt="ELITEUNIVERSE Logo" 
                className="w-full h-full object-contain relative z-10"
              />
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1 text-[var(--text-primary)]">Elite Bot</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <p className="text-blue-500 font-bold text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.4em]">Interactive Learning System</p>
            </div>
          </div>
          
          <p className="text-[var(--text-secondary)] text-[10px] md:text-xs mb-6 md:mb-8 leading-relaxed font-medium px-2">
            A professional AI terminal developed in collaboration with <span className="text-blue-500 font-bold">ELITEUNIVERSE</span>. 
            Created by <span className="text-[var(--text-primary)] font-bold">ABHISHEK GUPTA KANCHARLA</span> for Engineering students, 
            for easy learning and understanding their doubts.
          </p>
          
          <form onSubmit={handleSubmit} className="w-full space-y-4 md:space-y-5 relative z-10">
            <div className="text-left">
              <label className="block text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 ml-1">Personnel Identification</label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name to start a session..."
                className="w-full px-5 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-black/10 border border-white/10 text-[var(--text-primary)] text-base md:text-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:opacity-20 font-semibold shadow-inner"
                required
                autoComplete="off"
              />
            </div>
            
            <button
              type="submit"
              disabled={isEntering || !name.trim()}
              className="w-full py-3.5 md:py-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white font-black rounded-xl md:rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] text-[10px] md:text-xs flex items-center justify-center gap-2 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
              {isEntering ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  <span className="relative z-10">INITIALIZING LINK...</span>
                </>
              ) : (
                <span className="relative z-10 flex items-center gap-2">START A SESSION <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 w-full flex flex-col gap-2">
            <p className="text-[8px] md:text-[9px] text-[var(--text-secondary)] uppercase tracking-[0.2em] font-bold opacity-40">Designed & Developed by</p>
            <div className="flex items-center justify-center gap-3">
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-blue-400 font-black tracking-widest uppercase">ABHISHEK GUPTA KANCHARLA</span>
                <span className="text-[7px] text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.3em]">Lead Architect</span>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-white font-black tracking-widest uppercase">ELITEUNIVERSE</span>
                <span className="text-[7px] text-[var(--text-secondary)] opacity-50 uppercase tracking-[0.3em]">Partnership</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;