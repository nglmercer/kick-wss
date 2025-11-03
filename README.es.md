# Kick WebSocket

Una librería ligera y sin dependencias para conectar a los WebSockets de Kick.com.

## Características

- 🚀 **Ligera**: Sin dependencias externas, solo usa WebSocket nativo
- 🔌 **Simple**: API intuitiva y fácil de usar
- 🔄 **Auto-reconexión**: Reconexión automática configurable
- 📊 **Filtrado de eventos**: Escucha solo los eventos que necesitas
- 🎯 **Filtrado de eventos**: Escucha solo los eventos que necesitas
- 🛠️ **TypeScript**: Soporte completo de tipos
- 📝 **Debug mode**: Registro detallado para desarrollo
- 🌐 **Browser Support**: Totalmente compatible con navegadores modernos
- 📱 **Mobile Ready**: Optimizada para dispositivos móviles

## Instalación

### Node.js
```bash
npm install kick-ws
```

### Navegador (CDN)
```html
<!-- Versión minificada -->
<script src="https://unpkg.com/kick-wss@latest/dist/kick-wss.min.js"></script>

<!-- Módulos ES -->
<script type="module">
  import { KickWebSocket } from 'https://unpkg.com/kick-wss@latest/dist/kick-wss.min.js';
  // Tu código aquí
</script>
```

## Uso Básico

### Node.js / Backend
```typescript
import { KickWebSocket } from 'kick-wss';

// Crear instancia
const kickWS = new KickWebSocket({ debug: true });

// Conectar a un canal
kickWS.connect('nombre-del-canal');

// Escuchar mensajes de chat
kickWS.on('ChatMessage', (message) => {
  console.log(`${message.sender.username}: ${message.content}`);
});

// Escuchar eventos de conexión
kickWS.on('ready', () => {
  console.log('✅ Conectado exitosamente');
});

kickWS.on('disconnect', ({ reason }) => {
  console.log('❌ Desconectado:', reason);
});

kickWS.on('error', (error) => {
  console.error('⚠️ Error:', error);
});
```

### Navegador / Frontend
```html
<!DOCTYPE html>
<html>
<head>
    <title>Kick WebSocket Ejemplo</title>
</head>
<body>
    <div id="messages"></div>

    <script type="module">
      import { KickWebSocket } from 'https://unpkg.com/kick-wss@latest/dist/kick-wss.min.js';

      const kickWS = new KickWebSocket({ debug: true });
      const messagesDiv = document.getElementById('messages');

      kickWS.onChatMessage((message) => {
          const messageEl = document.createElement('div');
          messageEl.innerHTML = `<strong>${message.sender.username}:</strong> ${message.content}`;
          messagesDiv.appendChild(messageEl);
      });

      kickWS.connect('xqc');
    </script>
</body>
</html>
```

## 🌐 Compatibilidad con Navegadores

### Navegadores Soportados
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

### Verificación de Compatibilidad
La librería es compatible con navegadores modernos que soportan WebSocket API. No se requiere ninguna verificación de compatibilidad adicional.

### Polyfills (si es necesario)
```html
<!-- Para navegadores antiguos -->
<script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js"></script>
```

Para más detalles sobre el uso en navegador, consulta [BROWSER.md](./BROWSER.md).

## Configuración Avanzada

### Opciones disponibles

```typescript
const options = {
  debug: false,              // Mostrar logs de debug
  autoReconnect: true,       // Reconectar automáticamente
  reconnectInterval: 5000,   // Intervalo de reconexión (ms)
  connectionTimeout: 10000,  // Timeout de conexión (ms)
  filteredEvents: []         // Eventos a escuchar (vacío = todos)
};

const kickWS = new KickWebSocket(options);
```

### Filtrado de eventos

```typescript
// Escuchar solo mensajes y bans
kickWS = new KickWebSocket({
  filteredEvents: ['ChatMessage', 'UserBanned', 'Subscription']
});

// O usar la constante KICK_EVENTS para todos los eventos disponibles
import { KICK_EVENTS } from 'kick-wss';

// Escuchar todos los eventos
kickWS = new KickWebSocket({
  filteredEvents: KICK_EVENTS
});

// Escuchar categorías específicas
kickWS = new KickWebSocket({
  filteredEvents: KICK_EVENTS.filter(event =>
    event.includes('Chat') || event.includes('User')
  )
});
```

### Usando Enums para eventos

```typescript
// Importar el enum KickEvent
import { KickEvent } from 'kick-wss';

// Usar valores del enum para mejor seguridad de tipos
kickWS.on(KickEvent.ChatMessage, (message) => {
  console.log(`${message.sender.username}: ${message.content}`);
});

// Filtrar eventos usando valores del enum
kickWS = new KickWebSocket({
  filteredEvents: [
    KickEvent.ChatMessage,
    KickEvent.UserBanned,
    KickEvent.Subscription
  ]
});
```

## Métodos de Conveniencia

### Modo Debug

```typescript
const kickWS = KickWebSocket.createDebug('canal-name');
```

### Métodos de categorías de eventos

```typescript
// Escuchar todos los eventos de chat
kickWS.onChatEvents((event) => {
  console.log('Evento de chat:', event);
});

// Escuchar todos los eventos de usuarios
kickWS.onUserEvents((event) => {
  console.log('Evento de usuario:', event);
});

// Escuchar todos los eventos de stream
kickWS.onStreamEvents((event) => {
  console.log('Evento de stream:', event);
});

// Escuchar todos los eventos
kickWS.onAllEvents((event) => {
  console.log('Cualquier evento:', event);
});
```

## Eventos Disponibles

### Eventos de Chat
- `ChatMessage`: Nuevos mensajes en el chat
- `MessageDeleted`: Mensajes eliminados por moderadores
- `PinnedMessageCreated`: Mensajes fijados

### Eventos de Usuarios
- `UserBanned`: Usuarios baneados
- `UserUnbanned`: Usuarios desbaneados
- `Subscription`: Nuevas suscripciones
- `GiftedSubscriptions`: Suscripciones regaladas

### Eventos de Stream
- `StreamHost`: Cuando un canal hace host a otro
- `PollUpdate`: Actualización de encuestas
- `PollDelete`: Encuestas eliminadas

### Eventos de Sistema
- `ready`: Conexión establecida
- `disconnect`: Conexión cerrada
- `error`: Error de conexión
- `rawMessage`: Mensaje raw del WebSocket

## Estructura de Datos

### Mensaje de Chat

```typescript
interface ChatMessageEvent {
  id: string;
  content: string;
  type: 'message';
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
  };
}
```

### Otros eventos

Cada evento tiene su propia estructura de datos. Consulta los tipos TypeScript para más detalles.

## Ejemplos Prácticos

### Bot de registro de actividad

```typescript
import { KickWebSocket } from 'kick-wss';

const kickWS = new KickWebSocket({ debug: true });

// Conectar a múltiples canales
const channels = ['streamer1', 'streamer2', 'streamer3'];

channels.forEach(channel => {
  const ws = new KickWebSocket();

  ws.connect(channel);

  ws.onChatMessage((message) => {
    // Guardar en base de datos
    saveToDatabase({
      channel,
      user: message.sender.username,
      message: message.content,
      timestamp: message.created_at
    });
  });

  ws.onUserBanned((ban) => {
    console.log(`🚫 ${ban.username} baneado en ${channel}`);
  });
});
```

### Analizador de actividad en tiempo real

```typescript
import { KickEvent } from 'kick-wss';

const kickWS = new KickWebSocket({
  debug: true,
  filteredEvents: [
    KickEvent.ChatMessage,
    KickEvent.UserBanned,
    KickEvent.Subscription,
    KickEvent.GiftedSubscriptions
  ]
});

kickWS.connect('popular-streamer');

let messageCount = 0;
let subscriberCount = 0;
let banCount = 0;

kickWS.on(KickEvent.ChatMessage, () => messageCount++);
kickWS.on(KickEvent.Subscription, () => subscriberCount++);
kickWS.on(KickEvent.UserBanned, () => banCount++);

// Reporte cada minuto
setInterval(() => {
  console.log(`📊 Estadísticas del último minuto:
    Mensajes: ${messageCount}
    Suscripciones: ${subscriberCount}
    Bans: ${banCount}
  `);

  // Resetear contadores
  messageCount = 0;
  subscriberCount = 0;
  banCount = 0;
}, 60000);
```

### Sistema de notificaciones

```typescript
const kickWS = new KickWebSocket();

kickWS.connect('monitored-channel');

kickWS.onChatMessage((message) => {
  // Detectar palabras clave
  if (message.content.includes('!help') || message.content.includes('!admin')) {
    sendNotification(`🚨 Ayuda solicitada por ${message.sender.username}`);
  }
});

kickWS.onUserBanned((ban) => {
  sendNotification(`🔨 Usuario baneado: ${ban.username}`);
});

kickWS.onSubscription((sub) => {
  sendNotification(`⭐ Nueva suscripción: ${sub.username}`);
});

function sendNotification(message: string) {
  // Implementar tu sistema de notificaciones
  console.log('NOTIFICACIÓN:', message);
}
```

## API Reference

### Métodos Principales

- `connect(channelName: string): Promise<void>` - Conectar a un canal
- `disconnect(): void` - Desconectar manualmente
- `on(event, handler): void` - Escuchar un evento
- `once(event, handler): void` - Escuchar un evento una vez
- `off(event, handler): void` - Dejar de escuchar un evento
- `isConnected(): boolean` - Verificar si está conectado
- `getConnectionState(): ConnectionState` - Obtener estado de conexión

### Métodos de Información

- `getChannelName(): string` - Nombre del canal actual
- `getChannelId(): number` - ID del canal actual
- `getConnectionState(): ConnectionState` - Obtener estado de conexión
- `isConnected(): boolean` - Verificar si está conectado
- `updateOptions(options): void` - Actualizar configuración

### Métodos de Configuración WebSocket

- `setWebSocketConfig(config): void` - Establecer URL y parámetros del WebSocket
- `getWebSocketConfig(): WebSocketConfig` - Obtener configuración actual del WebSocket
- `resetWebSocketConfig(): void` - Restablecer configuración por defecto

### Métodos de Gestión de Suscripciones

- `subscribeToChannel(channel): void` - Suscribirse a canal adicional
- `unsubscribeFromChannel(channel): void` - Desuscribirse de canal
- `addCustomSubscriptions(channels): void` - Añadir canales de suscripción personalizados
- `clearCustomSubscriptions(): void` - Limpiar todas las suscripciones personalizadas
- `getCustomSubscriptions(): object` - Obtener suscripciones personalizadas actuales

## Limitaciones

- 📖 **Solo lectura**: No envía mensajes al chat
- 🔓 **Sin autenticación**: Solo funciona con chats públicos
- 🌐 **Requiere internet**: Conexión a los servidores de Kick.com

## Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

MIT License - ver archivo LICENSE para detalles.

## Soporte

- 🐛 Issues: [GitHub Issues](https://github.com/nglmercer/kick-wss/issues)
- 📖 Documentación: [Wiki](https://github.com/nglmercer/kick-wss/wiki)

---

**Kick WebSocket Lite** - La forma más simple de conectar a los chats de Kick.com.
