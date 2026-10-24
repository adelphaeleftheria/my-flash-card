/** Decode explicitly: never replace unreadable bytes or guess a legacy encoding. */
export function decodeCSV(bytes: ArrayBuffer, encoding = "auto"): string {
  const head = new Uint8Array(bytes);
  let selected = encoding;
  if (selected === "auto") {
    selected =
      head[0] === 0xff && head[1] === 0xfe
        ? "utf-16le"
        : head[0] === 0xfe && head[1] === 0xff
          ? "utf-16be"
          : "utf-8";
  }
  try {
    return new TextDecoder(selected, { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      "This file uses a different text encoding. Choose Windows-1252 for older Excel exports, or export it as CSV UTF-8 and try again.",
    );
  }
}
