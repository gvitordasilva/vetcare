/**
 * Helper para criar mocks manuais do PrismaClient.
 *
 * Usamos vi.fn() explicitamente em vez de mockDeep para garantir
 * que cada método seja sempre a mesma referência de função — o mockDeep
 * pode criar novas funções a cada acesso ao Proxy, quebrando mockResolvedValue.
 */
import { vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

type FnMock = ReturnType<typeof vi.fn>

export function createPrismaMock() {
  return {
    tenant: {
      findUnique: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      update: vi.fn() as FnMock,
      findMany: vi.fn() as FnMock,
      count: vi.fn() as FnMock,
    },
    user: {
      findUnique: vi.fn() as FnMock,
      findFirst: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      update: vi.fn() as FnMock,
      findMany: vi.fn() as FnMock,
      count: vi.fn() as FnMock,
    },
    refreshToken: {
      findUnique: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      delete: vi.fn() as FnMock,
      deleteMany: vi.fn() as FnMock,
    },
    owner: {
      findMany: vi.fn() as FnMock,
      findFirst: vi.fn() as FnMock,
      count: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      update: vi.fn() as FnMock,
    },
    patient: {
      findMany: vi.fn() as FnMock,
      findFirst: vi.fn() as FnMock,
      count: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      update: vi.fn() as FnMock,
    },
    appointment: {
      findMany: vi.fn() as FnMock,
      findFirst: vi.fn() as FnMock,
      count: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      update: vi.fn() as FnMock,
    },
    vaccine: {
      findMany: vi.fn() as FnMock,
      findFirst: vi.fn() as FnMock,
      count: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      update: vi.fn() as FnMock,
      delete: vi.fn() as FnMock,
    },
    invoice: {
      findMany: vi.fn() as FnMock,
      findFirst: vi.fn() as FnMock,
      count: vi.fn() as FnMock,
      create: vi.fn() as FnMock,
      update: vi.fn() as FnMock,
    },
    $transaction: vi.fn() as FnMock,
    $queryRaw: vi.fn() as FnMock,
  } as unknown as PrismaClient
}

export type PrismaMock = ReturnType<typeof createPrismaMock>
