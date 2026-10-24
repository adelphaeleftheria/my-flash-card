import { useRef, useState } from "react";
import { Download, Upload, ShieldCheck, Volume2 } from "lucide-react";
import { Modal } from "./ui";
import { dayKey } from "../features/statistics";
import { download, exportCSV } from "../features/csv";
import { mergeBackup, validateBackup } from "../features/backup";
import { pronounce, speechAvailable } from "../features/pronunciation";
import {
  emptyData,
  type Data,
  type Settings as Preferences,
} from "../lib/model";
export function Settings({
  data,
  onUpdate,
  notify,
}: {
  data: Data;
  onUpdate: (d: Data) => void;
  notify: (s: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    [restore, setRestore] = useState<Data | null>(null),
    [merge, setMerge] = useState(true);
  function set<K extends keyof Preferences>(k: K, v: Preferences[K]) {
    onUpdate({ ...data, settings: { ...data.settings, [k]: v } });
  }
  async function read(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("Choose a backup smaller than 100 MB.");
      setRestore(validateBackup(JSON.parse(await file.text())));
    } catch (e) {
      notify(e instanceof Error ? e.message : "We couldn’t read this backup.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>
            Your own way<span className="heading-dot">.</span>
          </h1>
          <p>A few thoughtful preferences for a practice that fits you.</p>
        </div>
      </div>
      <div className="settings-layout">
        <section className="panel settings-section">
          <h2>Study</h2>
          <p>A sustainable rhythm beats a perfect streak.</p>
          <div className="form-row">
            <label>
              Daily goal (cards)
              <input
                type="number"
                min={1}
                max={1000}
                value={data.settings.goal}
                onChange={(e) =>
                  set("goal", Math.max(1, Math.min(1000, +e.target.value)))
                }
              />
            </label>
            <label>
              Cards per session
              <input
                type="number"
                min={1}
                max={500}
                value={data.settings.sessionSize}
                onChange={(e) =>
                  set(
                    "sessionSize",
                    Math.max(1, Math.min(500, +e.target.value)),
                  )
                }
              />
            </label>
            <label>
              New cards per day
              <input
                type="number"
                min={0}
                max={500}
                value={data.settings.newPerDay}
                onChange={(e) =>
                  set("newPerDay", Math.max(0, Math.min(500, +e.target.value)))
                }
              />
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={data.settings.hideTranslation}
              onChange={(e) => set("hideTranslation", e.target.checked)}
            />{" "}
            Hide example translations during study
          </label>
        </section>
        <section className="panel settings-section">
          <h2>Pronunciation</h2>
          <p>Hear the word. Find your voice.</p>
          {!speechAvailable() && (
            <div className="notice">
              Pronunciation isn’t available in this browser. You can still study
              the written pronunciation.
            </div>
          )}
          <div className="form-row">
            <label>
              Preview language
              <select
                value={data.settings.locale}
                onChange={(e) => set("locale", e.target.value)}
              >
                {[
                  ["de-DE", "German"],
                  ["en-US", "English"],
                  ["es-ES", "Spanish"],
                  ["fr-FR", "French"],
                  ["it-IT", "Italian"],
                  ["ja-JP", "Japanese"],
                  ["zh-CN", "Chinese"],
                  ["el-GR", "Greek"],
                ].map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Speech speed: {data.settings.rate.toFixed(2)}×
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={data.settings.rate}
                onChange={(e) => set("rate", +e.target.value)}
              />
            </label>
          </div>
          <div className="inline">
            <button
              disabled={!speechAvailable()}
              onClick={() =>
                pronounce(
                  data.settings.locale === "de-DE"
                    ? "Ein bisschen, jeden Tag."
                    : "A little, every day.",
                  data.settings.locale,
                  data.settings.rate,
                )
              }
            >
              <Volume2 size={16} /> Preview voice
            </button>
            <label className="check-label">
              <input
                type="checkbox"
                checked={data.settings.autoPlay}
                onChange={(e) => set("autoPlay", e.target.checked)}
              />{" "}
              Auto-play during study
            </label>
          </div>
          <small className="muted">
            Available voices depend on your device. Each deck has its own speech
            locales.
          </small>
        </section>
        <section className="panel settings-section">
          <h2>Appearance</h2>
          <div className="form-row">
            <label>
              Theme
              <select
                aria-label="Theme"
                value={data.settings.theme}
                onChange={(e) =>
                  set("theme", e.target.value as Preferences["theme"])
                }
              >
                <option value="system">Follow system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Text size
              <select
                value={data.settings.fontSize}
                onChange={(e) => set("fontSize", +e.target.value)}
              >
                <option value={14}>Small</option>
                <option value={16}>Default</option>
                <option value={18}>Large</option>
                <option value={20}>Extra large</option>
              </select>
            </label>
            <label>
              Navigation language
              <select
                value={data.settings.uiLanguage}
                onChange={(e) =>
                  set("uiLanguage", e.target.value as "en" | "de")
                }
              >
                <option value="en">English</option>
                <option value="de">Deutsch (navigation)</option>
              </select>
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={data.settings.reducedMotion}
              onChange={(e) => set("reducedMotion", e.target.checked)}
            />{" "}
            Reduce motion
          </label>
        </section>
        <section className="panel settings-section">
          <h2>Your data, in your hands</h2>
          <p>
            Everything lives in this browser on this device. No account, no
            analytics, no automatic sync. Make a backup before clearing browser
            data.
          </p>
          <div className="data-actions">
            <button
              onClick={() =>
                download(
                  `flashcards-backup-${dayKey(Date.now())}.json`,
                  JSON.stringify(data, null, 2),
                  "application/json",
                )
              }
            >
              <Download size={16} /> Export full backup
            </button>
            <button onClick={() => input.current?.click()}>
              <Upload size={16} /> Restore backup
            </button>
            <button
              onClick={() =>
                download(
                  "folio-all-cards.csv",
                  exportCSV(data.cards),
                  "text/csv",
                )
              }
            >
              <Download size={16} /> Export all cards (CSV)
            </button>
            <button
              onClick={() =>
                download(
                  "folio-study-history.csv",
                  `cardId,deckId,timestamp,rating,previousInterval,newInterval,responseTimeMs\n${data.reviews.map((r) => [r.cardId, r.deckId, new Date(r.timestamp).toISOString(), r.rating, r.previousInterval, r.newInterval, r.responseTimeMs].join(",")).join("\n")}`,
                  "text/csv",
                )
              }
            >
              <Download size={16} /> Export study history
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void read(e.target.files?.[0])}
          />
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <span>
              Your words stay yours. Imported text is never executed as code.
              External image URLs and device speech voices can use the network.
            </span>
          </div>
          <button
            className="text-button danger"
            onClick={() => {
              if (
                confirm(
                  "Permanently clear all decks, cards, reviews, and preferences on this device? Export a backup first.",
                )
              ) {
                onUpdate(emptyData());
                notify(
                  "Local data cleared. You can start fresh or restore a backup.",
                );
              }
            }}
          >
            Clear all local data
          </button>
        </section>
        <section className="panel settings-section">
          <h2>Keyboard shortcuts</h2>
          <div className="shortcut-list">
            {[
              ["Space", "Reveal answer"],
              ["1 · 2 · 3 · 4", "Again · Hard · Good · Easy"],
              ["P", "Pronounce"],
              ["E", "Edit card"],
              ["S", "Skip card"],
              ["?", "Shortcut help while studying"],
            ].map(([k, v]) => (
              <p key={k}>
                <kbd>{k}</kbd>
                <span>{v}</span>
              </p>
            ))}
          </div>
        </section>
      </div>
      {restore && (
        <Modal
          title="Bring your learning home"
          onClose={() => setRestore(null)}
        >
          <p>
            This backup contains {restore.decks.length} decks,{" "}
            {restore.cards.length} cards, and {restore.reviews.length} reviews.
          </p>
          <label className="check-label">
            <input
              type="radio"
              name="restore"
              checked={merge}
              onChange={() => setMerge(true)}
            />{" "}
            Merge — keep existing data and add new items
          </label>
          <label className="check-label">
            <input
              type="radio"
              name="restore"
              checked={!merge}
              onChange={() => setMerge(false)}
            />{" "}
            Replace — overwrite all current local data
          </label>
          <p className="muted small">
            Merging matches item IDs and preserves existing versions. Export a
            backup first if you’re unsure.
          </p>
          <footer>
            <button onClick={() => setRestore(null)}>Cancel</button>
            <button
              className="primary"
              onClick={() => {
                onUpdate(merge ? mergeBackup(data, restore) : restore);
                setRestore(null);
                notify("Your backup has been restored.");
              }}
            >
              Restore backup
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
