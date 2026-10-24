import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { activity, stats } from "../features/statistics";
import type { Data } from "../lib/model";
export function Statistics({ data }: { data: Data }) {
  const [deckId, setDeckId] = useState(""),
    [metric, setMetric] = useState("count");
  const reviews = data.reviews.filter((r) => !deckId || r.deckId === deckId),
    cards = data.cards.filter((c) => !deckId || c.deckId === deckId),
    s = stats(cards, reviews),
    days = activity(reviews, 14),
    heat = activity(reviews, 182);
  const max = Math.max(
    1,
    ...days.map((d) => Number(d[metric as keyof typeof d])),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE BIGGER PICTURE</span>
          <h1>
            Little by little<span className="heading-dot">.</span>
          </h1>
          <p>Every word remembered started with a little practice.</p>
        </div>
        <select
          aria-label="Statistics deck"
          value={deckId}
          onChange={(e) => setDeckId(e.target.value)}
        >
          <option value="">All decks</option>
          {data.decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="metric-grid">
        <div className="metric-card">
          <Target size={19} />
          <strong>{s.accuracy}%</strong>
          <span>Recall accuracy</span>
          <small>
            {reviews.length
              ? "Ratings other than Again"
              : "Your first review starts the story"}
          </small>
        </div>
        <div className="metric-card">
          <TrendingUp size={19} />
          <strong>
            {s.learned}
            <em> / {s.total}</em>
          </strong>
          <span>Words in review</span>
          <small>{s.new} still to discover</small>
        </div>
        <div className="metric-card">
          <CalendarDays size={19} />
          <strong>
            {s.streak}
            <em> days</em>
          </strong>
          <span>Current streak</span>
          <small>Longest: {s.longest} days</small>
        </div>
        <div className="metric-card">
          <Clock size={19} />
          <strong>
            {Math.round(s.time / 60000)}
            <em> min</em>
          </strong>
          <span>Time spent learning</span>
          <small>{s.days} days of showing up</small>
        </div>
      </div>
      <section className="panel stats-chart-panel">
        <div className="section-heading">
          <div>
            <h2>A rhythm of your own</h2>
            <p>Your last two weeks of learning</p>
          </div>
          <select
            aria-label="Chart metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="count">Reviews</option>
            <option value="accuracy">Accuracy %</option>
            <option value="newLearned">New words learned</option>
            <option value="time">Study time (ms)</option>
          </select>
        </div>
        <div
          className="bar-chart"
          role="img"
          aria-label={days
            .map((d) => `${d.key}: ${d.count} reviews`)
            .join(", ")}
        >
          {days.map((d) => (
            <div className="bar-column" key={d.key}>
              <span className="bar-value">
                {metric === "time"
                  ? `${Math.round(d.time / 1000)}s`
                  : Number(d[metric as keyof typeof d]) || ""}
              </span>
              <div className="bar-track">
                <div
                  style={{
                    height: `${(Number(d[metric as keyof typeof d]) / max) * 100}%`,
                  }}
                  title={`${d.key}: ${d.count} reviews`}
                />
              </div>
              <small>{d.label.slice(0, 1)}</small>
            </div>
          ))}
        </div>
        {!reviews.length && (
          <p className="chart-empty">
            Your story starts with your first study session.
          </p>
        )}
      </section>
      <div className="stats-lower">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Showing up matters</h2>
              <p>Six months of small steps</p>
            </div>
            <CalendarDays size={18} />
          </div>
          <div className="heatmap">
            {heat.map((d) => (
              <div
                tabIndex={0}
                role="img"
                aria-label={`${d.key}: ${d.count} reviews`}
                title={`${d.key}: ${d.count} reviews`}
                className={`heat level-${Math.min(4, Math.ceil(d.count / 5))}`}
                key={d.key}
              />
            ))}
          </div>
          <div className="heat-legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <i className={`heat level-${i}`} key={i} />
            ))}
            <span>More</span>
          </div>
        </section>
        <section className="panel upcoming">
          <div className="section-heading">
            <h2>Looking ahead</h2>
            <ArrowUpRight size={19} />
          </div>
          {Array.from({ length: 7 }, (_, i) => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() + i);
            const end = +start + 86400000;
            const count = cards.filter(
              (c) =>
                c.scheduling.state !== "new" &&
                c.scheduling.due < end &&
                (i === 0 || c.scheduling.due >= +start),
            ).length;
            return (
              <div key={i}>
                <span>
                  {i === 0
                    ? "Today"
                    : i === 1
                      ? "Tomorrow"
                      : start.toLocaleDateString("en", { weekday: "long" })}
                </span>
                <strong>
                  {count}
                  <small> cards</small>
                </strong>
              </div>
            );
          })}
        </section>
      </div>
      <section className="panel deck-stats">
        <div className="section-heading">
          <h2>Your collections, at a glance</h2>
        </div>
        {data.decks
          .filter((d) => !deckId || d.id === deckId)
          .map((d) => {
            const ds = stats(
              data.cards.filter((c) => c.deckId === d.id),
              data.reviews.filter((r) => r.deckId === d.id),
            );
            return (
              <div className="deck-stat-row" key={d.id}>
                <strong>{d.name}</strong>
                <span>{ds.learned} learned</span>
                <span>{ds.due} due</span>
                <span>{ds.accuracy}% accuracy</span>
                <span>{ds.week} reviews this week</span>
              </div>
            );
          })}
      </section>
      <p className="small muted">
        Accuracy reflects your own recall ratings, not an independent retention
        test. Words enter review after a scheduled interval of at least one day.
      </p>
    </>
  );
}
