// Tests kick-ws
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { KickWebSocket } from "../src/index.js";
import type {
  ChatMessageEvent,
  UserBannedEvent,
  SubscriptionEvent,
  GiftedSubscriptionsEvent,
  MessageDeletedEvent,
} from "../src/types.js";

const TEST_CONFIG = {
  channelName: "elzeein",
  timeout: 5000,
  messageWaitTime: 5000,
  debug: true,
};

describe("Real WebSocket Tests - Conexión Real a Kick.com", () => {
  let kickWS: KickWebSocket;
  let testResults: any = {};

  beforeEach(() => {
    kickWS = new KickWebSocket({
      debug: TEST_CONFIG.debug,
      autoReconnect: false,
    });
  });

  afterEach(() => {
    if (kickWS) {
      kickWS.disconnect();
    }
  });

  describe("Conexión Real y Recepción de Mensajes", () => {
    it(
      "should connect to real Kick.com channel and receive all messages in sequence",
      async () => {
        console.log(`\n${TEST_CONFIG.channelName}`);

        const receivedMessages: ChatMessageEvent[] = [];
        let connectionReady = false;
        let connectionError: Error | null = null;

        kickWS.on("ready", (data) => {
          connectionReady = true;
          console.log(`✅ Conexión establecida al canal: ${data.channel}`);
        });

        kickWS.on("error", (error: Error) => {
          connectionError = error;
          console.error(`❌ Error de conexión: ${error.message}`);
        });

        kickWS.on("disconnect", (data) => {
          console.log(data);
        });

        kickWS.on("ChatMessage", (message: ChatMessageEvent) => {
          receivedMessages.push(message);
          console.log(message);
        });

        try {
          await kickWS.connect(TEST_CONFIG.channelName);

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout esperando conexión"));
            }, TEST_CONFIG.timeout);

            const checkConnection = () => {
              if (connectionReady) {
                clearTimeout(timeout);
                resolve();
              } else if (connectionError) {
                clearTimeout(timeout);
                reject(connectionError);
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });

          console.log(
            `\n⏳ Esperando mensajes durante ${TEST_CONFIG.messageWaitTime / 1000} segundos...`,
          );

          await new Promise<void>((resolve) => {
            setTimeout(resolve, TEST_CONFIG.messageWaitTime);
          });
          console.log(` lenght: ${receivedMessages.length}`);

          if (receivedMessages.length > 0) {

            for (let i = 0; i < receivedMessages.length; i++) {
              const msg = receivedMessages[i];

              expect(msg.id).toBeDefined();
              expect(msg.content).toBeDefined();
              expect(msg.type).toBe("message");
              expect(msg.created_at).toBeDefined();
              expect(msg.sender).toBeDefined();
              expect(msg.chatroom).toBeDefined();

              expect(msg.sender.id).toBeDefined();
              expect(msg.sender.username).toBeDefined();
              expect(msg.sender.slug).toBeDefined();
              expect(msg.sender.identity).toBeDefined();
              expect(msg.sender.identity.color).toBeDefined();
              expect(Array.isArray(msg.sender.identity.badges)).toBe(true);

              expect(msg.chatroom.id).toBeDefined();
              console.log("msg.chatroom.id", msg.chatroom.id);
            }

            for (let i = 1; i < receivedMessages.length; i++) {
              const prevTime = new Date(
                receivedMessages[i - 1].created_at,
              ).getTime();
              const currTime = new Date(
                receivedMessages[i].created_at,
              ).getTime();
              expect(prevTime).toBeGreaterThan(0);
              expect(currTime).toBeGreaterThan(0);
            }

          } else {

          }

          testResults.messageReception = {
            success: true,
            messagesReceived: receivedMessages.length,
            channel: TEST_CONFIG.channelName,
            connectionTime: TEST_CONFIG.timeout,
            waitTime: TEST_CONFIG.messageWaitTime,
          };
        } catch (error) {
          throw error;
        }
      },
      TEST_CONFIG.timeout + TEST_CONFIG.messageWaitTime + 5000,
    );

    // it.skip(
    it.skip(
      "should receive different event types and validate object lengths",
      async () => {
        console.log(
          `\n🎯 Test de múltiples tipos de eventos en canal: ${TEST_CONFIG.channelName}`,
        );

        const receivedEvents: any = {
          ChatMessage: [],
          UserBanned: [],
          Subscription: [],
          GiftedSubscriptions: [],
          MessageDeleted: [],
        };

        let connectionReady = false;
        let eventCounts = {
          ChatMessage: 0,
          UserBanned: 0,
          Subscription: 0,
          GiftedSubscriptions: 0,
          MessageDeleted: 0,
        };

        kickWS.on("ready", () => {
          connectionReady = true;
          console.log(
            `✅ Listo para capturar eventos en: ${TEST_CONFIG.channelName}`,
          );
        });

        kickWS.on("ChatMessage", (message: ChatMessageEvent) => {
          receivedEvents.ChatMessage.push(message);
          eventCounts.ChatMessage++;
          console.log(
            `💬 Chat [${eventCounts.ChatMessage}]: ${message.sender.username}: ${message.content}`,
          );
        });

        kickWS.on("UserBanned", (ban: UserBannedEvent) => {
          receivedEvents.UserBanned.push(ban);
          eventCounts.UserBanned++;
          console.log(`🚫 Ban [${eventCounts.UserBanned}]: ${ban.username}`);
        });

        kickWS.on("Subscription", (sub: SubscriptionEvent) => {
          receivedEvents.Subscription.push(sub);
          eventCounts.Subscription++;
          console.log(`⭐ Sub [${eventCounts.Subscription}]: ${sub.username}`);
        });

        kickWS.on("GiftedSubscriptions", (gift: GiftedSubscriptionsEvent) => {
          receivedEvents.GiftedSubscriptions.push(gift);
          eventCounts.GiftedSubscriptions++;
          console.log(
            `🎁 Gift [${eventCounts.GiftedSubscriptions}]: ${gift.gifted_by} → ${gift.recipients?.length || 0} usuarios`,
          );
        });

        kickWS.on("MessageDeleted", (del: MessageDeletedEvent) => {
          receivedEvents.MessageDeleted.push(del);
          eventCounts.MessageDeleted++;
          console.log(
            `🗑️ Delete [${eventCounts.MessageDeleted}]: Message ${del.message_id}`,
          );
        });

        await kickWS.connect(TEST_CONFIG.channelName);

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout en conexión"));
          }, TEST_CONFIG.timeout);

          const checkConnection = () => {
            if (connectionReady) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });

        console.log(
          `⏳ Esperando eventos durante ${TEST_CONFIG.messageWaitTime / 1000} segundos...`,
        );

        await new Promise((resolve) => {
          setTimeout(resolve, TEST_CONFIG.messageWaitTime);
        });

        console.log(`\n📊 Análisis de eventos recibidos:`);

        for (const [eventType, events] of Object.entries(receivedEvents)) {
          const eventArray = events as any[];

          if (eventArray.length > 0) {
            console.log(`\n   🎯 ${eventType}: ${eventArray.length} eventos`);

            const sampleEvent = eventArray[0];
            const keys = Object.keys(sampleEvent);
            console.log(
              `      📋 Longitud del objeto: ${keys.length} propiedades`,
            );
            console.log(`      🔍 Propiedades: ${keys.join(", ")}`);

            switch (eventType) {
              case "ChatMessage":
                expect(keys.length).toBeGreaterThanOrEqual(6);
                expect(sampleEvent.id).toBeDefined();
                expect(sampleEvent.content).toBeDefined();
                expect(sampleEvent.type).toBe("message");
                expect(sampleEvent.sender).toBeDefined();
                expect(
                  Object.keys(sampleEvent.sender).length,
                ).toBeGreaterThanOrEqual(4);
                expect(sampleEvent.sender.identity).toBeDefined();
                expect(
                  Object.keys(sampleEvent.sender.identity).length,
                ).toBeGreaterThanOrEqual(2);
                break;

              case "UserBanned":
                expect(keys.length).toBeGreaterThanOrEqual(2); // username, type
                expect(sampleEvent.username).toBeDefined();
                expect(sampleEvent.type).toBe("user_banned");
                break;

              case "Subscription":
                expect(keys.length).toBeGreaterThanOrEqual(2); // username, type
                expect(sampleEvent.username).toBeDefined();
                expect(sampleEvent.type).toBe("subscription");
                break;

              case "GiftedSubscriptions":
                expect(keys.length).toBeGreaterThanOrEqual(3); // gifted_by, recipients, type
                expect(sampleEvent.gifted_by).toBeDefined();
                expect(sampleEvent.recipients).toBeDefined();
                expect(Array.isArray(sampleEvent.recipients)).toBe(true);
                console.log(
                  `      📁 Array recipients length: ${sampleEvent.recipients.length}`,
                );
                break;

              case "MessageDeleted":
                expect(keys.length).toBeGreaterThanOrEqual(3); // message_id, chatroom_id, type
                expect(sampleEvent.message_id).toBeDefined();
                expect(sampleEvent.type).toBe("message_deleted");
                break;
            }

            for (let i = 1; i < eventArray.length; i++) {
              expect(Object.keys(eventArray[i]).length).toBe(keys.length);
              expect(eventArray[i].type).toBe(sampleEvent.type);
            }

            console.log(
              `      ✅ Estructura validada para ${eventArray.length} eventos`,
            );
          } else {
            console.log(
              `   ⚪ ${eventType}: 0 eventos (normal si no hay actividad de este tipo)`,
            );
          }
        }

        const totalEvents = Object.values(eventCounts).reduce(
          (sum, count) => sum + count,
          0,
        );
        console.log(`totalEvents: ${totalEvents}`);

        expect(totalEvents).toBeGreaterThan(0); 

        testResults.multipleEvents = {
          success: true,
          totalEvents,
          eventCounts,
          channel: TEST_CONFIG.channelName,
        };

        console.log(`   ✅ Test de múltiples eventos: PASÓ`);
      },
      TEST_CONFIG.timeout + TEST_CONFIG.messageWaitTime + 10000,
    );
  });

  describe("Validación de Performance - Conexión Real", () => {

    it(
      "should measure real connection performance and message processing",
      async () => {
        console.log("performanceMetrics");

        const performanceMetrics = {
          connectionTime: 0,
          messagesReceived: 0,
          messageProcessingTime: [] as number[],
          memoryUsage: [] as any[],
          startTime: 0,
        };

        let connectionReady = false;

        kickWS.on("ready", () => {
          performanceMetrics.connectionTime =
            Date.now() - performanceMetrics.startTime;
          connectionReady = true;
          console.log(
            ` ${performanceMetrics.connectionTime}ms`,
          );
        });

        kickWS.on("ChatMessage", (message: ChatMessageEvent) => {
          const startTime = performance.now();

          const processedContent = message.content.toUpperCase();
          const senderInfo = `${message.sender.username} (${message.sender.id})`;
          const badgeCount = message.sender.identity.badges.length;

          const endTime = performance.now();
          const processingTime = endTime - startTime;

          performanceMetrics.messageProcessingTime.push(processingTime);
          performanceMetrics.messagesReceived++;

          console.log(
            `⚡ [${performanceMetrics.messagesReceived}] Procesado en ${processingTime.toFixed(2)}ms`,
          );
          console.log(`    length: ${message.content.length} chars`);
          console.log(`   Sender: ${senderInfo}`);
          console.log(`   Badges: ${badgeCount}`);
        });

        // Medir uso de memoria periódicamente
        const memoryInterval = setInterval(() => {
          const memUsage = process.memoryUsage();
          performanceMetrics.memoryUsage.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
          });
        }, 5000);

        try {
          performanceMetrics.startTime = Date.now();

          await kickWS.connect(TEST_CONFIG.channelName);

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Timeout en conexión para performance test"));
            }, TEST_CONFIG.timeout);

            const checkConnection = () => {
              if (connectionReady) {
                clearTimeout(timeout);
                resolve();
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });

          console.log(
            `⏳ Midiendo performance durante ${TEST_CONFIG.messageWaitTime / 1000} segundos...`,
          );

          await new Promise((resolve) => {
            setTimeout(resolve, TEST_CONFIG.messageWaitTime);
          });

          clearInterval(memoryInterval);


          console.log(
            `  messagesReceived: ${performanceMetrics.messagesReceived}`,
          );

          if (performanceMetrics.messageProcessingTime.length > 0) {
            const avgProcessingTime =
              performanceMetrics.messageProcessingTime.reduce(
                (a, b) => a + b,
                0,
              ) / performanceMetrics.messageProcessingTime.length;
            const maxProcessingTime = Math.max(
              ...performanceMetrics.messageProcessingTime,
            );
            const minProcessingTime = Math.min(
              ...performanceMetrics.messageProcessingTime,
            );


            expect(avgProcessingTime).toBeLessThan(10); // Debería procesar en menos de 10ms promedio
          }

          if (performanceMetrics.memoryUsage.length > 1) {
            const initialMemory = performanceMetrics.memoryUsage[0];
            const finalMemory =
              performanceMetrics.memoryUsage[
                performanceMetrics.memoryUsage.length - 1
              ];
            const memoryIncrease =
              finalMemory.heapUsed - initialMemory.heapUsed;

            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Menos de 50MB
          }

          // Guardar métricas
          testResults.performance = {
            success: true,
            connectionTime: performanceMetrics.connectionTime,
            messagesProcessed: performanceMetrics.messagesReceived,
            avgProcessingTime:
              performanceMetrics.messageProcessingTime.length > 0
                ? performanceMetrics.messageProcessingTime.reduce(
                    (a, b) => a + b,
                    0,
                  ) / performanceMetrics.messageProcessingTime.length
                : 0,
            memoryIncrease:
              performanceMetrics.memoryUsage.length > 1
                ? performanceMetrics.memoryUsage[
                    performanceMetrics.memoryUsage.length - 1
                  ].heapUsed - performanceMetrics.memoryUsage[0].heapUsed
                : 0,
          };

        } catch (error) {
          clearInterval(memoryInterval);
          throw error;
        }
      },
      TEST_CONFIG.timeout + TEST_CONFIG.messageWaitTime + 5000,
    );
  });

});
