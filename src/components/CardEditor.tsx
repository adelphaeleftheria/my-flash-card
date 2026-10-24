import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "./ui";
import { makeCard, type Card, type Deck } from "../lib/model";
export function CardEditor({
  deck,
  card,
  onSave,
  onClose,
}: {
  deck: Deck;
  card?: Card;
  onSave: (card: Card) => void;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>(
      card
        ? { ...card.fields, Tags: card.tags.join("; ") }
        : {
            [deck.front]: "",
            [deck.back]: "",
            "Example Sentence": "",
            "Example Translation": "",
          },
    ),
    [difficulty, setDifficulty] = useState<Card["difficulty"]>(
      card?.difficulty || "normal",
    ),
    [newField, setNewField] = useState(""),
    [error, setError] = useState("");
  return (
    <Modal
      title={card ? "A little refinement" : "Add a new card"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!fields[deck.front]?.trim() || !fields[deck.back]?.trim()) {
            setError("Add both a prompt and an answer.");
            return;
          }
          onSave({
            ...(card || makeCard(deck.id, fields)),
            fields,
            difficulty,
            tags: (fields.Tags || "")
              .split(/[,;|]/)
              .map((x) => x.trim())
              .filter(Boolean),
            updatedAt: Date.now(),
          });
          onClose();
        }}
      >
        <div className="editor-fields">
          {Object.entries(fields).map(([key, value]) => (
            <label key={key}>
              {key}
              {key !== deck.front && key !== deck.back && (
                <button
                  type="button"
                  className="remove-field"
                  aria-label={`Remove ${key}`}
                  onClick={() =>
                    setFields(
                      Object.fromEntries(
                        Object.entries(fields).filter(([k]) => k !== key),
                      ),
                    )
                  }
                >
                  <Trash2 size={13} />
                </button>
              )}
              <textarea
                aria-label={key}
                rows={key === deck.front || key === deck.back ? 1 : 2}
                required={key === deck.front || key === deck.back}
                value={value}
                onChange={(e) =>
                  setFields({ ...fields, [key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
        <label>
          Difficulty
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as Card["difficulty"])
            }
          >
            <option value="normal">Normal</option>
            <option value="difficult">Difficult</option>
            <option value="easy">Easy</option>
          </select>
        </label>
        <div className="inline">
          <input
            list="field-options"
            placeholder="New field, e.g. Memory trick"
            aria-label="New field name"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
          />
          <button
            type="button"
            disabled={!newField.trim() || newField.trim() in fields}
            onClick={() => {
              setFields({ ...fields, [newField.trim()]: "" });
              setNewField("");
            }}
          >
            <Plus size={16} /> Add field
          </button>
        </div>
        <datalist id="field-options">
          {[
            "Gender",
            "Plural",
            "IPA",
            "Definition",
            "Synonyms",
            "Antonyms",
            "Notes",
            "Tags",
            "Image",
          ].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </datalist>
        {error && <p className="error">{error}</p>}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary">Save card</button>
        </footer>
      </form>
    </Modal>
  );
}
