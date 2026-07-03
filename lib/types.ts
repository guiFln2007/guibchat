// Tipos centrais do AutoDM (estrutura inspirada no Quick Automation do ManyChat)

export type MatchType = "contains" | "exact" | "any";

/** Botão de uma mensagem da sequência */
export interface StepButton {
  title: string;
  /** "next" = avança pro próximo passo · "url" = abre link */
  type: "next" | "url";
  url?: string;
}

/** Um passo da sequência de DMs */
export interface DmStep {
  id: string;
  /** rótulo interno: welcome, follow_gate, link, custom */
  kind: "welcome" | "follow_gate" | "link" | "custom";
  enabled: boolean;
  text: string;
  buttons: StepButton[];
}

export interface Automation {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;

  trigger: {
    type: "comment" | "dm";
    /** null = qualquer publicação; lista de media IDs = só nessas */
    postIds: string[] | null;
    matchType: MatchType;
    keywords: string[];
  };

  /** Respostas públicas ao comentário — sorteia uma (rotativas, anti-spam) */
  publicReplies: string[];

  /** Sequência de DMs */
  steps: DmStep[];

  stats: {
    triggered: number;
    dmsSent: number;
    commentsReplied: number;
    clicks: number;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  automationId: string;
  automationName: string;
  event: "comment" | "dm" | "postback";
  fromUsername?: string;
  fromId: string;
  matchedKeyword?: string;
  text: string;
  actions: string[];
  ok: boolean;
  error?: string;
}

/** Contato — todo mundo que interagiu com a conta */
export interface Contact {
  id: string;
  username?: string;
  source: "comment" | "dm";
  status: "inscrito" | "cancelado";
  firstInteraction: string;
  lastInteraction: string;
  interactions: number;
}

/** Mensagem da Caixa de Entrada */
export interface InboxMessage {
  id: string;
  contactId: string;
  contactUsername?: string;
  direction: "in" | "out";
  text: string;
  timestamp: string;
  /** origem: dm real, comentário (registro), automação (eco do bot) */
  via: "dm" | "comment" | "bot" | "manual";
}

/** Mídia da conta (pro seletor de posts) */
export interface IgMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}
