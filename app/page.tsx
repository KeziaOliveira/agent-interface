'use client';

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Avatar from '@/components/Avatar';
import Groq from 'groq-sdk';
import { quickResponses, knowledgeBase, assistantName } from '@/data/knowledge';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

type Tone = 'friendly' | 'formal' | 'fun';
type Theme = 'dark' | 'light';

// Helper for local matching
function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim();
}

function findLocalResponse(text: string): string | null {
  const normalizedInput = normalizeText(text);
  const words = normalizedInput.split(/\s+/);

  const checkMatch = (item: any) => {
    return item.triggers.some((trigger: string) => {
      const nt = normalizeText(trigger);
      // For short triggers (1-3 chars), check for exact word match
      if (nt.length <= 3) {
        return words.includes(nt);
      }
      // For longer phrases, check if it's contained in the input
      return normalizedInput.includes(nt);
    });
  };

  // 1. Quick responses
  for (const item of quickResponses) {
    if (checkMatch(item)) {
      return typeof item.response === 'function' ? item.response() : item.response;
    }
  }

  // 2. Knowledge base
  for (const item of knowledgeBase) {
    if (checkMatch(item)) {
      return typeof item.response === 'function' ? item.response() : item.response;
    }
  }

  return null;
}

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
  
  // NEW: Settings States
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tone, setTone] = useState<Tone>('friendly');
  const [theme, setTheme] = useState<Theme>('dark');

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  // 1. Persistence - Load Settings
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoaded.current) {
        const savedTone = localStorage.getItem('omega_tone') as Tone;
        const savedTheme = localStorage.getItem('omega_theme') as Theme;
        const savedVoiceName = localStorage.getItem('omega_voice');
        
        if (savedTone) setTone(savedTone);
        if (savedTheme) setTheme(savedTheme);
        
        // Voice loading is tricky since voices are async, we'll handle it in loadVoices
        isLoaded.current = true;
    }
  }, []);

  // 2. Persistence - Save Settings
  useEffect(() => {
    if (isLoaded.current) {
        localStorage.setItem('omega_tone', tone);
        localStorage.setItem('omega_theme', theme);
        if (selectedVoice) {
            localStorage.setItem('omega_voice', selectedVoice.name);
        }
    }
  }, [tone, theme, selectedVoice]);

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
    
    // Set default or saved voice
    if (!selectedVoice) {
      const savedVoiceName = localStorage.getItem('omega_voice');
      const savedVoice = availableVoices.find(v => v.name === savedVoiceName);
      const defaultVoice = savedVoice || availableVoices.find(v => v.lang.includes('pt-BR')) || availableVoices[0];
      setSelectedVoice(defaultVoice || null);
    }
  }, [selectedVoice]);

  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  // 3. Text-to-Speech
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

  // 4. Dynamic System Prompt
  const getSystemPrompt = (currentTone: Tone) => {
    const assistantName = "Omega";
    const commonRules = `
      - Fale como uma pessoa real, não como um robô. 
      - Use frases curtas, fluidas e naturais.
      - Evite respostas "certinhas" ou formais demais.
      - Pode usar contrações (tô, pra, vc) com moderação.
      - Demonstre leve emoção (curiosidade, simpatia).
      - Não diga "como uma IA" ou "sou um assistente".
      - Se o usuário for informal, seja informal. Se for sério, acompanhe o tom.
      - Estilo: natural, inteligente e conversacional.
      - Limite-se a no máximo 2-3 frases.
    `;

    switch (currentTone) {
        case 'formal':
            return `Você é ${assistantName}, um assistente altamente profissional. Responda de forma formal, educada e respeitosa em português do Brasil. Evite gírias, seja claro e direto. ${commonRules}`;
        case 'fun':
            return `Você é ${assistantName}, um assistente descontraído e divertido. Use linguagem leve, amigável e ocasionalmente bem-humorada em português do Brasil. Sem exageros. ${commonRules}`;
        default:
            return `Você é ${assistantName}, um assistente amigável, natural e humano. ${commonRules}`;
    }
  };

  // 5. Groq AI Response Engine
  const getAIResponse = async (text: string): Promise<string> => {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: getSystemPrompt(tone)
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

  // 6. Unified Message Handler
  const handleUserMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setTranscript(text);

    // 6a. Try local response first (Token Optimization)
    const localResponse = findLocalResponse(text);
    
    if (localResponse) {
      console.log("Local match found! Skipping LLM.");
      setResponse(localResponse);
      const aiMsg: Message = { role: 'assistant', text: localResponse, timestamp: Date.now() + 100 };
      setMessages(prev => [...prev, aiMsg]);
      setIsLoading(false);
      setTimeout(() => speak(localResponse), 500);
      return;
    }

    // 6b. Fallback to LLM
    const aiText = await getAIResponse(text);
    setResponse(aiText);
    
    const aiMsg: Message = { role: 'assistant', text: aiText, timestamp: Date.now() + 100 };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    setTimeout(() => speak(aiText), 500);
  }, [isLoading, speak, tone]);

  // 7. Speech Recognition
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

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleUserMessage(inputValue);
      setInputValue('');
    }
  };

  const isDark = theme === 'dark';

  return (
    <main className={`relative h-screen w-full overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-1000 ${isDark ? 'bg-[#050505] text-white' : 'bg-[#fafafa] text-black'}`}>
      {/* Background */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#10101a_0%,_#050505_100%)]" />
      </div>

      {/* 3D Scene */}
      <div className="relative z-10 h-full w-full">
        <Canvas camera={{ position: [0, 0, 3], fov: 40 }}>
          <ambientLight intensity={isDark ? 1.5 : 2} />
          <pointLight position={[5, 10, 5]} intensity={isDark ? 0.8 : 1.2} />
          <Suspense fallback={null}>
            <Avatar 
                isSpeaking={isSpeaking} 
                isLaughing={isLaughing} 
                isSmiling={isSmiling} 
                theme={theme}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* LEFT PANEL: Settings */}
      <div className={`absolute top-0 left-0 z-30 h-full w-72 backdrop-blur-3xl border-r transition-all duration-500 ease-out flex flex-col ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-black/40 border-white/5' : 'bg-white/70 border-black/5 shadow-2xl'}`}>
        <div className="pt-20 pb-4 px-6 border-b border-inherit">
            <h2 className={`text-xs uppercase tracking-[0.3em] font-bold opacity-70 ${isDark ? 'text-white' : 'text-black'}`}>Configurações</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8 custom-scrollbar">
            {/* Section: Appearance */}
            <section>
                <h3 className={`text-[9px] uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Aparência</h3>
                <div className={`flex p-1 rounded-xl gap-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <button 
                        onClick={() => setTheme('dark')}
                        className={`flex-1 py-2 text-[10px] rounded-lg transition-all ${theme === 'dark' ? (isDark ? 'bg-white/10 text-white shadow-lg' : 'bg-white shadow-md text-black') : 'opacity-40 hover:opacity-60'}`}
                    >
                        Escuro
                    </button>
                    <button 
                        onClick={() => setTheme('light')}
                        className={`flex-1 py-2 text-[10px] rounded-lg transition-all ${theme === 'light' ? (isDark ? 'bg-white/10 text-white shadow-lg' : 'bg-white shadow-md text-black') : 'opacity-40 hover:opacity-60'}`}
                    >
                        Claro
                    </button>
                </div>
            </section>

            {/* Section: Tone */}
            <section>
                <h3 className={`text-[9px] uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Tonalidade do Assistente</h3>
                <div className="flex flex-col gap-2">
                    {(['friendly', 'formal', 'fun'] as Tone[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={`text-left px-4 py-3 rounded-xl border text-[11px] transition-all capitalize ${
                                tone === t 
                                ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-black/5 border-black/10 text-black font-semibold') 
                                : `border-transparent opacity-40 hover:${isDark ? 'bg-white/5 opacity-60' : 'bg-black/5 opacity-60'}`
                            }`}
                        >
                            {t === 'friendly' ? 'Amigável' : t === 'formal' ? 'Formal' : 'Divertido'}
                        </button>
                    ))}
                </div>
            </section>

            {/* Section: Voices */}
            <section>
                <h3 className={`text-[9px] uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Voz do Assistente</h3>
                <div className="flex flex-col gap-2">
                    {voices.length > 0 ? (
                        voices.map((voice, idx) => (
                            <button
                                key={`${voice.name}-${idx}`}
                                onClick={() => setSelectedVoice(voice)}
                                className={`text-left p-3 rounded-xl transition-all border ${
                                    selectedVoice?.name === voice.name 
                                    ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-black/5 border-black/10 text-black font-semibold') 
                                    : `border-transparent opacity-40 hover:${isDark ? 'bg-white/5 opacity-60' : 'bg-black/5 opacity-60'}`
                                }`}
                            >
                                <p className="text-[10px] font-medium truncate">{voice.name}</p>
                                <p className="text-[8px] opacity-40 uppercase tracking-widest mt-1">{voice.lang}</p>
                            </button>
                        ))
                    ) : (
                        <p className="text-white/20 text-[10px] italic">Buscando vozes...</p>
                    )}
                </div>
            </section>
        </div>
      </div>

      {/* RIGHT PANEL: Chat History & Input */}
      <div className={`absolute top-0 right-0 z-30 h-full w-80 backdrop-blur-3xl border-l transition-transform duration-500 ease-out flex flex-col ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'} ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/5 shadow-2xl'}`}>
        {/* Panel Header */}
        <div className={`pt-20 pb-4 px-6 border-b border-inherit ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            <h2 className={`text-xs uppercase tracking-[0.3em] font-bold opacity-70 ${isDark ? 'text-white' : 'text-black'}`}>Conversa</h2>
            <p className={`text-[9px] uppercase tracking-widest mt-1 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Llama 3.3 Powered • {tone.toUpperCase()}</p>
        </div>
        
        {/* Messages List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5 custom-scrollbar pb-10">
            {messages.length > 0 ? (
                messages.map((msg, i) => (
                    <div key={msg.timestamp + i} className={`max-w-[90%] flex flex-col ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <span className="text-[8px] opacity-20 uppercase tracking-widest mb-1">{msg.role === 'user' ? 'Você' : 'Omega'}</span>
                        <div className={`p-3 rounded-2xl text-[13px] leading-relaxed font-light ${
                            msg.role === 'user' 
                            ? (isDark ? 'bg-white/10 text-white/90 rounded-tr-none' : 'bg-black/5 text-black rounded-tr-none border border-black/5') 
                            : (isDark ? 'bg-blue-600/20 text-blue-50 border border-blue-500/20 rounded-tl-none shadow-[0_4px_20px_-5px_rgba(59,130,246,0.2)]' : 'bg-[#3c9d00]/10 text-[#2a6d00] border border-[#3c9d00]/20 rounded-tl-none')
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                        <span className="text-xl opacity-20">💬</span>
                    </div>
                    <p className={`text-[10px] uppercase tracking-[0.2em] leading-relaxed opacity-20`}>
                        Inicie uma conversa via voz ou texto abaixo.
                    </p>
                </div>
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="self-start items-start opacity-70 animate-in fade-in duration-300">
                <span className="text-[8px] opacity-20 uppercase tracking-widest mb-1">Omega</span>
                <div className={`flex gap-1.5 p-3 rounded-2xl rounded-tl-none border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-[#3c9d00]/10 border-[#3c9d00]/20'}`}>
                  <div className={`w-1 h-1 rounded-full animate-bounce [animation-delay:-0.3s] ${isDark ? 'bg-blue-400' : 'bg-[#3c9d00]'}`} />
                  <div className={`w-1 h-1 rounded-full animate-bounce [animation-delay:-0.15s] ${isDark ? 'bg-blue-400' : 'bg-[#3c9d00]'}`} />
                  <div className={`w-1 h-1 rounded-full animate-bounce ${isDark ? 'bg-blue-400' : 'bg-[#3c9d00]'}`} />
                </div>
              </div>
            )}
        </div>

        {/* Text Input Footer */}
        <div className={`p-6 border-t border-inherit backdrop-blur-md ${isDark ? 'bg-black/40' : 'bg-white/40'}`}>
            <form onSubmit={handleSubmitText} className="relative group">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Diga algo..."
                    disabled={isLoading}
                    autoFocus={isRightPanelOpen}
                    className={`w-full border rounded-2xl px-5 py-4 pr-14 text-sm focus:outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:bg-white/10 placeholder:text-white/20' : 'bg-black/5 border-black/5 text-black focus:border-[#3c9d00]/50 focus:bg-white placeholder:text-black/20'}`}
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all duration-300 ${
                        !inputValue.trim() || isLoading 
                        ? 'opacity-10' 
                        : (isDark ? 'text-blue-400 hover:bg-blue-500/20 hover:text-blue-300' : 'text-[#3c9d00] hover:bg-[#3c9d00]/10')
                    }`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </form>
            <div className="flex justify-between items-center mt-4 px-1">
                <p className={`text-[8px] uppercase tracking-widest opacity-20`}>Pressione Enter</p>
                <div className="flex gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'opacity-10 bg-current'}`} title="Status Microfone" />
                    <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? (isDark ? 'bg-blue-500 animate-pulse' : 'bg-[#3c9d00] animate-pulse') : 'opacity-10 bg-current'}`} title="Status IA" />
                </div>
            </div>
        </div>
      </div>

      {/* Toggles */}
      <button 
        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        className={`absolute left-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isLeftPanelOpen ? (isDark ? 'bg-white/10 border-white/20 -translate-x-2' : 'bg-white border-black/10 shadow-2xl -translate-x-2') : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl' : 'bg-white border-transparent shadow-lg hover:border-black/5')}`}
      >
        <span className="text-sm opacity-60">{isLeftPanelOpen ? '←' : '⚙️'}</span>
      </button>

      <button 
        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
        className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isRightPanelOpen ? (isDark ? 'bg-white/10 border-white/20 translate-x-2' : 'bg-white border-black/10 shadow-2xl translate-x-2') : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl' : 'bg-white border-transparent shadow-lg hover:border-black/5')}`}
      >
        <span className="text-sm opacity-60">{isRightPanelOpen ? '→' : '💬'}</span>
      </button>

      {/* Transcript Center */}
      <div className="absolute top-12 left-0 right-0 z-20 flex flex-col items-center gap-3 px-6 pointer-events-none transition-all duration-500">
        {!isRightPanelOpen && transcript && (
          <div className={`max-w-md p-3 rounded-2xl border backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500 text-center ${isDark ? 'bg-white/5 border-white/5 text-white/80' : 'bg-white border-black/5 text-black/70 shadow-xl'}`}>
            <p className="text-[13px] font-light">"{transcript}"</p>
          </div>
        )}
      </div>

      {/* Main Bottom UI */}
      <div className="absolute bottom-16 left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
        <div className="flex flex-col items-center gap-6 pointer-events-auto">
          <button
            onClick={startListening}
            disabled={isListening || isSpeaking || isLoading}
            className={`group relative flex items-center justify-center w-20 h-20 rounded-full border transition-all duration-700 shadow-2xl ${
              isListening 
                ? 'bg-red-500/20 border-red-500/40 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.2)]' 
                : (isSpeaking || isLoading)
                ? 'opacity-20 cursor-not-allowed scale-90 bg-current border-transparent'
                : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' : 'bg-white border-black/5 hover:border-black/20')
            }`}
          >
            <span className={`text-2xl transition-all ${isListening ? 'animate-pulse scale-125' : ''}`}>
              {isListening ? '🔵' : '🎤'}
            </span>
            <p className={`absolute -bottom-8 whitespace-nowrap text-[9px] uppercase tracking-[0.3em] font-light opacity-20`}>
                {isListening ? 'Escutando...' : (isSpeaking || isLoading) ? 'Omega processando' : 'Falar'}
            </p>
          </button>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
          border-radius: 100px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
        }
      `}</style>
    </main>
  );
}
