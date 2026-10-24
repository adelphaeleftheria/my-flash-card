import { openDB } from "idb";
import { emptyData, type Data } from "./model";
const database = openDB("folio", 1, {
  upgrade(db) {
    db.createObjectStore("state");
  },
});
export async function loadData(): Promise<Data> {
  return (await (await database).get("state", "data")) || emptyData();
}
export async function saveData(data: Data) {
  await (await database).put("state", data, "data");
}
