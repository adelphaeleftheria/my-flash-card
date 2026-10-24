import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  GraduationCap,
  Home as HomeIcon,
  Leaf,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Home } from "./components/Home";
import { Library, DeckForm } from "./components/Library";
import { Study } from "./components/Study";
import { Statistics } from "./components/Statistics";
import { Settings } from "./components/Settings";
import { Importer } from "./components/Importer";
import { CardEditor } from "./components/CardEditor";
import { Modal } from "./components/ui";
import { loadData, saveData } from "./lib/storage";
import { addSample } from "./lib/sample";
import { makeDeck, type Card, type Data, type Deck } from "./lib/model";
import { messages } from "./lib/i18n";
const pages = ["home", "library", "study", "statistics", "settings"] as const;
type Page = (typeof pages)[number];
const pageFromHash = (): Page => {
  const p = location.hash.slice(1);
  return pages.includes(p as Page) ? (p as Page) : "home";
};
export default function App() {
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState<Page>(pageFromHash),
    [selected, setSelected] = useState<string>(),
    [studyDeck, setStudyDeck] = useState<string>(),
    [importer, setImporter] = useState<{ targetId?: string } | null>(null),
    [editor, setEditor] = useState<{ card?: Card; deck: Deck } | null>(null),
    [newDeck, setNewDeck] = useState<Deck | null>(null),
    [toast, setToast] = useState(""),
    [saving, setSaving] = useState(false),
    [storageError, setStorageError] = useState(""),
    [about, setAbout] = useState(false);
  const saveChain = useRef(Promise.resolve()),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function notify(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6000);
  }
  useEffect(() => {
    loadData()
      .then(setData)
      .catch(() =>
        setStorageError(
          "We couldn’t open local storage. Enable IndexedDB in your browser, then reload. Your existing data has not been changed.",
        ),
      );
    const hash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  function update(next: Data) {
    setData(next);
    setSaving(true);
    const operation = saveChain.current.then(() => saveData(next));
    saveChain.current = operation
      .then(() => {
        setStorageError("");
        setSaving(false);
      })
      .catch(() => {
        setSaving(false);
        setStorageError(
          "Your latest changes could not be saved. Storage may be full. Export a backup now before closing this page.",
        );
      });
    return saveChain.current;
  }
  useEffect(() => {
    if (!data) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        data.settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : data.settings.theme;
    };
    apply();
    media.addEventListener("change", apply);
    document.documentElement.style.fontSize = `${data.settings.fontSize}px`;
    document.documentElement.dataset.motion = data.settings.reducedMotion
      ? "reduced"
      : "normal";
    return () => media.removeEventListener("change", apply);
  }, [
    data?.settings.theme,
    data?.settings.fontSize,
    data?.settings.reducedMotion,
  ]);
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => {
      if (saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [saving]);
  function navigate(next: Page) {
    location.hash = next;
    setPage(next);
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    const search = (e: KeyboardEvent) => {
      if (
        e.key !== "/" ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        document.querySelector("dialog[open]")
      )
        return;
      e.preventDefault();
      navigate("library");
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>(".search-input input")
          ?.focus(),
      );
    };
    window.addEventListener("keydown", search);
    return () => window.removeEventListener("keydown", search);
  }, []);
  function study(id?: string) {
    setStudyDeck(id);
    navigate("study");
  }
  function library(id?: string) {
    setSelected(id);
    navigate("library");
  }
  function sample() {
    if (!data) return;
    const next = addSample(data);
    update(next);
    notify("Your German sample deck is ready. A good place to begin.");
  }
  if (!data)
    return (
      <div className="loading">
        <Leaf size={38} />
        <h1>Folio</h1>
        <p>{storageError || "Making a little room for learning…"}</p>
        {storageError && (
          <button onClick={() => location.reload()}>Try again</button>
        )}
      </div>
    );
  const t = messages[data.settings.uiLanguage] || messages.en;
  const icons = [
    HomeIcon,
    BookOpen,
    GraduationCap,
    ChartNoAxesColumnIncreasing,
    SettingsIcon,
  ];
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Folio home"
        >
          <span className="brand-mark">
            <BookOpen size={23} />
          </span>
          <span>
            folio<span className="brand-period">.</span>
          </span>
        </button>
        <div className="workspace-name">
          <span className="workspace-avatar">M</span>
          <div>
            My learning space<small>Make it a daily thing.</small>
          </div>
        </div>
        <div className="nav-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          {pages.map((p, i) => {
            const Icon = icons[i];
            return (
              <button
                key={p}
                className={page === p ? "nav-item active" : "nav-item"}
                onClick={() => navigate(p)}
                aria-current={page === p ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{t[p]}</span>
                {p === "library" && (
                  <small>{data.decks.filter((d) => !d.archived).length}</small>
                )}
                {page === p && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-decks">
          <div className="nav-label">
            YOUR COLLECTIONS
            <button
              aria-label="Create deck"
              onClick={() => setNewDeck(makeDeck(""))}
            >
              <Plus size={14} />
            </button>
          </div>
          {data.decks
            .filter((d) => !d.archived)
            .slice(0, 5)
            .map((d) => (
              <button key={d.id} onClick={() => library(d.id)}>
                <span className={`collection-dot ${d.color}`} />
                <span>{d.name}</span>
              </button>
            ))}
          {!data.decks.length && (
            <p>
              Something good starts
              <br />
              with your first deck.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Leaf size={20} />
            <strong>Small steps. Lasting roots.</strong>
            <p>A few minutes of practice can stay with you for a lifetime.</p>
            <button className="text-button" onClick={() => setAbout(true)}>
              The Folio philosophy <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="local-status">
            <ShieldCheck size={14} />
            <span>Private by design. Local by default.</span>
          </div>
          <button
            className="profile-button"
            onClick={() => navigate("settings")}
          >
            <span className="workspace-avatar">Y</span>
            <div>
              Your personal space<small>No account needed</small>
            </div>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div>
            <span>My workspace</span>
            <ChevronRight size={13} />
            <strong>{t[page]}</strong>
          </div>
          <button className="topbar-note" onClick={() => navigate("settings")}>
            <span className="status-dot" />{" "}
            {saving ? "Saving your changes…" : "All yours. All on this device."}
          </button>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={`main-content page-${page}`}
        >
          {storageError && (
            <div className="error" role="alert">
              {storageError}
              <button onClick={() => navigate("settings")}>
                Open backup settings
              </button>
            </div>
          )}
          {page === "home" && (
            <Home
              data={data}
              onStudy={study}
              onImport={() => setImporter({})}
              onLibrary={library}
              onSample={sample}
              onCreate={() => setNewDeck(makeDeck(""))}
            />
          )}
          {page === "library" && (
            <Library
              data={data}
              onUpdate={update}
              onStudy={study}
              onImport={(id) => setImporter({ targetId: id })}
              onEdit={(card, deck) => {
                if (deck) setEditor({ card, deck });
              }}
              selected={selected}
              onSelect={setSelected}
              onCreate={() => setNewDeck(makeDeck(""))}
            />
          )}
          {page === "study" && (
            <Study
              key={studyDeck || "all"}
              data={data}
              deckId={studyDeck}
              onUpdate={update}
              onExit={() => library(studyDeck)}
              onEdit={(card) => {
                const deck = data.decks.find((d) => d.id === card.deckId);
                if (deck) setEditor({ card, deck });
              }}
            />
          )}
          {page === "statistics" && <Statistics data={data} />}
          {page === "settings" && (
            <Settings data={data} onUpdate={update} notify={notify} />
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {pages.map((p, i) => {
          const Icon = icons[i];
          return (
            <button
              className={page === p ? "active" : ""}
              key={p}
              onClick={() => navigate(p)}
              aria-current={page === p ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{p === "statistics" ? "Stats" : t[p]}</span>
            </button>
          );
        })}
      </nav>
      {importer && (
        <Importer
          data={data}
          onImport={async (d) => {
            await update(d);
            notify("Your words have a new home. Deck imported.");
          }}
          onClose={() => setImporter(null)}
          targetId={importer.targetId}
        />
      )}
      {editor && (
        <CardEditor
          {...editor}
          onClose={() => setEditor(null)}
          onSave={async (card) => {
            await update({
              ...data,
              cards: data.cards.some((c) => c.id === card.id)
                ? data.cards.map((c) => (c.id === card.id ? card : c))
                : [...data.cards, card],
            });
            notify("Card saved.");
          }}
        />
      )}
      {newDeck && (
        <DeckForm
          deck={newDeck}
          onClose={() => setNewDeck(null)}
          onSave={(deck) => {
            update({ ...data, welcomed: true, decks: [...data.decks, deck] });
            setNewDeck(null);
            library(deck.id);
          }}
        />
      )}
      {about && (
        <Modal title="A little, every day." onClose={() => setAbout(false)}>
          <div className="philosophy">
            <Leaf size={38} />
            <p>
              Knowledge grows quietly. A word today, a sentence tomorrow, a
              conversation you didn’t think you could have.
            </p>
            <p>
              Folio is a little space for that kind of growth. No leaderboards.
              No pressure. Just you, your curiosity, and a few things worth
              remembering.
            </p>
            <p className="muted">
              Your learning stays on this device. Back it up to take it with
              you.
            </p>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckIcon />
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function CheckIcon() {
  return <span className="toast-check">✓</span>;
}
