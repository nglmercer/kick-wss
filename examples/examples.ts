// Ejemplos de uso de la librería Kick WebSocket Lite

import { KickWebSocket } from "../src/index.js";
import type {
  ChatMessageEvent,
  SubscriptionEvent,
  UserBannedEvent,
  GiftedSubscriptionsEvent,
} from "../src/types.js";

/**
 * Ejemplo 1: Uso básico - Conectar y escuchar mensajes
 */
export async function basicUsage(channelName: string='namechannel') {
  console.log("=== Ejemplo 1: Uso Básico ===");

  const kickWS = new KickWebSocket({ debug: true });

  // Conectar a un canal
  await kickWS.connect(channelName);

  // Eventos de conexión
  kickWS.on("ready", () => {
    console.log("✅ Conectado exitosamente");
  });
  kickWS.on('rawMessage', (message: string) => {
    console.log("Mensaje raw:", message);
  });
  kickWS.on("disconnect", (data: { reason?: string }) => {
    console.log("❌ Desconectado:", data.reason);
  });

  kickWS.on("error", (error: Error) => {
    console.error("⚠️ Error:", error);
  });
  return channelName
}
export async function getChannelInfo(channelName: string='namechannel') {
  const kickWS = new KickWebSocket({ debug: true });

  const channelInfo = await kickWS.getChannelInfo(channelName);
  console.log("Información del canal:", channelInfo);
  return channelInfo;
}
/**
 * Conecta al WebSocket ws-us3 con suscripciones múltiples
 */
export async function ws3(channelName: string = 'namechannel') {
  const ws3Url = "wss://ws-us3.pusher.com/app/dd11c46dae0376080879";
  
  const kickWS = new KickWebSocket({ 
    debug: true, 
    websocketConfig: { url: ws3Url } 
  });

  // Obtener información del canal
  const channelInfo = await kickWS.getChannelInfo(channelName);
  const channelId = channelInfo.chatroom.id;

  /*
  {"event":"pusher:subscribe","data":{"auth":"","channel":"chatroom_56235532"}}
  {"event":"pusher:subscribe","data":{"auth":"","channel":"chatrooms.56235532.v2"}}
  {"event":"pusher:subscribe","data":{"auth":"","channel":"channel_56523912"}}
  {"event":"pusher:subscribe","data":{"auth":"","channel":"chatrooms.56235532"}}
  {"event":"pusher:subscribe","data":{"auth":"","channel":"channel.56523912"}}
  {"event":"pusher:subscribe","data":{"auth":"","channel":"predictions-channel-56523912"}}

  */
  const channelPatterns = [
    `chatroom_${channelId}`,
    `chatrooms.${channelId}.v2`,
    `channel_${channelId}`,
    `channel.${channelId}`,
    `predictions-channel-${channelId}`
  ];

  const customSubscriptions = channelPatterns.map(channel => ({
    event: "pusher:subscribe",
    data: { auth: "", channel }
  }));
  kickWS.addSubscriptionMessages(customSubscriptions);

  // Configurar eventos ANTES de conectar
  kickWS.on("ready", () => {
    console.log("✅ Conectado exitosamente al canal:", channelName);
  });

  kickWS.on("rawMessage", (message: string) => {
    console.log("📨 Mensaje raw:", message);
  });

  kickWS.on("error", (error: Error) => {
    console.error("❌ Error:", error.message);
  });

  kickWS.on("disconnect", (data) => {
    console.log("🔌 Desconectado:", data.reason);
  });

  // Conectar al WebSocket
  await kickWS.connect(channelName);

  // Retornar el cliente para control externo
  return channelName;
}
/**
 * Ejemplo 2: Bot de registro de actividad
 */
export function activityLogger() {
  console.log("=== Ejemplo 2: Bot de Registro de Actividad ===");

  // Usar configuración para análisis
  const kickWS = new KickWebSocket({
    debug: true,
    filteredEvents: [
      "ChatMessage",
      "UserBanned",
      "Subscription",
      "GiftedSubscriptions",
    ],
  });

  kickWS.connect("streamer-popular");

  let stats = {
    messages: 0,
    subscriptions: 0,
    bans: 0,
    giftedSubs: 0,
  };

  // Contear suscripciones regaladas
  kickWS.on("GiftedSubscriptions", (gift: GiftedSubscriptionsEvent) => {
    stats.giftedSubs += gift.recipients.length;
    console.log(
      `🎁 ${gift.gifted_by} regaló ${gift.recipients.length} suscripciones`,
    );
  });

  // Reporte cada 30 segundos
  setInterval(() => {
    console.log(`📊 Estadísticas (últimos 30s):
      Mensajes: ${stats.messages}
      Suscripciones: ${stats.subscriptions}
      Bans: ${stats.bans}
      Subs regaladas: ${stats.giftedSubs}
    `);

    // Resetear contadores
    stats = { messages: 0, subscriptions: 0, bans: 0, giftedSubs: 0 };
  }, 30000);
}

/**
 * Ejemplo 3: Monitor de múltiples canales
 */
export function multiChannelMonitor() {
  console.log("=== Ejemplo 3: Monitor de Múltiples Canales ===");

  const channels = ["streamer1", "streamer2", "streamer3"];
  const connections: Map<string, KickWebSocket> = new Map();

  channels.forEach((channelName) => {
    const kickWS = new KickWebSocket({
      debug: false,
      autoReconnect: true,
      filteredEvents: ["ChatMessage", "UserBanned", "Subscription"],
    });

    connections.set(channelName, kickWS);

    kickWS.connect(channelName);



    kickWS.on("ready", () => {
      console.log(`✅ Conectado a ${channelName}`);
    });
  });

  // Función para desconectar todos los canales
  function disconnectAll() {
    connections.forEach((ws, channel) => {
      ws.disconnect();
      console.log(`❌ Desconectado de ${channel}`);
    });
  }

  return { disconnectAll };
}

/**
 * Ejemplo 4: Sistema de notificaciones
 */
export function notificationSystem() {
  console.log("=== Ejemplo 4: Sistema de Notificaciones ===");

  const kickWS = new KickWebSocket({
    debug: false,
  });

  // Palabras clave para notificaciones
  const keywords = ["admin", "mod", "help", "bug", "issue"];
  const mentionedUsers = new Set<string>();

  kickWS.connect("monitored-channel");


  function sendNotification(message: string) {
    // Aquí implementarías tu sistema de notificaciones
    // Por ejemplo: Discord webhook, Slack, Telegram, etc.
    console.log(`🔔 NOTIFICACIÓN: ${message}`);

    // Ejemplo de webhook a Discord (comentado)
    /*
    fetch('https://discord.com/api/webhooks/YOUR_WEBHOOK_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
    */
  }

  return { mentionedUsers: Array.from(mentionedUsers) };
}





// Exportar todos los ejemplos
export const examples = {
  basicUsage,
  activityLogger,
  multiChannelMonitor,
  notificationSystem,
};

// Función para ejecutar todos los ejemplos (con cuidado)
export function runAllExamples() {
  console.log("Ejecuta los ejemplos individualmente para evitar sobrecarga");

  // Descomentar para ejecutar (con precaución)
  //basicUsage();
  // setTimeout(() => activityLogger(), 5000);
  // setTimeout(() => multiChannelMonitor(), 10000);
}
basicUsage("memelcer").then((channelInfo) => {
  console.log(channelInfo);
});