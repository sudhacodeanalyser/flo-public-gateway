const ACTIVE_STATUSES: Set<string> = new Set(['active', 'trialing']);

export function isSubscriptionActive(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}