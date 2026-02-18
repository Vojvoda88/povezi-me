#!/usr/bin/env node
/**
 * Minimalni check za Socket.IO + Redis adapter.
 *
 * Pretpostavke:
 * - REDIS_URL je postavljen (adapter aktivan)
 * - backend instanca A radi na http://localhost:3001
 * - backend instanca B radi na http://localhost:3002
 *
 * Koraci:
 * 1) Generiši JWT token sa korisnikom "redis-check-user"
 * 2) Konektuj se na A i B sa tim tokenom
 * 3) Provjeri da oba klijenta dobiju "connect" i da ne budu disconnect-ovani odmah
 *
 * Napomena: Ovo ne pokreće pravi chat flow (emitNewMessage), ali potvrđuje:
 * - da Redis adapter ne ruši instancu,
 * - da obje instance prihvataju JWT token i formiraju sobu user:<id>.
 */

require('dotenv').config();

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

const REDIS_URL = (process.env.REDIS_URL || '').trim();
if (!REDIS_URL) {
  console.log('REDIS_URL nije postavljen. redis-chat-check preskače provjeru (single instance mode).');
  process.exit(0);
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-tajni-kljuc';
const userId = 'redis-check-user';
const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });

const endpointA = process.env.CHAT_INSTANCE_A || 'http://localhost:3001';
const endpointB = process.env.CHAT_INSTANCE_B || 'http://localhost:3002';

let connectedA = false;
let connectedB = false;
let pongReceived = false;
let done = false;

const ROOM = 'redis-check-room';

function finish() {
  if (done) return;
  done = true;
  if (connectedA && connectedB && pongReceived) {
    console.log(
      JSON.stringify({
        event: 'redis_chat_check',
        status: 'PASS',
        redisUrl: REDIS_URL,
        endpoints: [endpointA, endpointB],
        userId,
        room: ROOM,
        timestamp: new Date().toISOString(),
      })
    );
    process.exit(0);
  } else {
    console.log(
      JSON.stringify({
        event: 'redis_chat_check',
        status: 'FAIL',
        redisUrl: REDIS_URL,
        endpoints: [endpointA, endpointB],
        connectedA,
        connectedB,
        pongReceived,
        userId,
        room: ROOM,
        timestamp: new Date().toISOString(),
      })
    );
    process.exit(1);
  }
}

function setupClient(name, endpoint, onConnected, onPong) {
  const socket = io(endpoint, {
    transports: ['websocket'],
    auth: { token },
    timeout: 5000,
  });

  socket.on('connect', () => {
    console.log(
      JSON.stringify({
        event: 'redis_chat_client_connect',
        instance: name,
        endpoint,
        socketId: socket.id,
        userId,
        timestamp: new Date().toISOString(),
      })
    );
    socket.emit('redis_check_join', ROOM);
    onConnected(socket);
  });

  socket.on('redis_check_pong', (payload) => {
    if (payload?.room === ROOM) {
      console.log(
        JSON.stringify({
          event: 'redis_chat_client_pong',
          instance: name,
          endpoint,
          payload,
          timestamp: new Date().toISOString(),
        })
      );
      if (onPong) onPong();
    }
  });

  socket.on('connect_error', (err) => {
    console.log(
      JSON.stringify({
        event: 'redis_chat_client_connect_error',
        instance: name,
        endpoint,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      })
    );
  });

  setTimeout(() => {
    socket.disconnect();
  }, 10000);
}

let socketA = null;
let socketB = null;

setupClient('A', endpointA, (sock) => {
  connectedA = true;
  socketA = sock;
  if (connectedA && connectedB && socketA) {
    socketA.emit('redis_check_ping', { room: ROOM, message: 'ping-from-A' });
  }
}, null);

setupClient('B', endpointB, (sock) => {
  connectedB = true;
  socketB = sock;
  if (connectedA && connectedB && socketA) {
    socketA.emit('redis_check_ping', { room: ROOM, message: 'ping-from-A' });
  }
}, () => {
  pongReceived = true;
  finish();
});

setTimeout(() => {
  finish();
}, 15000);

