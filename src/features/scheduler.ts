import type { Schedule, Rating } from "../lib/model";
const DAY = 86400000;
/** A small SM-2-inspired scheduler. Intervals are days; initial learning steps are minutes. */
export function schedule(
  previous: Schedule,
  rating: Rating,
  now = Date.now(),
): Schedule {
  const s = {
    ...previous,
    reviewCount: previous.reviewCount + 1,
    lastReviewed: now,
  };
  if (rating === "again") {
    s.state = previous.state === "new" ? "learning" : "relearning";
    s.interval = 1 / 1440;
    s.due = now + 60000;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.incorrectCount++;
    s.lapseCount++;
  } else {
    s.correctCount++;
    if (rating === "hard") {
      s.interval =
        previous.interval < 1
          ? 10 / 1440
          : Math.max(1, previous.interval * 1.2);
      s.ease = Math.max(1.3, s.ease - 0.15);
    }
    if (rating === "good")
      s.interval =
        previous.interval < 1 ? 1 : Math.round(previous.interval * s.ease);
    if (rating === "easy") {
      s.interval =
        previous.interval < 1
          ? 4
          : Math.round(previous.interval * s.ease * 1.3);
      s.ease += 0.15;
    }
    s.state = s.interval < 1 ? "learning" : "review";
    s.due = now + s.interval * DAY;
  }
  return s;
}
export function intervalLabel(days: number) {
  return days < 1 ? `${Math.round(days * 1440)}m` : `${Math.round(days)}d`;
}
