import React from 'react';
import { ThemeMode } from '../App';

interface HeaderProps {
  onReset: () => void;
  showReset: boolean;
  currentTheme: ThemeMode;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, showReset, currentTheme, onToggleTheme }) => {
  const IETE_LOGO = "https://jit.ac.in/assets/uploads/2022/12/IETE-logo.png";
  const RAGHU_LOGO = "https://www.aicjitf.org/wp-content/uploads/2021/12/rec.png";
  
  const getThemeIcon = () => {
    switch(currentTheme) {
      case 'light': return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
      case 'dark': return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
      default: return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
        </svg>
      );
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-[var(--header-bg)] backdrop-blur-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-2 md:gap-4 flex-shrink min-w-0">
          <div className="flex items-center -space-x-1.5 md:-space-x-3 flex-shrink-0">
            {/* Raghu Logo First */}
            <div className="w-8 h-8 md:w-11 md:h-11 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden p-0.5 md:p-1 border border-black/10 relative z-20">
               <img 
                src={RAGHU_LOGO} 
                alt="Raghu Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            {/* IETE Logo Second */}
            <div className="w-8 h-8 md:w-11 md:h-11 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden p-0.5 md:p-1 border border-black/10 relative z-10">
               <img 
                src={IETE_LOGO} 
                alt="IETE Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs md:text-lg font-bold leading-tight text-[var(--text-primary)] truncate">IETE Bot</h1>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
              <p className="text-[7px] md:text-[9px] opacity-60 font-medium uppercase tracking-wider text-[var(--text-secondary)] truncate">Raghu Terminal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          <button 
            onClick={onToggleTheme}
            className="p-1.5 md:p-2.5 rounded-lg md:rounded-xl border border-black/10 bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5"
          >
            {getThemeIcon()}
          </button>
          
          {showReset && (
            <button 
              onClick={onReset}
              className="text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-4 py-1.5 md:py-2.5 rounded-lg md:rounded-xl border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;