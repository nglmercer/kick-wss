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
  KicksGiftedEvent,
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
  RawKicksGiftedData,
} from "./types.js";

import { KickEvent, LEGACY_EVENT_MAPPING } from "./types.js";

export class MessageParser {
  /**
   * Parsea un mensaje raw del WebSocket y devuelve el evento procesado
   */
  static parseMessage(
    rawMessage: string,
  ): { type: KickEventType; data: KickEventData; legacyType?: string } | null {
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
      
      // Normalizar evento: soporta ambos formatos (con y sin namespace)
      const normalizedEvent = LEGACY_EVENT_MAPPING[message.event] || message.event;
      
      // Guardar el formato original para retrocompatibilidad
      const originalEvent = message.event;
      const isLegacyFormat = message.event !== normalizedEvent;
      
      // Mapear eventos usando el enum
      let result: { type: KickEventType; data: KickEventData; legacyType?: string } | null = null;
      
      switch (normalizedEvent) {
        case KickEvent.ChatMessage:
          result = {
            type: "ChatMessage",
            data: this.parseChatMessage(eventData as RawChatMessageData),
          };
          break;
        case KickEvent.MessageDeleted:
          result = {
            type: "MessageDeleted",
            data: this.parseMessageDeleted(eventData as RawMessageDeletedData),
          };
          break;
        case KickEvent.UserBanned:
          result = {
            type: "UserBanned",
            data: this.parseUserBanned(eventData as RawUserBannedData),
          };
          break;
        case KickEvent.UserUnbanned:
          result = {
            type: "UserUnbanned",
            data: this.parseUserUnbanned(eventData as RawUserUnbannedData),
          };
          break;
        case KickEvent.Subscription:
          result = {
            type: "Subscription",
            data: this.parseSubscription(eventData as RawSubscriptionData),
          };
          break;
        case KickEvent.GiftedSubscriptions:
          result = {
            type: "GiftedSubscriptions",
            data: this.parseGiftedSubscriptions(
              eventData as RawGiftedSubscriptionsData,
            ),
          };
          break;
        case KickEvent.PinnedMessageCreated:
          result = {
            type: "PinnedMessageCreated",
            data: this.parsePinnedMessageCreated(
              eventData as RawPinnedMessageCreatedData,
            ),
          };
          break;
        case KickEvent.StreamHost:
          result = {
            type: "StreamHost",
            data: this.parseStreamHost(eventData as RawStreamHostData),
          };
          break;
        case KickEvent.PollUpdate:
          result = {
            type: "PollUpdate",
            data: this.parsePollUpdate(eventData as RawPollUpdateData),
          };
          break;
        case KickEvent.PollDelete:
          result = {
            type: "PollDelete",
            data: this.parsePollDelete(eventData as RawPollDeleteData),
          };
          break;
        case KickEvent.RewardRedeemed:
          result = {
            type: "RewardRedeemed",
            data: this.parseRewardRedeemed(eventData as RawRewardRedeemedData),
          };
          break;
        case KickEvent.KicksGifted:
          result = {
            type: "KicksGifted",
            data: this.parseKicksGifted(eventData as RawKicksGiftedData),
          };
          break;
        default:
          if (
            !message.event?.startsWith("pusher:") &&
            !message.event?.startsWith("pusher_internal:")
          ) {
            console.warn("Unknown event type:", message.event);
          }
          return null;
      }
      
      // Si el evento venía en formato legacy, incluir ambos formatos
      if (result && isLegacyFormat) {
        result.legacyType = originalEvent;
      }
      
      return result;
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
   * Parsea un evento de Kicks regalados
   */
  private static parseKicksGifted(data: RawKicksGiftedData): KicksGiftedEvent {
    return {
      gift_transaction_id: data.gift_transaction_id,
      message: data.message,
      sender: {
        id: data.sender.id,
        username: data.sender.username,
        username_color: data.sender.username_color,
      },
      gift: {
        gift_id: data.gift.gift_id,
        name: data.gift.name,
        amount: data.gift.amount,
        type: data.gift.type,
        tier: data.gift.tier,
        character_limit: data.gift.character_limit,
        pinned_time: data.gift.pinned_time,
      },
      type: "kicks_gifted",
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