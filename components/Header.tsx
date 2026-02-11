
import React from 'react';

interface HeaderProps {
  onReset: () => void;
  showReset: boolean;
}

const Header: React.FC<HeaderProps> = ({ onReset, showReset }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40 overflow-hidden p-0.5 border border-white/10">
             <img 
              src="https://r.jina.ai/i/9e006629906d4e248b1841b52a1b94c4" 
              alt="IETE Logo" 
              className="w-full h-full object-contain" 
              onError={(e) => {
                (e.target as any).src = `https://ui-avatars.com/api/?name=IETE&background=1d4ed8&color=fff&bold=true`;
              }}
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">IETE Bot</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">AI Systems Active</p>
            </div>
          </div>
        </div>

        {showReset && (
          <button 
            onClick={onReset}
            className="text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-tighter transition-all px-3 py-1.5 rounded-full border border-white/5 hover:border-white/20 bg-white/5"
          >
            New Session
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
