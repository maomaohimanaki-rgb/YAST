// =====================================================================
// state.js — peitoral equipado, perfil e estado ON/OFF persistido
// =====================================================================
import { EquipmentSlot } from "@minecraft/server";
import { CHESTPLATE_PROFILES } from "./chestplate_registry.js";

/** typeId do peitoral equipado, ou undefined (slot vazio / sem componente). */
export function obterPeitoral(player) {
  try {
    const eq = player.getComponent("minecraft:equippable");
    const item = eq?.getEquipment(EquipmentSlot.Chest);
    return item?.typeId; // item vanilla ou de outro add-on também retorna typeId
  } catch (e) {
    return undefined;
  }
}

/** Perfil do peitoral, ou null se não houver (vazio, vanilla, outro add-on). */
export function obterPerfil(typeId) {
  if (!typeId) return null;
  return Object.prototype.hasOwnProperty.call(CHESTPLATE_PROFILES, typeId)
    ? CHESTPLATE_PROFILES[typeId]
    : null;
}

// Chaves de save (Dynamic Properties do jogador). Cada peitoral tem o seu "save".
//   item de submenu : cm_<typeId>_<categoria>_<id ou posição>
//   atalho interno  : cm_<typeId>_cfg<posição 0..3>
export const chaveItem = (typeId, categoria, item, posicao) =>
  `cm_${typeId}_${categoria}_${item?.id ?? posicao}`;
export const chaveCfg = (typeId, i) => `cm_${typeId}_cfg${i}`;

export function lerEstado(player, chave) {
  return player.getDynamicProperty(chave) === true;
}

/** Grava true; para false remove a propriedade (economiza bytes). */
export function gravarEstado(player, chave, valor) {
  player.setDynamicProperty(chave, valor ? true : undefined);
}
