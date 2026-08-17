/**
 * The featured upgrade, which an event listing and a classified both carry: an
 * image above the copy, the top of the exported block, one flat fee.
 *
 * It lives in its own file because it belongs to neither table. Both listing
 * types price it here, snapshot it onto their own row, and chase it with the
 * same three payment states a booking uses — so "what does featuring cost" and
 * "what is still owed" have one answer in the codebase rather than two that
 * can drift.
 */

/**
 * What featuring a listing costs.
 *
 * The only place the current price lives. It is copied onto `featuredFee` when
 * the upgrade is taken, so changing it here prices new listings without
 * touching what anyone has already been charged. If events and classifieds ever
 * need different prices, this is the constant that splits in two.
 */
export const FEATURED_FEE = 4.99

/** A fee is outstanding until it is marked paid — invoiced still counts. */
export function isFeeOutstanding(featuredPaid: string): boolean {
  return featuredPaid !== 'PAID'
}

/**
 * What the featured listings in a view still owe. Cents, so it adds up with
 * `formatMoney(total, true)` rather than being rounded on the way in.
 */
export function featuredOwing(
  rows: { featured: boolean; featuredFee: number; featuredPaid: string }[]
): number {
  const cents = rows.reduce(
    (total, row) =>
      row.featured && isFeeOutstanding(row.featuredPaid)
        ? total + Math.round(row.featuredFee * 100)
        : total,
    0
  )
  return cents / 100
}
