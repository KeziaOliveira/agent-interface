export type LocalResponse = {
  triggers: string[];
  response: string | ((text: string, assistantName: string, tone: 'formal' | 'fun' | 'default') => string | null);
};

export const quickResponses: LocalResponse[] = [
  {
    triggers: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "e ai", "tudo bem", "tudo bom", "como vai", "ei"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Meus cumprimentos, Prezada Excelência. Em que posso ser-lhe útil nesta oportunidade?`;
        }
        return "Oi! Tudo bem? Como posso te ajudar?";
    }
  },
  {
    triggers: ["seu nome", "como voce se chama", "quem e voce"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Identifico-me como ${name}, seu assistente virtual de prontidão.`;
        }
        return `Eu sou o ${name}, seu assistente virtual!`;
    }
  },
  {
    triggers: ["que horas sao", "hora agora", "me fala a hora"],
    response: (text: string, name: string, tone: string) => {
      // Se a pergunta menciona um lugar específico, não responde localmente (fallback para LLM)
      const locKeywords = [" na ", " no ", " em ", " da ", " do ", " de "];
      if (locKeywords.some(k => text.includes(k))) return null;
      
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (tone === 'formal') {
          return `O horário oficial registra, no presente momento, ${timeStr}.`;
      }
      return `Agora são ${timeStr}.`;
    }
  },
  {
    triggers: ["como voce esta", "tudo bem", "como vai"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Tudo transcorre na mais perfeita ordem, agradeço vossa gentileza. E com você, como prosseguem vossos afazeres?`;
        }
        return "Tô ótimo, valeu por perguntar! E você?";
    }
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
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `O Doutor Antônio Carlos Antolini Junior incursionou no Poder Legislativo (ALES) via concurso público em 1983. Exerceu múnus como servidor efetivo até 2008, aliando à referida função a advocacia (OAB-ES 4.557) e o jornalismo profissional.`;
        }
        return "Ele tem uma trajetória de muito sucesso no Direito Civil e no Poder Legislativo (ALES), onde entrou por concurso em 1983. Atuou como servidor até 2008 e é advogado e jornalista de formação clássica.";
    }
  },
  {
    triggers: ["premios", "honrarias", "conquistas", "distincoes", "comendador"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Láureas de escol lhes foram outorgadas, tais como o Prêmio Innovare e o prêmio Braslider. Ademais, foi agraciado com o título de Comendador pela veneranda Assembleia Legislativa do ES em 2025.`;
        }
        return "Ele conquistou prêmios importantes como o Innovare na Justiça e o Braslider na Literatura. Além disso, recebeu honrarias da Academia de Letras de Maceió e, em 2025, ganhou o título de Comendador pela Assembleia Legislativa do ES.";
    }
  },
  {
    triggers: ["estudos", "formacao", "escola", "faculdade", "ufes"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Egressado do curso de Direito em 1985, sua base acadêmica remonta a instituições de tradição Marista e Salesiana. Outrossim, cursou Engenharia e Jornalismo na UFES, optando pela prevalência da ciência jurídica.`;
        }
        return "Formado em Direito em 1985, ele estudou em colégios tradicionais como Maristas e Salesianos. Também chegou a cursar Engenharia Mecânica e Jornalismo na UFES, mas seguiu mesmo a carreira no Direito e na Assembleia.";
    }
  },
  {
    triggers: ["familia", "filhas", "onde mora"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Atualmente, reside no município de Vitória/ES em reclusão intelectual, sob a égide e amparo dileto de suas progenitoras Glenda e Sophia Antolini.`;
        }
        return "Hoje ele vive em Vitória/ES, de forma mais reservada e focada nos estudos, contando sempre com o apoio e carinho de suas filhas, Glenda e Sophia Antolini.";
    }
  },
  {
    triggers: ["viagens", "paises", "exterior", "onde ja viajou", "paises visitados"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `O Doutor Antônio Carlos Antolini Junior peregrinou por diversos centros da civilização mundial, destacando-se missões na Europa e Américas, com projeção transcontinental para a África em 2026.`;
        }
        return "O Doutor Antônio Carlos Antolini Junior já viajou por grandes centros culturais do mundo, passando pela Europa e pelas Américas. Inclusive, tem uma missão planejada para a África do Sul em 2026.";
    }
  },
  {
    triggers: ["brasil", "vitoria", "espirito santo", "minas gerais", "mg", "es", "italia", "vaticano", "franca", "inglaterra", "grecia", "austria", "portugal", "espanha", "eua", "uruguai", "paraguai", "argentina", "chile", "venezuela", "guiana"],
    response: (text, name, tone) => {
      const travelKeywords = ["foi", "conhece", "visitou", "esteve", "viagem", "conheceu", "passou", "mora", "reside"];
      if (travelKeywords.some(k => text.includes(k))) {
        if (tone === 'formal') {
            return `Afirmativo. Referida localidade integra as missões e a veneranda trajetória documentada do jurista.`;
        }
        return "Sim! Esse lugar faz parte da história e das missões dele pelo mundo.";
      }
      return null;
    }
  },
  {
    triggers: ["esteve em", "esteve no", "esteve na", "foi para", "foi pro", "foi pra", "conhece o", "conhece a", "visitou o", "visitou a", "passou por", "conheceu"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Não há registro de tal incursão geográfica nas diligências e fontes documentais acostadas até a presente data.`;
        }
        return "Não há registro dessa localidade nas missões documentadas até o momento.";
    }
  },
  {
    triggers: ["livros", "publicacoes", "escritor", "obra literaria", "carta da vitoria"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Sua produção intelectiva reside nas obras: 'A Carta da Vitória do Espírito Santo!', 'Buscai e Vos Será Dado!' e 'De Advogado e de Louco, Todos Temos Um Pouco'.`;
        }
        return "Ele escreveu livros inspiradores como 'A Carta da Vitória do Espírito Santo!', 'Buscai e Vos Será Dado!' e 'De Advogado e de Louco, Todos Temos Um Pouco'.";
    }
  },
  {
    triggers: ["dna", "origem", "etnia", "raizes", "genetica"],
    response: (text, name, tone) => {
        const dna = "86% Europeia (Ashkenazim), 9% Africana (Costa da Mina), 4% Ameríndia (Andina) e 1% Oriente Médio (Iemenita).";
        if (tone === 'formal') {
            return `Sua composição genômica, sob o viés da ancestralidade, revela: ${dna}`;
        }
        return `A origem dele é uma mistura bem rica: ${dna}`;
    }
  },
  {
    triggers: ["alcool", "ativismo", "veneno"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `O jurista mantém estrita militância contra o consumo do álcool, classificando-o como estigma e veneno social passível de superação.`;
        }
        return "Ele é uma voz forte contra o álcool, que ele chama de veneno social, incentivando as pessoas a superarem esse hábito.";
    }
  },
  {
    triggers: ["rei das duvidas"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Correto. A alcunha de 'rei das dúvidas' exprime sua incessante busca filosófica por respostas teológicas.`;
        }
        return "Sim, ele se define como o 'rei das dúvidas' por estar sempre em busca de novas respostas filosóficas.";
    }
  },
  {
    triggers: ["valeu", "obrigado", "obrigada", "ajudou muito"],
    response: (text, name, tone) => {
        if (tone === 'formal') {
            return `Não há de quê. Permaneço à disposição para novos esclarecimentos que se fizerem necessários.`;
        }
        return "Imagina! Tô aqui pra isso sempre que precisar.";
    }
  }
];
