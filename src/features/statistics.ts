import type { Card, Review } from "../lib/model";
export function dayKey(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function stats(cards: Card[], reviews: Review[], now = Date.now()) {
  const days = new Set(reviews.map((r) => dayKey(r.timestamp)));
  const today = dayKey(now);
  const todays = reviews.filter((r) => dayKey(r.timestamp) === today);
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(+cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  let longest = 0,
    run = 0;
  const sorted = [...days].sort();
  sorted.forEach((d, i) => {
    const prev = new Date(`${d}T12:00:00`);
    prev.setDate(prev.getDate() - 1);
    run = i > 0 && sorted[i - 1] === dayKey(+prev) ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  return {
    total: cards.length,
    learned: cards.filter((c) => c.scheduling.state === "review").length,
    due: cards.filter(
      (c) => c.scheduling.state !== "new" && c.scheduling.due <= now,
    ).length,
    new: cards.filter((c) => c.scheduling.state === "new").length,
    today: todays.length,
    studiedToday: new Set(todays.map((r) => r.cardId)).size,
    accuracy: reviews.length
      ? Math.round(
          (100 * reviews.filter((r) => r.rating !== "again").length) /
            reviews.length,
        )
      : 0,
    streak,
    longest,
    time: reviews.reduce((s, r) => s + r.responseTimeMs, 0),
    days: days.size,
    week: reviews.filter((r) => r.timestamp >= now - 7 * 86400000).length,
  };
}
export function activity(reviews: Review[], count = 7, now = Date.now()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (count - 1 - i));
    const key = dayKey(+d);
    const events = reviews.filter((r) => dayKey(r.timestamp) === key);
    return {
      key,
      label: d.toLocaleDateString("en", { weekday: "short" }),
      count: events.length,
      accuracy: events.length
        ? Math.round(
            (events.filter((r) => r.rating !== "again").length /
              events.length) *
              100,
          )
        : 0,
      time: events.reduce((s, r) => s + r.responseTimeMs, 0),
      newLearned: events.filter(
        (r) => r.previousInterval < 1 && r.newInterval >= 1,
      ).length,
    };
  });
}
