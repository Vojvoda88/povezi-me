import { AsyncLocalStorage } from 'async_hooks';
import * as PrismaClientModule from '@prisma/client';

// Fix: Access PrismaClient from the module as any to resolve export member error
const PrismaClient = (PrismaClientModule as any).PrismaClient;

export const prismaQueryStore = new AsyncLocalStorage<{ count: number }>();

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  if (process.env.NODE_ENV === 'development') {
    (client as any).$use(async (params: unknown, next: (p: unknown) => Promise<unknown>) => {
      const store = prismaQueryStore.getStore();
      if (store) store.count += 1;
      return next(params);
    });
  }
  return client;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;