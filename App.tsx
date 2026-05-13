
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import ChatInterface from './components/ChatInterface';
import { UserProfile } from './types';

export type ThemeMode = 'default' | 'light' | 'dark';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('default');

  useEffect(() => {
    // Load User
    const savedUser = localStorage.getItem('elite_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser({ ...parsed, joinedAt: new Date(parsed.joinedAt) });
      } catch (e) { console.error(e); }
    }

    // Load Theme
    const savedTheme = localStorage.getItem('elite_theme') as ThemeMode;
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    } else {
      document.body.setAttribute('data-theme', 'default');
    }
  }, []);

  const handleStart = (name: string) => {
    const newUser: UserProfile = { name, joinedAt: new Date() };
    setUser(newUser);
    localStorage.setItem('elite_user', JSON.stringify(newUser));
  };

  const handleReset = () => {
    localStorage.removeItem('elite_user');
    setUser(null);
  };

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['default', 'light', 'dark'];
    const nextIndex = (modes.indexOf(theme) + 1) % modes.length;
    const nextTheme = modes[nextIndex];
    setTheme(nextTheme);
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('elite_theme', nextTheme);
  };

  return (
    <div className="flex flex-col min-h-screen iete-theme-bg">
      <Header 
        onReset={handleReset} 
        showReset={!!user} 
        currentTheme={theme}
        onToggleTheme={toggleTheme}
      />
      
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 md:p-6 z-10 relative">
        {!user ? (
          <Onboarding onStart={handleStart} />
        ) : (
          <ChatInterface user={user} />
        )}
      </main>

      <footer className="py-4 text-center text-[9px] md:text-[10px] opacity-60 bg-black/5 backdrop-blur-md border-t border-black/5 z-20">
        <div className="flex flex-col items-center gap-1 max-w-4xl mx-auto px-4">
          <p>© {new Date().getFullYear()} ELITEUNIVERSE Terminal Collaboration.</p>
          <p className="mt-1 leading-relaxed opacity-80">A professional AI terminal developed in collaboration with <span className="font-black text-[var(--text-primary)]">ELITEUNIVERSE</span>. Created by <span className="font-black text-[var(--text-primary)]">ABHISHEK GUPTA KANCHARLA</span> for Engineering students.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
