// Level tools (almanac, magnifier …) and almanac pages (planting log …).
//
// A tool is something you use on the garden: it gets its own toolbar button.
// Its view module calls defineTool(id, create) once when it loads. When a
// level lists that tool in `level.tools`, the level view calls create(ctx) and
// gets back
//   { open(page?), update?(state), destroy?() }
// ctx = { level, tool, scene, button, dispatch, getState, t, announce, cards, pages }.
// The level view owns the toolbar button, its key cap and the keyboard
// shortcut; the tool only has to open (or toggle) its panel. A tool with no
// view registered gets no button, so there is never a dead control on screen.
//
// A page is a document you read: it has no button of its own but lives as an
// extra screen page inside the almanac. Its module calls definePage(id, create);
// create({ level, tool, dispatch, getState, t }) returns
//   { title, body, show(state), update?(state) }
// show() runs whenever the page comes on screen (the log's "check"). A page's
// key (the log's "L") opens the almanac straight on that page.
const VIEWS = new Map();
const PAGES = new Map();

export function defineTool(id, create) {
  VIEWS.set(id, create);
}

export function toolView(id) {
  return VIEWS.get(id) || null;
}

export function definePage(id, create) {
  PAGES.set(id, create);
}

export function pageView(id) {
  return PAGES.get(id) || null;
}
