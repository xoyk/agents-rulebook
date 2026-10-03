// Run with use_figma after fetch-text.mjs has saved the spec: removes the
// transfer layer dump.js left on the page.
const page = figma.root.children.find((p) => p.name === 'Components');
await figma.setCurrentPageAsync(page);
const gone = page.findAll((x) => x.name === 'rulebook-spec-transfer');
for (const n of gone) n.remove();
return { removed: gone.length };
