import { parseCSV } from "./csv";
self.onmessage = (event: MessageEvent<string>) =>
  self.postMessage(parseCSV(event.data));
