import prisma from './prisma';

export type EntityType = 'USER' | 'AD' | 'REPORT' | 'PAYMENT' | 'VehicleMake' | 'VehicleModel';

export async function createAuditLog(
  adminId: string,
  action: string,
  entityType: EntityType,
  entityId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId: entityId ?? undefined,
        metadata: metadata ? (metadata as object) : undefined
      }
    });
  } catch (err) {
    console.error('[AdminAuditLog]', err);
  }
}
