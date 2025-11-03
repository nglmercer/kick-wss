// Parser de mensajes para procesar eventos de Kick.com
import type {
  WebSocketMessage,
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
  RewardRedeemedEvent,
  KickEventType,
  KickEventData,
  RawChatMessageData,
  RawMessageDeletedData,
  RawUserBannedData,
  RawUserUnbannedData,
  RawSubscriptionData,
  RawGiftedSubscriptionsData,
  RawPinnedMessageCreatedData,
  RawStreamHostData,
  RawPollUpdateData,
  RawPollDeleteData,
  RawRewardRedeemedData,
} from "./types.js";

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
  RewardRedeemed = "RewardRedeemedEvent",
}

export class MessageParser {
  /**
   * Parsea un mensaje raw del WebSocket y devuelve el evento procesado
   */
  static parseMessage(
    rawMessage: string,
  ): { type: KickEventType; data: KickEventData } | null {
    try {
      if (!rawMessage || rawMessage.trim() === "") {
        return null;
      }

      const message: WebSocketMessage = JSON.parse(rawMessage);

      if (!message.event || message.data === undefined) {
        return null;
      }

      // Ignorar mensajes de sistema del WebSocket
      if (
        message.event.startsWith("pusher:") ||
        message.event.startsWith("pusher_internal:")
      ) {
        return null;
      }

      if (message.event === "" || message.data === "") {
        return null;
      }

      // Parsear los datos del evento
      let eventData: unknown;
      try {
        if (message.data === undefined || message.data === "") {
          return null;
        }
        eventData = JSON.parse(message.data);
      } catch (e) {
        console.error("Error parsing event data:", e);
        return null;
      }

      // Mapear eventos usando el enum
      switch (message.event) {
        case KickEvent.ChatMessage:
          return {
            type: "ChatMessage",
            data: this.parseChatMessage(eventData as RawChatMessageData),
          };

        case KickEvent.MessageDeleted:
          return {
            type: "MessageDeleted",
            data: this.parseMessageDeleted(eventData as RawMessageDeletedData),
          };

        case KickEvent.UserBanned:
          return {
            type: "UserBanned",
            data: this.parseUserBanned(eventData as RawUserBannedData),
          };

        case KickEvent.UserUnbanned:
          return {
            type: "UserUnbanned",
            data: this.parseUserUnbanned(eventData as RawUserUnbannedData),
          };

        case KickEvent.Subscription:
          return {
            type: "Subscription",
            data: this.parseSubscription(eventData as RawSubscriptionData),
          };

        case KickEvent.GiftedSubscriptions:
          return {
            type: "GiftedSubscriptions",
            data: this.parseGiftedSubscriptions(
              eventData as RawGiftedSubscriptionsData,
            ),
          };

        case KickEvent.PinnedMessageCreated:
          return {
            type: "PinnedMessageCreated",
            data: this.parsePinnedMessageCreated(
              eventData as RawPinnedMessageCreatedData,
            ),
          };

        case KickEvent.StreamHost:
          return {
            type: "StreamHost",
            data: this.parseStreamHost(eventData as RawStreamHostData),
          };

        case KickEvent.PollUpdate:
          return {
            type: "PollUpdate",
            data: this.parsePollUpdate(eventData as RawPollUpdateData),
          };

        case KickEvent.PollDelete:
          return {
            type: "PollDelete",
            data: this.parsePollDelete(eventData as RawPollDeleteData),
          };

        case KickEvent.RewardRedeemed:
          return {
            type: "RewardRedeemed",
            data: this.parseRewardRedeemed(eventData as RawRewardRedeemedData),
          };

        default:
          if (
            !message.event?.startsWith("pusher:") &&
            !message.event?.startsWith("pusher_internal:")
          ) {
            console.warn("Unknown event type:", message.event);
          }
          return null;
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      return null;
    }
  }

  /**
   * Parsea un evento de mensaje de chat
   */
  private static parseChatMessage(data: RawChatMessageData): ChatMessageEvent {
    return {
      id: data.id,
      content: this.cleanEmotes(data.content),
      type: "message",
      created_at: data.created_at,
      sender: {
        id: data.sender.id,
        username: data.sender.username,
        slug: data.sender.slug,
        identity: {
          color: data.sender.identity?.color || "#ffffff",
          badges: data.sender.identity?.badges || [],
        },
      },
      chatroom: {
        id: data.chatroom?.id || 0,
      },
    };
  }

  /**
   * Parsea un evento de mensaje eliminado
   */
  private static parseMessageDeleted(
    data: RawMessageDeletedData,
  ): MessageDeletedEvent {
    return {
      message_id: data.message_id,
      chatroom_id: data.chatroom_id,
      type: "message_deleted",
    };
  }

  /**
   * Parsea un evento de usuario baneado
   */
  private static parseUserBanned(data: RawUserBannedData): UserBannedEvent {
    return {
      username: data.username || data.banned_username || "unknown",
      type: "user_banned",
    };
  }

  /**
   * Parsea un evento de usuario desbaneado
   */
  private static parseUserUnbanned(
    data: RawUserUnbannedData,
  ): UserUnbannedEvent {
    return {
      username: data.username || data.unbanned_username || "unknown",
      type: "user_unbanned",
    };
  }

  /**
   * Parsea un evento de suscripción
   */
  private static parseSubscription(
    data: RawSubscriptionData,
  ): SubscriptionEvent {
    return {
      username: data.username || data.user?.username || "unknown",
      type: "subscription",
    };
  }

  /**
   * Parsea un evento de suscripciones regaladas
   */
  private static parseGiftedSubscriptions(
    data: RawGiftedSubscriptionsData,
  ): GiftedSubscriptionsEvent {
    const gifter =
      data.gifted_by ||
      (typeof data.gifter === "object" ? data.gifter.username : data.gifter) ||
      "unknown";

    const recipients = Array.isArray(data.recipients)
      ? data.recipients.map((r) =>
          typeof r === "string" ? r : r.username || "unknown",
        )
      : [];

    return {
      gifted_by: gifter,
      recipients,
      type: "gifted_subscriptions",
    };
  }

  /**
   * Parsea un evento de mensaje fijado
   */
  private static parsePinnedMessageCreated(
    data: RawPinnedMessageCreatedData,
  ): PinnedMessageCreatedEvent {
    return {
      message: this.parseChatMessage(data.message),
      type: "pinned_message_created",
    };
  }

  /**
   * Parsea un evento de host de stream
   */
  private static parseStreamHost(data: RawStreamHostData): StreamHostEvent {
    const hoster =
      typeof data.hoster === "string"
        ? data.hoster
        : data.hoster?.username || "unknown";

    const hostedChannel =
      typeof data.hosted_channel === "string"
        ? data.hosted_channel
        : data.hosted_channel?.username || "unknown";

    return {
      hoster,
      hosted_channel: hostedChannel,
      type: "stream_host",
    };
  }

  /**
   * Parsea un evento de actualización de encuesta
   */
  private static parsePollUpdate(data: RawPollUpdateData): PollUpdateEvent {
    return {
      poll_id: data.id,
      question: data.question,
      options: (data.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
        votes: opt.votes || 0,
      })),
      type: "poll_update",
    };
  }

  /**
   * Parsea un evento de eliminación de encuesta
   */
  private static parsePollDelete(data: RawPollDeleteData): PollDeleteEvent {
    return {
      poll_id: data.id,
      type: "poll_delete",
    };
  }

  /**
   * Parsea un evento de recompensa canjeada
   */
  private static parseRewardRedeemed(data: RawRewardRedeemedData): RewardRedeemedEvent {
    return {
      reward_title: data.reward_title,
      user_id: data.user_id,
      channel_id: data.channel_id,
      username: data.username,
      user_input: data.user_input,
      reward_background_color: data.reward_background_color,
      type: "reward_redeemed",
    };
  }

  /**
   * Limpia los códigos de emote del contenido del mensaje
   */
  private static cleanEmotes(content: string): string {
    if (!content) return "";
    return content.replace(/\[emote:(\d+):(\w+)\]/g, "$2");
  }

  /**
   * Verifica si un mensaje es válido
   */
  static isValidMessage(message: string): boolean {
    try {
      if (!message || message.trim() === "") {
        return false;
      }

      const parsed = JSON.parse(message) as Partial<WebSocketMessage>;
      return (
        !!parsed.event &&
        parsed.data !== undefined &&
        parsed.event !== "" &&
        parsed.data !== ""
      );
    } catch {
      return false;
    }
  }

  /**
   * Extrae el tipo de evento de un mensaje raw
   */
  static extractEventType(rawMessage: string): string | null {
    try {
      if (!rawMessage || rawMessage.trim() === "") {
        return null;
      }

      const message = JSON.parse(rawMessage) as WebSocketMessage;

      if (!message.event) {
        return null;
      }

      if (
        message.event.startsWith("pusher:") ||
        message.event.startsWith("pusher_internal:")
      ) {
        return null;
      }

      if (message.event === "") {
        return null;
      }

      return message.event;
    } catch {
      return null;
    }
  }
}