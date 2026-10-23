// =====================================================================
// catalog.js — acesso ao catálogo gerado pelo build (generated/catalog.js).
// =====================================================================
import { CATALOG } from "../generated/catalog.js";

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));

export function getModel(id) {
  return id ? BY_ID.get(id) : undefined;
}

export function allModels() {
  return CATALOG;
}

/** [{ name, models: [...] }] em ordem alfabética, preservando a ordem dos modelos. */
export function collections() {
  const map = new Map();
  for (const e of CATALOG) {
    if (!map.has(e.collection)) map.set(e.collection, []);
    map.get(e.collection).push(e);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, models]) => ({ name, models }));
}
