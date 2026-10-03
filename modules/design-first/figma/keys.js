// Run with use_figma in a library file after it has been published (a person's
// click in the Assets panel): returns the key of every master, for
// ~/.config/agents-rulebook/figma-library.json. Keys are per file and per
// person, which is why they live in that machine-local file and never here.
const NAMES = {
  banner: 'Banner', briefRow: 'Brief row', brief: 'Brief', rowLabel: 'Row label', caption: 'Caption',
  note: 'Note', thumbnail: 'Thumbnail', coverIconSlot: 'Cover slot / Icon', coverPictureSlot: 'Cover slot / Picture',
  launchStep: 'Launch step', launchChecklist: 'Launch checklist',
};
const page = figma.root.children.find((p) => p.name === 'Components');
await figma.setCurrentPageAsync(page);
const components = {};
const missing = [];
for (const [key, name] of Object.entries(NAMES)) {
  const n = page.findOne((x) => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === name && x.parent.type === 'SECTION');
  if (n) components[key] = n.key; else missing.push(name);
}
return { components, missing };
