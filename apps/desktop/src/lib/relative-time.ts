/**
 * Formats a past unix timestamp as a short "N units ago" phrase, the way a commit
 * list reads. Pure (the caller passes "now") so it is unit tested without a clock.
 */
export function relativeTime(unixSeconds: number, nowSeconds: number): string {
  const delta = Math.max(0, nowSeconds - unixSeconds);

  const units: Array<[number, string]> = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [2592000, 'month'],
    [31536000, 'year'],
  ];

  if (delta < 45) return 'just now';

  let amount = Math.round(delta / 60);
  let label = 'minute';
  for (let i = units.length - 1; i >= 0; i -= 1) {
    const [seconds, name] = units[i]!;
    if (delta >= seconds) {
      amount = Math.round(delta / seconds);
      label = name;
      break;
    }
  }
  return `${amount} ${label}${amount === 1 ? '' : 's'} ago`;
}
