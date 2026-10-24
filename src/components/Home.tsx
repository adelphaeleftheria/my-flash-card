import {
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Leaf,
  Plus,
  Sun,
  Target,
  TrendingUp,
  Upload,
} from "lucide-react";
import { DeckTile } from "./Library";
import { Progress } from "./ui";
import { activity, stats } from "../features/statistics";
import type { Data } from "../lib/model";
export function Home({
  data,
  onStudy,
  onImport,
  onLibrary,
  onSample,
  onCreate,
}: {
  data: Data;
  onStudy: (id?: string) => void;
  onImport: () => void;
  onLibrary: (id?: string) => void;
  onSample: () => void;
  onCreate: () => void;
}) {
  const active = data.decks.filter((d) => !d.archived),
    cards = data.cards.filter((c) => active.some((d) => d.id === c.deckId)),
    s = stats(cards, data.reviews),
    week = activity(data.reviews),
    hasDecks = !!active.length;
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const goal = Math.min(100, (s.studiedToday / data.settings.goal) * 100);
  return (
    <>
      <div className="home-heading">
        <div>
          <span className="eyebrow">
            <Sun size={14} /> YOUR DAILY MOMENT OF DISCOVERY
          </span>
          <h1>
            {greeting}
            <span className="heading-dot">.</span>
          </h1>
          <p>A little practice today. A world of possibilities tomorrow.</p>
        </div>
        <button onClick={onImport}>
          <Upload size={16} /> Import CSV
        </button>
      </div>
      <div className="home-hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span /> {hasDecks ? "YOUR NEXT CHAPTER" : "A FRESH START"}
          </span>
          <h2>
            {hasDecks ? (
              s.due ? (
                <>
                  A few familiar words.
                  <br />A little more confidence.
                </>
              ) : (
                <>
                  Make room for
                  <br />
                  something new.
                </>
              )
            ) : (
              <>
                Big things start
                <br />
                with a little word.
              </>
            )}
          </h2>
          <p>
            {hasDecks
              ? s.due
                ? `${s.due} cards are ready for a fresh look. Pick up where you left off.`
                : s.new
                  ? `${s.new} new words are waiting to become familiar. Take your first small step.`
                  : "You’re all caught up. Let your words settle in, or enjoy a little extra practice."
              : "Your own quiet corner for learning. Bring your vocabulary, and build a little knowledge every day."}
          </p>
          <div className="hero-actions">
            <button
              className="primary"
              onClick={() => (hasDecks ? onStudy() : onImport())}
            >
              {hasDecks ? "Start studying" : "Import your first CSV"}{" "}
              <ArrowRight size={17} />
            </button>
            {!hasDecks ? (
              <button className="text-button" onClick={onSample}>
                Try a sample deck
              </button>
            ) : (
              <span>
                {Math.min(data.settings.sessionSize, s.due + s.new) ||
                  cards.length}{" "}
                cards · a few focused minutes
              </span>
            )}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-spark spark-one">✧</span>
          <span className="art-spark spark-two">+</span>
          <div className="art-card back-card">
            <span>FOLIO</span>
            <Leaf size={54} />
          </div>
          <div className="art-card front-card">
            <span>GERMAN → ENGLISH</span>
            <div className="art-word">
              entdecken<small>/ɛntˈdɛkn̩/</small>
            </div>
            <div className="art-divider" />
            <div className="art-translation">to discover</div>
            <small>One word. A new possibility.</small>
          </div>
          <span className="art-note">
            <Check size={12} /> A little more familiar.
          </span>
        </div>
      </div>
      <div className="home-metrics">
        <div>
          <span className="metric-icon">
            <BookOpen size={18} />
          </span>
          <div>
            <strong>{s.total}</strong>
            <span>Words in your library</span>
          </div>
        </div>
        <div>
          <span className="metric-icon">
            <TrendingUp size={18} />
          </span>
          <div>
            <strong>
              {s.accuracy}
              <small>%</small>
            </strong>
            <span>Recall accuracy</span>
          </div>
        </div>
        <div>
          <span className="metric-icon">
            <Flame size={18} />
          </span>
          <div>
            <strong>
              {s.streak}
              <small> days</small>
            </strong>
            <span>Learning streak</span>
          </div>
        </div>
        <div>
          <span className="metric-icon">
            <Check size={18} />
          </span>
          <div>
            <strong>{s.week}</strong>
            <span>Reviews this week</span>
          </div>
        </div>
      </div>
      <div className="home-lower">
        <section className="home-decks">
          <div className="section-heading">
            <div>
              <h2>
                Your collections <span>{active.length}</span>
              </h2>
              <p>A few words closer to where you want to be.</p>
            </div>
            <button className="text-button" onClick={() => onLibrary()}>
              View library <ArrowRight size={15} />
            </button>
          </div>
          <div className="deck-grid">
            {active.slice(0, 2).map((d) => (
              <DeckTile
                key={d.id}
                deck={d}
                data={data}
                onOpen={() => onLibrary(d.id)}
                onStudy={() => onStudy(d.id)}
              />
            ))}
            {active.length < 2 && (
              <button className="new-deck-tile" onClick={onCreate}>
                <span>
                  <Plus size={24} />
                </span>
                <strong>Your next collection</strong>
                <small>
                  A new language. A new interest.
                  <br />
                  Something worth remembering.
                </small>
                <span className="text-button">
                  Create a deck <ArrowRight size={14} />
                </span>
              </button>
            )}
          </div>
          {!hasDecks && (
            <div className="sample-invitation">
              <span className="sample-flag">DE</span>
              <div>
                <strong>A good place to begin</strong>
                <p>Explore 18 everyday German words, complete with examples.</p>
              </div>
              <button className="text-button" onClick={onSample}>
                Try the sample <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
        <aside className="daily-panel panel">
          <div className="section-heading">
            <h2>A little, every day</h2>
            <Target size={18} />
          </div>
          <p className="daily-description">
            Consistency is quieter than you think.
          </p>
          <div className="goal-number">
            <strong>{s.studiedToday}</strong>
            <span> / {data.settings.goal} cards</span>
            <span className="goal-percent">{Math.round(goal)}%</span>
          </div>
          <Progress value={goal} />
          <div className="week-activity">
            {week.map((d, i) => (
              <div key={d.key}>
                <span
                  className={`${d.count ? "done" : ""} ${i === 6 ? "today" : ""}`}
                  title={`${d.count} reviews`}
                >
                  {d.count ? <Check size={15} /> : <i />}
                </span>
                <small>{d.label.slice(0, 1)}</small>
              </div>
            ))}
          </div>
          <div className="daily-note">
            <Leaf size={17} />
            <p>
              {goal >= 100
                ? "You made time for learning today. Nicely done."
                : "No rush. Every small step counts."}
            </p>
          </div>
        </aside>
      </div>
      <div className="home-footer">
        <span>GROW YOUR KNOWLEDGE. KEEP YOUR CURIOSITY.</span>
        <span>A little every day adds up.</span>
      </div>
    </>
  );
}
