'use client';

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Avatar from '@/components/Avatar';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLaughing, setIsLaughing] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  // Side Panels & Conversation States
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat history
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRightPanelOpen]);

  // Load Voices
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const availableVoices = window.speechSynthesis.getVoices();
    setVoices(availableVoices);
    
    // Set default pt-BR voice if not selected
    if (!selectedVoice) {
      const defaultVoice = availableVoices.find(v => v.lang.includes('pt-BR')) || availableVoices[0];
      setSelectedVoice(defaultVoice || null);
    }
  }, [selectedVoice]);

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  // 1. Text-to-Speech
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  // 2. Response Engine
  const getAIResponse = (text: string): string => {
    const input = text.toLowerCase();
    if (input.includes('oi') || input.includes('olá') || input.includes('ola')) {
      return "Olá! Sou seu assistente Omega. Em que posso ajudar?";
    }
    if (input.includes('nome')) {
      return "Eu me chamo Omega, sou o seu assistente minimalista em 3D.";
    }
    if (input.includes('hora')) {
      const now = new Date();
      return `Agora são ${now.getHours()} horas e ${now.getMinutes()} minutos.`;
    }
    if (input.includes('quem é você') || input.includes('que é você')) {
        return "Sou uma inteligência artificial criada para interagir com você através deste avatar 3D.";
    }
    return "Entendi! Estou ouvindo você.";
  };

  // 3. Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);

        recognitionRef.current.onresult = (event: any) => {
          const resultText = event.results[event.resultIndex][0].transcript;
          setTranscript(resultText);
          
          // Add user message to history
          const userMsg: Message = { role: 'user', text: resultText, timestamp: Date.now() };
          
          // Process response
          const aiText = getAIResponse(resultText);
          setResponse(aiText);
          const aiMsg: Message = { role: 'assistant', text: aiText, timestamp: Date.now() + 100 };

          setMessages(prev => [...prev, userMsg, aiMsg]);
          
          setTimeout(() => speak(aiText), 500);
        };
      }
    }
  }, [speak]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      setTranscript('');
      setResponse('');
      recognitionRef.current.start();
    }
  }, [isListening, isSpeaking]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#050505] font-sans selection:bg-blue-500/30">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#10101a_0%,_#050505_100%)]" />

      {/* 3D Scene */}
      <div className="relative z-10 h-full w-full">
        <Canvas camera={{ position: [0, 0, 3], fov: 40 }}>
          <ambientLight intensity={1.5} />
          <pointLight position={[5, 10, 5]} intensity={0.8} />
          <Suspense fallback={null}>
            <Avatar isSpeaking={isSpeaking} isLaughing={isLaughing} isSmiling={isSmiling} />
          </Suspense>
        </Canvas>
      </div>

      {/* LEFT PANEL: Voice Settings */}
      <div className={`absolute top-0 left-0 z-30 h-full w-72 bg-black/40 backdrop-blur-xl border-r border-white/5 transition-transform duration-500 ease-out p-6 pt-20 ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <h2 className="text-white/40 text-xs uppercase tracking-[0.3em] font-medium mb-6">Configurações de Voz</h2>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar pr-2">
            {voices.length > 0 ? (
                voices.map((voice, idx) => (
                    <button
                        key={`${voice.name}-${idx}`}
                        onClick={() => setSelectedVoice(voice)}
                        className={`text-left p-3 rounded-xl transition-all border ${
                            selectedVoice?.name === voice.name 
                            ? 'bg-white/10 border-white/20 text-white' 
                            : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white/60'
                        }`}
                    >
                        <p className="text-[11px] font-medium truncate">{voice.name}</p>
                        <p className="text-[9px] opacity-40 uppercase tracking-widest mt-1">{voice.lang}</p>
                    </button>
                ))
            ) : (
                <p className="text-white/20 text-[10px] italic">Nenhuma voz encontrada no sistema.</p>
            )}
        </div>
      </div>

      {/* RIGHT PANEL: Chat History */}
      <div className={`absolute top-0 right-0 z-30 h-full w-80 bg-black/40 backdrop-blur-xl border-l border-white/5 transition-transform duration-500 ease-out flex flex-col pt-20 ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <h2 className="px-6 text-white/40 text-xs uppercase tracking-[0.3em] font-medium mb-6">Histórico da Conversa</h2>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-4 custom-scrollbar">
            {messages.length > 0 ? (
                messages.map((msg, i) => (
                    <div key={msg.timestamp + i} className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                        <span className="text-[8px] text-white/20 uppercase tracking-widest mb-1">{msg.role === 'user' ? 'Você' : 'Omega'}</span>
                        <div className={`p-3 rounded-2xl text-[13px] leading-relaxed font-light ${
                            msg.role === 'user' 
                            ? 'bg-white/5 text-white/90 rounded-tr-none' 
                            : 'bg-blue-500/10 text-blue-100 border border-blue-500/10 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex-1 flex items-center justify-center text-white/10 text-[10px] uppercase tracking-[0.4em] text-center">
                    Nenhuma mensagem ainda
                </div>
            )}
        </div>
      </div>

      {/* Floating UI Toggles */}
      <button 
        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        className={`absolute left-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isLeftPanelOpen ? 'bg-white/10 border-white/20 -translate-x-2' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
      >
        <span className="text-sm opacity-60">{isLeftPanelOpen ? '←' : '🎙️'}</span>
      </button>

      <button 
        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
        className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isRightPanelOpen ? 'bg-white/10 border-white/20 translate-x-2' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
      >
        <span className="text-sm opacity-60">{isRightPanelOpen ? '→' : '💬'}</span>
      </button>

      {/* Interaction Bubbles (Persistent in Center) */}
      <div className="absolute top-12 left-0 right-0 z-20 flex flex-col items-center gap-3 px-6 pointer-events-none transition-all duration-500">
        {!isRightPanelOpen && transcript && (
          <div className="max-w-md p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500 text-center">
            <p className="text-white/80 text-[13px] font-light">"{transcript}"</p>
          </div>
        )}
      </div>

      {/* Main Bottom UI */}
      <div className="absolute bottom-16 left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
        <div className="flex flex-col items-center gap-6 pointer-events-auto">
          {/* Microphone Button */}
          <button
            onClick={startListening}
            disabled={isListening || isSpeaking}
            className={`group relative flex items-center justify-center w-20 h-20 rounded-full border transition-all duration-700 ${
              isListening 
                ? 'bg-red-500/20 border-red-500/40 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.2)]' 
                : isSpeaking
                ? 'bg-blue-500/5 border-blue-500/10 opacity-40 cursor-not-allowed scale-90'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95'
            }`}
          >
            <span className={`text-2xl transition-all ${isListening ? 'animate-pulse scale-125' : ''}`}>
              {isListening ? '🔵' : '🎤'}
            </span>
            {!isListening && !isSpeaking && (
              <div className="absolute inset-0 rounded-full bg-blue-500/10 scale-[1.2] opacity-0 blur-xl group-hover:opacity-100 transition-opacity duration-1000" />
            )}
            <p className="absolute -bottom-8 whitespace-nowrap text-white/20 text-[9px] uppercase tracking-[0.3em] font-light">
                {isListening ? 'Escutando...' : isSpeaking ? 'Omega falando' : 'Tocar para falar'}
            </p>
          </button>
          
          <div className="flex gap-3 opacity-40 hover:opacity-100 transition-opacity">
            <button
                onClick={() => setIsSmiling(!isSmiling)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${isSmiling ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
            >
                {isSmiling ? '😊' : '🙂'}
            </button>
            <button
                onClick={() => setIsLaughing(!isLaughing)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${isLaughing ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
            >
                {isLaughing ? '😆' : '😄'}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </main>
  );
}
