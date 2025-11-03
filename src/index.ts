// Archivo principal de exportación de la librería WebSocket de Kick.com
export { WebSocketManager } from "./WebSocketManager.js";
export { EventEmitter } from "./EventEmitter.js";
export { MessageParser } from "./MessageParser.js";
// Exportar tipos y enums
export type {
  KickMessage,
  KickUser,
  KickChannel,
  ChatMessageEvent,
  MessageDeletedEvent,
  UserBannedEvent,
  UserUnbannedEvent,
  SubscriptionEvent,
  GiftedSubscriptionsEvent,
  PinnedMessageCreatedEvent,
  StreamHostEvent,
  PollUpdateEvent,
  PollDeleteEvent,
  KickEventType,
  KICK_EVENTS,
  KickEventData,
  KickWebSocketOptions,
  WebSocketMessage,
  ConnectionState,
  EventHandler,
  IKickWebSocket,
  EventDataMap,
} from "./types.js";

// Exportar enums
export { KickEvent, LEGACY_EVENT_MAPPING } from "./types.js";

// Clase principal simplificada para uso fácil
import { WebSocketManager } from "./WebSocketManager.js";
import type {
  ExtendedKickWebSocketOptions,
  KickEventType,
  EventHandler,
} from "./types.js";

/**
 * Clase principal para conectar a los WebSockets de Kick.com
 *
 * Ejemplo de uso:
 * ```typescript
 * import { KickWebSocket } from './websocket-lib';
 *
 * const kickWS = new KickWebSocket({ debug: true });
 *
 * kickWS.connect('nombre-del-canal');
 *
 * kickWS.on('ChatMessage', (message) => {
 *   console.log('Nuevo mensaje:', message.content);
 * });
 *
 * kickWS.on('ready', () => {
 *   console.log('Conectado exitosamente');
 * });
 * ```
 */
export class KickWebSocket extends WebSocketManager {
  constructor(options: ExtendedKickWebSocketOptions = {}) {
    super(options);
  }

  /**
   * Método de conveniencia para escuchar todos los eventos
   */
  onAllEvents(handler: EventHandler<unknown>): void {
    const events: KickEventType[] = [
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
      "rawMessage",
      "ready",
      "error",
      "disconnect",
    ];

    events.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Método de conveniencia para escuchar solo eventos de chat
   */
  onChatEvents(handler: EventHandler<unknown>): void {
    const chatEvents: KickEventType[] = [
      "ChatMessage",
      "MessageDeleted",
      "PinnedMessageCreated",
    ];

    chatEvents.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Método de conveniencia para escuchar solo eventos de usuarios
   */
  onUserEvents(handler: EventHandler<unknown>): void {
    const userEvents: KickEventType[] = [
      "UserBanned",
      "UserUnbanned",
      "Subscription",
      "GiftedSubscriptions",
    ];

    userEvents.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Método de conveniencia para escuchar solo eventos de stream
   */
  onStreamEvents(handler: EventHandler<unknown>): void {
    const streamEvents: KickEventType[] = [
      "StreamHost",
      "PollUpdate",
      "PollDelete",
    ];

    streamEvents.forEach((event) => {
      this.on(event, handler);
    });
  }

  /**
   * Crea una instancia configurada para modo de debug
   */
  static createDebug(channelName?: string): KickWebSocket {
    const ws = new KickWebSocket({
      debug: true,
      autoReconnect: true,
      reconnectInterval: 3000,
    });

    if (channelName) {
      ws.connect(channelName).catch(console.error);
    }

    return ws;
  }
}

// Exportar por defecto la clase principal
export default KickWebSocket;
