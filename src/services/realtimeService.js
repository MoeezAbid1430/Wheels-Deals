import { realtimeEvents } from '../api';

const DEFAULT_REALTIME_URL = process.env.REACT_APP_REALTIME_URL || 'http://localhost:4000/api/realtime';
const DEFAULT_REALTIME_WS_URL = process.env.REACT_APP_REALTIME_WS_URL || DEFAULT_REALTIME_URL.replace(/^http/, 'ws').replace(/\/realtime$/, '/realtime/ws');

export const realtimeService = {
  events: realtimeEvents,

  connect: ({ token, url = DEFAULT_REALTIME_URL, wsUrl = DEFAULT_REALTIME_WS_URL, channel = 'global', onMessage, onOpen, onClose, onError, preferWebSocket = true, reconnect = true } = {}) => {
    if (!url) {
      return {
        readyState: 'mock',
        close: () => {},
      };
    }

    if (preferWebSocket && typeof WebSocket !== 'undefined' && wsUrl) {
      const socketUrl = new URL(wsUrl, window.location.origin);
      socketUrl.searchParams.set('channel', channel);
      if (token) socketUrl.searchParams.set('token', token);

      let socket;
      let closedByClient = false;
      let reconnectTimer;
      let heartbeatTimer;
      let attempts = 0;

      const controller = {
        get readyState() {
          return socket?.readyState ?? WebSocket.CLOSED;
        },
        send: (payload) => {
          if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
        },
        close: () => {
          closedByClient = true;
          window.clearTimeout(reconnectTimer);
          window.clearInterval(heartbeatTimer);
          socket?.close?.();
        },
      };

      const openSocket = () => {
        socket = new WebSocket(socketUrl.toString());
        socket.addEventListener('open', () => {
          attempts = 0;
          onOpen?.({ channel, transport: 'websocket' });
          window.clearInterval(heartbeatTimer);
          heartbeatTimer = window.setInterval(() => {
            controller.send({ type: 'ping', at: new Date().toISOString() });
          }, 25000);
        });
        socket.addEventListener('message', (event) => {
          try {
            onMessage?.(JSON.parse(event.data));
          } catch {
            onMessage?.({ type: 'message', payload: event.data });
          }
        });
        socket.addEventListener('close', () => {
          window.clearInterval(heartbeatTimer);
          onClose?.();
          if (!closedByClient && reconnect) {
            attempts += 1;
            reconnectTimer = window.setTimeout(openSocket, Math.min(10000, 750 * attempts));
          }
        });
        socket.addEventListener('error', (error) => {
          onError?.(error);
        });
      };

      openSocket();
      return controller;
    }

    const streamUrl = new URL(url, window.location.origin);
    streamUrl.searchParams.set('channel', channel);
    if (token) streamUrl.searchParams.set('token', token);

    const stream = new EventSource(streamUrl.toString());

    stream.addEventListener('open', onOpen || (() => {}));
    stream.addEventListener('error', onError || (() => {}));
    stream.addEventListener('connected', (event) => {
      try {
        onOpen?.(JSON.parse(event.data));
      } catch {
        onOpen?.();
      }
    });

    const handleEvent = (event) => {
      try {
        onMessage?.({ type: event.type, payload: JSON.parse(event.data) });
      } catch {
        onMessage?.({ type: event.type || 'unknown', payload: event.data });
      }
    };

    Object.values(realtimeEvents.auction).forEach((eventName) => {
      stream.addEventListener(eventName, handleEvent);
    });

    const originalClose = stream.close.bind(stream);
    stream.close = () => {
      onClose?.();
      originalClose();
    };

    return stream;
  },

  connectToAuction: (auctionId, options = {}) => realtimeService.connect({ ...options, channel: `auction:${auctionId}` }),

  subscribeToAuction: () => true,

  unsubscribeFromAuction: (stream) => {
    stream?.close?.();
    return true;
  },
};
