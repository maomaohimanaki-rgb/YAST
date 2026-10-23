// =====================================================================
// manager.js — ciclo de vida da entidade sombra (spawn, troca, teardown).
//
// Uma sessão por jogador com avatar ativo. A DynamicProperty é a fonte de
// verdade; a sessão é só cache de runtime e pode ser reconstruída a qualquer
// momento (playerSpawn, entidade descarregada, troca de dimensão, /kill).
// =====================================================================
import { system, world } from "@minecraft/server";
import { AVATAR_FAMILY, DP_OWNER, PLAYER_FLAG, RESPAWN_COOLDOWN_TICKS, CONFIG_SLOTS, CONFIG_UNSET, DEBUG } from "../config.js";
import { getModel } from "./catalog.js";
import { savedAvatar, saveAvatar, loadPrefs, savePrefs } from "./store.js";

/** @type {Map<string, Session>} player.id -> sessão */
export const sessions = new Map();

/**
 * @typedef {object} Session
 * @property {import("@minecraft/server").Player} player
 * @property {object} model             entrada do catálogo
 * @property {{v:number,c:number[]}} prefs
 * @property {import("@minecraft/server").Entity|undefined} entity
 * @property {number} nextSpawnTick
 * @property {Map<string, number>} sent   última propriedade enviada (evita tráfego repetido)
 * @property {object} sync              estado do sync.js (yaw do corpo, itens...)
 * @property {{swing:number, hurt:number, use:number, act:number, aseq:number}} counters
 */

function log(msg) {
  if (DEBUG) console.warn(`[YAST] ${msg}`);
}

function setFlag(player, on) {
  try {
    player.setProperty(PLAYER_FLAG, on);
  } catch (e) {
    // Sem a propriedade = BP/entities/player.json foi sobrescrito por outro add-on.
    console.warn(`[YAST] não consegui marcar ${PLAYER_FLAG}: ${e}. Outro add-on substitui player.json?`);
  }
}

/** Ativa (ou troca para) o avatar `id`. Substitui direto, sem precisar resetar antes. */
export function activate(player, id) {
  const model = getModel(id);
  if (!model) return false;
  const old = sessions.get(player.id);
  if (old) removeEntity(old);
  saveAvatar(player, id);
  const s = {
    player, model, prefs: loadPrefs(player, model), entity: undefined, nextSpawnTick: 0,
    sent: new Map(), sync: {},
    counters: { swing: 0, hurt: 0, use: 0, act: -1, aseq: 0 },
  };
  sessions.set(player.id, s);
  setFlag(player, true);
  ensureEntity(s);
  return true;
}

/** Opção 0 do menu: some com o avatar e mostra o player de novo. */
export function reset(player) {
  const s = sessions.get(player.id);
  if (s) removeEntity(s);
  sessions.delete(player.id);
  saveAvatar(player, undefined);
  setFlag(player, false);
}

/** playerSpawn / reload: reconstrói o estado a partir da DynamicProperty. */
export function restore(player) {
  const id = savedAvatar(player);
  if (!id) {
    setFlag(player, false);       // save apontando para modelo fora deste pack
    return;
  }
  const s = sessions.get(player.id);
  if (s && s.model.id === id) {
    s.player = player;
    s.nextSpawnTick = 0;
    if (s.entity?.isValid && s.entity.dimension.id !== player.dimension.id) removeEntity(s);
    setFlag(player, true);
    ensureEntity(s);
    return;
  }
  activate(player, id);
}

export function removeEntity(s) {
  try {
    if (s.entity?.isValid) s.entity.remove();
  } catch {
    /* já removida / chunk descarregado: a varredura pega depois */
  }
  s.entity = undefined;
  s.sent.clear();
  s.sync = {};
}

/** Garante que a entidade sombra existe, na mesma dimensão do dono. */
export function ensureEntity(s) {
  const p = s.player;
  if (!p.isValid) return undefined;
  if (s.entity?.isValid) {
    if (s.entity.dimension.id === p.dimension.id) return s.entity;
    removeEntity(s);
  }
  if (system.currentTick < s.nextSpawnTick) return undefined;
  s.nextSpawnTick = system.currentTick + RESPAWN_COOLDOWN_TICKS;
  let e;
  try {
    e = p.dimension.spawnEntity(s.model.entity, p.location);
  } catch (err) {
    log(`spawn de ${s.model.entity} falhou: ${err}`);
    return undefined;
  }
  e.setDynamicProperty(DP_OWNER, p.id);
  s.entity = e;
  s.sent.clear();
  s.sync = {};
  pushStatic(s);
  log(`avatar ${s.model.id} criado para ${p.name}`);
  return e;
}

/** Propriedade só vai para a rede quando muda. */
export function setProp(s, key, value) {
  if (s.sent.get(key) === value) return;
  try {
    s.entity.setProperty(key, value);
    s.sent.set(key, value);
  } catch (err) {
    log(`setProperty ${key}=${value}: ${err}`);
  }
}

/** Variação + configs + contadores — o que não muda a cada tick. */
export function pushStatic(s) {
  if (!s.entity?.isValid) return;
  setProp(s, "yast:var", s.prefs.v);
  for (let i = 0; i < CONFIG_SLOTS; i++) setProp(s, `yast:c${i}`, s.prefs.c[i] ?? CONFIG_UNSET);
  setProp(s, "yast:act", s.counters.act);
  setProp(s, "yast:aseq", s.counters.aseq);
}

export function setVariant(player, v) {
  const s = sessions.get(player.id);
  if (!s || v < 0 || v >= s.model.variants.length) return;
  s.prefs.v = v;
  savePrefs(player, s.model, s.prefs);
  pushStatic(s);
}

export function setConfig(player, slot, value) {
  const s = sessions.get(player.id);
  if (!s) return;
  s.prefs.c[slot] = value;
  savePrefs(player, s.model, s.prefs);
  pushStatic(s);
}

export function playEmote(player, index) {
  const s = sessions.get(player.id);
  if (!s || index < 0 || index >= s.model.extras.length) return;
  s.counters.act = index;
  s.counters.aseq = (s.counters.aseq + 1) % 256;   // muda sempre: reinicia o mesmo emote
  pushStatic(s);
}

export function stopEmote(player) {
  const s = sessions.get(player.id);
  if (!s) return;
  s.counters.act = -1;
  pushStatic(s);
}

/** Jogador saiu: some com a entidade, mantém o save. */
export function dropSession(playerId) {
  const s = sessions.get(playerId);
  if (!s) return;
  removeEntity(s);
  sessions.delete(playerId);
}

/** Remove avatares órfãos (dono offline, duplicados após crash/reload, /summon manual). */
export function sweep() {
  const live = new Set();
  for (const s of sessions.values()) if (s.entity?.isValid) live.add(s.entity.id);
  for (const dimId of ["overworld", "nether", "the_end"]) {
    let list;
    try {
      list = world.getDimension(dimId).getEntities({ families: [AVATAR_FAMILY] });
    } catch {
      continue;
    }
    for (const e of list) {
      if (live.has(e.id)) continue;
      try {
        e.remove();
      } catch {
        /* ignore */
      }
    }
  }
}
