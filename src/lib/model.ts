export type Rating = "again" | "hard" | "good" | "easy";
export type Schedule = {
  state: "new" | "learning" | "review" | "relearning";
  due: number;
  interval: number;
  ease: number;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  lapseCount: number;
  lastReviewed?: number;
};
export type Card = {
  id: string;
  deckId: string;
  fields: Record<string, string>;
  tags: string[];
  difficulty: "normal" | "difficult" | "easy";
  createdAt: number;
  updatedAt: number;
  scheduling: Schedule;
};
export type Deck = {
  id: string;
  name: string;
  description: string;
  sourceLanguage: string;
  targetLanguage: string;
  front: string;
  back: string;
  color: string;
  createdAt: number;
  archived: boolean;
};
export type Review = {
  id: string;
  cardId: string;
  deckId: string;
  timestamp: number;
  rating: Rating;
  previousInterval: number;
  newInterval: number;
  responseTimeMs: number;
};
export type Settings = {
  theme: "light" | "dark" | "system";
  goal: number;
  sessionSize: number;
  newPerDay: number;
  rate: number;
  locale: string;
  autoPlay: boolean;
  hideTranslation: boolean;
  fontSize: number;
  reducedMotion: boolean;
  uiLanguage: "en" | "de";
};
export type Data = {
  version: 1;
  decks: Deck[];
  cards: Card[];
  reviews: Review[];
  settings: Settings;
  welcomed: boolean;
};
export const uid = () => crypto.randomUUID();
export const freshSchedule = (): Schedule => ({
  state: "new",
  due: 0,
  interval: 0,
  ease: 2.5,
  reviewCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  lapseCount: 0,
});
export const defaultSettings: Settings = {
  theme: "system",
  goal: 20,
  sessionSize: 20,
  newPerDay: 10,
  rate: 0.85,
  locale: "de-DE",
  autoPlay: false,
  hideTranslation: false,
  fontSize: 16,
  reducedMotion: false,
  uiLanguage: "en",
};
export const emptyData = (): Data => ({
  version: 1,
  decks: [],
  cards: [],
  reviews: [],
  settings: { ...defaultSettings },
  welcomed: false,
});
export const makeCard = (
  deckId: string,
  fields: Record<string, string>,
): Card => ({
  id: uid(),
  deckId,
  fields,
  tags: (fields.Tags || "")
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean),
  difficulty: "normal",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  scheduling: freshSchedule(),
});
export const makeDeck = (name: string): Deck => ({
  id: uid(),
  name,
  description: "",
  sourceLanguage: "de-DE",
  targetLanguage: "en-US",
  front: "German",
  back: "English",
  color: "sage",
  createdAt: Date.now(),
  archived: false,
});
