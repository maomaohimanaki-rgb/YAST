// =====================================================================
// menu.js — fluxo do menu aberto pela Chave do Menu.
//
//   Roda principal ─┬─ Avatares  -> coleções -> modelos (lista vanilla, rolável)
//                   ├─ Cor        -> variações do avatar atual (roda)
//                   ├─ Emotes     -> extras do avatar atual (roda paginada)
//                   ├─ Parar emote
//                   ├─ Ajustes    -> ModalFormData (checkbox / radio / slider)
//                   └─ Resetar    -> "opção 0": volta a ser o player normal
//
// Radio button: escolher outro avatar substitui o atual direto.
// =====================================================================
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { C, pickWheel, show } from "./wheel.js";
import { allModels, collections } from "../avatar/catalog.js";
import { sessions, activate, reset, setVariant, setConfig, playEmote, stopEmote } from "../avatar/manager.js";

const LIST_PAGE = 40;            // botões por página na lista vanilla
const FLAT_LIST_LIMIT = 60;      // até isso, pula o nível "coleções"

export async function openMenu(player) {
  while (player.isValid) {
    const s = sessions.get(player.id);
    const items = [{ label: `${C.cat}Avatares${s ? `\n§a${short(s.model.name)}` : ""}`, value: "browse" }];
    if (s) {
      if (s.model.variants.length > 1) items.push({ label: `${C.cat}Cor\n§a${short(s.model.variants[s.prefs.v])}`, value: "variant" });
      if (s.model.extras.length) {
        items.push({ label: `${C.cat}Emotes`, value: "emotes" });
        items.push({ label: `${C.off}Parar emote`, value: "stop" });
      }
      if (s.model.configs.length) items.push({ label: `${C.cat}Ajustes`, value: "configs" });
      items.push({ label: `${C.off}Resetar\n§7player normal`, value: "reset" });
    }
    const pick = await pickWheel(player, "YAST", items, "Fechar");
    if (pick === undefined || pick === "center") return;
    if (pick === "browse") {
      if (await browse(player)) return;
    } else if (pick === "variant") await variantWheel(player);
    else if (pick === "emotes") {
      if (await emoteWheel(player)) return;
    } else if (pick === "stop") {
      stopEmote(player);
      return;
    } else if (pick === "configs") await configForm(player);
    else if (pick === "reset") {
      reset(player);
      player.onScreenDisplay.setActionBar("§e[YAST] §fAvatar removido");
      return;
    }
  }
}

function short(text, n = 18) {
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
}

/** Lista vanilla paginada. Retorna o value escolhido, "back" ou undefined. */
async function pickList(player, title, body, entries) {
  let page = 0;
  const pages = Math.max(1, Math.ceil(entries.length / LIST_PAGE));
  while (player.isValid) {
    const form = new ActionFormData().title(pages > 1 ? `${title} (${page + 1}/${pages})` : title).body(body);
    const map = [];
    form.button("§l< Voltar");
    map.push("back");
    if (page > 0) {
      form.button("§7<< Página anterior");
      map.push("prev");
    }
    for (const e of entries.slice(page * LIST_PAGE, (page + 1) * LIST_PAGE)) {
      form.button(e.label);
      map.push({ v: e.value });
    }
    if (page < pages - 1) {
      form.button("§7Próxima página >>");
      map.push("next");
    }
    const r = await show(player, form);
    if (r.canceled || r.selection === undefined) return undefined;
    const a = map[r.selection];
    if (a === "prev") page--;
    else if (a === "next") page++;
    else if (a === "back") return "back";
    else if (typeof a === "object") return a.v;
  }
  return undefined;
}

/** true = fechou o menu inteiro (avatar escolhido). */
async function browse(player) {
  const current = sessions.get(player.id)?.model.id;
  const label = (m) => `${m.id === current ? "§a● " : "§f"}${short(m.name, 30)}${m.variants.length > 1 ? ` §7(${m.variants.length} cores)` : ""}`;
  let models;
  if (allModels().length <= FLAT_LIST_LIMIT) {
    models = allModels();
  } else {
    for (;;) {
      const cols = collections();
      const col = await pickList(player, "Avatares", "§7Escolha uma coleção", cols.map((c) => ({
        label: `${c.models.some((m) => m.id === current) ? "§a● " : "§f"}${c.name} §7(${c.models.length})`,
        value: c,
      })));
      if (col === undefined) return true;
      if (col === "back") return false;
      const m = await pickList(player, col.name, "", col.models.map((x) => ({ label: label(x), value: x })));
      if (m === undefined) return true;
      if (m === "back") continue;
      return choose(player, m);
    }
  }
  const m = await pickList(player, "Avatares", "", models.map((x) => ({ label: label(x), value: x })));
  if (m === undefined) return true;
  if (m === "back") return false;
  return choose(player, m);
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
  const items = s.model.variants.map((name, i) => ({ label: `${i === s.prefs.v ? C.on : C.off}${short(name, 16)}`, value: i }));
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

async function configForm(player) {
  const s = sessions.get(player.id);
  if (!s) return;
  const cfgs = s.model.configs;
  const form = new ModalFormData().title(`${short(s.model.name, 22)} - Ajustes`);
  for (const c of cfgs) {
    const cur = s.prefs.c[c.slot] ?? 0;
    if (c.kind === "checkbox") form.toggle(c.title, { defaultValue: cur >= 1 });
    else if (c.kind === "radio") form.dropdown(c.title, c.labels, { defaultValueIndex: Math.max(0, Math.min(c.labels.length - 1, Math.round(cur))) });
    else form.slider(c.title, c.min, c.max, { valueStep: c.step > 0 ? c.step : 0.1, defaultValue: Math.max(c.min, Math.min(c.max, cur)) });
  }
  form.submitButton("Aplicar");
  const r = await show(player, form);
  if (r.canceled || !r.formValues) return;
  cfgs.forEach((c, i) => {
    const raw = r.formValues[i];
    const val = typeof raw === "boolean" ? (raw ? 1 : 0) : Number(raw);
    if (Number.isFinite(val) && val !== s.prefs.c[c.slot]) setConfig(player, c.slot, val);
  });
}
