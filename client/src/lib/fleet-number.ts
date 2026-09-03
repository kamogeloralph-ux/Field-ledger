/* Field Ledger direction: fleet numbers are stored as plain digits (matching Supabase)
   but must always be read on screen as 3 digits, a dash, then the remaining digits —
   e.g. "7440771" is stored as-is but shown as "744-0771". */

/** Strip everything except digits — use this to get the raw value that matches
 * what is stored in Supabase (`trucks.fleet_number`) or used for lookups. */
export function onlyDigits(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Format a fleet number for display: "7440771" -> "744-0771". Safe to call with
 * partial input while someone is still typing ("74" -> "74", "7440" -> "744-0"). */
export function formatFleetNumber(value: string | undefined | null): string {
  const digits = onlyDigits(value);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
}
