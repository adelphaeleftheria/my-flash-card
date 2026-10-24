import Papa from "papaparse";
import type { Card } from "../lib/model";
export type ParsedCSV = {
  headers: string[];
  rows: string[][];
  delimiter: string;
  errors: string[];
  emptyRows: number;
};
export function parseCSV(text: string): ParsedCSV {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: false,
  });
  const nonempty = parsed.data.filter((row) => row.some((cell) => cell.trim()));
  const headers = (nonempty.shift() || []).map((h) => h.trim());
  const errors: string[] = [];
  if (headers.length < 2)
    errors.push("Use at least two columns: a prompt and an answer.");
  if (headers.some((h) => !h)) errors.push("Every column needs a header.");
  if (new Set(headers.map((h) => h.toLowerCase())).size !== headers.length)
    errors.push("Column headers must be unique.");
  if (!nonempty.length) errors.push("This file has no vocabulary rows.");
  if (
    parsed.errors.some(
      (e) => e.code === "MissingQuotes" || e.code === "InvalidQuotes",
    )
  )
    errors.push("A quoted field is incomplete. Check the CSV quotation marks.");
  const bad = nonempty.filter((r) => r.length !== headers.length).length;
  if (bad)
    errors.push(
      `${bad} rows have a different number of columns. Check the delimiter and quotation marks.`,
    );
  return {
    headers,
    rows: nonempty,
    delimiter: parsed.meta.delimiter,
    errors,
    emptyRows: parsed.data.length - nonempty.length - 1,
  };
}
export function duplicateKey(
  fields: Record<string, string>,
  front: string,
  back: string,
) {
  return [fields[front], fields[back]]
    .map((v) => (v || "").trim().toLocaleLowerCase().normalize("NFC"))
    .join("\u0000");
}
export function exportCSV(cards: Card[], headers?: string[]) {
  const fields = headers || [
    ...new Set(cards.flatMap((c) => Object.keys(c.fields))),
  ];
  return Papa.unparse({
    fields,
    data: cards.map((c) =>
      fields.map((h) => (h === "Tags" ? c.tags.join("; ") : c.fields[h] || "")),
    ),
  });
}
export function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
