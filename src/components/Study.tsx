import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Keyboard,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { AudioButton, Empty, Modal, Progress } from "./ui";
import { schedule, intervalLabel } from "../features/scheduler";
import { dayKey } from "../features/statistics";
import { pronounce, speechAvailable } from "../features/pronunciation";
import { uid, type Data, type Card, type Rating } from "../lib/model";
type Mode = "review" | "new" | "mixed" | "difficult" | "typing" | "listening";
export function Study({
  data,
  deckId,
  onUpdate,
  onExit,
  onEdit,
}: {
  data: Data;
  deckId?: string;
  onUpdate: (data: Data) => Promise<void>;
  onExit: () => void;
  onEdit: (card: Card) => void;
}) {
  const [selected, setSelected] = useState(
      deckId || data.decks.find((d) => !d.archived)?.id || "",
    ),
    [mode, setMode] = useState<Mode>("review"),
    [direction, setDirection] = useState("forward"),
    [count, setCount] = useState(data.settings.sessionSize),
    [advanced, setAdvanced] = useState(false),
    [tag, setTag] = useState(""),
    [queue, setQueue] = useState<{ id: string; reverse: boolean }[] | null>(
      null,
    ),
    [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false),
    [typed, setTyped] = useState(""),
    [help, setHelp] = useState(false),
    [ratings, setRatings] = useState<Rating[]>([]),
    [skipped, setSkipped] = useState(0);
  const ratingInFlight = useRef(false);
  const started = useRef(Date.now()),
    cardStart = useRef(Date.now()),
    [elapsed, setElapsed] = useState(0);
  const deck = data.decks.find((d) => d.id === selected);
  const cards = data.cards.filter((c) => c.deckId === selected);
  const due = cards.filter(
    (c) => c.scheduling.state !== "new" && c.scheduling.due <= Date.now(),
  );
  const fresh = cards.filter((c) => c.scheduling.state === "new");
  const item = queue?.[index];
  const card = data.cards.find((c) => c.id === item?.id);
  const front = (deck && (item?.reverse ? deck.back : deck.front)) || "",
    back = (deck && (item?.reverse ? deck.front : deck.back)) || "";
  const spokenLang =
    (deck && (item?.reverse ? deck.targetLanguage : deck.sourceLanguage)) ||
    data.settings.locale;
  const normalized = (s: string) =>
    s
      .trim()
      .normalize("NFC")
      .toLocaleLowerCase()
      .replace(/[.!?]$/, "");
  function start() {
    const today = dayKey(Date.now());
    const alreadyNew = new Set(
      data.reviews
        .filter(
          (r) =>
            dayKey(r.timestamp) === today &&
            r.previousInterval < 1 &&
            r.newInterval >= 1,
        )
        .map((r) => r.cardId),
    ).size;
    const newAllowed = Math.max(0, data.settings.newPerDay - alreadyNew);
    let candidates =
      mode === "review"
        ? [
            ...due.sort((a, b) => a.scheduling.due - b.scheduling.due),
            ...fresh.slice(0, newAllowed),
          ]
        : mode === "new"
          ? fresh.slice(0, newAllowed)
          : mode === "difficult"
            ? cards.filter(
                (c) =>
                  c.difficulty === "difficult" || c.scheduling.lapseCount >= 2,
              )
            : [...cards];
    if (tag) candidates = candidates.filter((c) => c.tags.includes(tag));
    if (mode !== "review") candidates.sort(() => Math.random() - 0.5);
    setQueue(
      candidates
        .slice(0, count)
        .map((c) => ({
          id: c.id,
          reverse:
            direction === "reverse" ||
            (direction === "mixed" && Math.random() < 0.5),
        })),
    );
    setIndex(0);
    setRatings([]);
    setSkipped(0);
    setRevealed(false);
    started.current = Date.now();
    cardStart.current = Date.now();
  }
  function advance() {
    setIndex((i) => i + 1);
    setRevealed(false);
    setTyped("");
    cardStart.current = Date.now();
    setElapsed(Date.now() - started.current);
  }
  async function rate(rating: Rating) {
    if (!card || !revealed || ratingInFlight.current) return;
    ratingInFlight.current = true;
    const next = schedule(card.scheduling, rating);
    await onUpdate({
      ...data,
      cards: data.cards.map((c) =>
        c.id === card.id
          ? { ...c, scheduling: next, updatedAt: Date.now() }
          : c,
      ),
      reviews: [
        ...data.reviews,
        {
          id: uid(),
          cardId: card.id,
          deckId: card.deckId,
          timestamp: Date.now(),
          rating,
          previousInterval: card.scheduling.interval,
          newInterval: next.interval,
          responseTimeMs: Math.min(600000, Date.now() - cardStart.current),
        },
      ],
    });
    setRatings((r) => [...r, rating]);
    advance();
    ratingInFlight.current = false;
  }
  useEffect(() => {
    if (card && deck && (data.settings.autoPlay || mode === "listening"))
      pronounce(card.fields[front] || "", spokenLang, data.settings.rate);
  }, [card?.id, mode]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        help ||
        document.querySelector("dialog[open]")
      )
        return;
      if (e.code === "Space" && queue && card) {
        e.preventDefault();
        setRevealed(true);
      }
      if (["1", "2", "3", "4"].includes(e.key) && revealed)
        rate((["again", "hard", "good", "easy"] as Rating[])[+e.key - 1]);
      if (e.key.toLowerCase() === "p" && card)
        pronounce(card.fields[front], spokenLang, data.settings.rate);
      if (e.key.toLowerCase() === "s" && card) {
        setSkipped((s) => s + 1);
        advance();
      }
      if (e.key.toLowerCase() === "e" && card) onEdit(card);
      if (e.key === "?") setHelp(true);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  if (!deck)
    return (
      <Empty title="Every journey starts with a word">
        <p>Import a deck or try the sample to start studying.</p>
        <button onClick={onExit}>Back to library</button>
      </Empty>
    );
  if (queue && index >= queue.length)
    return (
      <div className="session-summary">
        <div className="completion-mark">
          <Check size={32} />
        </div>
        <span className="eyebrow">A LITTLE PROGRESS, EVERY DAY</span>
        <h1>{ratings.length ? "Nicely done." : "Nothing to review."}</h1>
        <p>
          {ratings.length
            ? `You made time for ${ratings.length} cards. Let them settle in.`
            : "No cards match these options. Try a different mode or tag."}
        </p>
        <div className="summary-metrics">
          <div>
            <strong>{ratings.length}</strong>
            <span>cards reviewed</span>
          </div>
          <div>
            <strong>
              {ratings.length
                ? Math.round(
                    (ratings.filter((r) => r !== "again").length /
                      ratings.length) *
                      100,
                  )
                : 0}
              %
            </strong>
            <span>recall accuracy</span>
          </div>
          <div>
            <strong>{Math.max(1, Math.round(elapsed / 60000))}m</strong>
            <span>time well spent</span>
          </div>
        </div>
        {skipped > 0 && (
          <p>{skipped} cards skipped — their schedules are unchanged.</p>
        )}
        {ratings.includes("again") && (
          <div className="notice">
            A few words need another look. Cards rated Again will be due in one
            minute.
          </div>
        )}
        <div className="inline centered">
          <button onClick={() => setQueue(null)}>
            <RotateCcw size={16} /> Study again
          </button>
          <button className="primary" onClick={onExit}>
            Back to library <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  if (!queue)
    return (
      <div className="study-setup">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={16} /> Back to library
        </button>
        <span className="eyebrow">MAKE A LITTLE ROOM TO LEARN</span>
        <h1>Your next small step.</h1>
        <p className="muted">A few focused minutes can go a long way.</p>
        <section className="setup-panel">
          <label>
            Choose a deck
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.decks
                .filter((d) => !d.archived)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="setup-counts">
            <div>
              <strong>{due.length}</strong>
              <span>ready for review</span>
            </div>
            <div>
              <strong>{fresh.length}</strong>
              <span>new words</span>
            </div>
            <div>
              <strong>
                ~{Math.max(1, Math.round(Math.min(count, cards.length) * 0.3))}{" "}
                min
              </strong>
              <span>a little time for you</span>
            </div>
          </div>
          <button
            className="text-button"
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={16} /> Study options
          </button>
          {advanced && (
            <div className="advanced-options">
              <div className="form-row">
                <label>
                  Mode
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                  >
                    {[
                      "review",
                      "new",
                      "mixed",
                      "difficult",
                      "typing",
                      "listening",
                    ].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Direction
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                  >
                    <option value="forward">
                      {deck.front} → {deck.back}
                    </option>
                    <option value="reverse">
                      {deck.back} → {deck.front}
                    </option>
                    <option value="mixed">Mixed directions</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Cards per session
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={count}
                    onChange={(e) =>
                      setCount(Math.max(1, Math.min(500, +e.target.value)))
                    }
                  />
                </label>
                <label>
                  Tag
                  <select value={tag} onChange={(e) => setTag(e.target.value)}>
                    <option value="">All tags</option>
                    {[...new Set(cards.flatMap((c) => c.tags))].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
          {mode === "listening" && !speechAvailable() && (
            <p className="error">
              Pronunciation isn’t available in this browser. Choose a written
              study mode.
            </p>
          )}
          <button
            className="primary full"
            disabled={
              !cards.length || (mode === "listening" && !speechAvailable())
            }
            onClick={start}
          >
            Start studying <ArrowRight size={17} />
          </button>
          <p className="setup-note">
            {mode === "review"
              ? "Due cards first, then new words within your daily limit."
              : "Extra practice won’t erase your progress."}
          </p>
        </section>
      </div>
    );
  if (!card) return null;
  return (
    <div className="study-session">
      <div className="study-top">
        <button
          className="text-button"
          onClick={() => {
            if (confirm("End this session? Your completed reviews are saved."))
              onExit();
          }}
        >
          <X size={18} /> End session
        </button>
        <span>{deck.name}</span>
        <button
          className="icon-button"
          aria-label="Keyboard shortcuts"
          onClick={() => setHelp(true)}
        >
          <Keyboard size={20} />
        </button>
      </div>
      <div className="study-progress">
        <span>
          {index + 1} of {queue.length}
        </span>
        <Progress value={(index / queue.length) * 100} />
        <span>{ratings.length} reviewed</span>
      </div>
      <div className={`study-card ${revealed ? "is-revealed" : ""}`}>
        <span className="eyebrow">
          {mode === "listening" ? "LISTEN & RECALL" : `${front} → ${back}`}
        </span>
        {mode === "listening" ? (
          <button
            className="listen-large"
            aria-label="Play word"
            onClick={() =>
              pronounce(card.fields[front], spokenLang, data.settings.rate)
            }
          >
            <Volume2 size={36} />
          </button>
        ) : (
          <>
            <h1>{card.fields[front]}</h1>
            {card.fields.IPA && <p className="ipa">/{card.fields.IPA}/</p>}
            <AudioButton
              text={card.fields[front]}
              lang={spokenLang}
              rate={data.settings.rate}
            />
          </>
        )}
        {(mode === "typing" || mode === "listening") && !revealed && (
          <form
            className="typing-form"
            onSubmit={(e) => {
              e.preventDefault();
              setRevealed(true);
            }}
          >
            <label className="sr-only" htmlFor="typed">
              Your answer
            </label>
            <input
              id="typed"
              autoFocus
              autoComplete="off"
              placeholder={
                mode === "listening"
                  ? `Type the word in ${front}…`
                  : `Type the answer in ${back}…`
              }
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button className="primary">Check answer</button>
          </form>
        )}
        {revealed && (
          <div className="answer" aria-live="polite">
            {(mode === "typing" || mode === "listening") && (
              <p
                className={
                  normalized(typed) ===
                  normalized(card.fields[mode === "listening" ? front : back])
                    ? "correct"
                    : "incorrect"
                }
              >
                {normalized(typed) ===
                normalized(card.fields[mode === "listening" ? front : back])
                  ? "✓ Correct"
                  : "↻ Keep practicing"}
                {typed && ` · You wrote “${typed}”`}
              </p>
            )}
            <h2>{card.fields[back]}</h2>
            {mode === "listening" && <p>{card.fields[front]}</p>}
            {card.fields["Example Sentence"] && (
              <blockquote>
                {card.fields["Example Sentence"]}
                {!data.settings.hideTranslation && (
                  <span>{card.fields["Example Translation"]}</span>
                )}
              </blockquote>
            )}
            <div className="grammar">
              {["Part of Speech", "Gender", "Plural"]
                .filter((k) => card.fields[k])
                .map((k) => (
                  <span key={k}>
                    {k === "Plural" ? "Plural: " : ""}
                    {card.fields[k]}
                  </span>
                ))}
            </div>
            <details>
              <summary>A little more context</summary>
              <div className="card-context">
                {Object.entries(card.fields)
                  .filter(
                    ([k, v]) =>
                      v &&
                      ![
                        front,
                        back,
                        "IPA",
                        "Example Sentence",
                        "Example Translation",
                        "Gender",
                        "Plural",
                        "Part of Speech",
                        "Tags",
                        "Image",
                      ].includes(k),
                  )
                  .map(([k, v]) => (
                    <p key={k}>
                      <small>{k}</small>
                      {v}
                    </p>
                  ))}
                {card.fields.Image &&
                  /^https?:\/\//.test(card.fields.Image) && (
                    <img
                      src={card.fields.Image}
                      alt="Vocabulary illustration"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}
                <div className="tags">
                  {card.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <button onClick={() => onEdit(card)}>Edit this card</button>
              </div>
            </details>
          </div>
        )}
      </div>
      <div className="study-controls">
        {!revealed && mode !== "typing" && mode !== "listening" ? (
          <>
            <button
              className="primary reveal"
              onClick={() => setRevealed(true)}
            >
              Reveal answer <span>space</span>
            </button>
            <p>Take your time. Recall before you reveal.</p>
          </>
        ) : revealed ? (
          <div className="rating-buttons">
            {(["again", "hard", "good", "easy"] as Rating[]).map((r, i) => (
              <button className={`rating ${r}`} key={r} onClick={() => rate(r)}>
                <span>
                  {r.charAt(0).toUpperCase() + r.slice(1)} <kbd>{i + 1}</kbd>
                </span>
                <small>
                  {intervalLabel(schedule(card.scheduling, r).interval)}
                </small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {help && (
        <Modal title="A little less clicking" onClose={() => setHelp(false)}>
          <div className="shortcut-list">
            {[
              ["Space", "Reveal answer"],
              ["1 / 2 / 3 / 4", "Again / Hard / Good / Easy"],
              ["P", "Pronounce"],
              ["E", "Edit card"],
              ["S", "Skip card"],
              ["?", "Open shortcuts"],
            ].map(([k, v]) => (
              <p key={k}>
                <kbd>{k}</kbd>
                <span>{v}</span>
              </p>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
