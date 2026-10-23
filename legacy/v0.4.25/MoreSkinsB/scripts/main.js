// YAST mobile 0.4.24 — integrated action wheel + attachable signal bridge.
import { world, system, EquipmentSlot, ItemStack } from "@minecraft/server";
import { ITEM_ABRIR_MENU } from "./chestplate_registry.js";
import { abrirMenu } from "./menu.js";

// Attachables cannot read arbitrary player tags in Molang. A hidden temporary offhand item
// acts as the signal, read in RP as context.owning_entity->query.is_item_name_any(...).
const PULSE_TICKS = 6;
const VALID_ACTIONS = {
  "wf01": [
    "extra0",
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf02": [
    "extra0",
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf03": [
    "extra0",
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5"
  ],
  "wf05": [
    "extra2"
  ],
  "wf07": [
    "extra0",
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf12": [
    "extra0",
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf13": [
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf14": [
    "a011b70",
    "a1f5b0b",
    "a224e2c",
    "a5e774d",
    "a5fcf14",
    "a61bcda",
    "a6f370b",
    "a98f4e2",
    "ab57a33",
    "acbc8fc",
    "af7ce99",
    "dooble",
    "extra_ciallo"
  ],
  "wf16": [
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf17": [
    "2",
    "3",
    "4",
    "5",
    "extra0",
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7",
    "new",
    "new2",
    "new3",
    "new4",
    "up"
  ],
  "wf18": [
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf19": [
    "extra0",
    "extra1",
    "extra2",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf20": [
    "extra0",
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf21": [
    "extra1",
    "extra2",
    "extra3",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ],
  "wf22": [
    "extra0",
    "extra1",
    "extra2",
    "extra4",
    "extra5",
    "extra6",
    "extra7"
  ]
};
const SET_VALUES = {
  "wf05": {
    "roaming_staffhide": [
      0,
      1
    ],
    "roaming_c": [
      0,
      1
    ]
  },
  "wf13": {
    "roaming_umbrella": [
      0,
      1
    ]
  },
  "wf14": {
    "player_size": [
      0.2,
      0.6,
      1,
      2,
      5
    ],
    "hold": [
      0,
      1,
      3,
      5,
      10
    ],
    "roaming_back": [
      0,
      1
    ]
  },
  "wf16": {
    "roaming_gun": [
      0,
      1
    ],
    "roaming_humujing": [
      0,
      1
    ]
  },
  "wf17": {
    "hh": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ],
    "hhh": [
      0,
      1,
      2,
      3,
      4
    ],
    "yj": [
      0,
      1,
      2
    ],
    "player_root_size": [
      -1,
      0,
      1,
      2
    ]
  },
  "wf18": {
    "roaming_hairderss": [
      0,
      1
    ]
  },
  "wf19": {
    "roaming_b": [
      0,
      1
    ]
  },
  "wf21": {
    "roaming_hairderss": [
      0,
      1
    ],
    "roaming_wings": [
      0,
      1
    ]
  },
  "wf22": {
    "roaming_f": [
      0,
      1
    ]
  }
};
const activePulses = new Map();

function isPlayer(entity) { return entity?.typeId === "minecraft:player"; }
function normaliseNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const s = Number.isInteger(n) ? String(n) : String(n);
  return s.replace(/-/g, "m").replace(/\./g, "p");
}
function signalForAction(model, action) { return `yast:signal_a_${model}_${action}`; }
function signalForSet(model, variable, value) {
  const code = normaliseNumber(value);
  return code == null ? null : `yast:signal_s_${model}_${variable}_${code}`;
}
function signalForStop(model) { return `yast:signal_x_${model}_stop`; }

function pulseOffhand(player, signalId) {
  let equippable;
  try { equippable = player.getComponent("minecraft:equippable"); } catch { return; }
  if (!equippable) return;
  const key = player.id;
  let record = activePulses.get(key);
  if (!record) {
    let oldItem;
    try { oldItem = equippable.getEquipment(EquipmentSlot.Offhand); } catch { return; }
    record = { original: oldItem?.clone(), generation: 0 };
    activePulses.set(key, record);
  }
  record.generation += 1;
  const generation = record.generation;
  try { equippable.setEquipment(EquipmentSlot.Offhand, new ItemStack(signalId, 1)); }
  catch (error) {
    if (activePulses.get(key) === record) activePulses.delete(key);
    console.warn(`[YAST wheel] Could not set action signal ${signalId}: ${error}`);
    return;
  }
  system.runTimeout(() => {
    const active = activePulses.get(key);
    if (!active || active.generation !== generation) return;
    activePulses.delete(key);
    try {
      if (!player.isValid) return;
      const eq = player.getComponent("minecraft:equippable");
      const current = eq?.getEquipment(EquipmentSlot.Offhand);
      // Restore only if our temporary signal is still there; never overwrite a new player choice.
      if (current?.typeId?.startsWith("yast:signal_")) eq.setEquipment(EquipmentSlot.Offhand, active.original);
    } catch { /* a disconnect during the six-tick pulse is harmless */ }
  }, PULSE_TICKS);
}
function modelIsKnown(model) {
  return Object.prototype.hasOwnProperty.call(VALID_ACTIONS, model) || Object.prototype.hasOwnProperty.call(SET_VALUES, model);
}

world.afterEvents.itemUse.subscribe((ev) => {
  if (ev.itemStack?.typeId === ITEM_ABRIR_MENU && isPlayer(ev.source)) abrirMenu(ev.source);
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  const player = ev.sourceEntity;
  if (!isPlayer(player)) return;
  const args = (ev.message ?? "").trim().split(/\s+/).filter(Boolean);
  const model = args[0];
  if (!model || !modelIsKnown(model)) return;

  if (ev.id === "yast:action") {
    const action = args[1];
    if (!action || !(VALID_ACTIONS[model] ?? []).includes(action)) return;
    pulseOffhand(player, signalForAction(model, action));
    return;
  }
  if (ev.id === "yast:stop") {
    if (!(VALID_ACTIONS[model] ?? []).length) return;
    pulseOffhand(player, signalForStop(model));
    return;
  }
  if (ev.id === "yast:set") {
    const variable = args[1];
    const rawValue = args[2];
    const allowed = SET_VALUES[model]?.[variable];
    if (!allowed || rawValue == null) return;
    const number = Number(rawValue);
    const value = allowed.find((candidate) => Number(candidate) === number);
    if (value === undefined) return;
    const signal = signalForSet(model, variable, value);
    if (signal) pulseOffhand(player, signal);
  }
});
