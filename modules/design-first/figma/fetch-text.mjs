#!/usr/bin/env node
/**
 * Prints the characters of one text layer of a Figma file, read over the REST
 * API — the bridge dump.js uses to bring a spec out of Figma without a person
 * or a model copying it.
 *
 *   FIGMA_TOKEN=… node fetch-text.mjs <file-key> <node-id> > spec.json
 *
 * The token is the person's own, from the environment; it is never written
 * anywhere. Exit 2 when it cannot read the layer.
 */
const [file, node] = process.argv.slice(2);
const token = process.env.FIGMA_TOKEN;
if (!file || !node || !token) {
  console.error("Usage: FIGMA_TOKEN=<your token> node fetch-text.mjs <file-key> <node-id>");
  process.exit(2);
}
const res = await fetch(`https://api.figma.com/v1/files/${file}/nodes?ids=${encodeURIComponent(node)}`, {
  headers: { "X-Figma-Token": token },
});
if (!res.ok) {
  console.error(`Figma answered ${res.status} for node ${node}.`);
  process.exit(2);
}
const doc = (await res.json()).nodes?.[node]?.document;
if (!doc || doc.type !== "TEXT") {
  console.error(`Node ${node} is not a text layer in that file.`);
  process.exit(2);
}
process.stdout.write(doc.characters.endsWith("\n") ? doc.characters : doc.characters + "\n");
