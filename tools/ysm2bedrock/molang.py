"""Tradutor do dialeto Molang do YSM (Java) para Molang Bedrock da entidade sombra.

No add-on antigo as animações rodavam num attachable preso ao player, então
`q.is_sneaking`, `q.ground_speed`... liam o próprio player. Agora quem roda as
animações é a entidade `yast:av_<id>`, que não anda, não agacha e não nada.
Todo estado do player chega por Entity Properties (ver PROPRIEDADES abaixo) e um
"shim" no pre_animation as expõe como variáveis `v.yq_*`. Este módulo reescreve
cada expressão trocando queries do player/YSM por essas variáveis.

Regra de ouro: identificador desconhecido NUNCA passa adiante. O Molang do
Bedrock invalida a expressão inteira (às vezes a animação inteira) quando acha
uma query que não existe, então o que não sabemos traduzir vira `0` e entra no
relatório de conversão.
"""
import re
from collections import Counter

# ---------------------------------------------------------------------------
# Contrato com o script (BP/scripts/avatar/sync.js). Mudou aqui, muda lá.
# ---------------------------------------------------------------------------
STATE_BITS = {
    "sneaking": 1, "sprinting": 2, "swimming": 4, "gliding": 8, "on_ground": 16,
    "in_water": 32, "riding": 64, "sleeping": 128, "jumping": 256, "flying": 512,
    "climbing": 1024, "using_item": 2048, "dead": 4096, "on_fire": 8192, "falling": 16384,
}
ARMOR_BITS = {"helmet": 1, "chest": 2, "legs": 4, "boots": 8, "elytra": 16}
# Categoria do item na mão (yast:main / yast:off). Mesma tabela em sync.js.
ITEM_CATS = {
    "none": 0, "sword": 1, "bow": 2, "crossbow": 3, "shield": 4, "spear": 5,
    "pickaxe": 6, "axe": 7, "shovel": 8, "hoe": 9, "mace": 10, "throwable_potion": 11,
    "food": 12, "drink": 13, "spyglass": 14, "fishing_rod": 15, "block": 16, "item": 17,
    "shears": 18, "brush": 19, "goat_horn": 20, "trident": 5, "charged_crossbow": 21,
}
CONFIG_SLOTS = 12

# Códigos de estado do controlador principal (v.yq_mst). Usados por ctrl.walk etc.
MAIN_STATES = [
    "idle", "walk", "run", "sneak", "sneaking", "jump", "fly", "swim", "swim_stand",
    "sleep", "ride", "ride_pig", "sit", "boat", "elytra_fly", "climb", "climbing",
    "ladder_up", "ladder_down", "ladder_stillness", "death", "riptide", "extra",
]
MAIN_STATE_CODE = {n: i for i, n in enumerate(MAIN_STATES)}

def _bit(var, bit):
    return f"(math.mod(math.floor({var}/{bit}),2)>=1)"

def _st(name):
    return _bit("v.yq_st", STATE_BITS[name])

# Queries/atalhos sem argumento -> expressão Bedrock.
SIMPLE = {
    # movimento
    "q.ground_speed": "v.yq_ground_speed",
    "q.vertical_speed": "v.yq_vertical_speed",
    "q.modified_move_speed": "v.yq_mms",
    "q.walk_distance": "v.yq_dist",
    "q.modified_distance_moved": "v.yq_dist",
    "q.yaw_speed": "v.yq_yaw_speed",
    "q.body_yaw_speed": "v.yq_yaw_speed",
    "q.head_yaw_speed": "v.yq_yaw_speed",
    "ysm.yaw_speed": "v.yq_yaw_speed",
    "ysm.delta_movement_length": "(v.yq_ground_speed/20)",
    "q.is_moving": "(v.yq_ground_speed>0.05)",
    "q.is_standing": "(v.yq_ground_speed<=0.05)",
    # cabeça
    "ysm.head_pitch": "v.yq_pitch", "ysm.headpitch": "v.yq_pitch",
    "ysm.head_yaw": "v.yq_hyaw", "ysm.head_y_rotation": "v.yq_hyaw",
    # v.yq_pitch segue o YSM (positivo = olhando para cima); as queries do Bedrock são o contrário
    "q.target_x_rotation": "(-v.yq_pitch)", "q.head_x_rotation": "(-v.yq_pitch)",
    "q.eye_target_x_rotation": "(-v.yq_pitch)",
    "q.target_y_rotation": "v.yq_hyaw", "q.head_y_rotation": "v.yq_hyaw",
    "q.eye_target_y_rotation": "v.yq_hyaw",
    "q.body_x_rotation": "0",
    "ysm.body_pitch": "0", "ysm.body_yaw": "q.body_y_rotation",
    # flags
    "q.is_sneaking": _st("sneaking"), "q.is_sprinting": _st("sprinting"),
    "q.is_swimming": _st("swimming"), "q.is_gliding": _st("gliding"),
    "q.is_on_ground": _st("on_ground"), "q.is_in_water": _st("in_water"),
    "q.is_in_water_or_rain": _st("in_water"), "ysm.eye_in_water": _st("in_water"),
    "q.is_riding": _st("riding"), "q.is_sleeping": _st("sleeping"), "ysm.is_sleep": _st("sleeping"),
    "q.is_jumping": _st("jumping"), "q.is_using_item": _st("using_item"),
    "q.is_eating": _st("using_item"),
    "q.is_on_fire": _st("on_fire"), "q.is_alive": f"(!{_st('dead')})",
    "ysm.on_ladder": _st("climbing"), "ysm.is_close_eyes": _st("sleeping"),
    "ysm.in_ground": "0",
    # vida / fome
    "q.health": "v.yq_health", "q.max_health": "v.yq_max_health",
    "ysm.food_level": "v.yq_food", "ysm.armor_value": "0",
    "q.player_level": "0", "q.hurt_time": "v.yq_hurt_time",
    # equipamento
    "ysm.has_mainhand": "(v.yq_main>0)", "ysm.has_offhand": "(v.yq_off>0)", "ysm.has_offand": "(v.yq_off>0)",
    "ysm.has_helmet": _bit("v.yq_armor", 1), "ysm.has_chest_plate": _bit("v.yq_armor", 2),
    "ysm.chest_plate": _bit("v.yq_armor", 2),
    "ysm.has_leggings": _bit("v.yq_armor", 4), "ysm.has_boots": _bit("v.yq_armor", 8),
    "ysm.has_elytra": _bit("v.yq_armor", 16),
    "ysm.has_pickaxe": "(v.yq_main==6)", "ysm.has_axe": "(v.yq_main==7)",
    "ysm.has_shovel": "(v.yq_main==8)", "ysm.has_hoe": "(v.yq_main==9)",
    "ysm.mainhand_charged_crossbow": "(v.yq_main==21)", "ysm.offhand_charged_crossbow": "(v.yq_off==21)",
    "ysm.is_fishing": "0", "ysm.in_shield_block_cooldown": "0", "ysm.arrow_count": "0",
    "q.item_in_use_duration": "v.yq_use_time", "q.main_hand_item_use_duration": "v.yq_use_time",
    "q.is_item_equipped": "(v.yq_main>0)",
    # câmera / render — a entidade é sempre "terceira pessoa"
    "q.is_first_person": "0", "ysm.first_person_mod_hide": "0", "ysm.rendering_in_inventory": "0",
    "ysm.person_view": "1", "ysm.is_maid": "0", "q.is_spectator": "0", "q.is_playing_dead": "0",
    # entrada (não temos o vetor de input; aproxima pela velocidade)
    "ysm.input_vertical": "(v.yq_ground_speed>0.05?1:0)", "ysm.input_horizontal": "0",
    "ysm.zza": "(v.yq_ground_speed>0.05?1:0)",
    # diversos
    "ysm.elytra_rot_x": "0", "ysm.elytra_rot_z": "0", "ysm.frozen_ticks": "0", "ysm.weather": "0",
    "ysm.fps": "60", "ysm.mod_version": "20605", "ysm.on_ground_time": "v.yq_ground_time",
    "ysm.entity_gravity": "0.08", "ysm.hair_pitch": "v.yq_pitch", "ysm.ground_speed2": "v.yq_ground_speed",
    "q.cape_flap_amount": "0", "q.remaining_durability": "0", "q.max_durability": "0",
    "q.equipment_count": "0", "q.variant": "v.yq_var", "q.skin_id": "v.yq_var", "q.swing": "v.yq_swing_time",
    "ysm.texture_name": "''", "ysm.bo": "0", "ysm.head_head": "0",
    "tlm.is_sitting": "0", "tlm.is_sittin": "0",
}

# Queries nativas que funcionam na própria entidade sombra.
NATIVE_Q = {
    "anim_time", "life_time", "all_animations_finished", "any_animation_finished", "delta_time",
    "time_of_day", "time_stamp", "distance_from_camera", "position", "cardinal_facing_2d",
    "body_y_rotation", "camera_rotation", "frame_alpha", "moon_phase", "day", "property",
    "has_property", "is_alive", "actor_count", "rotation_to_camera", "anim_time_update",
}

MATH_FUNCS = {
    "abs", "acos", "asin", "atan", "atan2", "ceil", "clamp", "cos", "die_roll", "die_roll_integer",
    "exp", "floor", "hermite_blend", "lerp", "lerprotate", "ln", "max", "min", "min_angle", "mod",
    "pi", "pow", "random", "random_integer", "round", "sin", "sqrt", "trunc", "sign", "copy_sign",
    "inverse_lerp",
}
KEYWORDS = {"return", "loop", "for_each", "break", "continue", "this", "true", "false"}

# Estados do controlador principal acessíveis via ctrl.<nome>
CTRL_STATES = {n: f"(v.yq_mst=={c})" for n, c in MAIN_STATE_CODE.items()}
CTRL_STATES.update({"idel": CTRL_STATES["idle"], "elytra": CTRL_STATES["elytra_fly"]})

TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<str>'[^']*')
  | (?P<num>\d+\.?\d*(?:[eE][-+]?\d+)?f?|\.\d+f?)
  | (?P<id>[A-Za-z_\u0080-￿][\w\u0080-￿]*(?:\s*\.\s*[A-Za-z_\u0080-￿][\w\u0080-￿]*)*)
  | (?P<op>->|\?\?|==|!=|<=|>=|&&|\|\||[-+*/%<>!?:;,=(){}\[\]])
  | (?P<other>.)
""", re.VERBOSE)


def tokenize(s):
    out = []
    for m in TOKEN_RE.finditer(s):
        kind = m.lastgroup
        if kind == "ws":
            continue
        val = m.group(kind)
        if kind == "id":
            val = re.sub(r"\s*\.\s*", ".", val)
        out.append((kind, val))
    return out


def _brace_values(toks):
    """`{expr}` sem `;` dentro é valor, não bloco: o Bedrock recusa ("Brace sections must
    only contain semicolon-delimited expressions"). Vira `(expr)`."""
    toks = list(toks)
    stack = []
    for i, (k, v) in enumerate(toks):
        if v == "{":
            stack.append([i, False])
        elif v == ";" and stack:
            stack[-1][1] = True
        elif v == "}" and stack:
            start, has_semi = stack.pop()
            if not has_semi:
                toks[start] = ("op", "(")
                toks[i] = ("op", ")")
                if i == start + 1:          # {} vazio
                    toks[i] = ("op", "0)")
    return toks


def _detok(toks):
    s = []
    prev = None
    for k, v in toks:
        if prev and prev[0] in ("id", "num") and k in ("id", "num"):
            s.append(" ")
        s.append(v)
        prev = (k, v)
    return "".join(s)


def _fmt(x):
    return repr(round(float(x), 6)).rstrip("0").rstrip(".") if isinstance(x, float) else str(x)


class Rewriter:
    """Reescreve expressões de UM modelo. Guarda estado (second_order etc.)."""

    def __init__(self, config_map=None):
        self.report = Counter()       # identificador não suportado -> ocorrências
        self.dynamics = {}            # nome YSM -> dict(kind, var, input, params)
        self.config_map = config_map or {}   # 'v.roaming_b' -> slot
        self.used = Counter()
        self.invalid = []             # (expressão original, erro) descartadas

    # -- API ----------------------------------------------------------------
    def expr(self, s):
        """Expressão usada como VALOR (canal de osso, transição, blend)."""
        if isinstance(s, (int, float, bool)):
            return s
        if not isinstance(s, str):
            return s
        out = _as_value(self._rewrite(s))
        if not self._valid(out, s):
            return 0
        return out

    def stmts(self, s):
        """Lista de statements (on_entry, timeline, pre_animation)."""
        if not isinstance(s, str):
            return s
        out = self._rewrite(s).strip()
        if out and not out.endswith(";"):
            out += ";"
        if out and not self._valid(out, s):
            return ""
        return out

    def _valid(self, out, original):
        """Expressão que o Bedrock não compila derruba a animação inteira: troca por 0."""
        from .molang_check import check, MolangError
        try:
            check(out)
            return True
        except MolangError as e:
            self.invalid.append((original[:120], str(e)))
            return False

    # -- núcleo -------------------------------------------------------------
    def _rewrite(self, s):
        toks = tokenize(s)
        out, _ = self._walk(toks, 0, len(toks))
        return _detok(_brace_values(out))

    def _walk(self, toks, i, end):
        out = []
        while i < end:
            k, v = toks[i]
            if k != "id":
                out.append((k, v))
                i += 1
                continue
            name = v
            lower = name.lower()
            parts = lower.split(".")
            # argumentos de chamada?
            args_toks = None
            j = i + 1
            if j < end and toks[j] == ("op", "("):
                depth, a = 0, j
                while a < end:
                    if toks[a] == ("op", "("):
                        depth += 1
                    elif toks[a] == ("op", ")"):
                        depth -= 1
                        if depth == 0:
                            break
                    a += 1
                args_toks = toks[j + 1:a]
                j = a + 1
            # membro após chamada (ysm.bone_rot('x').y): o valor inteiro vira 0
            if args_toks is not None and j + 1 < end and toks[j][1] == "." and toks[j + 1][0] == "id":
                j += 2
            repl = self._ident(parts, name, args_toks)
            if isinstance(repl, list):
                out.extend(repl)
            else:
                out.extend(tokenize(repl))
            i = j
        return out, i

    def _args(self, args_toks):
        """Divide tokens dos argumentos por vírgula de nível 0 e reescreve cada um."""
        args, cur, depth = [], [], 0
        for t in args_toks:
            if t[1] in ("(", "[", "{"):
                depth += 1
            elif t[1] in (")", "]", "}"):
                depth -= 1
            if t == ("op", ",") and depth == 0:
                args.append(cur)
                cur = []
            else:
                cur.append(t)
        if cur or args:
            args.append(cur)
        return args

    def _sub(self, toks):
        out, _ = self._walk(toks, 0, len(toks))
        return out

    def _ident(self, parts, raw, args_toks):
        ns = parts[0]
        ns = {"query": "q", "variable": "v", "temp": "t", "context": "c"}.get(ns, ns)
        if len(parts) == 1:
            if parts[0] in KEYWORDS:
                return raw
            self.report[f"<bare>{raw}"] += 1
            return "0"
        key = ns + "." + parts[1]

        if ns == "math":
            if parts[1] in MATH_FUNCS:
                return self._call(f"math.{parts[1]}", args_toks)
            self.report[key] += 1
            return "0"

        if ns in ("v", "t"):
            flat = ns + "." + "_".join(parts[1:])
            if not flat.isascii():
                import hashlib
                flat = ns + ".u" + hashlib.md5(flat.encode()).hexdigest()[:8]
            if flat.startswith("v.yq_") or flat.startswith("v.yast_") or flat.startswith("v.yso"):
                flat = flat.replace("v.", "v.m_", 1)   # nunca deixa o modelo sobrescrever o shim
            if flat in self.config_map:
                flat = f"v.yast_cfg{self.config_map[flat]}"
            return flat if args_toks is None else self._call(flat, args_toks)

        if ns == "c":
            self.report[key] += 1
            return "0"

        if ns == "q" and key in SIMPLE and args_toks is None:
            self.used[key] += 1
            return SIMPLE[key]
        if ns == "ysm" and key in SIMPLE and args_toks is None:
            self.used[key] += 1
            return SIMPLE[key]

        if ns == "ysm":
            return self._ysm_call(parts[1], args_toks, key)
        if ns == "ctrl":
            return self._ctrl(parts[1], args_toks, key)
        if ns == "q":
            if parts[1] == "position_delta":
                return self._indexed(args_toks, ["v.yq_pdx", "v.yq_pdy", "v.yq_pdz"])
            if parts[1] in ("equipped_item_all_tags", "equipped_item_any_tag", "is_item_name_any"):
                return self._item_tags(args_toks)
            if parts[1] in NATIVE_Q:
                return self._call(f"q.{parts[1]}", args_toks)
            if parts[1] in ("debug_output",):
                return "0"
            self.report[key] += 1
            return "0"
        if key in SIMPLE:
            return SIMPLE[key]
        self.report[key] += 1
        return "0"

    def _call(self, fname, args_toks):
        if args_toks is None:
            return fname
        args = [self._sub(a) for a in self._args(args_toks)]
        res = [("id", fname), ("op", "(")]
        for n, a in enumerate(args):
            if n:
                res.append(("op", ","))
            res.extend(a)
        res.append(("op", ")"))
        return res

    def _indexed(self, args_toks, names):
        args = self._args(args_toks or [])
        if not args:
            return names[0]
        a = _detok(self._sub(args[0]))
        try:
            return names[int(float(a))]
        except (ValueError, IndexError):
            return f"(({a})==0?{names[0]}:(({a})==1?{names[1]}:{names[2]}))"

    def _str_args(self, args_toks):
        vals = []
        for a in self._args(args_toks or []):
            if len(a) == 1 and a[0][0] == "str":
                vals.append(a[0][1][1:-1])
            else:
                vals.append(None)
        return vals

    def _item_tags(self, args_toks):
        cat_expr = []
        txt = " ".join(x or "" for x in self._str_args(args_toks)).lower()
        slot = "v.yq_off" if "off" in txt.split(" ")[0] else "v.yq_main"
        for word, cat in (("sword", 1), ("bow", 2), ("crossbow", 3), ("shield", 4), ("trident", 5),
                          ("pickaxe", 6), ("axe", 7), ("shovel", 8), ("hoe", 9), ("mace", 10)):
            if re.search(rf"(?<![a-z]){word}", txt):
                cat_expr.append(f"{slot}=={cat}")
        if not cat_expr:
            self.report["q.item_tags(<outros>)"] += 1
            return "0"
        return "(" + "||".join(cat_expr) + ")"

    def _hand_cat(self, args_toks):
        vals = self._str_args(args_toks)
        hand = (vals[0] or "mainhand") if vals else "mainhand"
        slot = "v.yq_off" if "off" in hand else "v.yq_main"
        what = (vals[1] if len(vals) > 1 else "") or ""
        w = what.lower().lstrip(":#$").replace("minecraft:", "")
        w = {"swords": "sword", "axes": "axe", "pickaxes": "pickaxe", "shovels": "shovel", "hoes": "hoe",
             "bows": "bow", "crossbows": "crossbow"}.get(w, w)
        if w in ITEM_CATS:
            c = ITEM_CATS[w]
            if w == "crossbow":
                return f"({slot}==3||{slot}==21)"
            return f"({slot}=={c})"
        if not w:
            return f"({slot}>0)"
        self.report[f"ctrl.hold({what})"] += 1
        return "0"

    def _ctrl(self, name, args_toks, key):
        if name == "hold":
            return self._hand_cat(args_toks)
        if name == "use":
            hand_cat = self._hand_cat(args_toks)
            vals = self._str_args(args_toks)
            hand = 2 if vals and vals[0] and "off" in vals[0] else 1
            return f"(v.yq_use=={hand}&&{hand_cat})"
        if name in ("swing", "attack"):
            return "(v.yq_swing_time<0.3)"
        if name == "attacked":
            return "(v.yq_hurt_time<0.5)"
        if name in CTRL_STATES and args_toks is None:
            return CTRL_STATES[name]
        self.report[key] += 1
        return "0"

    def _ysm_call(self, name, args_toks, key):
        if name in ("second_order", "first_order") and args_toks is not None:
            return self._dynamics(name, args_toks)
        if name in ("bone_rot", "bone_pos", "bone_scale", "bone_pivot_abs", "perlin_noise",
                    "effect_level", "equipped_enchantment_level", "keyboard", "relative_block_name",
                    "particle", "abs_particle", "play_sound", "stop_sound", "projectile_owner",
                    "shoot_item_id", "ladder_facing", "dump_mods", "mod"):
            self.report[key] += 1
            return "0"
        self.report[key] += 1
        return "0"

    def _dynamics(self, kind, args_toks):
        args = self._args(args_toks)
        sargs = self._str_args(args_toks)
        name = sargs[0] if sargs and sargs[0] is not None else _detok(args[0]) if args else "anon"
        if name in self.dynamics:
            return self.dynamics[name]["var"]
        var = f"v.yso{len(self.dynamics)}"
        inp = _detok(self._sub(args[1])) if len(args) > 1 else "0"
        params = []
        for a in args[2:]:
            params.append(_detok(self._sub(a)))
        self.dynamics[name] = {"kind": kind, "var": var, "input": inp, "params": params}
        return var

    # -- pre_animation gerado ------------------------------------------------
    def dynamics_scripts(self):
        """Integra os sistemas de 1ª/2ª ordem (Second Order Dynamics, t3ssel8r).

        Duas linhas por mola: a entrada vai sozinha para v.ysoN_in (se ela falhar, a mola
        continua com a entrada anterior em vez de abortar), depois a integração.
        """
        out = []
        for d in self.dynamics.values():
            x, var, p = d["input"], d["var"], d["params"]
            out.append(f"{var}_in=({x});")
            if d["kind"] == "second_order":
                f, z, r = (p + ["1", "0.5", "0"])[:3]
                k = _consts(f, z, r)
                out.append(
                    f"t.x={var}_in;t.dt=v.yq_dt;"
                    f"{var}_xp={var}_xp??t.x;{var}_d={var}_d??0;"
                    f"t.xd=(t.x-{var}_xp)/t.dt;{var}_xp=t.x;"
                    f"t.k1={k[0]};t.k2=math.max({k[1]},math.max(t.dt*t.dt/2+t.dt*t.k1/2,t.dt*t.k1));t.k3={k[2]};"
                    f"{var}={var}+t.dt*{var}_d;"
                    f"{var}_d={var}_d+t.dt*(t.x+t.k3*t.xd-{var}-t.k1*{var}_d)/t.k2;"
                )
            else:
                tau = (p + ["0.2"])[0]
                out.append(f"t.x={var}_in;{var}={var}+(t.x-{var})*math.clamp(v.yq_dt/math.max({tau},0.001),0,1);")
        return out

    def dynamics_init(self):
        """Toda mola existe desde o spawn: uma pode ler a outra antes de ela rodar no frame."""
        return "".join(f"{d['var']}=0;{d['var']}_in=0;" for d in self.dynamics.values())


def _consts(f, z, r):
    try:
        f, z, r = float(f), float(z), float(r)
        import math
        f = max(f, 0.001)
        return (_fmt(z / (math.pi * f)), _fmt(1 / ((2 * math.pi * f) ** 2)), _fmt(r * z / (2 * math.pi * f)))
    except ValueError:
        return (f"(({z})/(math.pi*math.max({f},0.001)))",
                f"(1/math.pow(2*math.pi*math.max({f},0.001),2))",
                f"(({r})*({z})/(2*math.pi*math.max({f},0.001)))")


_ASSIGN = re.compile(r"(?<![=!<>])=(?!=)")


def _split_top(s):
    parts, cur, depth, q = [], [], 0, False
    for ch in s:
        if ch == "'":
            q = not q
        if not q:
            if ch in "({[":
                depth += 1
            elif ch in ")}]":
                depth -= 1
            elif ch == ";" and depth == 0:
                parts.append("".join(cur))
                cur = []
                continue
        cur.append(ch)
    parts.append("".join(cur))
    return [p.strip() for p in parts]


def _as_value(s):
    """Expressão com atribuição/; precisa de `return` para valer como número no Bedrock."""
    s = s.strip()
    if not s:
        return "0"
    if ";" not in s and not _ASSIGN.search(re.sub(r"'[^']*'", "", s)):
        return s
    if "return" in s:
        return s if s.endswith(";") else s + ";"
    parts = [p for p in _split_top(s) if p]
    last = parts[-1] if parts else "0"
    if _ASSIGN.search(re.sub(r"'[^']*'", "", last)) or last.endswith("}"):
        parts.append("return 0")
    else:
        parts[-1] = "return " + last
    return ";".join(parts) + ";"
