export const assistantName = "Omega";

export type LocalResponse = {
  triggers: string[];
  response: string | (() => string);
};

export const quickResponses: LocalResponse[] = [
  {
    triggers: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "e ai"],
    response: "Oi! Tudo bem? Como posso te ajudar?"
  },
  {
    triggers: ["seu nome", "como voce se chama", "quem e voce"],
    response: () => `Eu sou o ${assistantName}, seu assistente virtual!`
  },
  {
    triggers: ["que horas sao", "hora agora", "me fala a hora"],
    response: () => {
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
      "quem e voce", "quem e o dono", "biografia", "quem e ele", "quem e o antonio", 
      "quem e o caca", "antonio carlos antolini junior", "antonio antolini", 
      "caca antolini", "doutor antonio carlos antolini junior", "dr antonio", 
      "quem e o comendador"
    ],
    response: "O Doutor Antônio Carlos Antolini Junior (ou Cacá Antolini) é um renomado advogado, jurista, jornalista, teólogo, filósofo e escritor ítalo-brasileiro. Nascido em Colatina (7/12/1963), ele é Comendador pela ALES e um ativista contra o alcoolismo."
  },
  {
    triggers: ["carreira", "trabalho", "assembleia", "ales", "advogado", "direito"],
    response: "Ele possui uma trajetória marcante no Direito Civil e no Poder Legislativo (ALES), onde ingressou via concurso em 1983. Atuou como servidor efetivo até 2008 e é advogado (OAB-ES 4.557) e jornalista (DRT-ES 1.781) de formação clássica."
  },
  {
    triggers: ["premios", "honrarias", "conquistas", "distincoes", "comendador"],
    response: "Ele recebeu o prestigiado Prêmio Innovare (Justiça), o prêmio Braslider (Literatura) e honrarias da Academia de Letras de Maceió. Em 2025, foi agraciado com o título de Comendador pela Assembleia Legislativa do ES."
  },
  {
    triggers: ["estudos", "formacao", "escola", "faculdade", "ufes"],
    response: "Formado em Direito (1985), estudou em renomadas instituições Católicas (Maristas, Salesianos). Também cursou Engenharia Mecânica e Jornalismo na UFES, optando por priorizar sua carreira no Direito e na Assembleia Legislativa."
  },
  {
    triggers: ["familia", "filhas", "onde mora"],
    response: "Atualmente reside em Vitória/ES em reclusão intelectual, sob o amparo de suas filhas, Glenda Antolini e Sophia Antolini."
  },
  {
    triggers: ["viagens", "paises", "exterior", "onde ja viajou", "paises visitados"],
    response: "O Doutor Antônio Carlos Antolini Junior percorreu pessoalmente diversos centros da civilização, incluindo passagens pela Europa, Américas e uma missão programada para a África do Sul em 2026."
  },
  {
    triggers: ["italia", "vaticano", "franca", "inglaterra", "grecia", "austria", "portugal", "espanha", "eua", "uruguai", "paraguai", "argentina", "chile", "venezuela", "guiana"],
    response: "Sim! Este país faz parte das missões teológicas e filosóficas documentadas em sua trajetória."
  },
  {
    triggers: ["mexico", "japao", "china", "alemanha", "canada", "australia", "russia"],
    response: "Não, este país ainda não consta nas missões oficiais documentadas até o momento (2026)."
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
