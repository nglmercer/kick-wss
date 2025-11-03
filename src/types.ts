// Definiciones de tipos para la librería WebSocket de Kick.com

export interface KickMessage {
  id: string;
  content: string;
  type: "message";
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity: {
      color: string;
      badges: string[];
    };
  };
  chatroom: {
    id: number;
    channel_id: number;
  };
}

export interface KickUser {
  id: number;
  username: string;
  slug: string;
  identity: {
    color: string;
    badges: string[];
  };
}

export interface KickChannel {
  id: number;
  slug: string;
  user: {
    username: string;
  };
  chatroom: {
    id: number;
  };
}

// Eventos del WebSocket
export interface ChatMessageEvent {
  id: string;
  content: string;
  type: "message";
  created_at: string;
  sender: KickUser;
  chatroom: {
    id: number;
  };
}

export interface MessageDeletedEvent {
  message_id: string;
  chatroom_id: number;
  type: "message_deleted";
}

export interface UserBannedEvent {
  username: string;
  type: "user_banned";
}

export interface UserUnbannedEvent {
  username: string;
  type: "user_unbanned";
}

export interface SubscriptionEvent {
  username: string;
  type: "subscription";
}

export interface GiftedSubscriptionsEvent {
  gifted_by: string;
  recipients: string[];
  type: "gifted_subscriptions";
}

export interface PinnedMessageCreatedEvent {
  message: ChatMessageEvent;
  type: "pinned_message_created";
}

export interface StreamHostEvent {
  hoster: string;
  hosted_channel: string;
  type: "stream_host";
}

export interface PollUpdateEvent {
  poll_id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  type: "poll_update";
}

export interface PollDeleteEvent {
  poll_id: string;
  type: "poll_delete";
}

export interface RewardRedeemedEvent {
  reward_title: string;
  user_id: number;
  channel_id: number;
  username: string;
  user_input: string;
  reward_background_color: string;
  type: "reward_redeemed";
}

// Array de todos los eventos disponibles
export const KICK_EVENTS = [
  "ChatMessage",
  "MessageDeleted",
  "UserBanned",
  "UserUnbanned",
  "Subscription",
  "GiftedSubscriptions",
  "PinnedMessageCreated",
  "StreamHost",
  "PollUpdate",
  "PollDelete",
  "RewardRedeemed",
  "ready",
  "disconnect",
  "error",
  "rawMessage",
] as const;

// Tipos de eventos que pueden ser emitidos
export type KickEventType = (typeof KICK_EVENTS)[number];

// Mapa de tipos de datos para cada evento
export interface EventDataMap {
  ChatMessage: ChatMessageEvent;
  MessageDeleted: MessageDeletedEvent;
  UserBanned: UserBannedEvent;
  UserUnbanned: UserUnbannedEvent;
  Subscription: SubscriptionEvent;
  GiftedSubscriptions: GiftedSubscriptionsEvent;
  PinnedMessageCreated: PinnedMessageCreatedEvent;
  StreamHost: StreamHostEvent;
  PollUpdate: PollUpdateEvent;
  PollDelete: PollDeleteEvent;
  RewardRedeemed: RewardRedeemedEvent;
  ready: { channel: string };
  disconnect: { reason?: string };
  error: Error;
  rawMessage: string;
}

// Tipos de datos para cada evento
export type KickEventData =
  | ChatMessageEvent
  | MessageDeletedEvent
  | UserBannedEvent
  | UserUnbannedEvent
  | SubscriptionEvent
  | GiftedSubscriptionsEvent
  | PinnedMessageCreatedEvent
  | StreamHostEvent
  | PollUpdateEvent
  | PollDeleteEvent
  | RewardRedeemedEvent
  | { channel: string } // ready event
  | { reason?: string } // disconnect event
  | Error // error event
  | string; // rawMessage event

// Opciones de configuración
export interface KickWebSocketOptions {
  debug?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  connectionTimeout?: number;
  filteredEvents?: KickEventType[];
}

// Estructura del mensaje raw del WebSocket
export interface WebSocketMessage {
  event: string;
  data: string;
  channel?: string;
}

// Estados de conexión
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// Manejador de eventos
export type EventHandler<T = unknown> = (data: T) => void;

// Interfaz para el manager de WebSocket
export interface IKickWebSocket {
  connect(channelName: string): Promise<void>;
  disconnect(): void;
  on<T = KickEventData>(event: KickEventType, handler: EventHandler<T>): void;
  off<T = KickEventData>(event: KickEventType, handler: EventHandler<T>): void;
  isConnected(): boolean;
  getConnectionState(): ConnectionState;
}

// Tipos para los datos raw que vienen del servidor (antes de parsear)
export interface RawChatMessageData {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
    slug: string;
    identity?: {
      color?: string;
      badges?: string[];
    };
  };
  chatroom?: {
    id: number;
  };
}

export interface RawMessageDeletedData {
  message_id: string;
  chatroom_id: number;
}

export interface RawUserBannedData {
  username?: string;
  banned_username?: string;
}

export interface RawUserUnbannedData {
  username?: string;
  unbanned_username?: string;
}

export interface RawSubscriptionData {
  username?: string;
  user?: {
    username: string;
  };
}

export interface RawGiftedSubscriptionsData {
  gifted_by?: string;
  gifter?: {
    username: string;
  };
  recipients?: Array<string | { username: string }>;
}

export interface RawPinnedMessageCreatedData {
  message: RawChatMessageData;
}

export interface RawStreamHostData {
  hoster?: string | { username: string };
  hosted_channel?: string | { username: string };
}

export interface RawPollUpdateData {
  id: string;
  question: string;
  options?: Array<{
    id: string;
    text: string;
    votes?: number;
  }>;
}

export interface RawPollDeleteData {
  id: string;
}

export interface RawRewardRedeemedData {
  reward_title: string;
  user_id: number;
  channel_id: number;
  username: string;
  user_input: string;
  reward_background_color: string;
}

// Tipo para mensajes de suscripción personalizados
export interface SubscriptionMessage {
  event: string;
  data?: {
    auth?: string;
    channel?: string;
  };
}

// Configuración extendida del WebSocket
export interface WebSocketConfig {
  url?: string;
  params?: Record<string, string>;
}

// Opciones extendidas
export interface ExtendedKickWebSocketOptions extends KickWebSocketOptions {
  websocketConfig?: WebSocketConfig;
  customSubscriptions?: string[]; // Array de canales custom
  subscriptionMessages?: SubscriptionMessage[]; // Mensajes de suscripción completamente personalizados
}
