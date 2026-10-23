// =====================================================================
// store.js — persistência por jogador (DynamicProperties).
//
// yast:avatar           -> id do modelo ativo (string estável, NÃO índice:
//                          o mesmo save funciona em packs de 100 ou de 1000)
// yast:prefs:<id>       -> JSON { v: variação, c: [valores de config] }
//                          lembrado por modelo, então voltar a um avatar
//                          restaura a cor e os ajustes que você deixou nele.
// =====================================================================
import { DP_AVATAR, DP_PREFS, CONFIG_SLOTS, CONFIG_UNSET } from "../config.js";
import { getModel } from "./catalog.js";

/** Id salvo, ou undefined se nenhum / modelo não existe neste pack. */
export function savedAvatar(player) {
  const id = player.getDynamicProperty(DP_AVATAR);
  return typeof id === "string" && getModel(id) ? id : undefined;
}

export function saveAvatar(player, id) {
  player.setDynamicProperty(DP_AVATAR, id || undefined);
}

export function loadPrefs(player, model) {
  let raw;
  try {
    raw = JSON.parse(player.getDynamicProperty(DP_PREFS(model.id)) ?? "{}");
  } catch {
    raw = {};
  }
  const v = Number.isInteger(raw.v) && raw.v >= 0 && raw.v < model.variants.length ? raw.v : model.defaultVariant;
  const c = new Array(CONFIG_SLOTS).fill(CONFIG_UNSET);
  for (const cfg of model.configs) {
    const saved = Array.isArray(raw.c) ? raw.c[cfg.slot] : undefined;
    if (typeof saved === "number" && Number.isFinite(saved)) c[cfg.slot] = saved;
  }
  return { v, c };
}

/** Valor que o jogador vê: o salvo ou, se nunca mexeu, o padrão do modelo. */
export function configValue(prefs, cfg) {
  const v = prefs.c[cfg.slot];
  return v === undefined || v === CONFIG_UNSET ? cfg.default ?? 0 : v;
}

export function savePrefs(player, model, prefs) {
  const c = prefs.c.slice(0, model.configs.length ? Math.max(...model.configs.map((x) => x.slot)) + 1 : 0);
  player.setDynamicProperty(DP_PREFS(model.id), JSON.stringify({ v: prefs.v, c }));
}
