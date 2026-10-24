import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
const assets = (await files("dist"))
  .filter((p) => !p.endsWith("/sw.js"))
  .map((p) => `./${p.slice(5)}`);
const hash = createHash("sha256");
for (const asset of assets) {
  hash.update(asset);
  hash.update(await readFile(`dist/${asset.slice(2)}`));
}
const version = hash.digest("hex").slice(0, 12);
let worker = await readFile("public/sw.js", "utf8");
worker = worker
  .replace("folio-shell-v1", `folio-shell-${version}`)
  .replace(
    /cache\.addAll\(\[[\s\S]*?\]\)/,
    `cache.addAll(${JSON.stringify(["./", ...assets])})`,
  );
await writeFile("dist/sw.js", worker);
