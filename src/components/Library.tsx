import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Archive,
  Trash2,
  GitMerge,
  Upload,
  Volume2,
} from "lucide-react";
import { AudioButton, Empty, Modal, Progress } from "./ui";
import { exportCSV, download } from "../features/csv";
import { stats } from "../features/statistics";
import { uid, type Card, type Data, type Deck } from "../lib/model";
export function DeckTile({
  deck,
  data,
  onOpen,
  onStudy,
}: {
  deck: Deck;
  data: Data;
  onOpen: () => void;
  onStudy: () => void;
}) {
  const cards = data.cards.filter((c) => c.deckId === deck.id),
    s = stats(
      cards,
      data.reviews.filter((r) => r.deckId === deck.id),
    );
  return (
    <article className={`deck-tile ${deck.color}`}>
      <div className="deck-tile-top">
        <span className="deck-icon">
          <BookOpen size={23} />
        </span>
        <button
          className="icon-button"
          aria-label={`Open ${deck.name} options`}
          onClick={onOpen}
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
      <button className="deck-title" onClick={onOpen}>
        {deck.name}
      </button>
      <p className="deck-language">
        {deck.front} <ArrowRight size={12} /> {deck.back}
      </p>
      <p className="deck-description">
        {deck.description || "A little collection of things worth remembering."}
      </p>
      <div className="deck-numbers">
        <span>{cards.length} cards</span>
        <span>
          <i />
          {s.due} due
        </span>
      </div>
      <Progress value={s.total ? (s.learned / s.total) * 100 : 0} />
      <div className="deck-bottom">
        <small>
          {s.learned} learned · {s.new} new
        </small>
        <button className="text-button" onClick={onStudy}>
          Study <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}
export function Library({
  data,
  onUpdate,
  onStudy,
  onImport,
  onEdit,
  selected,
  onSelect,
  onCreate,
}: {
  data: Data;
  onUpdate: (d: Data) => void;
  onStudy: (id: string) => void;
  onImport: (id?: string) => void;
  onEdit: (c?: Card, deck?: Deck) => void;
  selected?: string;
  onSelect: (id?: string) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState("recent"),
    [filter, setFilter] = useState("all"),
    [showFilters, setShowFilters] = useState(false),
    [tag, setTag] = useState(""),
    [chosen, setChosen] = useState<string[]>([]),
    [options, setOptions] = useState(false),
    [editing, setEditing] = useState(false),
    [archive, setArchive] = useState(false),
    [mergeTarget, setMergeTarget] = useState("");
  const deck = data.decks.find((d) => d.id === selected),
    allCards = data.cards.filter((c) => !deck || c.deckId === deck.id);
  const q = search.toLocaleLowerCase();
  const cards = allCards
    .filter(
      (c) =>
        Object.values(c.fields).join(" ").toLocaleLowerCase().includes(q) ||
        c.tags.join(" ").toLocaleLowerCase().includes(q),
    )
    .filter((c) => !tag || c.tags.includes(tag))
    .filter(
      (c) =>
        filter === "all" ||
        (filter === "due" &&
          c.scheduling.state !== "new" &&
          c.scheduling.due <= Date.now()) ||
        (filter === "difficult" &&
          (c.difficulty === "difficult" || c.scheduling.lapseCount >= 2)) ||
        (filter === "easy" && c.difficulty === "easy") ||
        (filter === "example" && !!c.fields["Example Sentence"]) ||
        (filter === "pronunciation" && !!c.fields.IPA) ||
        (filter === "notes" && !!c.fields.Notes) ||
        filter === c.scheduling.state,
    )
    .sort((a, b) =>
      sort === "name"
        ? (a.fields[deck?.front || "German"] || "").localeCompare(
            b.fields[deck?.front || "German"] || "",
          )
        : sort === "due"
          ? a.scheduling.due - b.scheduling.due
          : sort === "accuracy"
            ? a.scheduling.correctCount / (a.scheduling.reviewCount || 1) -
              b.scheduling.correctCount / (b.scheduling.reviewCount || 1)
            : b.createdAt - a.createdAt,
    );
  const [page, setPage] = useState(0);
  const visible = cards.slice(page * 50, page * 50 + 50);
  const deckList = data.decks
    .filter(
      (d) =>
        d.archived === archive &&
        (d.name.toLowerCase().includes(q) ||
          data.cards.some(
            (c) =>
              c.deckId === d.id &&
              Object.values(c.fields).join(" ").toLowerCase().includes(q),
          )),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "cards"
          ? data.cards.filter((c) => c.deckId === b.id).length -
            data.cards.filter((c) => c.deckId === a.id).length
          : sort === "due"
            ? stats(
                data.cards.filter((c) => c.deckId === b.id),
                [],
              ).due -
              stats(
                data.cards.filter((c) => c.deckId === a.id),
                [],
              ).due
            : sort === "studied"
              ? Math.max(
                  0,
                  ...data.reviews
                    .filter((r) => r.deckId === b.id)
                    .map((r) => r.timestamp),
                ) -
                Math.max(
                  0,
                  ...data.reviews
                    .filter((r) => r.deckId === a.id)
                    .map((r) => r.timestamp),
                )
              : b.createdAt - a.createdAt,
    );
  function updateDeck(changes: Partial<Deck>) {
    if (deck)
      onUpdate({
        ...data,
        decks: data.decks.map((d) =>
          d.id === deck.id ? { ...d, ...changes } : d,
        ),
      });
  }
  const exportDeck = () =>
    download(
      `${deck?.name || "folio-library"}.csv`,
      exportCSV(deck ? allCards : data.cards),
      "text/csv;charset=utf-8",
    );
  return (
    <>
      <div className="page-heading">
        <div>
          {deck && (
            <button
              className="text-button back-link"
              onClick={() => {
                onSelect(undefined);
                setChosen([]);
                setSearch("");
              }}
            >
              <ArrowLeft size={15} /> My library
            </button>
          )}
          <span className="eyebrow">
            {deck
              ? `${deck.front} → ${deck.back}`
              : "A HOME FOR WHAT YOU LEARN"}
          </span>
          <h1>
            {deck ? deck.name : "My library"}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {deck
              ? `${allCards.length} words, each one a little more familiar.`
              : "Small collections. Endless possibilities."}
          </p>
        </div>
        <div className="inline">
          {deck ? (
            <>
              <button
                className="icon-button bordered"
                aria-label="Deck options"
                onClick={() => setOptions(true)}
              >
                <MoreHorizontal size={21} />
              </button>
              <button onClick={() => onEdit(undefined, deck)}>
                <Plus size={17} /> Add card
              </button>
              <button className="primary" onClick={() => onStudy(deck.id)}>
                Study deck <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onImport()}>
                <Upload size={16} /> Import CSV
              </button>
              <button className="primary" onClick={onCreate}>
                <Plus size={17} /> New deck
              </button>
            </>
          )}
        </div>
      </div>
      <div className="library-toolbar">
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label={deck ? "Search cards" : "Search library"}
            placeholder={
              deck ? "Find a word, example, or tag…" : "Find a deck or a word…"
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <kbd>/</kbd>
        </div>
        <div className="inline">
          {!deck && (
            <button
              className={archive ? "active-toggle" : ""}
              onClick={() => setArchive(!archive)}
            >
              <Archive size={16} />
              {archive ? "Archived" : "Archive"}
            </button>
          )}
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Recently added</option>
            <option value="name">Alphabetical</option>
            {!deck && (
              <>
                <option value="cards">Most cards</option>
                <option value="studied">Recently studied</option>
              </>
            )}
            <option value="due">Due first</option>
            {deck && <option value="accuracy">Lowest accuracy</option>}
          </select>
          {deck && (
            <button onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={16} /> Filters
            </button>
          )}
        </div>
      </div>
      {deck && showFilters && (
        <div className="filter-panel">
          <label>
            Status
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
            >
              {[
                ["all", "All cards"],
                ["new", "New"],
                ["learning", "Learning"],
                ["relearning", "Relearning"],
                ["review", "Review"],
                ["due", "Due now"],
                ["difficult", "Difficult"],
                ["easy", "Easy"],
                ["example", "Has example"],
                ["pronunciation", "Has IPA"],
                ["notes", "Has notes"],
              ].map(([v, t]) => (
                <option value={v} key={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tag
            <select
              value={tag}
              onChange={(e) => {
                setTag(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All tags</option>
              {[...new Set(allCards.flatMap((c) => c.tags))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!deck ? (
        <>
          {deckList.length ? (
            <div className="deck-grid">
              {deckList.map((d) => (
                <DeckTile
                  key={d.id}
                  data={data}
                  deck={d}
                  onOpen={() => {
                    onSelect(d.id);
                    setSearch("");
                  }}
                  onStudy={() => onStudy(d.id)}
                />
              ))}
            </div>
          ) : (
            <Empty
              title={archive ? "Nothing tucked away" : "Room for something new"}
            >
              <p>
                {search
                  ? "No decks match your search."
                  : "Import a CSV or create your first collection."}
              </p>
              <button onClick={() => onImport()}>Import CSV</button>
            </Empty>
          )}
        </>
      ) : (
        <>
          {chosen.length > 0 && (
            <div className="selection-bar">
              <span>{chosen.length} selected</span>
              <button
                onClick={() =>
                  download(
                    `${deck.name}-selection.csv`,
                    exportCSV(allCards.filter((c) => chosen.includes(c.id))),
                    "text/csv",
                  )
                }
              >
                Export selected
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Delete ${chosen.length} selected cards and their review history?`,
                    )
                  ) {
                    onUpdate({
                      ...data,
                      cards: data.cards.filter((c) => !chosen.includes(c.id)),
                      reviews: data.reviews.filter(
                        (r) => !chosen.includes(r.cardId),
                      ),
                    });
                    setChosen([]);
                  }
                }}
              >
                Delete selected
              </button>
              <button onClick={() => setChosen([])}>Clear selection</button>
            </div>
          )}
          <div className="card-table">
            <div className="table-header">
              <span />
              <span>{deck.front}</span>
              <span>{deck.back}</span>
              <span>Status</span>
              <span />
            </div>
            {visible.map((c) => (
              <div className="table-row" key={c.id}>
                <input
                  aria-label={`Select ${c.fields[deck.front]}`}
                  type="checkbox"
                  checked={chosen.includes(c.id)}
                  onChange={(e) =>
                    setChosen(
                      e.target.checked
                        ? [...chosen, c.id]
                        : chosen.filter((id) => id !== c.id),
                    )
                  }
                />
                <button className="word-cell" onClick={() => onEdit(c, deck)}>
                  {c.fields[deck.front]}
                  <small>{c.fields.IPA && `/${c.fields.IPA}/`}</small>
                </button>
                <span>
                  {c.fields[deck.back]}
                  <small>{c.tags.slice(0, 2).join(" · ")}</small>
                </span>
                <span className={`status ${c.scheduling.state}`}>
                  {c.scheduling.state}
                </span>
                <AudioButton
                  text={c.fields[deck.front]}
                  lang={deck.sourceLanguage}
                  rate={data.settings.rate}
                />
              </div>
            ))}
          </div>
          {!cards.length && (
            <Empty title="No words found">
              <p>Try another filter, or add a new card.</p>
            </Empty>
          )}
          <div className="pagination">
            <span>
              {cards.length
                ? `${page * 50 + 1}–${Math.min((page + 1) * 50, cards.length)} of ${cards.length} cards`
                : "0 cards"}
            </span>
            <div className="inline">
              <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button
                disabled={(page + 1) * 50 >= cards.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {options && deck && (
        <Modal title="Deck options" onClose={() => setOptions(false)}>
          <div className="option-list">
            <button
              onClick={() => {
                setEditing(true);
                setOptions(false);
              }}
            >
              <Edit3 size={17} /> Rename & settings
            </button>
            <button
              onClick={() => {
                onImport(deck.id);
                setOptions(false);
              }}
            >
              <Upload size={17} /> Import cards into deck
            </button>
            <button onClick={exportDeck}>
              <Download size={17} /> Export deck as CSV
            </button>
            <button
              onClick={() => {
                const copy = {
                  ...deck,
                  id: uid(),
                  name: `${deck.name} (copy)`,
                  createdAt: Date.now(),
                };
                onUpdate({
                  ...data,
                  decks: [...data.decks, copy],
                  cards: [
                    ...data.cards,
                    ...allCards.map((c) => ({
                      ...c,
                      id: uid(),
                      deckId: copy.id,
                    })),
                  ],
                });
                setOptions(false);
              }}
            >
              <Copy size={17} /> Duplicate deck
            </button>
            <button
              onClick={() => {
                updateDeck({ archived: !deck.archived });
                setOptions(false);
                onSelect(undefined);
              }}
            >
              <Archive size={17} /> {deck.archived ? "Unarchive" : "Archive"}{" "}
              deck
            </button>
            <div className="merge-control">
              <label>
                Move cards into another deck
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                >
                  <option value="">Choose a deck</option>
                  {data.decks
                    .filter(
                      (d) =>
                        d.id !== deck.id &&
                        d.front === deck.front &&
                        d.back === deck.back,
                    )
                    .map((d) => (
                      <option value={d.id} key={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                disabled={!mergeTarget}
                onClick={() => {
                  if (
                    confirm(
                      "Merge these decks? Card schedules and review history will be kept.",
                    )
                  ) {
                    onUpdate({
                      ...data,
                      decks: data.decks.filter((d) => d.id !== deck.id),
                      cards: data.cards.map((c) =>
                        c.deckId === deck.id
                          ? { ...c, deckId: mergeTarget }
                          : c,
                      ),
                      reviews: data.reviews.map((r) =>
                        r.deckId === deck.id
                          ? { ...r, deckId: mergeTarget }
                          : r,
                      ),
                    });
                    setOptions(false);
                    onSelect(mergeTarget);
                  }
                }}
              >
                <GitMerge size={16} /> Merge
              </button>
            </div>
            <button
              className="danger"
              onClick={() => {
                if (
                  confirm(
                    `Delete “${deck.name}”, all its cards, and its review history? Export a backup first if you may need it.`,
                  )
                ) {
                  onUpdate({
                    ...data,
                    decks: data.decks.filter((d) => d.id !== deck.id),
                    cards: data.cards.filter((c) => c.deckId !== deck.id),
                    reviews: data.reviews.filter((r) => r.deckId !== deck.id),
                  });
                  setOptions(false);
                  onSelect(undefined);
                }
              }}
            >
              <Trash2 size={17} /> Delete deck
            </button>
          </div>
        </Modal>
      )}
      {editing && deck && (
        <DeckForm
          deck={deck}
          onClose={() => setEditing(false)}
          onSave={(d) => {
            updateDeck(d);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
export function DeckForm({
  deck,
  onClose,
  onSave,
}: {
  deck: Deck;
  onClose: () => void;
  onSave: (deck: Deck) => void;
}) {
  const [value, setValue] = useState(deck);
  return (
    <Modal
      title={deck.name ? "Deck settings" : "Start a new collection"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(value);
        }}
      >
        <label>
          Deck name
          <input
            required
            autoFocus
            value={value.name}
            placeholder="e.g. German for everyday life"
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            value={value.description}
            onChange={(e) =>
              setValue({ ...value, description: e.target.value })
            }
            placeholder="What would you like to remember?"
          />
        </label>
        <div className="form-row">
          <label>
            Front field
            <input
              required
              value={value.front}
              onChange={(e) => setValue({ ...value, front: e.target.value })}
            />
          </label>
          <label>
            Back field
            <input
              required
              value={value.back}
              onChange={(e) => setValue({ ...value, back: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Front speech locale
            <input
              required
              value={value.sourceLanguage}
              placeholder="de-DE"
              onChange={(e) =>
                setValue({ ...value, sourceLanguage: e.target.value })
              }
            />
          </label>
          <label>
            Back speech locale
            <input
              required
              value={value.targetLanguage}
              placeholder="en-US"
              onChange={(e) =>
                setValue({ ...value, targetLanguage: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          Deck accent
          <select
            value={value.color}
            onChange={(e) => setValue({ ...value, color: e.target.value })}
          >
            <option value="sage">Sage</option>
            <option value="clay">Terracotta</option>
            <option value="blue">Slate blue</option>
            <option value="gold">Warm ochre</option>
          </select>
        </label>
        <p className="muted small">
          Changing field names doesn’t rename existing card data. Keep the names
          used in your cards.
        </p>
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={value.front === value.back || !value.name.trim()}
          >
            Save deck
          </button>
        </footer>
      </form>
    </Modal>
  );
}
