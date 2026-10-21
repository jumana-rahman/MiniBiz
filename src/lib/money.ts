/**
 * Integer minor-unit (cents) money arithmetic — SRS FR-022.
 * Every intermediate value is an exact integer; conversion to
 * decimal amounts happens once, at the edge.
 */

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Line total in cents: quantity (≤3 decimals) × unit price in cents, rounded once. */
export function lineTotalCents(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}
