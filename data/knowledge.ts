export type LocalResponse = {
  triggers: string[];
  response: string | ((text: string, assistantName: string, tone: 'formal' | 'fun' | 'default') => string | null);
};

export const quickResponses: LocalResponse[] = [
  {
    triggers: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "e ai", "tudo bem", "tudo bom", "como vai", "ei"],
    response: "Oi! Tudo bem? Como posso te ajudar?"
  },
  {
    triggers: ["seu nome", "como voce se chama", "quem e voce"],
    response: (text, name, tone) => `Eu sou o ${name}, seu assistente virtual!`
  },
  {
    triggers: ["que horas sao", "hora agora", "me fala a hora"],
    response: (text: string, name: string, tone: string) => {
      // Se a pergunta menciona um lugar específico, não responde localmente (fallback para LLM)
      const locKeywords = [" na ", " no ", " em ", " da ", " do ", " de "];
      if (locKeywords.some(k => text.includes(k))) return null;
      
      const now = new Date();
      return `Agora são ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}.`;
    }
  },
  {
    triggers: ["como voce esta", "tudo bem", "como vai"],
    response: "Tô ótimo, valeu por perguntar! E você?"
  }
];

export const knowledgeBase: LocalResponse[] = [
  {
    triggers: [
      // Direct names & Formal
      "antonio carlos antolini junior", "antonio antolini", "caca antolini", 
      "doutor antonio carlos antolini junior", "dr antonio", "comendador",
      // "Who is" variations
      "quem e voce", "quem e o dono", "quem e ele", "quem e o antonio", "quem e o caca",
      "quem e caca", "quem e o kaka", "quem e kaka", "quem caca e", "quem e esse",
      "quem e esse caca", "quem e esse antonio",
      // First person / Identity
      "quem sou eu", "quem eu sou", "minha biografia", "fale sobre mim", "me conte sobre mim",
      "me fale sobre mim", "quem eu sou", "quem sou eu",
      // "Tell me about" variations
      "fala sobre o caca", "fala sobre o antonio", "falar sobre caca", "me conta do caca", 
      "me fala do caca", "quem e o caca antolini", "me conta quem e o caca",
      "me fala sobre o antonio", "me fala do antonio", "me fala quem e o antonio",
      // Informal / Typos / Missing accents
      "vc sabe quem e caca", "voce sabe quem e caca", "conhece o caca", "conhece o antonio",
      "quem e o kka", "quem e o caca", "q e o caca", "quem e o caca", "quem e o caca",
      "quem e o caca", "biografia", "quem e o comendador"
    ],
    response: (text, name, tone) => {
        const isFirstPerson = ["eu", "mim", "sou", "meu", "me "].some(w => text.toLowerCase().includes(w));
        
        if (tone === 'formal') {
            if (isFirstPerson) {
                return `Doutor, você personifica a excelência jurídica sob a égide do nome Antônio Carlos Antolini Junior. Outrossim, na qualidade de seu assistente ${name}, declaro-me honrado em tutelar vosso legado intelectual e humanista!`;
            }
            return `O Doutor Antônio Carlos Antolini Junior, ou Cacá Antolini, é um ínclito advogado e jurista de renome. Ex positis, sua trajetória é pautada pelo humanismo e pela excelência técnica no âmbito do Direito.`;
        }

        if (isFirstPerson) {
            return `Você é o Doutor Antônio Carlos Antolini Junior, conhecido também como Cacá Antolini. Você tem uma trajetória brilhante como advogado, jurista e humanista, e eu, como ${name}, tenho a honra de ser seu assistente!`;
        }
        return `O Doutor Antônio Carlos Antolini Junior, ou Cacá Antolini, é um renomado advogado, jurista e humanista. Eu, como ${name}, fico muito feliz em te contar mais sobre a trajetória dele!`;
    }
  },
  {
    triggers: ["carreira", "trabalho", "assembleia", "ales", "advogado", "direito"],
    response: "Ele tem uma trajetória de muito sucesso no Direito Civil e no Poder Legislativo (ALES), onde entrou por concurso em 1983. Atuou como servidor até 2008 e é advogado e jornalista de formação clássica."
  },
  {
    triggers: ["premios", "honrarias", "conquistas", "distincoes", "comendador"],
    response: "Ele conquistou prêmios importantes como o Innovare na Justiça e o Braslider na Literatura. Além disso, recebeu honrarias da Academia de Letras de Maceió e, em 2025, ganhou o título de Comendador pela Assembleia Legislativa do ES."
  },
  {
    triggers: ["estudos", "formacao", "escola", "faculdade", "ufes"],
    response: "Formado em Direito em 1985, ele estudou em colégios tradicionais como Maristas e Salesianos. Também chegou a cursar Engenharia Mecânica e Jornalismo na UFES, mas seguiu mesmo a carreira no Direito e na Assembleia."
  },
  {
    triggers: ["familia", "filhas", "onde mora"],
    response: "Hoje ele vive em Vitória/ES, de forma mais reservada e focada nos estudos, contando sempre com o apoio e carinho de suas filhas, Glenda e Sophia Antolini."
  },
  {
    triggers: ["viagens", "paises", "exterior", "onde ja viajou", "paises visitados"],
    response: "O Doutor Antônio Carlos Antolini Junior já viajou por grandes centros culturais do mundo, passando pela Europa e pelas Américas. Inclusive, tem uma missão planejada para a África do Sul em 2026."
  },
  {
    triggers: ["brasil", "vitoria", "espirito santo", "minas gerais", "mg", "es", "italia", "vaticano", "franca", "inglaterra", "grecia", "austria", "portugal", "espanha", "eua", "uruguai", "paraguai", "argentina", "chile", "venezuela", "guiana"],
    response: (text: string, name: string, tone: string) => {
      const travelKeywords = ["foi", "conhece", "visitou", "esteve", "viagem", "conheceu", "passou", "mora", "reside"];
      if (travelKeywords.some(k => text.includes(k))) {
        return "Sim! Esse lugar faz parte da história e das missões dele pelo mundo.";
      }
      return null;
    }
  },
  {
    triggers: ["esteve em", "esteve no", "esteve na", "foi para", "foi pro", "foi pra", "conhece o", "conhece a", "visitou o", "visitou a", "passou por", "conheceu"],
    response: "Não há registro dessa localidade nas missões documentadas até o momento."
  },
  {
    triggers: ["livros", "publicacoes", "escritor", "obra literaria", "carta da vitoria"],
    response: "É autor dos livros: 'A Carta da Vitória do Espírito Santo!', 'Buscai e Vos Será Dado! O Evangelho Nada Secreto de Antônio!' e 'De Advogado e de Louco, Todos Temos Um Pouco'."
  },
  {
    triggers: ["dna", "origem", "etnia", "raizes", "genetica"],
    response: "Sua identidade é poliétnica: 86% Europeia (Ashkenazim), 9% Africana (Costa da Mina), 4% Ameríndia (Andina) e 1% Oriente Médio (Iemenita)."
  },
  {
    triggers: ["alcool", "ativismo", "veneno"],
    response: "É uma voz ativa contra o consumo de álcool, substância que classifica categoricamente como um 'veneno social', transformando sua própria superação em ativismo social."
  },
  {
    triggers: ["rei das duvidas"],
    response: "Sim, ele se considera o 'rei das dúvidas' devido à sua constante busca filosófica e teológica."
  },
  {
    triggers: ["valeu", "obrigado", "obrigada", "ajudou muito"],
    response: "Imagina! Tô aqui pra isso. Precisando, é só chamar."
  }
];
