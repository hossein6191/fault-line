// The score is plain points; the magnitude is a readable class on top of it,
// on the same log scale as Magnitude Run (USGS names).
export function magnitudeFor(score) {
  return Math.min(9.9, 1 + 2.2 * Math.log10(1 + Math.max(0, score)));
}
export function tierFor(m) {
  if (m < 2) return 'Micro';
  if (m < 4) return 'Minor';
  if (m < 5) return 'Light';
  if (m < 6) return 'Moderate';
  if (m < 7) return 'Strong';
  if (m < 8) return 'Major';
  return 'Great';
}
