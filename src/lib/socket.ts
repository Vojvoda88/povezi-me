import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

let io: Server | null = null;

export async function initSocket(httpServer: HttpServer, corsOrigin: string[] | boolean): Promise<Server> {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin === true ? '*' : corsOrigin,
      credentials: true
    }
  });

  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    try {
      const pubClient = new Redis(redisUrl);
      const subClient = new Redis(redisUrl);
      pubClient.on('error', (err) => {
        console.warn(
          '[socket.io][redis] pubClient error:',
          err instanceof Error ? err.message : err
        );
      });
      subClient.on('error', (err) => {
        console.warn(
          '[socket.io][redis] subClient error:',
          err instanceof Error ? err.message : err
        );
      });
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✓ Socket.io Redis adapter: multi-instance chat omogućen.');
    } catch (err) {
      console.warn('⚠ Socket.io Redis adapter failed, falling back to single instance:', err instanceof Error ? err.message : err);
    }
  } else {
    console.log('✓ Socket.io: single instance (REDIS_URL nije postavljen, dev mode).');
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'super-tajni-kljuc';
  const debug = process.env.DEBUG_CHAT === 'true';

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token || (socket.handshake.headers?.authorization as string)?.replace(/^Bearer\s+/i, '');
    if (!token) {
      if (debug) console.log('[chat] socket connect rejected: no token');
      socket.disconnect(true);
      return;
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const userId = decoded.userId;
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
      if (debug) console.log('[chat] socket connect userId=', userId, 'socket.id=', socket.id, 'room=user:' + userId);
    } catch {
      if (debug) console.log('[chat] socket connect rejected: invalid token');
      socket.disconnect(true);
    }

    // Test-only helper eventi za Redis cluster verifikaciju (bez uticaja na UI).
    socket.on('redis_check_join', (room: string) => {
      if (!room) return;
      socket.join(room);
      if (debug) console.log('[chat][redis_check] join room=', room, 'userId=', socket.data.userId);
    });

    socket.on('redis_check_ping', (payload: { room: string; message?: string }) => {
      const room = payload?.room;
      if (!room) return;
      if (debug) console.log('[chat][redis_check] ping room=', room, 'from=', socket.data.userId);
      io?.to(room).emit('redis_check_pong', {
        room,
        fromUserId: socket.data.userId,
        message: payload?.message ?? 'pong',
      });
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitNewMessage(recipientUserId: string, payload: { conversationId: string; message: unknown }): void {
  if (io) {
    if (process.env.DEBUG_CHAT === 'true') {
      console.log('[chat] emit newMessage recipient=', recipientUserId, 'conversationId=', payload.conversationId);
    }
    io.to(`user:${recipientUserId}`).emit('newMessage', payload);
  }
}
