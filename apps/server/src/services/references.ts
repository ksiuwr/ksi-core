import { sql } from 'drizzle-orm';
import { collaborationCounters } from '../db';
import type { Transaction } from '../lib/audit';
/** A single counter row serializes task and forum creation within each workspace. */
export async function allocateReferenceNumber(tx: Transaction, scopeKey: string) {
  const [counter] = await tx
    .insert(collaborationCounters)
    .values({ scopeKey, lastNumber: 1 })
    .onConflictDoUpdate({
      target: collaborationCounters.scopeKey,
      set: { lastNumber: sql`${collaborationCounters.lastNumber} + 1` }
    })
    .returning();
  return counter!.lastNumber;
}
