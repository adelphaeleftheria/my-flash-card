import { decodeCSV } from "../src/features/csv-file";
import { describe, it, expect } from "vitest";
import { parseCSV, exportCSV, duplicateKey } from "../src/features/csv";
import { schedule } from "../src/features/scheduler";
import { activity, stats, dayKey } from "../src/features/statistics";
import { validateBackup, mergeBackup } from "../src/features/backup";
import {
  emptyData,
  freshSchedule,
  makeCard,
  makeDeck,
  type Review,
} from "../src/lib/model";
import { addSample } from "../src/lib/sample";
describe("CSV", () => {
  it("imports Unicode and quoted commas and newlines", () => {
    const p = parseCSV(
      'German,English,Example\nHäuser,houses,"Hallo, Welt!\nGuten Tag."\n水,water,"水です"',
    );
    expect(p.errors).toEqual([]);
    expect(p.rows).toHaveLength(2);
    expect(p.rows[0][2]).toContain("Hallo, Welt!\n");
    expect(p.rows[1][0]).toBe("水");
  });
  it("detects semicolons and BOM", () => {
    const p = parseCSV("\uFEFFGerman;English\nHaus;House");
    expect(p.delimiter).toBe(";");
    expect(p.headers).toEqual(["German", "English"]);
  });
  it("detects missing, duplicate, and empty headers", () => {
    expect(parseCSV("German,German\na,b").errors.join()).toContain("unique");
    expect(parseCSV(",English\na,b").errors.join()).toContain("header");
    expect(parseCSV("German\na").errors.length).toBeGreaterThan(0);
  });
  it("identifies malformed CSV and uneven rows", () => {
    expect(parseCSV('A,B\n"broken,b').errors.length).toBeGreaterThan(0);
    expect(parseCSV("A,B\na,b,c").errors.join()).toContain("different number");
  });
  it("keeps missing cells and counts empty rows", () => {
    const p = parseCSV("German,English\nHaus,\n\nBuch,book\n");
    expect(p.rows[0][1]).toBe("");
    expect(p.emptyRows).toBeGreaterThan(0);
  });
  it("normalizes duplicate identity without losing accents", () => {
    expect(duplicateKey({ A: " Haus ", B: "HOUSE" }, "A", "B")).toBe(
      duplicateKey({ A: "haus", B: "house" }, "A", "B"),
    );
    expect(duplicateKey({ A: "schön", B: "nice" }, "A", "B")).not.toBe(
      duplicateKey({ A: "schon", B: "nice" }, "A", "B"),
    );
  });
  it("exports and reimports all custom fields", () => {
    const c = makeCard("deck", {
      German: "Häuser",
      English: "houses",
      "My mnemonic": "a house, a home\nremember it",
      Tags: "A1; Home",
    });
    const p = parseCSV(exportCSV([c]));
    expect(p.errors).toEqual([]);
    expect(
      Object.fromEntries(p.headers.map((h, i) => [h, p.rows[0][i]])),
    ).toEqual(c.fields);
  });
});
describe("scheduler", () => {
  const now = 1000000;
  it("starts a new card with a one-day Good interval", () => {
    const s = schedule(freshSchedule(), "good", now);
    expect(s.interval).toBe(1);
    expect(s.due).toBe(now + 86400000);
    expect(s.state).toBe("review");
    expect(s.correctCount).toBe(1);
  });
  it("Again reintroduces the card after a minute and tracks lapses", () => {
    const s = schedule(freshSchedule(), "again", now);
    expect(s.state).toBe("learning");
    expect(s.due).toBe(now + 60000);
    expect(s.incorrectCount).toBe(1);
    expect(s.lapseCount).toBe(1);
  });
  it("Hard uses a ten-minute step; Easy uses four days", () => {
    expect(schedule(freshSchedule(), "hard", now).due).toBe(now + 600000);
    expect(schedule(freshSchedule(), "easy", now).interval).toBe(4);
  });
  it("progresses review intervals and bounds ease", () => {
    let s = schedule(freshSchedule(), "good", now);
    s = schedule(s, "good", now);
    expect(s.interval).toBe(3);
    expect(schedule(s, "hard", now).interval).toBeGreaterThan(s.interval);
    expect(schedule(s, "easy", now).interval).toBeGreaterThan(
      schedule(s, "good", now).interval,
    );
    for (let i = 0; i < 20; i++) s = schedule(s, "again", now);
    expect(s.ease).toBe(1.3);
    expect(s.state).toBe("relearning");
  });
});
describe("statistics", () => {
  const now = +new Date(2026, 9, 24, 12);
  const rev = (days: number, rating: Review["rating"] = "good"): Review => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return {
      id: `${days}-${rating}`,
      cardId: "c",
      deckId: "d",
      timestamp: +d,
      rating,
      previousInterval: 0,
      newInterval: 1,
      responseTimeMs: 5000,
    };
  };
  it("derives accuracy, unique studied cards, streak and time", () => {
    const s = stats([], [rev(0), rev(0, "again"), rev(1), rev(2), rev(5)], now);
    expect(s.accuracy).toBe(80);
    expect(s.streak).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.time).toBe(25000);
    expect(s.today).toBe(2);
    expect(s.studiedToday).toBe(1);
  });
  it("allows yesterday to anchor the streak and detects gaps", () => {
    expect(stats([], [rev(1), rev(2)], now).streak).toBe(2);
    expect(stats([], [rev(2)], now).streak).toBe(0);
  });
  it("groups reviews by local day", () => {
    const a = activity([rev(0), rev(1)], 7, now);
    expect(a[6].key).toBe(dayKey(now));
    expect(a[6].count).toBe(1);
    expect(a[5].newLearned).toBe(1);
  });
  it("derives card progress", () => {
    const c = makeCard("d", { A: "a", B: "b" });
    expect(stats([c], [], now).new).toBe(1);
    c.scheduling = schedule(c.scheduling, "good", now);
    expect(stats([c], [], now).learned).toBe(1);
    expect(stats([c], [], now + 86400001).due).toBe(1);
  });
});
describe("backups", () => {
  it("round trips complete sample vocabulary and progress", () => {
    const d = addSample(emptyData());
    d.cards[0].scheduling = schedule(d.cards[0].scheduling, "easy");
    expect(validateBackup(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(d.cards).toHaveLength(18);
  });
  it("rejects invalid and orphaned data", () => {
    expect(() => validateBackup({})).toThrow();
    const d = addSample(emptyData());
    d.cards[0].deckId = "missing";
    expect(() => validateBackup(d)).toThrow();
  });
  it("merges by id, preserving existing review history and settings", () => {
    const a = addSample(emptyData()),
      b = addSample(emptyData());
    a.settings.goal = 50;
    const merged = mergeBackup(a, b);
    expect(merged.cards.length).toBe(36);
    expect(merged.settings.goal).toBe(50);
    expect(mergeBackup(a, a).cards.length).toBe(18);
  });
  it("rejects invalid schedule values", () => {
    const d = addSample(emptyData());
    d.cards[0].scheduling.due = NaN;
    expect(() => validateBackup(d)).toThrow();
  });
});

describe("CSV file encodings", () => {
  it("reads UTF-8 without losing umlauts", () => {
    expect(
      decodeCSV(
        new TextEncoder().encode("German,English\nHäuser,houses").buffer,
      ),
    ).toContain("Häuser");
  });
  it("detects Excel UTF-16 BOM", () => {
    expect(
      decodeCSV(
        new Uint8Array([255, 254, 72, 0, 228, 0, 117, 0, 115, 0]).buffer,
      ),
    ).toBe("Häus");
  });
  it("explains legacy encoding and permits explicit Windows-1252", () => {
    const bytes = new Uint8Array([72, 228, 117, 115]).buffer;
    expect(() => decodeCSV(bytes)).toThrow("Windows-1252");
    expect(decodeCSV(bytes, "windows-1252")).toBe("Häus");
  });
});
