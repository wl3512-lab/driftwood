// Level tools (almanac, magnifier, planting log …). Each tool's view module
// calls defineTool(id, create) once when it loads. When a level lists that tool
// in `level.tools`, the level view calls create(ctx) and gets back
//   { open(), update?(state), destroy?() }
// ctx = { level, tool, scene, button, dispatch, getState, t, announce }.
// The level view owns the toolbar button, its key cap and the keyboard
// shortcut; the tool only has to open (or toggle) its panel. A tool with no
// view registered gets no button, so there is never a dead control on screen.
const VIEWS = new Map();

export function defineTool(id, create) {
  VIEWS.set(id, create);
}

export function toolView(id) {
  return VIEWS.get(id) || null;
}
