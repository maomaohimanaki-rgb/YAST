// =====================================================================
// menu.js — roda de ações em dois níveis (JSON UI em RP/ui/server_form.json)
//
//   RODA PRINCIPAL : fatias externas = categorias (perfil.menu), círculo
//                    interno = 4 atalhos ON/OFF (perfil.configs).
//   SUBMENU        : fatias externas = itens da categoria (8 por página),
//                    círculo central = botão "Voltar".
//
// O ActionFormData SEMPRE envia 15 botões em ordem fixa:
//   0..7   fatias externas (topo, sentido horário)
//   8..11  quadrantes internos
//   12..13 página anterior (esquerda) / próxima (direita), botões laterais
//   14     "Voltar" (centro)
// Botão com texto VAZIO ("") = fatia não usada: a UI não desenha o setor
// nem o texto, e o clique é ignorado ("pizza incompleta").
// O marcador "wheel_form:" no título ativa a roda no Resource Pack.
// =====================================================================
import { system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { DEBUG, FECHAR_AO_ALTERNAR } from "./chestplate_registry.js";
import { obterPeitoral, obterPerfil, chaveItem, chaveCfg, lerEstado, gravarEstado } from "./state.js";

const MARCADOR = "wheel_form:"; // igual ao de RP/ui/server_form.json
const POR_PAGINA = 8;
const esperar = (ticks) => new Promise((res) => system.runTimeout(res, ticks));

/** Um item pode declarar seu comportamento; caso contrário, herda o submenu. */
const modoItem = (sub, item) => item?.modo ?? sub?.modo ?? "toggle";

const TXT_ON = "§a§l";   // verde vivo
const TXT_OFF = "§f";    // branco
const TXT_NADA = "§7";   // cinza
const TXT_CAT = "§f§l";  // nome de categoria

/** Categorias válidas da roda principal (máx. 8). */
const categorias = (perfil) => (perfil.menu ?? []).filter((k) => perfil.submenus?.[k]).slice(0, POR_PAGINA);

/** Quantos itens do submenu estão ligados. */
function contarOn(player, typeId, chave, sub) {
  let n = 0;
  sub.itens.forEach((it, i) => {
    if (modoItem(sub, it) !== "disparo" && lerEstado(player, chaveItem(typeId, chave, it, i))) n++;
  });
  return n;
}

/**
 * Monta o formulário (sempre 15 botões).
 * @param {string|null} tela  null = roda principal; senão a chave do submenu
 * @returns {{form, mapa, pagina, totalPaginas}}  mapa[i] = ação do botão i ou null
 */
export function construirMenu(player, typeId, perfil, tela = null, pagina = 0) {
  const mapa = [];
  const form = new ActionFormData().body("");
  const vazio = () => { mapa.push(null); form.button(""); };

  if (tela === null) {
    // ---------- RODA PRINCIPAL ----------
    form.title(MARCADOR + perfil.name);
    const cats = categorias(perfil);
    for (let i = 0; i < 8; i++) {
      const chave = cats[i];
      if (!chave) { vazio(); continue; }
      const sub = perfil.submenus[chave];
      let info = "";
      const temToggle = sub.itens.some((it) => modoItem(sub, it) !== "disparo");
      if (temToggle && sub.exclusivo) {
        const ativo = sub.itens.findIndex((it, j) => modoItem(sub, it) !== "disparo" && lerEstado(player, chaveItem(typeId, chave, it, j)));
        if (ativo >= 0) info = `\n§a${sub.itens[ativo].label}`;
      } else if (temToggle) {
        const n = contarOn(player, typeId, chave, sub);
        if (n > 0) info = `\n§a${n} ON`;
      }
      mapa.push({ tipo: "abrir", sub: chave });
      form.button(`${TXT_CAT}${sub.label}${info}`);
    }
    // 0.4.25: os quatro quadrantes internos não têm configurações atribuídas
    // em nenhum perfil ativo; escondê-los deixa só as categorias da roda.
    for (let i = 0; i < 4; i++) vazio();
    vazio(); vazio(); vazio(); // 12, 13, 14
    return { form, mapa, pagina: 0, totalPaginas: 1 };
  }

  // ---------- SUBMENU ----------
  const sub = perfil.submenus[tela];
  const totalPaginas = Math.max(1, Math.ceil(sub.itens.length / POR_PAGINA));
  const pag = Math.min(Math.max(pagina, 0), totalPaginas - 1);
  const base = pag * POR_PAGINA;
  form.title(MARCADOR + `${perfil.name} - ${sub.label}` + (totalPaginas > 1 ? ` (${pag + 1}/${totalPaginas})` : ""));

  for (let i = 0; i < 8; i++) {
    const idx = base + i;           // índice GLOBAL do item (estado não depende da página)
    const item = sub.itens[idx];
    if (!item) { vazio(); continue; }
    if (modoItem(sub, item) === "disparo") {
      mapa.push({ tipo: "disparo", sub: tela, indice: idx });
      form.button(`${TXT_CAT}${item.label}`);
    } else {
      const on = lerEstado(player, chaveItem(typeId, tela, item, idx));
      mapa.push({ tipo: "item", sub: tela, indice: idx });
      form.button(`${on ? TXT_ON : TXT_OFF}${item.label}\n${on ? "ON" : "OFF"}`);
    }
  }
  for (let i = 0; i < 4; i++) vazio(); // internos escondidos no submenu
  if (pag > 0) { mapa.push({ tipo: "pagina", direcao: -1 }); form.button(`${TXT_OFF}< Pág. ${pag}`); } else vazio();
  if (pag < totalPaginas - 1) { mapa.push({ tipo: "pagina", direcao: 1 }); form.button(`${TXT_OFF}Pág. ${pag + 2} >`); } else vazio();
  mapa.push({ tipo: "voltar" });
  form.button(`${TXT_OFF}Voltar`);
  return { form, mapa, pagina: pag, totalPaginas };
}

/** Executa um comando (de outro add-on, por exemplo) no jogador. */
function executar(player, comando) {
  if (!comando) return;
  try {
    player.runCommand(comando);
  } catch (e) {
    console.warn(`[menu] comando falhou "${comando}": ${e}`);
  }
}

/** FEEDBACK de debug (só com DEBUG = true em chestplate_registry.js). */
function feedback(player, nome, numero, ligado) {
  if (!DEBUG) return;
  const texto = `§e[Menu] §f${nome} §7-> ${ligado ? "§aON" : "§cOFF"}`;
  player.sendMessage(texto);
  player.onScreenDisplay.setActionBar(texto);
  try {
    player.playSound(ligado ? "random.orb" : "random.click", { pitch: 0.6 + (numero % 12) * 0.1, volume: 1 });
    if (ligado) {
      const l = player.location;
      player.dimension.spawnParticle("minecraft:villager_happy", { x: l.x, y: l.y + 2.2, z: l.z });
    }
  } catch (e) {
    console.warn(`[menu] feedback sem som/particula: ${e}`);
  }
  console.warn(`[menu] ${nome} -> ${ligado ? "ON" : "OFF"}`);
}

/** Dispara uma ação uma vez: sem estado persistido e sem comando de desligamento. */
function dispararItem(player, perfil, chave, indice) {
  const sub = perfil.submenus[chave];
  const item = sub.itens[indice];
  executar(player, item.command);
  if (DEBUG) {
    const texto = `§e[Menu] §f${sub.label}: ${item.label} §7-> disparo`;
    player.sendMessage(texto);
    player.onScreenDisplay.setActionBar(texto);
    console.warn(`[menu] ${sub.label}: ${item.label} -> disparo`);
  }
}

/** Liga/desliga um item de submenu respeitando "exclusivo" e os comandos. */
export function alternarItem(player, typeId, perfil, chave, indice) {
  const sub = perfil.submenus[chave];
  const item = sub.itens[indice];
  const novo = !lerEstado(player, chaveItem(typeId, chave, item, indice));
  if (sub.exclusivo) {
    // ligar um desliga os outros (todas as páginas) e dispara o commandOff deles
    sub.itens.forEach((outro, j) => {
      if (j !== indice && lerEstado(player, chaveItem(typeId, chave, outro, j))) {
        gravarEstado(player, chaveItem(typeId, chave, outro, j), false);
        executar(player, outro.commandOff);
      }
    });
  }
  gravarEstado(player, chaveItem(typeId, chave, item, indice), novo);
  executar(player, novo ? item.command : item.commandOff);
  feedback(player, `${sub.label}: ${item.label}`, indice, novo);
}

function alternarConfig(player, typeId, perfil, indice) {
  const cfg = perfil.configs[indice];
  const k = chaveCfg(typeId, indice);
  const novo = !lerEstado(player, k);
  gravarEstado(player, k, novo);
  executar(player, novo ? cfg.command : cfg.commandOff);
  feedback(player, `Atalho: ${cfg.label}`, 8 + indice, novo);
}

/** Mostra o form; se o jogador estiver "ocupado" (chat/UI aberta) tenta de novo. */
async function mostrar(player, form) {
  for (let t = 0; t < 5; t++) {
    const r = await form.show(player);
    if (!(r.canceled && r.cancelationReason === "UserBusy")) return r;
    await esperar(10);
  }
  return { canceled: true };
}

/** Abre a roda e a reabre a cada clique, com o estado atualizado. */
export async function abrirMenu(player) {
  let tela = null;   // null = roda principal
  let pagina = 0;
  let typeIdAnterior;

  while (player.isValid) {
    const typeId = obterPeitoral(player);
    const perfil = obterPerfil(typeId);
    if (!perfil) {
      player.sendMessage(
        typeId
          ? `§c[Menu] "${typeId}" não possui perfil de menu.`
          : "§c[Menu] Equipe um peitoral compatível no slot de peito."
      );
      return;
    }
    // trocou de peitoral (ou categoria deixou de existir): volta pra roda principal
    if (typeId !== typeIdAnterior || (tela !== null && !perfil.submenus?.[tela])) { tela = null; pagina = 0; }
    typeIdAnterior = typeId;

    const montado = construirMenu(player, typeId, perfil, tela, pagina);
    pagina = montado.pagina;
    const r = await mostrar(player, montado.form);
    if (r.canceled || r.selection == null) return; // X / ESC: fecha tudo

    const acao = montado.mapa[r.selection];
    if (!acao) continue; // fatia vazia: ignora e redesenha

    if (acao.tipo === "abrir") { tela = acao.sub; pagina = 0; continue; }
    if (acao.tipo === "voltar") { tela = null; pagina = 0; continue; }
    if (acao.tipo === "pagina") { pagina += acao.direcao; continue; }

    if (acao.tipo === "disparo") {
      dispararItem(player, perfil, acao.sub, acao.indice);
      return; // o menu fecha, mas o emote é um disparo e continua no controlador
    }
    if (acao.tipo === "item") alternarItem(player, typeId, perfil, acao.sub, acao.indice);
    else if (acao.tipo === "cfg") alternarConfig(player, typeId, perfil, acao.indice);
    if (FECHAR_AO_ALTERNAR) return; // toggles: fecha após atualizar o estado
  }
}
