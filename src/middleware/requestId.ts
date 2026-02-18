import { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const rid = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = rid;
  res.setHeader('X-Request-Id', rid);
  next();
};