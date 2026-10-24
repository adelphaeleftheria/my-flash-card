import { defaultSettings, type Data } from "../lib/model";
export function validateBackup(raw: unknown): Data {
  const d = raw as Data;
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.decks) ||
    !Array.isArray(d.cards) ||
    !Array.isArray(d.reviews) ||
    !d.settings ||
    typeof d.settings !== "object" ||
    Array.isArray(d.settings)
  )
    throw new Error(
      "This is not a supported Folio backup. Choose a JSON backup exported from Folio.",
    );
  if (
    d.decks.length > 10000 ||
    d.cards.length > 100000 ||
    d.reviews.length > 1000000
  )
    throw new Error("This backup is too large.");
  if (d.decks.some((x) => !x) || d.cards.some((x) => !x))
    throw new Error("The backup contains invalid items.");
  const ids = new Set(d.decks.map((x) => x.id));
  if (
    ids.size !== d.decks.length ||
    d.decks.some(
      (x) =>
        typeof x.id !== "string" ||
        typeof x.name !== "string" ||
        typeof x.front !== "string" ||
        typeof x.back !== "string" ||
        !x.id ||
        x.front === x.back ||
        typeof x.description !== "string" ||
        typeof x.sourceLanguage !== "string" ||
        typeof x.targetLanguage !== "string" ||
        typeof x.color !== "string" ||
        typeof x.archived !== "boolean" ||
        !Number.isFinite(x.createdAt),
    )
  )
    throw new Error("The backup contains invalid decks.");
  if (
    new Set(d.cards.map((c) => c.id)).size !== d.cards.length ||
    d.cards.some(
      (c) =>
        !c ||
        typeof c.id !== "string" ||
        !ids.has(c.deckId) ||
        !c.fields ||
        typeof c.fields !== "object" ||
        Array.isArray(c.fields) ||
        !["normal", "difficult", "easy"].includes(c.difficulty) ||
        !Number.isFinite(c.createdAt) ||
        !Number.isFinite(c.updatedAt) ||
        Object.values(c.fields).some((v) => typeof v !== "string") ||
        !Array.isArray(c.tags) ||
        c.tags.some((t) => typeof t !== "string") ||
        !c.scheduling ||
        !["new", "learning", "review", "relearning"].includes(
          c.scheduling.state,
        ) ||
        [
          "due",
          "interval",
          "ease",
          "reviewCount",
          "correctCount",
          "incorrectCount",
          "lapseCount",
        ].some(
          (k) => !Number.isFinite(c.scheduling[k as keyof typeof c.scheduling]),
        ),
    )
  )
    throw new Error("The backup contains invalid cards or schedules.");
  const cardIds = new Set(d.cards.map((c) => c.id));
  if (
    d.reviews.some(
      (r) =>
        !r ||
        !cardIds.has(r.cardId) ||
        !ids.has(r.deckId) ||
        !["again", "hard", "good", "easy"].includes(r.rating) ||
        !Number.isFinite(r.timestamp) ||
        !Number.isFinite(r.responseTimeMs) ||
        typeof r.id !== "string" ||
        !Number.isFinite(r.previousInterval) ||
        !Number.isFinite(r.newInterval),
    )
  )
    throw new Error("The backup contains invalid review history.");
  return {
    ...d,
    settings: {
      ...defaultSettings,
      ...d.settings,
      goal: Math.max(1, Math.min(1000, Number(d.settings.goal) || 20)),
      sessionSize: Math.max(
        1,
        Math.min(500, Number(d.settings.sessionSize) || 20),
      ),
      fontSize: Math.max(14, Math.min(22, Number(d.settings.fontSize) || 16)),
      rate: Math.max(0.5, Math.min(1.5, Number(d.settings.rate) || 0.85)),
    },
  };
}
export function mergeBackup(current: Data, incoming: Data): Data {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => {
    const ids = new Set(a.map((x) => x.id));
    return [...a, ...b.filter((x) => !ids.has(x.id))];
  };
  return {
    ...current,
    decks: merge(current.decks, incoming.decks),
    cards: merge(current.cards, incoming.cards),
    reviews: merge(current.reviews, incoming.reviews),
    welcomed: true,
  };
}
