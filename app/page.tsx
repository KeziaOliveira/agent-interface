'use client';

import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Avatar from '@/components/Avatar';

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLaughing, setIsLaughing] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes('pt-BR')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const handleLaugh = useCallback(() => {
    setIsLaughing(true);
    setIsSmiling(false);
    setTimeout(() => {
      setIsLaughing(false);
    }, 2000);
  }, []);

  const handleSmile = useCallback(() => {
    setIsSmiling(true);
    setIsLaughing(false);
    setTimeout(() => {
      setIsSmiling(false);
    }, 2000);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#050505]">
      {/* Background Gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at center, #10101a 0%, #050505 100%)',
        }}
      />

      {/* 3D Scene */}
      <div className="relative z-10 h-full w-full">
        <Canvas camera={{ position: [0, 0, 3], fov: 40 }}>
          <ambientLight intensity={1.5} />
          <pointLight position={[5, 10, 5]} intensity={0.8} />
          <Suspense fallback={null}>
            <Avatar
              isSpeaking={isSpeaking}
              isLaughing={isLaughing}
              isSmiling={isSmiling}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-24 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <button
            onClick={() =>
              speak('Olá! Eu sou seu assistente virtual. Como posso ajudar você hoje?')
            }
            className="group relative px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-medium tracking-widest uppercase transition-all duration-300 hover:bg-white/10 hover:border-white/20 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10">Falar</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </button>

          <button
            onClick={handleLaugh}
            className="group relative px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-medium tracking-widest uppercase transition-all duration-300 hover:bg-white/10 hover:border-white/20 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10">Gargalhar</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-white/5 to-pink-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </button>

          <button
            onClick={handleSmile}
            className="group relative px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-medium tracking-widest uppercase transition-all duration-300 hover:bg-white/10 hover:border-white/20 active:scale-95 overflow-hidden"
          >
            <span className="relative z-10">Sorrir</span>
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-white/5 to-yellow-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </button>
        </div>

        <div
          className={`mt-8 flex flex-col items-center gap-2 transition-opacity duration-500 ${isSpeaking || isLaughing || isSmiling ? 'opacity-100' : 'opacity-40'}`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors ${isSpeaking ? 'bg-blue-400 animate-pulse' : isLaughing ? 'bg-purple-400 animate-bounce' : 'bg-white/40'}`}
          />
          <p className="text-white/20 text-[10px] font-light tracking-[0.4em] uppercase">
            {isSpeaking
              ? 'Falando...'
              : isLaughing
                ? 'Rindo...'
                : isSmiling
                  ? 'Sorrindo...'
                  : 'Pronto'}
          </p>
        </div>
      </div>

      {/* Decorative Edge Glow */}
      <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 opacity-10" />
    </main>
  );
}
