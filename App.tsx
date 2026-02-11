
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import ChatInterface from './components/ChatInterface';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('iete_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser({
          ...parsed,
          joinedAt: new Date(parsed.joinedAt)
        });
      } catch (e) {
        console.error("Failed to load user session", e);
      }
    }
  }, []);

  const handleStart = (name: string) => {
    const newUser: UserProfile = {
      name,
      joinedAt: new Date()
    };
    setUser(newUser);
    localStorage.setItem('iete_user', JSON.stringify(newUser));
  };

  const handleReset = () => {
    localStorage.removeItem('iete_user');
    setUser(null);
  };

  return (
    <div className="flex flex-col min-h-screen iete-theme-bg">
      <Header onReset={handleReset} showReset={!!user} />
      
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 md:p-6 z-10 relative">
        {!user ? (
          <Onboarding onStart={handleStart} />
        ) : (
          <ChatInterface user={user} />
        )}
      </main>

      <footer className="py-4 text-center text-[10px] text-slate-500 bg-black/40 backdrop-blur-md border-t border-white/5 z-20">
        <div className="flex flex-col items-center gap-1">
          <p>© {new Date().getFullYear()} The Institution of Electronics and Telecommunication Engineers (IETE).</p>
          <p className="opacity-60 uppercase tracking-widest font-medium">Electronics • Telecommunication • Information Technology</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
