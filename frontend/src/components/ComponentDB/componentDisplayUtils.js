export function isToolCategory(component) {
  return String(component?.category || "").trim().toLowerCase() === "tool";
}

// Tool-category components have no pipeline concept - the watcher always
// reports pipeline=false for them since there's nothing to configure, which
// otherwise renders as "Unconfigured" and reads like a component someone
// forgot to set up rather than one the concept doesn't apply to.
export function getPipelineDisplayLabel(component) {
  if (isToolCategory(component)) return "Not Available";
  return component?.pipeline || "N/A";
}
