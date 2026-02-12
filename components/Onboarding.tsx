import React, { useState } from 'react';

interface OnboardingProps {
  onStart: (name: string) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const BOT_LOGO = "https://jit.ac.in/assets/uploads/2022/12/IETE-logo.png";
  const COLLEGE_DETAILS_IMG = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkzXqnId5i9NXfPUDVmv1HdZR-tkLpUb9ue53hA7JlI5uXXQiRgMEuod9J&s=10";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isEntering) {
      setIsEntering(true);
      // Directly invoke the start callback. This will trigger a state update in App.tsx 
      // which switches the view to ChatInterface, unmounting this component.
      onStart(name.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-4 md:py-8 animate-in fade-in zoom-in duration-300 w-full px-4 overflow-hidden">
      <div className="w-full max-w-lg theme-glass-card rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden text-center flex flex-col shadow-2xl border-white/10">
        
        {/* Institutional Visual Header */}
        <div className="w-full h-32 md:h-48 overflow-hidden border-b border-white/10 bg-black/20">
          <img 
            src={COLLEGE_DETAILS_IMG} 
            alt="Raghu Educational Institutions" 
            className="w-full h-full object-cover brightness-90 hover:brightness-105 transition-all duration-700"
          />
        </div>

        <div className="p-6 md:p-10 flex flex-col items-center">
          <div className="mb-4 md:mb-6 flex flex-col items-center relative z-10">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-2xl p-1 border border-black/5 mb-3 transform hover:scale-105 transition-transform">
               <img 
                src={BOT_LOGO} 
                alt="IETE" 
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase mb-1 text-[var(--text-primary)]">IETE Bot</h2>
            <p className="text-blue-500 font-bold text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.4em]">Institutional Terminal</p>
          </div>
          
          <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-6 md:mb-8 leading-relaxed font-medium px-2">
            Professional AI terminal for electronics and telecommunication engineering at Raghu Educational Institutions.
          </p>
          
          <form onSubmit={handleSubmit} className="w-full space-y-4 md:space-y-5 relative z-10">
            <div className="text-left">
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name to launch..."
                className="w-full px-5 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-black/10 border border-white/10 text-[var(--text-primary)] text-base md:text-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:opacity-30 font-semibold"
                required
                autoComplete="off"
              />
            </div>
            
            <button
              type="submit"
              disabled={isEntering || !name.trim()}
              className="w-full py-3.5 md:py-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white font-black rounded-xl md:rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 uppercase tracking-[0.2em] text-[10px] md:text-xs flex items-center justify-center gap-2"
            >
              {isEntering ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                "LAUNCH TERMINAL →"
              )}
            </button>
          </form>

          <div className="mt-5 md:mt-6">
            <p className="text-[8px] md:text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold opacity-40">Raghu Educational Institutions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;