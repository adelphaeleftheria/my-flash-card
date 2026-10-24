import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  FileSpreadsheet,
  Upload,
  Download,
} from "lucide-react";
import { Modal } from "./ui";
import {
  parseCSV,
  duplicateKey,
  download,
  type ParsedCSV,
} from "../features/csv";
import { makeDeck, makeCard, type Data } from "../lib/model";
export function Importer({
  data,
  onImport,
  onClose,
  targetId,
}: {
  data: Data;
  onImport: (data: Data) => void;
  onClose: () => void;
  targetId?: string;
}) {
  const [step, setStep] = useState(0),
    [parsed, setParsed] = useState<ParsedCSV | null>(null),
    [mapping, setMapping] = useState<string[]>([]),
    [name, setName] = useState(""),
    [front, setFront] = useState(""),
    [back, setBack] = useState(""),
    [error, setError] = useState(""),
    [skip, setSkip] = useState(true),
    [busy, setBusy] = useState(false),
    [filename, setFilename] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function read(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Choose a CSV smaller than 10 MB. Split larger files into multiple imports.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const bytes = await file.arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const { default: Worker } = await import("../features/csv.worker?worker");
      const worker = new Worker();
      const result = await new Promise<ParsedCSV>((resolve, reject) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.onerror = () => reject(new Error("We could not read this CSV."));
        worker.postMessage(text);
      });
      worker.terminate();
      setParsed(result);
      setMapping(result.headers);
      setFront(result.headers[0] || "");
      setBack(result.headers[1] || "");
      setName(file.name.replace(/\.csv$/i, "").replace(/[_-]/g, " "));
      setFilename(file.name);
      setStep(1);
    } catch {
      setError(
        "We couldn’t read this CSV. Use UTF-8 encoding and a header row.",
      );
    } finally {
      setBusy(false);
    }
  }
  const fields = useMemo(
    () =>
      parsed?.rows.map((row) =>
        Object.fromEntries(
          mapping
            .map((key, i) => [key, row[i]?.trim() || ""])
            .filter(([k]) => k),
        ),
      ) || [],
    [parsed, mapping],
  );
  const summary = useMemo(() => {
    const target = data.decks.find((d) => d.id === targetId);
    const f = target?.front || front,
      b = target?.back || back;
    const seen = new Set(
      data.cards
        .filter((c) => c.deckId === targetId)
        .map((c) => duplicateKey(c.fields, f, b)),
    );
    let duplicates = 0,
      invalid = 0;
    const valid: Record<string, string>[] = [];
    fields.forEach((field) => {
      if (!field[f] || !field[b]) {
        invalid++;
        return;
      }
      const key = duplicateKey(field, f, b);
      if (seen.has(key)) {
        duplicates++;
        if (skip) return;
      }
      seen.add(key);
      valid.push(field);
    });
    return { valid, duplicates, invalid };
  }, [fields, data, targetId, front, back, skip]);
  const names = mapping.filter(Boolean);
  const mappingError =
    new Set(names).size !== names.length
      ? "Imported field names must be unique."
      : !front ||
          !back ||
          front === back ||
          !names.includes(front) ||
          !names.includes(back)
        ? "Choose two different imported fields for the front and back."
        : "";
  function finish() {
    const locales: Record<string, string> = {
      german: "de-DE",
      deutsch: "de-DE",
      english: "en-US",
      spanish: "es-ES",
      french: "fr-FR",
      italian: "it-IT",
      greek: "el-GR",
      japanese: "ja-JP",
      chinese: "zh-CN",
      portuguese: "pt-PT",
      korean: "ko-KR",
    };
    const deck = data.decks.find((d) => d.id === targetId) || {
      ...makeDeck(name.trim() || "Untitled deck"),
      front,
      back,
      sourceLanguage: locales[front.toLowerCase()] || data.settings.locale,
      targetLanguage: locales[back.toLowerCase()] || "en-US",
    };
    onImport({
      ...data,
      welcomed: true,
      decks: targetId ? data.decks : [...data.decks, deck],
      cards: [...data.cards, ...summary.valid.map((f) => makeCard(deck.id, f))],
    });
    onClose();
  }
  return (
    <Modal title="A new chapter of learning" onClose={onClose} wide>
      <div className="wizard-steps">
        {["Upload", "Map fields", "Preview & import"].map((s, i) => (
          <span key={s} className={i === step ? "active" : ""}>
            <b>{i < step ? <Check size={12} /> : i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {step === 0 ? (
        <>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void read(e.dataTransfer.files[0]);
            }}
          >
            <div className="upload-icon">
              <Upload size={28} />
            </div>
            <h3>Drop your CSV here</h3>
            <p>Your vocabulary, ready for its next chapter.</p>
            <button
              className="primary"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? "Reading your file…" : "Browse files"}
            </button>
            <small>UTF-8 CSV · comma, semicolon or tab · up to 10 MB</small>
          </div>
          <input
            ref={input}
            type="file"
            accept=".csv,.tsv,text/csv"
            hidden
            onChange={(e) => void read(e.target.files?.[0])}
          />
          <button
            className="text-button template"
            onClick={() =>
              download(
                "folio-template.csv",
                "German,English,Example Sentence,Example Translation,Tags\nHaus,house,Das Haus ist groß.,The house is big.,A1\n",
                "text/csv",
              )
            }
          >
            <Download size={15} /> Download CSV template
          </button>
        </>
      ) : (
        <>
          {parsed && (
            <div className="file-summary">
              <FileSpreadsheet size={21} />
              <div>
                <strong>{filename}</strong>
                <small>
                  {parsed.rows.length} rows · {parsed.headers.length} columns ·{" "}
                  {parsed.delimiter === "\t" ? "tab" : parsed.delimiter}{" "}
                  delimiter · UTF-8
                </small>
              </div>
            </div>
          )}
          {parsed?.errors.map((e) => (
            <p className="error" role="alert" key={e}>
              {e}
            </p>
          ))}
          {step === 1 ? (
            <>
              <p className="muted">
                Give your columns a home. Rename a field, or uncheck it to leave
                it out.
              </p>
              <div className="mapping">
                {parsed?.headers.map((h, i) => (
                  <div key={i}>
                    <input
                      aria-label={`Import ${h}`}
                      type="checkbox"
                      checked={!!mapping[i]}
                      onChange={(e) =>
                        setMapping(
                          mapping.map((m, j) =>
                            j === i ? (e.target.checked ? h : "") : m,
                          ),
                        )
                      }
                    />
                    <span>{h}</span>
                    <ArrowRight size={16} />
                    <input
                      aria-label={`Field name for ${h}`}
                      value={mapping[i]}
                      disabled={!mapping[i]}
                      onChange={(e) =>
                        setMapping(
                          mapping.map((m, j) => (j === i ? e.target.value : m)),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="form-row">
                <label>
                  Front of card
                  <select
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                  >
                    {names.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Back of card
                  <select
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                  >
                    {names.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              {mappingError && <p className="error">{mappingError}</p>}
              <footer>
                <button onClick={() => setStep(0)}>Back</button>
                <button
                  className="primary"
                  disabled={!!mappingError || !!parsed?.errors.length}
                  onClick={() => setStep(2)}
                >
                  Preview cards <ArrowRight size={16} />
                </button>
              </footer>
            </>
          ) : (
            <>
              {!targetId && (
                <label>
                  Deck name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <div className="import-previews">
                {summary.valid.slice(0, 3).map((f, i) => (
                  <div key={i}>
                    <small>{front}</small>
                    <h3>{f[front]}</h3>
                    <p>{f[back]}</p>
                  </div>
                ))}
              </div>
              <div className="notice">
                <strong>{summary.valid.length} cards ready to import</strong>
                <p>
                  {summary.invalid} missing a front or back ·{" "}
                  {summary.duplicates} possible duplicates · {parsed?.emptyRows}{" "}
                  empty rows ignored
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={skip}
                    onChange={(e) => setSkip(e.target.checked)}
                  />{" "}
                  Skip duplicates (keeps existing review history)
                </label>
              </div>
              <footer>
                <button onClick={() => setStep(1)}>Back</button>
                <button
                  className="primary"
                  disabled={!summary.valid.length || !name.trim()}
                  onClick={finish}
                >
                  Import {summary.valid.length} cards <ArrowRight size={16} />
                </button>
              </footer>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
