export function getHornsUpLevel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  return hours;
}

export function getHornsUpColor(level: number) {
  // Starts green, goes to red as they get more.
  // 0-2: Green, 3-5: Yellow/Orange, 6+: Red
  if (level === 0) return 'text-zinc-600'; // none
  if (level < 3) return 'text-[#00FF00]';   // Green
  if (level < 6) return 'text-[#FFaa00]';   // Orange
  return 'text-[#FF0000]';                  // Red
}
