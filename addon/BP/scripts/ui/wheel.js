// =====================================================================
// wheel.js — roda de ações (JSON UI em RP/ui/server_form.json).
//
// Protocolo herdado da 0.4.x (funciona, não mexer sem mexer no RP junto):
// o ActionFormData SEMPRE envia 15 botões em ordem fixa
//   0..7   fatias externas (topo, sentido horário)
//   8..11  quadrantes internos
//   12..13 página anterior / próxima
//   14     centro ("Voltar"/"Fechar")
// Botão com texto "" = fatia não desenhada e clique ignorado.
// O prefixo "wheel_form:" no título liga a roda; sem ele, o form é o vanilla.
// =====================================================================
import { system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

export const WHEEL_MARKER = "wheel_form:";
export const PER_PAGE = 8;
export const C = { on: "§a§l", off: "§f", dim: "§7", cat: "§f§l" };

const wait = (ticks) => new Promise((res) => system.runTimeout(() => res(undefined), ticks));

/**
 * @param {string} title
 * @param {{label:string, value:any}[]} items   fatias (paginadas de 8 em 8)
 * @param {number} page
 * @param {string} center   rótulo do botão central
 * @returns {{form: ActionFormData, map: any[], page: number, pages: number}}
 */
export function buildWheel(title, items, page = 0, center = "Voltar") {
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const pg = Math.min(Math.max(page, 0), pages - 1);
  const form = new ActionFormData().title(WHEEL_MARKER + title + (pages > 1 ? ` (${pg + 1}/${pages})` : "")).body("");
  const map = [];
  const empty = () => {
    map.push(null);
    form.button("");
  };
  for (let i = 0; i < PER_PAGE; i++) {
    const it = items[pg * PER_PAGE + i];
    if (!it) empty();
    else {
      map.push({ type: "item", value: it.value });
      form.button(it.label);
    }
  }
  for (let i = 0; i < 4; i++) empty();
  if (pg > 0) {
    map.push({ type: "page", dir: -1 });
    form.button(`${C.off}< Pág. ${pg}`);
  } else empty();
  if (pg < pages - 1) {
    map.push({ type: "page", dir: 1 });
    form.button(`${C.off}Pág. ${pg + 2} >`);
  } else empty();
  map.push({ type: "center" });
  form.button(`${C.off}${center}`);
  return { form, map, page: pg, pages };
}

/** Mostra o form; se o jogador estiver ocupado (chat aberto etc.) tenta de novo. */
export async function show(player, form) {
  for (let t = 0; t < 5; t++) {
    const r = await form.show(player);
    if (!(r.canceled && r.cancelationReason === "UserBusy")) return r;
    await wait(10);
  }
  return { canceled: true };
}

/**
 * Loop de uma roda paginada. Retorna o `value` escolhido, "center" ou undefined (fechou).
 * Fatias vazias e troca de página são resolvidas aqui dentro.
 */
export async function pickWheel(player, title, items, center = "Voltar") {
  let page = 0;
  while (player.isValid) {
    const w = buildWheel(title, items, page, center);
    const r = await show(player, w.form);
    if (r.canceled || r.selection === undefined) return undefined;
    const a = w.map[r.selection];
    if (!a) continue;
    if (a.type === "page") {
      page = w.page + a.dir;
      continue;
    }
    if (a.type === "center") return "center";
    return a.value;
  }
  return undefined;
}
