// Tests mínimos para la librería Kick WebSocket Lite
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { KickWebSocket, EventEmitter, MessageParser } from "../src/index.js";

describe("Tests Mínimos Funcionales", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  it("EventEmitter debería funcionar básicamente", () => {
    let received = "";

    emitter.on("test", (data: string) => {
      received = data;
    });

    emitter.emit("test", "hello");
    expect(received).toBe("hello");
  });

  it("MessageParser debería ignorar mensajes pusher", () => {
    const rawMessage = JSON.stringify({
      event: "pusher:connection_established",
      data: '{"socket_id":"123.456","activity_timeout":120}',
    });

    const parsed = MessageParser.parseMessage(rawMessage);
    expect(parsed).toBeNull();
  });

  it("MessageParser debería manejar JSON inválido", () => {
    const invalidMessage = "invalid json";
    const parsed = MessageParser.parseMessage(invalidMessage);
    expect(parsed).toBeNull();
  });

  it("MessageParser debería verificar mensajes válidos", () => {
    const validMessage = JSON.stringify({
      event: "test",
      data: "test data",
    });

    const invalidMessage = "not json";

    expect(MessageParser.isValidMessage(validMessage)).toBe(true);
    expect(MessageParser.isValidMessage(invalidMessage)).toBe(false);
  });
});

describe("KickWebSocket Básico", () => {
  let kickWS: KickWebSocket;

  beforeEach(() => {
    kickWS = new KickWebSocket({
      debug: false,
      autoReconnect: false,
    });
  });

  afterEach(() => {
    kickWS.disconnect();
  });

  it("debería crearse desconectado", () => {
    expect(kickWS.isConnected()).toBe(false);
    expect(kickWS.getConnectionState()).toBe("disconnected");
    expect(kickWS.getChannelName()).toBe("");
    expect(kickWS.getChannelId()).toBe(0);
  });

  it("debería manejar eventos básicos", () => {
    let readyCalled = false;
    let errorCalled = false;

    kickWS.on("ready", () => {
      readyCalled = true;
    });

    kickWS.on("error", () => {
      errorCalled = true;
    });

    kickWS.emit("ready", { channel: "test" });
    kickWS.emit("error", new Error("test error"));

    expect(readyCalled).toBe(true);
    expect(errorCalled).toBe(true);
  });

  it("debería actualizar opciones sin errores", () => {
    expect(() => {
      kickWS.updateOptions({
        debug: true,
        reconnectInterval: 1000,
        autoReconnect: true,
      });
    }).not.toThrow();
  });

  it("debería tener métodos de conveniencia", () => {
    expect(() => {
      kickWS.onAllEvents(() => {});
      kickWS.onChatEvents(() => {});
      kickWS.onUserEvents(() => {});
      kickWS.onStreamEvents(() => {});
    }).not.toThrow();
  });

  it("debería crear instancia de debug", () => {
    expect(() => {
      const debug = KickWebSocket.createDebug();
      debug.disconnect();
    }).not.toThrow();
  });
});

describe("Manejo de Errores", () => {
  it("debería manejar errores en listeners", () => {
    const emitter = new EventEmitter();
    let errorLogged = false;

    const originalConsoleError = console.error;
    console.error = () => {
      errorLogged = true;
    };

    emitter.on("error-test", () => {
      throw new Error("Test error");
    });

    try {
      emitter.emit("error-test");
    } catch (e) {
      // Expected
    }

    expect(errorLogged).toBe(true);
    console.error = originalConsoleError;
  });
});