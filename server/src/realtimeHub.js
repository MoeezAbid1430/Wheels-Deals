import { createHash } from 'node:crypto';
import { URL } from 'node:url';

const sseClients = new Map();
const socketClients = new Map();

const addClient = (collection, channel, client) => {
  if (!collection.has(channel)) collection.set(channel, new Set());
  collection.get(channel).add(client);
};

export const addRealtimeClient = (channel, response) => {
  addClient(sseClients, channel, response);

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  response.write(`event: connected\ndata: ${JSON.stringify({ channel })}\n\n`);

  response.on('close', () => {
    sseClients.get(channel)?.delete(response);
  });
};

const encodeWebSocketFrame = (data) => {
  const payload = Buffer.from(JSON.stringify(data));
  const header = [];
  header.push(0x81);
  if (payload.length < 126) {
    header.push(payload.length);
  } else if (payload.length < 65536) {
    header.push(126, (payload.length >> 8) & 255, payload.length & 255);
  } else {
    header.push(127, 0, 0, 0, 0, (payload.length >> 24) & 255, (payload.length >> 16) & 255, (payload.length >> 8) & 255, payload.length & 255);
  }
  return Buffer.concat([Buffer.from(header), payload]);
};

const decodeWebSocketFrame = (buffer) => {
  if (buffer.length < 6) return null;
  const opcode = buffer[0] & 0x0f;
  if (opcode === 0x8) return { type: 'close' };
  if (opcode !== 0x1) return null;

  let offset = 2;
  let length = buffer[1] & 0x7f;
  if (length === 126) {
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  const masked = Boolean(buffer[1] & 0x80);
  const mask = masked ? buffer.subarray(offset, offset + 4) : null;
  if (masked) offset += 4;

  const payload = buffer.subarray(offset, offset + length);
  const decoded = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) {
    decoded[index] = masked ? payload[index] ^ mask[index % 4] : payload[index];
  }

  try {
    return { type: 'message', payload: JSON.parse(decoded.toString('utf8')) };
  } catch {
    return { type: 'message', payload: decoded.toString('utf8') };
  }
};

export const handleRealtimeUpgrade = (request, socket) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname.replace(/^\/api/, '');
  if (path !== '/realtime/ws') {
    socket.destroy();
    return;
  }

  const key = request.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const channel = url.searchParams.get('channel') || 'global';
  const accept = createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');

  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    '',
  ].join('\r\n'));

  addClient(socketClients, channel, socket);
  socket.write(encodeWebSocketFrame({ type: 'connected', payload: { channel } }));

  socket.on('data', (buffer) => {
    const frame = decodeWebSocketFrame(buffer);
    if (frame?.type === 'close') socket.end();
    if (frame?.type === 'message' && frame.payload?.type === 'ping') {
      socket.write(encodeWebSocketFrame({ type: 'pong', payload: { channel, at: new Date().toISOString() } }));
    }
  });

  socket.on('close', () => {
    socketClients.get(channel)?.delete(socket);
  });

  socket.on('error', () => {
    socketClients.get(channel)?.delete(socket);
  });
};

export const publishEvent = (channel, type, payload) => {
  const event = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.get(channel)?.forEach((response) => response.write(event));
  socketClients.get(channel)?.forEach((socket) => {
    if (!socket.destroyed) socket.write(encodeWebSocketFrame({ type, payload }));
  });
};
