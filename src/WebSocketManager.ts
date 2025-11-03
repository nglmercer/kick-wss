// Gestor principal de conexión WebSocket para Kick.com
import { EventEmitter } from "./EventEmitter.js";
import { MessageParser } from "./MessageParser.js";
import type {
  KickWebSocketOptions,
  ConnectionState,
  EventHandler,
  KickChannel,
  EventDataMap,
  ExtendedKickWebSocketOptions,
  SubscriptionMessage,
  WebSocketConfig,
} from "./types.js";

// Enum para eventos de Kick
export enum KickEvent {
  ChatMessage = "App\\Events\\ChatMessageEvent",
  MessageDeleted = "App\\Events\\MessageDeletedEvent",
  UserBanned = "App\\Events\\UserBannedEvent",
  UserUnbanned = "App\\Events\\UserUnbannedEvent",
  Subscription = "App\\Events\\SubscriptionEvent",
  GiftedSubscriptions = "App\\Events\\GiftedSubscriptionsEvent",
  PinnedMessageCreated = "App\\Events\\PinnedMessageCreatedEvent",
  StreamHost = "App\\Events\\StreamHostEvent",
  PollUpdate = "App\\Events\\PollUpdateEvent",
  PollDelete = "App\\Events\\PollDeleteEvent",
}

// Mapeo de eventos de Kick a tipos estándar
const EVENT_TYPE_MAP: Record<string, keyof EventDataMap> = {
  [KickEvent.ChatMessage]: "ChatMessage",
  [KickEvent.MessageDeleted]: "MessageDeleted",
  [KickEvent.UserBanned]: "UserBanned",
  [KickEvent.UserUnbanned]: "UserUnbanned",
  [KickEvent.Subscription]: "Subscription",
  [KickEvent.GiftedSubscriptions]: "GiftedSubscriptions",
  [KickEvent.PinnedMessageCreated]: "PinnedMessageCreated",
  [KickEvent.StreamHost]: "StreamHost",
  [KickEvent.PollUpdate]: "PollUpdate",
  [KickEvent.PollDelete]: "PollDelete",
};


export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private channelName: string = "";
  private channelId: number = 0;
  private connectionState: ConnectionState = "disconnected";
  private options: Required<KickWebSocketOptions>;
  private reconnectTimer: number | null = null;
  private isManualDisconnect: boolean = false;
  private connectionResolver: ((value: void) => void) | null = null;
  private connectionRejector: ((error: Error) => void) | null = null;

  // URLs y parámetros configurables
  private websocketUrl: string;
  private websocketParams: Record<string, string>;

  // Suscripciones personalizadas
  private customSubscriptions: string[] = [];
  private subscriptionMessages: SubscriptionMessage[] = [];

  // Valores por defecto
  private readonly DEFAULT_WEBSOCKET_URL =
    "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679";
  private readonly DEFAULT_WS_PARAMS = {
    protocol: "7",
    client: "js",
    version: "8.4.0",
    flash: "false",
  };

  constructor(options: ExtendedKickWebSocketOptions = {}) {
    super();

    // Configurar opciones básicas
    this.options = {
      debug: false,
      autoReconnect: true,
      reconnectInterval: 5000,
      connectionTimeout: 10000,
      filteredEvents: [],
      ...options,
    };

    // Configurar WebSocket URL y parámetros
    this.websocketUrl = options.websocketConfig?.url || this.DEFAULT_WEBSOCKET_URL;
    this.websocketParams = {
      ...this.DEFAULT_WS_PARAMS,
      ...options.websocketConfig?.params,
    };

    // Configurar suscripciones personalizadas
    this.customSubscriptions = options.customSubscriptions || [];
    this.subscriptionMessages = options.subscriptionMessages || [];

    this.log("WebSocketManager initialized with config:", {
      url: this.websocketUrl,
      params: this.websocketParams,
      customSubscriptions: this.customSubscriptions,
      subscriptionMessages: this.subscriptionMessages,
    });
  }

  /**
   * Conecta al WebSocket de un canal específico
   * Retorna una promesa que se resuelve cuando la conexión está lista
   */
  async connect(channelName: string): Promise<void> {
    if (
      this.connectionState === "connected" ||
      this.connectionState === "connecting"
    ) {
      this.log("Already connected or connecting");
      return;
    }

    this.channelName = channelName;
    this.isManualDisconnect = false;

    return new Promise<void>((resolve, reject) => {
      this.connectionResolver = resolve;
      this.connectionRejector = reject;

      // Timeout para evitar que la promesa nunca se resuelva
      const timeout = setTimeout(() => {
        if (this.connectionState !== "connected") {
          const error = new Error(
            `Connection timeout after ${this.options.connectionTimeout}ms`
          );
          this.handleConnectionError(error);
          reject(error);
        }
      }, this.options.connectionTimeout);

      // Limpiar timeout cuando se conecte
      const cleanupTimeout = () => clearTimeout(timeout);
      this.once("ready", cleanupTimeout);
      this.once("error", cleanupTimeout);

      this.performConnection().catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Realiza la conexión al WebSocket
   */
  private async performConnection(): Promise<void> {
    this.setConnectionState("connecting");
    this.log(`Connecting to channel: ${this.channelName}`);

    try {
      // Obtener información del canal
      const channelInfo = await this.getChannelInfo(this.channelName);
      this.channelId = channelInfo.chatroom.id;

      // Construir URL del WebSocket
      const wsUrl = this.buildWebSocketUrl();

      // Crear conexión WebSocket
      this.ws = new WebSocket(wsUrl);

      // Configurar manejadores de eventos
      this.setupWebSocketHandlers();
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Construye la URL del WebSocket con parámetros
   */
  private buildWebSocketUrl(): string {
    const params = new URLSearchParams(this.websocketParams);
    return `${this.websocketUrl}?${params.toString()}`;
  }

  /**
   * Actualiza la configuración del WebSocket (URL y parámetros)
   */
  setWebSocketConfig(config: WebSocketConfig): void {
    if (config.url) {
      this.websocketUrl = config.url;
      this.log(`WebSocket URL updated: ${config.url}`);
    }

    if (config.params) {
      this.websocketParams = { ...this.websocketParams, ...config.params };
      this.log(`WebSocket params updated:`, this.websocketParams);
    }
  }

  /**
   * Obtiene la configuración actual del WebSocket
   */
  getWebSocketConfig(): WebSocketConfig {
    return {
      url: this.websocketUrl,
      params: { ...this.websocketParams },
    };
  }

  /**
   * Restablece la configuración del WebSocket a los valores por defecto
   */
  resetWebSocketConfig(): void {
    this.websocketUrl = this.DEFAULT_WEBSOCKET_URL;
    this.websocketParams = { ...this.DEFAULT_WS_PARAMS };
    this.log("WebSocket configuration reset to defaults");
  }

  /**
   * Añade canales de suscripción personalizados
   */
  addCustomSubscriptions(channels: string[]): void {
    this.customSubscriptions.push(...channels);
    this.log(`Custom subscriptions added:`, channels);
  }

  /**
   * Añade mensajes de suscripción completamente personalizados
   */
  addSubscriptionMessages(messages: SubscriptionMessage[]): void {
    this.subscriptionMessages.push(...messages);
    this.log(`Subscription messages added:`, messages);
  }

  /**
   * Limpia todas las suscripciones personalizadas
   */
  clearCustomSubscriptions(): void {
    this.customSubscriptions = [];
    this.subscriptionMessages = [];
    this.log("Custom subscriptions cleared");
  }

  /**
   * Obtiene las suscripciones personalizadas actuales
   */
  getCustomSubscriptions(): {
    channels: string[];
    messages: SubscriptionMessage[];
  } {
    return {
      channels: [...this.customSubscriptions],
      messages: [...this.subscriptionMessages],
    };
  }

  /**
   * Configura los manejadores de eventos del WebSocket
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log("WebSocket connection opened");
      this.subscribeToChannels();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data as string);
    };

    this.ws.onclose = (event) => {
      this.log(`WebSocket closed: ${event.code} - ${event.reason}`);
      this.handleDisconnect(event.code, event.reason);
    };

    this.ws.onerror = (error) => {
      this.log("WebSocket error:", error);
      this.emit("error", error);
      this.connectionRejector?.(new Error("WebSocket error"));
    };
  }

  /**
   * Se suscribe a todos los canales (principal + personalizados)
   */
  private subscribeToChannels(): void {
    if (!this.ws) return;

    // Crear un Set para trackear canales ya suscritos
    const subscribedChannels = new Set<string>();
    /*
    {"event":"pusher:subscribe","data":{"auth":"","channel":"chatroom_56235532"}}
    {"event":"pusher:subscribe","data":{"auth":"","channel":"chatrooms.56235532.v2"}}
    {"event":"pusher:subscribe","data":{"auth":"","channel":"channel_56523912"}}
    {"event":"pusher:subscribe","data":{"auth":"","channel":"chatrooms.56235532"}}
    {"event":"pusher:subscribe","data":{"auth":"","channel":"channel.56523912"}}
    {"event":"pusher:subscribe","data":{"auth":"","channel":"predictions-channel-56523912"}}

    */
    this.customSubscriptions.push(`chatroom_${this.channelId}`);
    this.customSubscriptions.push(`chatrooms.${this.channelId}.v2`);
    this.customSubscriptions.push(`channel_${this.channelId}`);
    this.customSubscriptions.push(`chatrooms.${this.channelId}`);
    this.customSubscriptions.push(`channel.${this.channelId}`);
    this.customSubscriptions.push(`predictions-channel-${this.channelId}`);

    // Suscripciones a canales personalizados (evitando duplicados)
    for (const channel of this.customSubscriptions) {
      if (!subscribedChannels.has(channel)) {
        const subscribeMessage = {
          event: "pusher:subscribe",
          data: {
            auth: "",
            channel: channel,
          },
        };
        this.sendSubscription(subscribeMessage);
        subscribedChannels.add(channel);
        this.log(`Subscribed to custom channel: ${channel}`);
      } else {
        this.log(`Skipping duplicate subscription: ${channel}`);
      }
    }

    // Enviar mensajes de suscripción completamente personalizados (evitando duplicados)
    for (const message of this.subscriptionMessages) {
      const channel = message.data?.channel;
      if (channel && !subscribedChannels.has(channel)) {
        this.sendSubscription(message);
        subscribedChannels.add(channel);
        this.log(`Sent custom subscription message:`, message);
      } else {
        this.log(`Skipping duplicate subscription message for channel: ${channel}`);
      }
    }

    // Marcar como conectado después de todas las suscripciones
    this.setConnectionState("connected");
    this.emit("ready", { 
      channel: this.channelName,
      customSubscriptions: Array.from(subscribedChannels),
    });

    // Resolver la promesa de conexión
    this.connectionResolver?.();
    this.connectionResolver = null;
    this.connectionRejector = null;
  }

  /**
   * Envía un mensaje de suscripción al WebSocket
   */
  private sendSubscription(message: SubscriptionMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log("Cannot send subscription: WebSocket not open");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.emit("subscriptionSent", message);
    } catch (error) {
      this.log("Error sending subscription:", error);
      this.emit("subscriptionError", { message, error });
    }
  }

  /**
   * Suscribe a un canal adicional después de la conexión inicial
   */
  subscribeToChannel(channel: string): void {
    if (!this.isConnected()) {
      this.log("Cannot subscribe: not connected");
      return;
    }

    const subscribeMessage = {
      event: "pusher:subscribe",
      data: {
        auth: "",
        channel: channel,
      },
    };

    this.sendSubscription(subscribeMessage);
    this.log(`Dynamically subscribed to channel: ${channel}`);
  }

  /**
   * Desuscribe de un canal
   */
  unsubscribeFromChannel(channel: string): void {
    if (!this.isConnected()) {
      this.log("Cannot unsubscribe: not connected");
      return;
    }

    const unsubscribeMessage = {
      event: "pusher:unsubscribe",
      data: {
        channel: channel,
      },
    };

    if (this.ws) {
      this.ws.send(JSON.stringify(unsubscribeMessage));
      this.log(`Unsubscribed from channel: ${channel}`);
    }
  }

  sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log("Cannot send ping: WebSocket not open");
      return;
    }

    try {
      this.ws.send(JSON.stringify({ event: "pusher:ping", data: "{}" }));
      this.emit("pingSent");
    } catch (error) {
      this.log("Error sending ping:", error);
      this.emit("pingError", error);
    }
  }

  /**
   * Maneja los mensajes recibidos del WebSocket
   */
  private handleMessage(rawMessage: string): void {
    // Emitir mensaje raw primero
    this.emit("rawMessage", rawMessage);
    
    // Filtrar eventos de sistema de Pusher temprano
    try {
      const message = JSON.parse(rawMessage);
      if (
        message.event?.startsWith("pusher:") ||
        message.event?.startsWith("pusher_internal:")
      ) {
        if (message.event === "pusher:pong"){
          this.sendPing();
        }
        this.log(`Ignoring Pusher system event: ${message.event}`);
        return;
      }
    } catch (e) {
      // Si no es JSON válido, continuamos con el procesamiento normal
    }

    // Verificar si el evento está filtrado
    const eventType = MessageParser.extractEventType(rawMessage);
    if (eventType && this.isEventFiltered(eventType)) {
      this.log(`Event filtered: ${eventType}`);
      return;
    }

    // Parsear el mensaje
    const parsedMessage = MessageParser.parseMessage(rawMessage);
    if (parsedMessage) {
      this.log(`Parsed event: ${parsedMessage.type}`);
      this.emit(parsedMessage.type, parsedMessage.data);
    }
  }

  /**
   * Verifica si un evento está filtrado
   */
  private isEventFiltered(eventType: string): boolean {
    if (this.options.filteredEvents.length === 0) {
      return false;
    }

    const standardEventType = EVENT_TYPE_MAP[eventType];
    return standardEventType
      ? !this.options.filteredEvents.includes(standardEventType)
      : false;
  }

  /**
   * Maneja la desconexión
   */
  private handleDisconnect(code: number, reason: string): void {
    this.setConnectionState("disconnected");
    this.emit("disconnect", { code, reason });

    // Rechazar promesa de conexión si existe
    this.connectionRejector?.(
      new Error(`Disconnected: ${code} - ${reason}`)
    );
    this.connectionResolver = null;
    this.connectionRejector = null;

    // Reconexión automática si no es desconexión manual
    if (this.options.autoReconnect && !this.isManualDisconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Maneja errores de conexión
   */
  private handleConnectionError(error: Error): void {
    this.setConnectionState("error");
    this.emit("error", error);

    // Rechazar promesa de conexión si existe
    this.connectionRejector?.(error);
    this.connectionResolver = null;
    this.connectionRejector = null;

    if (this.options.autoReconnect && !this.isManualDisconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Programa una reconexión
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.setConnectionState("reconnecting");
    this.log(`Scheduling reconnect in ${this.options.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.log("Attempting to reconnect...");
      this.performConnection().catch((error) => {
        this.log("Reconnection failed:", error);
      });
    }, this.options.reconnectInterval) as unknown as number;
  }

  /**
   * Desconecta manualmente
   */
  disconnect(): void {
    this.isManualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }

    this.setConnectionState("disconnected");
    this.log("Manual disconnect completed");
  }

  /**
   * Obtiene información del canal
   */
  public async getChannelInfo(channelName: string): Promise<KickChannel> {
    const url = `https://kick.com/api/v2/channels/${channelName}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as KickChannel;
      return data;
    } catch (error) {
      this.log("Error fetching channel info:", error);
      throw new Error(
        `Failed to fetch channel info for ${channelName}: ${String(error)}`,
      );
    }
  }

  /**
   * Establece el estado de conexión
   */
  private setConnectionState(state: ConnectionState): void {
    const oldState = this.connectionState;
    this.connectionState = state;
    this.log(`Connection state changed: ${oldState} -> ${state}`);
  }

  /**
   * Registra mensajes de debug si está habilitado
   */
  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log("[KickWebSocket]", ...args);
    }
  }

  /**
   * Registra un listener para un evento específico
   */
  override on<K extends keyof EventDataMap>(
    event: K,
    handler: EventHandler<EventDataMap[K]>,
  ): void {
    super.on(event, handler as EventHandler<unknown>);
  }

  /**
   * Registra un listener que se ejecuta solo una vez
   */
  override once<K extends keyof EventDataMap>(
    event: K,
    handler: EventHandler<EventDataMap[K]>,
  ): void {
    super.once(event, handler as EventHandler<unknown>);
  }

  /**
   * Elimina un listener
   */
  override off<K extends keyof EventDataMap>(
    event: K,
    handler: EventHandler<EventDataMap[K]>,
  ): void {
    super.off(event, handler as EventHandler<unknown>);
  }

  // ==================== GETTERS ====================

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return (
      this.connectionState === "connected" &&
      this.ws?.readyState === WebSocket.OPEN
    );
  }

  /**
   * Obtiene el estado actual de conexión
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Obtiene el nombre del canal actual
   */
  getChannelName(): string {
    return this.channelName;
  }

  /**
   * Obtiene el ID del canal actual
   */
  getChannelId(): number {
    return this.channelId;
  }



  /**
   * Actualiza las opciones en tiempo de ejecución
   */
  updateOptions(newOptions: Partial<ExtendedKickWebSocketOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    if (newOptions.websocketConfig) {
      this.setWebSocketConfig(newOptions.websocketConfig);
    }
    
    if (newOptions.customSubscriptions) {
      this.addCustomSubscriptions(newOptions.customSubscriptions);
    }
    
    if (newOptions.subscriptionMessages) {
      this.addSubscriptionMessages(newOptions.subscriptionMessages);
    }
    
    this.log("Options updated:", this.options);
  }
}