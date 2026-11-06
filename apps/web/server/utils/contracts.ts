import { contracts, lots } from "@projet/db/schema";
import { asc, count, eq } from "drizzle-orm";

import type { ContractListItem } from "#shared/domain/contracts";
import { getDb } from "./db";

export async function listContracts(db = getDb()): Promise<ContractListItem[]> {
  return db
    .select({
      reference: contracts.reference,
      subject: contracts.subject,
      holder: contracts.holder,
      service: contracts.service,
      startsOn: contracts.startsOn,
      endsOn: contracts.endsOn,
      initialAmount: contracts.initialAmount,
      amendmentsAmount: contracts.amendmentsAmount,
      active: contracts.active,
      settled: contracts.settled,
      lots: count(lots.id),
    })
    .from(contracts)
    .leftJoin(lots, eq(lots.contractId, contracts.id))
    .groupBy(contracts.id)
    .orderBy(asc(contracts.reference));
}
