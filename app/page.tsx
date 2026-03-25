'use client';

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Avatar from '@/components/Avatar';
import Groq from 'groq-sdk';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

// 0. Initialize Groq
const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

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
  
  // NEW: Text Input States
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat history
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRightPanelOpen, isLoading]);

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

  // 2. Groq AI Response Engine
  const getAIResponse = async (text: string): Promise<string> => {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Você é Omega, um assistente virtual amigável, amigável, leve e humano. Responda de forma natural, curta (no máximo 2-3 frases) e em português do Brasil. Evite formalidades excessivas."
          },
          {
            role: "user",
            content: text
          }
        ],
        model: "llama-3.3-70b-versatile",
      });

      return completion.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
    } catch (error) {
      console.error("Groq API Error:", error);
      return "Desculpe, tive um problema para responder agora.";
    }
  };

  // NEW: Unified Message Handler (Voice & Text)
  const handleUserMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // 1. Add user message
    const userMsg: Message = { role: 'user', text: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // 2. Clear current visual transcript
    setTranscript(text);

    // 3. Get AI Response
    const aiText = await getAIResponse(text);
    setResponse(aiText);
    
    // 4. Add AI message
    const aiMsg: Message = { role: 'assistant', text: aiText, timestamp: Date.now() + 100 };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    // 5. Speak response
    setTimeout(() => speak(aiText), 500);
  }, [isLoading, speak]);

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
          handleUserMessage(resultText);
        };
      }
    }
  }, [handleUserMessage]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isSpeaking && !isLoading) {
      setTranscript('');
      setResponse('');
      recognitionRef.current.start();
    }
  }, [isListening, isSpeaking, isLoading]);

  const handleLaugh = useCallback(() => {
    setIsLaughing(true);
    setIsSmiling(false);
    setTimeout(() => setIsLaughing(false), 2000);
  }, []);

  const handleSmile = useCallback(() => {
    setIsSmiling(true);
    setIsLaughing(false);
    setTimeout(() => setIsSmiling(false), 2000);
  }, []);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleUserMessage(inputValue);
      setInputValue('');
    }
  };

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
        <h2 className="text-white/40 text-xs uppercase tracking-[0.3em] font-medium mb-6 text-center">Configurações de Voz</h2>
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

      {/* RIGHT PANEL: Chat History & Input */}
      <div className={`absolute top-0 right-0 z-30 h-full w-80 bg-black/60 backdrop-blur-2xl border-l border-white/10 transition-transform duration-500 ease-out flex flex-col ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Panel Header */}
        <div className="pt-20 pb-4 px-6 border-b border-white/5 bg-white/5">
            <h2 className="text-white text-xs uppercase tracking-[0.3em] font-bold opacity-70">Conversa</h2>
            <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">Llama 3 Powered</p>
        </div>
        
        {/* Messages List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5 custom-scrollbar pb-10">
            {messages.length > 0 ? (
                messages.map((msg, i) => (
                    <div key={msg.timestamp + i} className={`max-w-[90%] flex flex-col ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <span className="text-[8px] text-white/20 uppercase tracking-widest mb-1">{msg.role === 'user' ? 'Você' : 'Omega'}</span>
                        <div className={`p-3 rounded-2xl text-[13px] leading-relaxed font-light ${
                            msg.role === 'user' 
                            ? 'bg-white/10 text-white/90 rounded-tr-none' 
                            : 'bg-blue-600/20 text-blue-50 border border-blue-500/20 rounded-tl-none shadow-[0_4px_20px_-5px_rgba(59,130,246,0.2)]'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <span className="text-xl opacity-20">💬</span>
                    </div>
                    <p className="text-white/20 text-[10px] uppercase tracking-[0.2em] leading-relaxed">
                        Inicie uma conversa via voz ou texto abaixo.
                    </p>
                </div>
            )}
            
            {/* Loading / Typing Indicator */}
            {isLoading && (
              <div className="self-start items-start opacity-70 animate-in fade-in duration-300">
                <span className="text-[8px] text-white/20 uppercase tracking-widest mb-1">Omega</span>
                <div className="flex gap-1.5 p-3 bg-blue-500/10 rounded-2xl rounded-tl-none border border-blue-500/20">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
        </div>

        {/* Text Input Footer - FIXED AT BOTTOM */}
        <div className="p-6 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <form onSubmit={handleSubmitText} className="relative group">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Diga algo..."
                    disabled={isLoading}
                    autoFocus={isRightPanelOpen}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all duration-300 ${
                        !inputValue.trim() || isLoading 
                        ? 'text-white/5' 
                        : 'text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 active:scale-90'
                    }`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </form>
            <div className="flex justify-between items-center mt-4 px-1">
                <p className="text-[8px] text-white/10 uppercase tracking-widest">Pressione Enter</p>
                <div className="flex gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/5'}`} title="Status Microfone" />
                    <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-white/5'}`} title="Status IA" />
                </div>
            </div>
        </div>
      </div>

      {/* Floating UI Toggles */}
      <button 
        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        className={`absolute left-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isLeftPanelOpen ? 'bg-white/10 border-white/20 -translate-x-2' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl'}`}
      >
        <span className="text-sm opacity-60">{isLeftPanelOpen ? '←' : '🎙️'}</span>
      </button>

      <button 
        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
        className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isRightPanelOpen ? 'bg-white/10 border-white/20 translate-x-2' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl'}`}
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

      {/* Main Bottom UI (Microphone & Reactions) */}
      <div className="absolute bottom-16 left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
        <div className="flex flex-col items-center gap-6 pointer-events-auto">
          {/* Microphone Button */}
          <button
            onClick={startListening}
            disabled={isListening || isSpeaking || isLoading}
            className={`group relative flex items-center justify-center w-20 h-20 rounded-full border transition-all duration-700 ${
              isListening 
                ? 'bg-red-500/20 border-red-500/40 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.2)]' 
                : (isSpeaking || isLoading)
                ? 'bg-blue-500/5 border-blue-500/10 opacity-40 cursor-not-allowed scale-90'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 shadow-2xl'
            }`}
          >
            <span className={`text-2xl transition-all ${isListening ? 'animate-pulse scale-125' : ''}`}>
              {isListening ? '🔵' : '🎤'}
            </span>
            {!isListening && !isSpeaking && !isLoading && (
              <div className="absolute inset-0 rounded-full bg-blue-500/10 scale-[1.2] opacity-0 blur-xl group-hover:opacity-100 transition-opacity duration-1000" />
            )}
            <p className="absolute -bottom-8 whitespace-nowrap text-white/20 text-[9px] uppercase tracking-[0.3em] font-light">
                {isListening ? 'Escutando...' : (isSpeaking || isLoading) ? 'Omega processando' : 'Tocar para falar'}
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
          border-radius: 100px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
