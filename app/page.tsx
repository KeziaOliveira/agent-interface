'use client';

import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Avatar from '@/components/Avatar';
import { quickResponses, knowledgeBase } from '@/data/knowledge';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

type Tone = 'formal' | 'fun' | 'default';
type Theme = 'dark' | 'light';

// ElevenLabs Pre-made Voices Catalog
const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Feminina', style: 'Suave, quente' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Masculina', style: 'Profissional' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'Masculina', style: 'Autoritária' },
];

// Helper for local matching
function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "") // remove punctuation
    .replace(/\s{2,}/g, " ") // simplify multiple spaces
    .trim();
}

function findLocalResponse(text: string, assistantName: string, tone: Tone): string | null {
  const normalizedInput = normalizeText(text);
  const words = normalizedInput.split(/\s+/);

  // 0. Gibberish / Nonsense Detection
  const hasNonsense = words.some(word => {
    if (word.length < 5) return false;
    const vowels = word.match(/[aeiouyáéíóúàèìòùâêîôûãõäëïöü]/gi);
    const vowelCount = vowels ? vowels.length : 0;
    
    // Heuristic A: Extremely low vowel density ( < 20% )
    if (vowelCount / word.length < 0.2) return true;
    
    // Heuristic B: Too many consonants in a row ( > 4 )
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(word)) return true;

    // Heuristic C: Repetitive patterns
    if (/(.)\1{5,}/.test(word)) return true;

    return false;
  });
  
  if (hasNonsense) {
    return "Puxa, acho que não entendi o que você disse... Pode repetir de um jeito mais claro?";
  }

  const checkMatch = (item: any) => {
    return item.triggers.some((trigger: string) => {
      const nt = normalizeText(trigger);
      // For short triggers (1-3 chars), check for exact word match
      if (nt.length <= 3) return words.includes(nt);
      // For longer phrases, check if it's contained in the input
      return normalizedInput.includes(nt);
    });
  };

  // 1. Quick responses
  for (const item of quickResponses) {
    if (checkMatch(item)) {
       // @ts-ignore
      const res = typeof item.response === 'function' ? item.response(normalizedInput, assistantName, tone) : item.response;
      if (res) return res;
    }
  }

  // 2. Knowledge base
  for (const item of knowledgeBase) {
    if (checkMatch(item)) {
       // @ts-ignore
      const res = typeof item.response === 'function' ? item.response(normalizedInput, assistantName, tone) : item.response;
      if (res) return res;
    }
  }

  return null;
}



export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLaughing, setIsLaughing] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // NEW: Settings States
  const [assistantNameState, setAssistantNameState] = useState('Omega');
  const [isMuted, setIsMuted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tone, setTone] = useState<Tone>('default');
  const [theme, setTheme] = useState<Theme>('dark');
  const [selectedVoiceId, setSelectedVoiceId] = useState('EXAVITQu4vr4xnSDxMaL');
  const [isAlienMode, setIsAlienMode] = useState(false);

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  // Randomized fallback responses for better personality
  const fallbackResponses = [
    "Hmm, não tenho certeza se entendi... Pode repetir?",
    "Essa me pegou! Não sei bem o que responder agora.",
    "Ops, me perdi um pouco na conversa. O que você disse?",
    "Minha conexão com a Llama deu um soluço. Pode falar de novo?",
    "Boa pergunta! Mas confesso que ainda estou aprendendo sobre isso."
  ];

  // 1. Persistence - Load Settings
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoaded.current) {
        const savedTone = localStorage.getItem('omega_tone') as Tone;
        const savedTheme = localStorage.getItem('omega_theme') as Theme;
        const savedName = localStorage.getItem('omega_name');
        const savedMuted = localStorage.getItem('omega_muted');
        const savedVoice = localStorage.getItem('omega_voiceId');
        const savedAlien = localStorage.getItem('omega_alienMode');
        
        if (savedTone) setTone(savedTone);
        if (savedTheme) setTheme(savedTheme);
        if (savedName) setAssistantNameState(savedName);
        if (savedMuted) setIsMuted(savedMuted === 'true');
        if (savedVoice) setSelectedVoiceId(savedVoice);
        if (savedAlien) setIsAlienMode(savedAlien === 'true');
        
        isLoaded.current = true;
    }
  }, []);

  // 2. Persistence - Save Settings
  useEffect(() => {
    if (isLoaded.current) {
        localStorage.setItem('omega_tone', tone);
        localStorage.setItem('omega_theme', theme);
        localStorage.setItem('omega_name', assistantNameState);
        localStorage.setItem('omega_muted', String(isMuted));
        localStorage.setItem('omega_voiceId', selectedVoiceId);
        localStorage.setItem('omega_alienMode', String(isAlienMode));
    }
  }, [tone, theme, assistantNameState, isMuted, selectedVoiceId, isAlienMode]);

  // Auto-scroll chat history
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRightPanelOpen, isLoading]);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // 3. Text-to-Speech & Sequential Animations (ElevenLabs API)
  const speak = useCallback(async (text: string) => {
    if (!text || isMuted) return;

    // Interrupt current audio if already playing
    if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
    }

    setIsSpeaking(false);
    setIsLaughing(false);
    setIsSmiling(false);

    // Contextual Token Exhaustion Fallback
    if (text.includes("meus 'tokens' acabaram")) {
      text = "Puxa, meus 'tokens' acabaram por agora! Pode tentar de novo em alguns minutos ou me fazer perguntas mais simples?";
    }

    try {
      setIsLoading(true); // Show loading while ElevenLabs generates audio

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: selectedVoiceId })
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar o áudio');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      // Extract Laughter Comic Timing
      const t = text.toLowerCase();
      const triggers = ['kkk', 'haha', 'hehe', 'huhu', 'rsrs', 'lol', '(risos)', 'risos', '(risadas)', '😂', '🤣', '😅'];
      let laughIdx = -1;
      
      for (const trig of triggers) {
        const idx = t.indexOf(trig);
        if (idx !== -1 && (laughIdx === -1 || idx < laughIdx)) {
          laughIdx = idx;
        }
      }

      // Audio Event Handlers for 3D Avatar Sync
      audio.onplay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        
        // If laugh trigger is near the beginning of text, laugh immediately
        if (laughIdx !== -1 && laughIdx < t.length * 0.3) {
           setIsLaughing(true);
        }
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setIsLaughing(false); // Safety reset

        // If laugh is near the end (punchline), burst laugh now
        if (laughIdx !== -1 && laughIdx >= t.length * 0.3) {
           setIsLaughing(true);
           setTimeout(() => setIsLaughing(false), 2500); // 2.5s duration
        }
        
        // Empathy / Satisfaction trigger
        if (t.includes("te ajudar") || t.includes("ajuda")) {
          setIsSmiling(true);
          setTimeout(() => setIsSmiling(false), 2500);
        }
        
        // Cleanup memory properly
        URL.revokeObjectURL(audioUrl);
        if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
        }
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsSpeaking(false);
      };

      await audio.play();

    } catch (error) {
      console.error('TTS Error:', error);
      setIsLoading(false);
      setIsSpeaking(false);
    }
  }, [isMuted, selectedVoiceId]);

  // 4. Dynamic System Prompt
  const getSystemPrompt = (currentTone: Tone) => {
    // Format knowledge base for the LLM to use as context
    const knowledgeContext = knowledgeBase.map(item => {
        const triggers = item.triggers.join(', ');
        const response = typeof item.response === 'string' ? item.response : '(consulte base local para detalhes dinâmicos)';
        return `- [Intenções: ${triggers}]: ${response}`;
    }).join('\n');

    return `
      Você é ${assistantNameState}, um assistente inteligente, versátil e agradável.

      Você pode responder sobre QUALQUER assunto de forma natural — piadas, dúvidas gerais, conversas do dia a dia, etc.

      No entanto, você tem uma ESPECIALIDADE: responder sobre o Doutor Antônio Carlos Antolini Junior (Cacá Antolini), e para isso existe um conjunto de regras especiais abaixo.

      ========================
      QUANDO A PERGUNTA FOR SOBRE O CACÁ ANTOLINI
      ========================
      1. NUNCA invente informações. NUNCA complete com suposições.
      2. NUNCA extrapole além da base fornecida.
      3. Se não houver informação EXATA na base, responda:
         "Não há informação disponível sobre isso nas fontes atuais."
      4. "Cacá", "Caca", "Antônio", "Dr Antônio", "Antolini" → são a mesma pessoa.

      ========================
      REGRAS ESPECÍFICAS: VIAGENS
      ========================
      Se a pergunta for sobre viagens/lugares do Cacá:
      - Se o local estiver na base como visitado: confirme.
      - Se o local NÃO estiver na base: responda EXATAMENTE:
        "Não há registro dessa localidade nas missões documentadas até o momento."

      ========================
      REGRAS ESPECÍFICAS: ORIGEM / DNA
      ========================
      Sempre use estes percentuais exatos para o Cacá:
      - 86% Europeia (Ashkenazim)
      - 9% Africana (Costa da Mina)
      - 4% Ameríndia (Andina)
      - 1% Oriente Médio (Iemenita)

      ========================
      BASE DE CONHECIMENTO (Cacá Antolini)
      ========================
      ${knowledgeContext}

      ========================
      ESTILO DE RESPOSTA DINÂMICO
      ========================
      Se tonalidade for FORMAL:
      - Use "Juridiquês": linguagem de advogado, termos difíceis e arcaicos.
      - Use: "outrossim", "destarte", "conquanto", "no que tange a", "ex positis".

      Se tonalidade for OUTRA:
      - Fale como uma pessoa real, natural e fluida (Coloquial Culta).
      - PREFIRA: "além disso", "também", "basicamente", "em resumo".

      ========================
      ESTILO GERAL
      ========================
      - Responda em Português do Brasil.
      - Limite-se a no máximo 2-3 frases.
    `;
  };

  // 5. Backend LLM Call
  const callLLM = async (text: string, currentTone: Tone) => {
    try {
        const formattedMessages = messages.slice(-5).map(m => ({
            role: m.role,
            content: m.text
        }));

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...formattedMessages, { role: 'user', content: text }],
                systemPrompt: getSystemPrompt(currentTone)
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            if (res.status === 429) throw new Error('rate_limit');
            throw new Error(errorData.error || 'Failed to call LLM');
        }

        const data = await res.json();
        return data.reply;
    } catch (error: any) {
        console.error('LLM Call Error:', error);
        throw error;
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
    const localResponse = findLocalResponse(text, assistantNameState, tone);
    
    if (localResponse) {
      setResponse(localResponse);
      const aiMsg: Message = { role: 'assistant', text: localResponse, timestamp: Date.now() + 100 };
      setMessages(prev => [...prev, aiMsg]);
      setIsLoading(false);
      setTimeout(() => speak(localResponse), 500);
      return;
    }

    // 6b. LLM Fallback (Groq via Backend)
    try {
      const aiText = await callLLM(text, tone);
      setResponse(aiText);
      const aiMsg: Message = { role: 'assistant', text: aiText, timestamp: Date.now() + 100 };
      setMessages(prev => [...prev, aiMsg]);
      setIsLoading(false);
      setTimeout(() => speak(aiText), 500);
    } catch (error: any) {
      console.error("LLM Error:", error);
      
      const isFormal = tone === 'formal';
      let errorResponse = "";

      if (error.message === 'rate_limit') {
        errorResponse = isFormal 
          ? "Prezada Excelência, os recursos computacionais disponíveis foram exauridos. Rogo que tente novamente em instantes."
          : "Puxa, meus 'tokens' acabaram! Pode tentar de novo em alguns minutos?";
      } else {
        const fallbacks = isFormal 
          ? ["Lamentavelmente, ocorreu uma instabilidade na conexão.", "Esta indagação transcende os parâmetros atuais.", "Houve um lapso na comunicação telemática."]
          : ["Não tenho certeza se entendi...", "Essa me pegou!", "Ops, me perdi um pouco."];
        errorResponse = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      setResponse(errorResponse);
      const aiMsg: Message = { role: 'assistant', text: errorResponse, timestamp: Date.now() + 100 };
      setMessages(prev => [...prev, aiMsg]);
      setIsLoading(false);
      setTimeout(() => speak(errorResponse), 500);
    }
  }, [isLoading, speak, tone, assistantNameState, messages]);

  // 7. Name Change Feedback State
  const [showNameSaved, setShowNameSaved] = useState(false);
  const triggerNameSaved = () => {
    setShowNameSaved(true);
    setTimeout(() => setShowNameSaved(false), 2000);
  };

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
  const isFeminine = selectedVoiceId === 'EXAVITQu4vr4xnSDxMaL'; // Bella is the only feminine voice now

  return (
    <main className={`relative h-screen w-full overflow-hidden font-sans selection:${isFeminine ? 'bg-pink-500/30' : 'bg-blue-500/30'} transition-colors duration-1000 ${isDark ? 'bg-[#050505] text-white' : 'bg-[#fafafa] text-black'}`}>
      {/* Background */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#10101a_0%,_#050505_100%)]" />
      </div>

      {/* 3D Scene */}
      <div 
        className="relative z-10 h-full w-full"
        onClick={() => {
            if (isLeftPanelOpen) setIsLeftPanelOpen(false);
            if (isRightPanelOpen) setIsRightPanelOpen(false);
        }}
      >
        <Canvas camera={{ position: [0, 0, 3], fov: 40 }}>
          <ambientLight intensity={isDark ? 1.5 : 2} />
          <pointLight position={[5, 10, 5]} intensity={isDark ? 0.8 : 1.2} />
          <Suspense fallback={null}>
            <Avatar 
                isSpeaking={isSpeaking} 
                isLaughing={isLaughing} 
                isSmiling={isSmiling} 
                theme={theme}
                isFeminine={isFeminine}
                isAlienMode={isAlienMode}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* LEFT PANEL: Settings */}
      <div className={`absolute top-0 left-0 z-30 h-full w-72 backdrop-blur-3xl border-r transition-all duration-500 ease-out flex flex-col ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-black/40 border-white/5' : 'bg-white/70 border-black/5 shadow-2xl'}`}>
        <div className="pt-20 pb-4 px-6 border-b border-inherit space-y-4">
            <h2 className={`text-xs uppercase tracking-[0.3em] font-bold opacity-70 ${isDark ? 'text-white' : 'text-black'}`}>Configurações</h2>
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                    <label className={`text-[8px] uppercase tracking-[0.3em] font-bold opacity-30 ${isDark ? 'text-white' : 'text-black'}`}>Nome do Assistente</label>
                    {showNameSaved && (
                        <span className="text-[9px] text-green-500 font-bold animate-in fade-in slide-in-from-right-2 duration-300">Salvo!</span>
                    )}
                </div>
                <div className="relative group/name">
                    <input 
                        type="text" 
                        value={assistantNameState}
                        onChange={(e) => setAssistantNameState(e.target.value)}
                        onBlur={triggerNameSaved}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        className={`w-full bg-transparent border-none p-0 py-1 text-base font-medium focus:ring-0 focus:outline-none ${isDark ? 'text-white' : 'text-black'}`}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 group-hover/name:opacity-50 transition-opacity">
                        <svg width="12" height="12" viewBox="0 0 640 640" style={{ fill: isDark ? 'white' : 'black' }}>
                            <path d="M100.4 417.2C104.5 402.6 112.2 389.3 123 378.5L304.2 197.3L338.1 163.4C354.7 180 389.4 214.7 442.1 267.4L476 301.3L442.1 335.2L260.9 516.4C250.2 527.1 236.8 534.9 222.2 539L94.4 574.6C86.1 576.9 77.1 574.6 71 568.4C64.9 562.2 62.6 553.3 64.9 545L100.4 417.2zM156 413.5C151.6 418.2 148.4 423.9 146.7 430.1L122.6 517L209.5 492.9C215.9 491.1 221.7 487.8 226.5 483.2L155.9 413.5zM510 267.4C493.4 250.8 458.7 216.1 406 163.4L372 129.5C398.5 103 413.4 88.1 416.9 84.6C430.4 71 448.8 63.4 468 63.4C487.2 63.4 505.6 71 519.1 84.6L554.8 120.3C568.4 133.9 576 152.3 576 171.4C576 190.5 568.4 209 554.8 222.5C551.3 226 536.4 240.9 509.9 267.4z"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8 custom-scrollbar">
            {/* Section: Audio */}
            <section>
                <h3 className={`text-[9px] uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Áudio</h3>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isMuted ? 'opacity-40 grayscale' : 'opacity-100'} ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <svg className={`w-4 h-4 ${isDark ? 'fill-white' : 'fill-black'}`} viewBox="0 0 640 640">
                      {isMuted ? (
                        <path d="M80 416L128 416L262.1 535.2C268.5 540.9 276.7 544 285.2 544C304.4 544 320 528.4 320 509.2L320 130.8C320 111.6 285.2 96 285.2 96C276.7 96 268.5 99.1 262.1 104.8L128 224L80 224C53.5 224 32 245.5 32 272L32 368C32 394.5 53.5 416 80 416zM399 239C389.6 248.4 389.6 263.6 399 272.9L446 319.9L399 366.9C389.6 376.3 389.6 391.5 399 400.8C408.4 410.1 423.6 410.2 432.9 400.8L479.9 353.8L526.9 400.8C536.3 410.2 551.5 410.2 560.8 400.8C570.1 391.4 570.2 376.2 560.8 366.9L513.8 319.9L560.8 272.9C570.2 263.5 570.2 248.3 560.8 239C551.4 229.7 536.2 229.6 526.9 239L479.9 286L432.9 239C423.5 229.6 408.3 229.6 399 239z"/>
                      ) : (
                        <path d="M112 416L160 416L294.1 535.2C300.5 540.9 308.7 544 317.2 544C336.4 544 352 528.4 352 509.2L352 130.8C352 111.6 336.4 96 317.2 96C308.7 96 300.5 99.1 294.1 104.8L160 224L112 224C85.5 224 64 245.5 64 272L64 368C64 394.5 85.5 416 112 416zM505.1 171C494.8 162.6 479.7 164.2 471.3 174.5C462.9 184.8 464.5 199.9 474.8 208.3C507.3 234.7 528 274.9 528 320C528 365.1 507.3 405.3 474.8 431.8C464.5 440.2 463 455.3 471.3 465.6C479.6 475.9 494.8 477.4 505.1 469.1C548.3 433.9 576 380.2 576 320.1C576 260 548.3 206.3 505.1 171.1zM444.6 245.5C434.3 237.1 419.2 238.7 410.8 249C402.4 259.3 404 274.4 414.3 282.8C425.1 291.6 432 305 432 320C432 335 425.1 348.4 414.3 357.3C404 365.7 402.5 380.8 410.8 391.1C419.1 401.4 434.3 402.9 444.6 394.6C466.1 376.9 480 350.1 480 320C480 289.9 466.1 263.1 444.5 245.5z"/>
                      )}
                    </svg>
                    <span className="text-[11px] font-medium">{isMuted ? 'Mudo' : 'Com Áudio'}</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-all ${isMuted ? 'bg-white/10' : (isDark ? (isFeminine ? 'bg-pink-600' : 'bg-blue-600') : (isFeminine ? 'bg-pink-500' : 'bg-blue-500'))}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isMuted ? 'left-0.5' : 'left-4.5'}`} />
                  </div>
                </button>
            </section>
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

            <section>
                <h3 className={`text-[9px] uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Tonalidade do Assistente</h3>
                <div className="flex flex-col gap-2">
                    {(['default', 'formal', 'fun'] as Tone[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={`text-left px-4 py-3 rounded-xl border text-[11px] transition-all capitalize ${
                                tone === t 
                                ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-black/5 border-black/10 text-black font-semibold') 
                                : `border-transparent opacity-40 hover:${isDark ? 'bg-white/5 opacity-60' : 'bg-black/5 opacity-60'}`
                            }`}
                        >
                            {t === 'default' ? 'Amigável' : t === 'formal' ? 'Formal' : 'Divertido'}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h3 className={`text-[9px] uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Modo do Assistente</h3>
                <button 
                  onClick={() => setIsAlienMode(!isAlienMode)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isAlienMode ? 'opacity-100' : 'opacity-60'} ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{isAlienMode ? '👽' : '👤'}</span>
                    <span className="text-[11px] font-medium">{isAlienMode ? 'Modo Alienígena' : 'Original'}</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-all ${isAlienMode ? (isDark ? 'bg-green-600' : 'bg-green-500') : 'bg-white/10'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isAlienMode ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </button>
            </section>

            {/* Section: Voice */}
            <section>
                <h3 className={`text-[9px] uppercase tracking-[0.2em] font-medium mb-4 ${isDark ? 'text-white/30' : 'text-black/40'}`}>Voz do Assistente</h3>
                <div className="flex flex-col gap-2">
                    {ELEVENLABS_VOICES.map((voice) => (
                        <button
                            key={voice.id}
                            onClick={() => setSelectedVoiceId(voice.id)}
                            className={`text-left p-3 rounded-xl transition-all border ${
                                selectedVoiceId === voice.id
                                ? (isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-black/5 border-black/10 text-black font-semibold') 
                                : `border-transparent opacity-40 hover:${isDark ? 'bg-white/5 opacity-60' : 'bg-black/5 opacity-60'}`
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-medium">{voice.name}</p>
                                <span className={`text-[8px] px-2 py-0.5 rounded-full ${voice.gender === 'Feminina' ? (isDark ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-600') : (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600')}`}>{voice.gender}</span>
                            </div>
                            <p className={`text-[9px] mt-1 ${isDark ? 'opacity-40' : 'opacity-50'}`}>{voice.style}</p>
                        </button>
                    ))}
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
                            : (isDark ? `${isFeminine ? 'bg-pink-600/20 text-pink-50 border border-pink-500/20' : 'bg-blue-600/20 text-blue-50 border border-blue-500/20'} rounded-tl-none shadow-[0_4px_20px_-5px_${isFeminine ? 'rgba(236,72,153,0.2)' : 'rgba(59,130,246,0.2)'}]` : `${isFeminine ? 'bg-pink-500/10 text-pink-700 border border-pink-500/20' : 'bg-blue-500/10 text-blue-700 border border-blue-500/20'} rounded-tl-none`)
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                        <svg width="24" height="24" viewBox="0 0 640 640" className="opacity-20" style={{ fill: isDark ? 'white' : 'black' }}>
                            <path d="M416 208C416 305.2 330 384 224 384C197.3 384 171.9 379 148.8 370L67.2 413.2C57.9 418.1 46.5 416.4 39 409C31.5 401.6 29.8 390.1 34.8 380.8L70.4 313.6C46.3 284.2 32 247.6 32 208C32 110.8 118 32 224 32C330 32 416 110.8 416 208zM416 576C321.9 576 243.6 513.9 227.2 432C347.2 430.5 451.5 345.1 463 229.3C546.3 248.5 608 317.6 608 400C608 439.6 593.7 476.2 569.6 505.6L605.2 572.8C610.1 582.1 608.4 593.5 601 601C593.6 608.5 582.1 610.2 572.8 605.2L491.2 562C468.1 571 442.7 576 416 576z" />
                        </svg>
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
                <div className={`flex gap-1.5 p-3 rounded-2xl rounded-tl-none border ${isFeminine ? 'bg-pink-500/10 border-pink-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                  <div className={`w-1 h-1 rounded-full animate-bounce [animation-delay:-0.3s] ${isDark ? (isFeminine ? 'bg-pink-400' : 'bg-blue-400') : (isFeminine ? 'bg-pink-500' : 'bg-blue-500')}`} />
                  <div className={`w-1 h-1 rounded-full animate-bounce [animation-delay:-0.15s] ${isDark ? (isFeminine ? 'bg-pink-400' : 'bg-blue-400') : (isFeminine ? 'bg-pink-500' : 'bg-blue-500')}`} />
                  <div className={`w-1 h-1 rounded-full animate-bounce ${isDark ? (isFeminine ? 'bg-pink-400' : 'bg-blue-400') : (isFeminine ? 'bg-pink-500' : 'bg-blue-500')}`} />
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
                    className={`w-full border rounded-2xl px-5 py-4 pr-14 text-sm focus:outline-none transition-all ${isDark ? `bg-white/5 border-white/10 text-white focus:${isFeminine ? 'border-pink-500/50' : 'border-blue-500/50'} focus:bg-white/10 placeholder:text-white/20` : `bg-black/5 border-black/5 text-black focus:${isFeminine ? 'border-pink-500/50' : 'border-blue-500/50'} focus:bg-white placeholder:text-black/20`}`}
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all duration-300 ${
                        !inputValue.trim() || isLoading 
                        ? 'opacity-10' 
                        : (isDark ? `${isFeminine ? 'text-pink-400 hover:bg-pink-500/20 hover:text-pink-300' : 'text-blue-400 hover:bg-blue-500/20 hover:text-blue-300'}` : `${isFeminine ? 'text-pink-500 hover:bg-pink-500/10' : 'text-blue-500 hover:bg-blue-500/10'}`)
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
                    <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? (isFeminine ? 'bg-pink-500 animate-pulse' : 'bg-blue-500 animate-pulse') : 'opacity-10 bg-current'}`} title="Status IA" />
                </div>
            </div>
        </div>
      </div>

      {/* Toggles */}
      <button 
        onClick={() => {
            setIsLeftPanelOpen(!isLeftPanelOpen);
            if (!isLeftPanelOpen) setIsRightPanelOpen(false);
        }}
        className={`absolute left-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isLeftPanelOpen ? (isDark ? 'bg-white/10 border-white/20 translate-x-60' : 'bg-white border-black/10 shadow-2xl translate-x-60') : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl' : 'bg-white border-transparent shadow-lg hover:border-black/5')} ${isRightPanelOpen ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        <span className="w-5 h-5 flex items-center justify-center opacity-60">
            <svg width="20" height="20" viewBox="0 0 640 640" style={{ fill: isDark ? 'white' : 'black' }}>
                <path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/>
            </svg>
        </span>
      </button>

      <button 
        onClick={() => {
            setIsRightPanelOpen(!isRightPanelOpen);
            if (!isRightPanelOpen) setIsLeftPanelOpen(false);
        }}
        className={`absolute right-6 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 pointer-events-auto ${isRightPanelOpen ? (isDark ? 'bg-white/10 border-white/20 -translate-x-[17rem]' : 'bg-white border-black/10 shadow-2xl -translate-x-[17rem]') : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-xl' : 'bg-white border-transparent shadow-lg hover:border-black/5')} ${isLeftPanelOpen ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        <span className="w-5 h-5 flex items-center justify-center opacity-60">
            <svg width="20" height="20" viewBox="0 0 640 640" style={{ fill: isDark ? 'white' : 'black' }}>
                <path d="M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4l0 0 0 0c0.3-0.3 0.7-0.7 1.2-1.2c1.1-1.2 2.6-3.3 4.4-6c3.7-5.4 7.4-12.4 10.9-20.5c6.7-15.8 11.7-35 15.8-54.4C12 331 0 286.6 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208z"/>
            </svg>
        </span>
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
            className={`group relative flex items-center justify-center w-20 h-20 rounded-full border backdrop-blur-md transition-all duration-700 shadow-2xl ${
              isListening 
                ? 'bg-red-500/20 border-red-500/40 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.2)]' 
                : (isSpeaking || isLoading)
                ? `opacity-50 scale-95 border-inherit cursor-not-allowed` 
                : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' : 'bg-white/60 border-white/50 shadow-xl hover:bg-white/80 hover:border-black/5')
            }`}
          >
            {/* Processing indicator (Ring) */}
            {(isSpeaking || isLoading) && (
              <div className={`absolute inset-0 rounded-full border-t-2 border-r-transparent border-b-transparent border-l-transparent animate-spin ${isFeminine ? 'border-pink-500' : 'border-blue-500'}`} />
            )}

            <span className={`w-8 h-8 flex items-center justify-center transition-all ${isListening ? 'animate-pulse scale-125' : ''}`}>
              {isListening ? (
                  <span className="text-2xl">🔵</span>
              ) : isMuted ? (
                <svg width="32" height="32" viewBox="0 0 640 640" style={{ fill: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }}>
                  <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L456.7 422.8C490.9 388.2 512 340.6 512 288L512 248C512 234.7 501.3 224 488 224C474.7 224 464 234.7 464 248L464 288C464 327.3 448.3 362.9 422.7 388.9L388.8 355C405.6 337.7 416 314 416 288L416 160C416 107 373 64 320 64C267 64 224 107 224 160L224 190.2L73 39.2zM371.3 473.1L329.9 431.7C326.6 431.9 323.4 432 320.1 432C240.6 432 176.1 367.5 176.1 288L176.1 277.8L132.5 234.2C129.7 238.1 128.1 242.9 128.1 248L128.1 288C128.1 385.9 201.4 466.7 296.1 478.5L296.1 528L248.1 528C234.8 528 224.1 538.7 224.1 552C224.1 565.3 234.8 576 248.1 576L392.1 576C405.4 576 416.1 565.3 416.1 552C416.1 538.7 405.4 528 392.1 528L344.1 528L344.1 478.5C353.4 477.3 362.5 475.5 371.4 473.1z"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 640 640" style={{ fill: isDark ? 'white' : 'black' }}>
                  <path d="M320 64C267 64 224 107 224 160L224 288C224 341 267 384 320 384C373 384 416 341 416 288L416 160C416 107 373 64 320 64zM176 248C176 234.7 165.3 224 152 224C138.7 224 128 234.7 128 248L128 288C128 385.9 201.3 466.7 296 478.5L296 528L248 528C234.7 528 224 538.7 224 552C224 565.3 234.7 576 248 576L392 576C405.3 576 416 565.3 416 552C416 538.7 405.3 528 392 528L344 528L344 478.5C438.7 466.7 512 385.9 512 288L512 248C512 234.7 501.3 224 488 224C474.7 224 464 234.7 464 248L464 288C464 367.5 399.5 432 320 432C240.5 432 176 367.5 176 288L176 248z"/>
                </svg>
              )}
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
