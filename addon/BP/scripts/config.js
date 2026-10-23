// =====================================================================
// config.js — constantes compartilhadas. Nada aqui depende de modelo.
// =====================================================================
export const DEBUG = false;

export const ITEM_MENU_KEY = "yast:menu_key";
export const AVATAR_FAMILY = "yast_avatar";
export const PLAYER_FLAG = "yast:avatar_on";          // propriedade do player (gate do render no RP)

// DynamicProperties do jogador (fonte única de verdade)
export const DP_AVATAR = "yast:avatar";                // id estável do modelo ("" = nenhum)
export const DP_PREFS = (id) => `yast:prefs:${id}`;    // JSON { v: variação, c: [configs] }
// DynamicProperty da entidade sombra
export const DP_OWNER = "yast:owner";                  // player.id do dono

export const CONFIG_SLOTS = 12;
export const RESPAWN_COOLDOWN_TICKS = 20;
export const SWEEP_INTERVAL_TICKS = 100;

// Bits de yast:st — espelho de tools/ysm2bedrock/molang.py (STATE_BITS) + HIDDEN_BIT.
export const ST = {
  sneaking: 1, sprinting: 2, swimming: 4, gliding: 8, onGround: 16, inWater: 32, riding: 64,
  sleeping: 128, jumping: 256, flying: 512, climbing: 1024, usingItem: 2048, dead: 4096,
  onFire: 8192, falling: 16384, hidden: 32768,
};
export const ARMOR = { helmet: 1, chest: 2, legs: 4, boots: 8, elytra: 16 };
// Categorias de item — espelho de ITEM_CATS em molang.py.
export const ITEM_CAT = {
  none: 0, sword: 1, bow: 2, crossbow: 3, shield: 4, spear: 5, pickaxe: 6, axe: 7, shovel: 8, hoe: 9,
  mace: 10, throwablePotion: 11, food: 12, drink: 13, spyglass: 14, fishingRod: 15, block: 16, item: 17,
  shears: 18, brush: 19, goatHorn: 20, chargedCrossbow: 21,
};
export const VEHICLE = { none: 0, boat: 1, minecart: 2, horse: 3, pig: 4, other: 5 };
