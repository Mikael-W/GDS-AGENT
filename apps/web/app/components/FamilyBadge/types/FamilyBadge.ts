import type { Urgency } from "#shared/domain/alerts";
import type { Family } from "#shared/domain/deadlines";

export type FamilyBadgeProps = {
  family: Family;
  urgency: Urgency;
};
