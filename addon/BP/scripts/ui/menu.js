// =====================================================================
// menu.js — fluxo do menu aberto pela Chave do Menu. Tudo na roda (ui/wheel.js).
//
//   Roda principal ─┬─ Avatares  -> coleções -> modelos (roda paginada)
//                   ├─ Cor        -> variações do avatar atual
//                   ├─ Emotes     -> extras do avatar atual
//                   ├─ Parar emote
//                   ├─ Ajustes    -> uma fatia por opção do YSM:
//                   │                 checkbox = toque alterna (mostra o estado por extenso)
//                   │                 rádio    = sub-roda com as opções
//                   │                 slider   = sub-roda com valores prontos
//                   └─ Resetar    -> "opção 0": volta a ser o player normal
//
// Radio button: escolher outro avatar substitui o atual direto.
// =====================================================================
import { C, pickWheel, pickWheelAt } from "./wheel.js";
import { allModels, collections } from "../avatar/catalog.js";
import { configValue } from "../avatar/store.js";
import { CONFIG_UNSET } from "../config.js";
import { sessions, activate, reset, setVariant, setConfig, playEmote, stopEmote } from "../avatar/manager.js";

const FLAT_LIST_LIMIT = 40;      // até isso, pula o nível "coleções"
const ON = "§a";
const OFF = "§7";

function short(text, n = 18) {
  const t = String(text);
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export async function openMenu(player) {
  let page = 0;
  while (player.isValid) {
    const s = sessions.get(player.id);
    const items = [{ label: `${C.cat}Avatares${s ? `\n${ON}${short(s.model.name)}` : ""}`, value: "browse" }];
    if (s) {
      if (s.model.variants.length > 1) items.push({ label: `${C.cat}Cor\n${ON}${short(s.model.variants[s.prefs.v])}`, value: "variant" });
      if (s.model.extras.length) {
        items.push({ label: `${C.cat}Emotes`, value: "emotes" });
        items.push({ label: `${C.off}Parar emote`, value: "stop" });
      }
      if (s.model.configs.length) items.push({ label: `${C.cat}Ajustes`, value: "configs" });
      items.push({ label: `${C.off}Resetar\n${OFF}player normal`, value: "reset" });
    }
    const r = await pickWheelAt(player, "YAST", items, "Fechar", page);
    page = r.page;
    const pick = r.value;
    if (pick === undefined || pick === "center") return;
    if (pick === "browse") {
      if (await browse(player)) return;
    } else if (pick === "variant") await variantWheel(player);
    else if (pick === "emotes") {
      if (await emoteWheel(player)) return;
    } else if (pick === "stop") {
      stopEmote(player);
      return;
    } else if (pick === "configs") await configWheel(player);
    else if (pick === "reset") {
      reset(player);
      player.onScreenDisplay.setActionBar("§e[YAST] §fAvatar removido");
      return;
    }
  }
}

/** true = fechou o menu inteiro (avatar escolhido). */
async function browse(player) {
  const current = () => sessions.get(player.id)?.model.id;
  const modelItem = (m) => ({
    label: `${m.id === current() ? `${ON}§l● ` : C.off}${short(m.name, 16)}${m.variants.length > 1 ? `\n${OFF}${m.variants.length} cores` : ""}`,
    value: m,
  });
  if (allModels().length <= FLAT_LIST_LIMIT) {
    const m = await pickWheel(player, "Avatares", allModels().map(modelItem));
    if (m === undefined) return true;
    if (m === "center") return false;
    return choose(player, m);
  }
  let colPage = 0;
  for (;;) {
    const cols = collections();
    const r = await pickWheelAt(player, "Avatares - Coleções", cols.map((c) => ({
      label: `${c.models.some((m) => m.id === current()) ? `${ON}§l● ` : C.cat}${short(c.name, 16)}\n${OFF}${c.models.length}`,
      value: c,
    })), "Voltar", colPage);
    colPage = r.page;
    if (r.value === undefined) return true;
    if (r.value === "center") return false;
    const m = await pickWheel(player, short(r.value.name, 24), r.value.models.map(modelItem));
    if (m === undefined) return true;
    if (m === "center") continue;
    return choose(player, m);
  }
}

async function choose(player, model) {
  if (!activate(player, model.id)) {
    player.sendMessage(`§c[YAST] Não foi possível ativar ${model.name}.`);
    return true;
  }
  player.onScreenDisplay.setActionBar(`§e[YAST] §f${model.name}`);
  if (model.variants.length > 1) await variantWheel(player);
  return true;
}

async function variantWheel(player) {
  const s = sessions.get(player.id);
  if (!s) return;
  const items = s.model.variants.map((name, i) => ({ label: `${i === s.prefs.v ? `${ON}§l` : C.off}${short(name, 16)}`, value: i }));
  const v = await pickWheel(player, `${short(s.model.name, 22)} - Cor`, items);
  if (typeof v === "number") setVariant(player, v);
}

async function emoteWheel(player) {
  const s = sessions.get(player.id);
  if (!s) return false;
  const items = s.model.extras.map((name, i) => ({ label: `${C.cat}${short(name, 16)}`, value: i }));
  const v = await pickWheel(player, `${short(s.model.name, 22)} - Emotes`, items);
  if (typeof v !== "number") return false;
  playEmote(player, v);
  return true;
}

// ----------------------------------------------------------------------------- ajustes
/** Texto do estado atual de uma opção (sem "lado do toggle": o estado vem escrito). */
function stateText(cfg, val) {
  if (cfg.kind === "checkbox") {
    const on = val >= 1;
    if (cfg.states?.length === 2) return `${on ? ON : OFF}${short(on ? cfg.states[0] : cfg.states[1], 14)}`;
    return on ? `${ON}Ligado` : `${OFF}Desligado`;
  }
  if (cfg.kind === "radio") return `${ON}${short(cfg.labels[Math.round(val)] ?? cfg.labels[0], 14)}`;
  return `${ON}${fmt(val)}`;
}

function fmt(x) {
  return Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

async function configWheel(player) {
  let page = 0;
  while (player.isValid) {
    const s = sessions.get(player.id);
    if (!s) return;
    const items = s.model.configs.map((cfg) => ({
      label: `${C.cat}${short(cfg.title, 16)}\n${stateText(cfg, configValue(s.prefs, cfg))}`,
      value: cfg,
    }));
    items.push({ label: `${C.off}Restaurar\n${OFF}padrões`, value: "defaults" });
    const r = await pickWheelAt(player, `${short(s.model.name, 22)} - Ajustes`, items, "Voltar", page);
    page = r.page;
    if (r.value === undefined || r.value === "center") return;
    if (r.value === "defaults") {
      for (const cfg of s.model.configs) setConfig(player, cfg.slot, CONFIG_UNSET);
      continue;
    }
    const cfg = r.value;
    const cur = configValue(s.prefs, cfg);
    if (cfg.kind === "checkbox") {
      setConfig(player, cfg.slot, cur >= 1 ? 0 : 1);       // um toque alterna; a roda reabre já atualizada
    } else if (cfg.kind === "radio") {
      const opts = cfg.labels.map((label, i) => ({ label: `${i === Math.round(cur) ? `${ON}§l` : C.off}${short(label, 16)}`, value: i }));
      const v = await pickWheel(player, short(cfg.title, 24), opts);
      if (typeof v === "number") setConfig(player, cfg.slot, v);
    } else {
      const v = await pickWheel(player, `${short(cfg.title, 18)}: ${fmt(cur)}`, rangeOptions(cfg, cur));
      if (typeof v === "number") setConfig(player, cfg.slot, v);
    }
  }
}

/** Slider vira valores prontos: mínimo, ¼, ½, ¾, máximo, padrão e ± um passo. */
function rangeOptions(cfg, cur) {
  const step = cfg.step > 0 ? cfg.step : (cfg.max - cfg.min) / 20 || 0.1;
  const snap = (x) => Math.min(cfg.max, Math.max(cfg.min, Math.round((x - cfg.min) / step) * step + cfg.min));
  const vals = [
    ["- passo", snap(cur - step)],
    ["+ passo", snap(cur + step)],
    ["Mínimo", cfg.min],
    ["25%", snap(cfg.min + (cfg.max - cfg.min) * 0.25)],
    ["50%", snap(cfg.min + (cfg.max - cfg.min) * 0.5)],
    ["75%", snap(cfg.min + (cfg.max - cfg.min) * 0.75)],
    ["Máximo", cfg.max],
    ["Padrão", cfg.default ?? cfg.min],
  ];
  return vals.map(([name, v]) => ({
    label: `${Math.abs(v - cur) < 1e-9 ? `${ON}§l` : C.off}${name}\n${OFF}${fmt(Number(v.toFixed(4)))}`,
    value: Number(v.toFixed(4)),
  }));
}
