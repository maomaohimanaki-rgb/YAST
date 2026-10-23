"""Converte um YsmModel em um "pacote de avatar" padronizado (entidade sombra).

Saída de um modelo <id>:
  RP/models/entity/yast/<id>.geo.json          geometry.yast.<id>
  RP/animations/yast/<id>.animation.json       animation.yast.<id>.*
  RP/animation_controllers/yast/<id>.ac.json   controller.animation.yast.<id>.*
  RP/entity/yast/<id>.entity.json              cliente de yast:av_<id>
  RP/textures/yast/<id>/v<n>.png               variações (cores)
  BP/entities/yast/<id>.json                   servidor de yast:av_<id>
e um dicionário de catálogo (nome, variações, emotes, configs) para o script.

Todos os modelos saem com o MESMO contrato: mesmas propriedades, mesmo shim,
mesmos nomes de controladores. Bug na cadeia principal se corrige uma vez aqui.
"""
import copy
import hashlib
import json
import os
import re
import shutil

from .molang import Rewriter, MAIN_STATE_CODE, CONFIG_SLOTS

MAX_VARIANTS = 16
MAX_EXTRAS = 64
TICK_ANIM_MAX_LENGTH = 0.05   # loop mais curto que isso + timeline = passo de física por frame
SCALE = "0.9375"          # mesma escala do player vanilla (o attachable antigo herdava isso)
FP_HIDE_DISTANCE = 1.9    # câmera mais perto que isso = dono em 1ª pessoa

# --- Contrato de propriedades (BP) ------------------------------------------------
PROPERTIES = {
    "yast:st": {"type": "int", "range": [0, 65535], "default": 16, "client_sync": True},
    "yast:var": {"type": "int", "range": [0, 63], "default": 0, "client_sync": True},
    "yast:pitch": {"type": "float", "range": [-90.0, 90.0], "default": 0.0, "client_sync": True},
    "yast:hyaw": {"type": "float", "range": [-180.0, 180.0], "default": 0.0, "client_sync": True},
    "yast:yspd": {"type": "float", "range": [-3000.0, 3000.0], "default": 0.0, "client_sync": True},
    "yast:vx": {"type": "float", "range": [-100.0, 100.0], "default": 0.0, "client_sync": True},
    "yast:vy": {"type": "float", "range": [-100.0, 100.0], "default": 0.0, "client_sync": True},
    "yast:vz": {"type": "float", "range": [-100.0, 100.0], "default": 0.0, "client_sync": True},
    "yast:hp": {"type": "float", "range": [0.0, 4096.0], "default": 20.0, "client_sync": True},
    "yast:mhp": {"type": "float", "range": [1.0, 4096.0], "default": 20.0, "client_sync": True},
    "yast:food": {"type": "int", "range": [0, 20], "default": 20, "client_sync": True},
    "yast:main": {"type": "int", "range": [0, 63], "default": 0, "client_sync": True},
    "yast:off": {"type": "int", "range": [0, 63], "default": 0, "client_sync": True},
    "yast:armor": {"type": "int", "range": [0, 31], "default": 0, "client_sync": True},
    "yast:swing": {"type": "int", "range": [0, 255], "default": 0, "client_sync": True},
    "yast:hurt": {"type": "int", "range": [0, 255], "default": 0, "client_sync": True},
    "yast:use": {"type": "int", "range": [0, 2], "default": 0, "client_sync": True},
    "yast:veh": {"type": "int", "range": [0, 7], "default": 0, "client_sync": True},
    "yast:act": {"type": "int", "range": [-1, 63], "default": -1, "client_sync": True},
    "yast:aseq": {"type": "int", "range": [0, 255], "default": 0, "client_sync": True},
}
for _i in range(CONFIG_SLOTS):
    PROPERTIES[f"yast:c{_i}"] = {"type": "float", "range": [-100000.0, 100000.0], "default": -99999.0, "client_sync": True}
assert len(PROPERTIES) <= 32, "Bedrock aceita no máximo 32 propriedades por entidade"

HIDDEN_BIT = 32768
CONFIG_UNSET = -99999  # yast:cN com esse valor = "use o padrão do modelo"  # bit extra de yast:st: player invisível (poção) -> avatar some


def slug(text, maxlen=40):
    s = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return s[:maxlen].strip("_")


def short_hash(text, n=6):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:n]


def _anim_short(name, used):
    base = slug(name.replace(":", "_").replace("$", "_").replace("#", "_"), 48)
    if not base or not name.isascii():
        base = (base + "_" if base else "a") + short_hash(name)
    s, n = base, 2
    while s in used:
        s, n = f"{base}_{n}", n + 1
    used.add(s)
    return s


# ======================================================================================
class Converter:
    def __init__(self, model, model_id, out_root):
        self.m = model
        self.id = model_id
        self.out = out_root
        self.entity = f"yast:av_{model_id}"
        self.prefix_anim = f"animation.yast.{model_id}"
        self.prefix_ctrl = f"controller.animation.yast.{model_id}"
        self.configs = model.configs[:CONFIG_SLOTS]
        cmap = {}
        for i, c in enumerate(self.configs):
            cmap[_flat_var(c.variable)] = i
        self.rw = Rewriter(cmap)
        self.tick_scripts = []
        self.const_init = []
        self.notes = list(model.warnings)
        if len(model.configs) > CONFIG_SLOTS:
            self.notes.append(f"{len(model.configs) - CONFIG_SLOTS} configs além do limite de {CONFIG_SLOTS} ignoradas")

    # ------------------------------------------------------------------ geometria
    def geometry(self):
        src = self.m.main_geo
        geos = src.get("minecraft:geometry") or []
        if not geos:
            raise ValueError("main.json sem minecraft:geometry")
        g = copy.deepcopy(geos[0])
        desc = g.setdefault("description", {})
        desc["identifier"] = f"geometry.yast.{self.id}"
        desc.setdefault("texture_width", 64)
        desc.setdefault("texture_height", 64)
        desc["visible_bounds_width"] = max(float(desc.get("visible_bounds_width", 0) or 0), 4)
        desc["visible_bounds_height"] = max(float(desc.get("visible_bounds_height", 0) or 0), 4.5)
        desc["visible_bounds_offset"] = [0, 1.75, 0]
        bones = g.get("bones") or []
        seen = {}
        for b in bones:                       # nomes de osso duplicados quebram o modelo inteiro
            low = b["name"].lower()
            if low in seen:
                seen[low] += 1
                b["name"] = f"{b['name']}_dup{seen[low]}"
                self.notes.append(f"osso duplicado renomeado: {b['name']}")
            else:
                seen[low] = 0
        by = {b["name"].lower(): b for b in bones}
        self.head_bone = next((by[n]["name"] for n in ("head", "allhead") if n in by), None)
        if not self.head_bone:
            self.notes.append("sem osso Head: cabeça não segue a câmera")
        # rightItem/leftItem: pivô oficial do item na mão (Fase 5)
        for side, loc, arm in (("right", "righthandlocator", "rightarm"), ("left", "lefthandlocator", "leftarm")):
            name = f"{side}Item"
            if name.lower() in by:
                continue
            parent = by.get(loc) or by.get(f"{side}forearm") or by.get(arm)
            if not parent:
                self.notes.append(f"sem {loc}/{arm}: item na mão {side} não aparece")
                continue
            pv = parent.get("pivot") or [0, 0, 0]
            if parent is not by.get(loc):
                pv = [pv[0], pv[1] - 10, pv[2]]
            bones.append({"name": name, "parent": parent["name"], "pivot": list(pv)})
        g["bones"] = bones
        self.bone_names = {b["name"] for b in bones}
        return {"format_version": "1.12.0", "minecraft:geometry": [g]}

    # ------------------------------------------------------------------ animações
    def animations(self):
        used = set()
        self.short = {}
        for name in self.m.animations:
            self.short[name] = _anim_short(name, used)
        out = {}
        for name, a in self.m.animations.items():
            out[f"{self.prefix_anim}.{self.short[name]}"] = self._anim(a, name)
        self._pre_parallel_priority(out)
        self._breast_physics(out, used)
        # olhar da cabeça: no YSM é automático no osso Head; aqui é uma animação.
        if self.head_bone:
            self.short["__head_look"] = _anim_short("yast_head_look", used)
            out[f"{self.prefix_anim}.{self.short['__head_look']}"] = {
                "loop": True,
                "bones": {self.head_bone: {"rotation": ["math.clamp(v.yq_pitch,-90,90)", "math.clamp(v.yq_hyaw,-85,85)", 0]}},
            }
        return {"format_version": "1.8.0", "animations": out}

    def _breast_physics(self, out, used):
        """Física padrão de busto para modelos que têm o osso mas não o animam (~120 de 685).

        Os outros 565 já trazem a própria (ysm.second_order), reaproveitada como está.
        Mola de 2ª ordem (mesma do YSM) reagindo a pulo/queda e à passada.
        """
        names = [b for b in self.bone_names if b.lower() in ("breast", "bust", "body_breast", "xiong")]
        if not names:
            return
        anim_bones = {b.lower() for a in self.m.animations.values() for b in (a.get("bones") or {})}
        names = [b for b in names if b.lower() not in anim_bones]
        if not names:
            return
        so = self.rw.expr("ysm.second_order('__yast_breast', math.clamp(-q.vertical_speed*4,-20,20)"
                          "+math.sin(q.walk_distance*230)*math.min(q.ground_speed,5)*0.8, 2.2, 0.22, 0)")
        self.short["__breast"] = _anim_short("yast_breast", used)
        out[f"{self.prefix_anim}.{self.short['__breast']}"] = {
            "loop": True, "bones": {b: {"rotation": [f"math.clamp({so},-18,18)", 0, 0]} for b in names}}
        self.notes.append(f"física de busto padrão em {', '.join(names)}")

    def _pre_parallel_priority(self, out):
        """pre_parallelN tem prioridade MENOR que a animação principal no YSM.

        No YSM, se `run` define a escala de um osso, ela substitui a do pre_parallel; no
        Bedrock as escalas multiplicam e rotações/posições somam. Ex.: Magical Wine Fox
        esconde os círculos no pre_parallel (escala 0) e o `run` mostra (0,3): aqui dava
        0 × 0,3 = 0 e os círculos nunca apareciam. Solução (a mesma do conversor 0.4.x):
        enquanto um estado principal que mexe naquele osso/canal está ativo, o valor do
        pre_parallel vira neutro (escala 1, rotação/posição 0).
        """
        main = {}
        for st, code in MAIN_STATE_CODE.items():
            if st in self.m.animations:
                main[st] = (f"v.yq_mst=={code}", self.m.animations[st])
        extras = [n for n, _l in self.m.extras if n in self.m.animations][:MAX_EXTRAS]
        for i, n in enumerate(extras):
            main[f"extra_{i}"] = (f"(v.yq_mst=={MAIN_STATE_CODE['extra']}&&v.yq_act=={i})", self.m.animations[n])
        touched = {}
        for cond, a in main.values():
            for b, chans in (a.get("bones") or {}).items():
                if isinstance(chans, dict):
                    for ch in ("rotation", "position", "scale"):
                        if ch in chans:
                            touched.setdefault((b.lower(), ch), []).append(cond)
        for name in self.m.animations:
            if not re.fullmatch(r"pre_parallel\d+", name):
                continue
            a = out[f"{self.prefix_anim}.{self.short[name]}"]
            for b, chans in (a.get("bones") or {}).items():
                for ch in ("rotation", "position", "scale"):
                    conds = touched.get((b.lower(), ch))
                    if ch in chans and conds:
                        ident = 1 if ch == "scale" else 0
                        cond = "||".join(sorted(set(conds)))
                        chans[ch] = _neutral_when(chans[ch], cond, ident)

    def _anim(self, a, name=""):
        o = {}
        loop = a.get("loop", False)
        if isinstance(loop, str) and loop not in ("hold_on_last_frame",):
            loop = loop.lower() == "true"
        o["loop"] = loop
        for k in ("animation_length", "override_previous_animation"):
            if k in a:
                o[k] = a[k]
        for k in ("start_delay", "loop_delay", "anim_time_update", "blend_weight"):
            if k in a:
                o[k] = self.rw.expr(a[k])
        bones = {}
        for bname, chans in (a.get("bones") or {}).items():
            if not isinstance(chans, dict) or not bname.strip():
                continue
            is_head = self.head_bone and bname.lower() == self.head_bone.lower()
            nb = {}
            for ch in ("rotation", "position", "scale"):
                if ch in chans:
                    v = chans[ch]
                    if is_head and ch == "rotation":
                        v = _strip_head_look(v)
                    nb[ch] = self._channel(v)
            if "relative_to" in chans:
                nb["relative_to"] = chans["relative_to"]
            if nb:
                bones[bname] = nb
        if bones:
            o["bones"] = bones
        tl = a.get("timeline")
        if isinstance(tl, dict):
            ntl = {}
            for t, st in sorted(tl.items(), key=lambda kv: _num(kv[0])):
                ss = st if isinstance(st, list) else [st]
                ss = [y for y in (self.rw.stmts(x) for x in ss if isinstance(x, str) and x.strip()) if y]
                if ss:
                    ntl[t] = ss
            length = _num(a.get("animation_length", 0))
            if ntl and loop is True and 0 < length <= TICK_ANIM_MAX_LENGTH:
                # "Motor de física" YSM: animação de 1 frame cuja timeline integra molas em
                # passo fixo. No Bedrock os eventos de timeline de um loop menor que o frame
                # disparam irregularmente (FPS do celular varia) -> cabelo trava/explode.
                # Aqui a timeline vira código no pre_animation, rodado N vezes por frame
                # para manter o ritmo de 60 Hz para o qual o modelo foi escrito.
                self.tick_scripts.append((length, "".join(x for t in ntl for x in ntl[t])))
            elif ntl:
                o["timeline"] = ntl
                # Constantes de mola (v.L1_F=0.6; v.L1_K2=1/...) ficam espalhadas numa
                # timeline de 0,5 s: até ela tocar, K=0 e a física divide por zero.
                # Atribuições que não leem estado do player também rodam no initialize.
                # SÓ de animações sempre ligadas (pre_parallelN/parallelN): timeline de emote
                # (ex.: transformação "v.roaming.a=1-v.roaming.b") não pode rodar no spawn —
                # foi o que fez os Wine Fox nascerem como raposa no teste 02.
                if _ALWAYS_ON.fullmatch(name):
                    known = set()
                    for t in ntl:
                        for x in ntl[t]:
                            m = _CONST_ASSIGN.fullmatch(x)
                            if not m or _READS_STATE.search(m.group(2)):
                                continue
                            reads = {r.lower() for r in _VAR_RE.findall(m.group(2))}
                            if reads <= known:
                                self.const_init.append(x)
                                known.add(m.group(1).lower())
        return o

    def _channel(self, v):
        if not isinstance(v, dict):
            return self._vec(v)
        out = {}
        for t, kf in v.items():
            if _num(t, None) is None:
                continue
            if isinstance(kf, dict):
                nk = {}
                for kk in ("pre", "post"):
                    if kk in kf:
                        nk[kk] = self._vec3(kf[kk])
                if "vector" in kf and "post" not in nk:
                    nk["post"] = self._vec3(kf["vector"])
                if kf.get("lerp_mode") in ("linear", "catmullrom", "step"):
                    nk["lerp_mode"] = kf["lerp_mode"]
                if "pre" not in nk and "post" not in nk:
                    continue
                out[t] = nk
            else:
                out[t] = self._vec3(kf)
        # Bedrock: interpolação catmullrom só aceita keyframes constantes.
        def dynamic(x):
            vals = [x.get("pre"), x.get("post")] if isinstance(x, dict) else [x]
            return any(isinstance(c, str) for vv in vals if isinstance(vv, list) for c in vv)
        if any(dynamic(x) for x in out.values()):
            for x in out.values():
                if isinstance(x, dict) and x.get("lerp_mode") == "catmullrom":
                    x["lerp_mode"] = "linear"
        return out

    def _vec3(self, v):
        """Valor de keyframe: o Bedrock exige [x, y, z] (o YSM aceita número solto)."""
        while isinstance(v, dict):
            v = v.get("post", v.get("pre", v.get("vector", 0)))
        if not isinstance(v, list):
            v = [v, v, v]
        elif len(v) == 1:
            v = v * 3
        elif len(v) != 3:
            v = (list(v) + [0, 0, 0])[:3]
        return [self.rw.expr(x) for x in v]

    def _vec(self, v):
        if isinstance(v, (list, dict)):
            return self._vec3(v)
        return self.rw.expr(v)

    # ------------------------------------------------------------------ controladores
    def controllers(self):
        ctrls = {}
        self.animate = []
        has = lambda n: n in self.short
        s = lambda n: self.short[n]

        # --- controladores do próprio modelo (YSM 2) ---
        referenced = set()
        model_ctrls = []
        for cid, c in self.m.controllers.items():
            if not isinstance(c, dict) or not isinstance(c.get("states"), dict):
                continue
            nid = _anim_short(cid, set(self.short.values()) | {x[0] for x in model_ctrls})
            # Bedrock só aceita nome de estado ASCII ("默认", "交给我吧1" derrubavam o controlador)
            used_states = set()
            smap = {}
            for sn in c["states"]:
                smap[sn] = sn if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", sn) and sn not in used_states else _anim_short(sn, used_states)
                used_states.add(smap[sn])
            states = {}
            for sn, st in c["states"].items():
                if not isinstance(st, dict):
                    continue
                ns = {}
                anims = []
                for a in st.get("animations") or []:
                    if isinstance(a, str) and a in self.short:
                        anims.append(s(a)); referenced.add(a)
                    elif isinstance(a, dict):
                        for an, cond in a.items():
                            if an in self.short:
                                anims.append({s(an): _as_str(self.rw.expr(cond))}); referenced.add(an)
                if anims:
                    ns["animations"] = anims
                for k in ("on_entry", "on_exit"):
                    if st.get(k):
                        ns[k] = [y for y in (self.rw.stmts(x) for x in st[k] if isinstance(x, str)) if y]
                tr = []
                for t in st.get("transitions") or []:
                    if isinstance(t, dict):
                        for tn, cond in t.items():
                            if tn in c["states"]:
                                tr.append({smap[tn]: _as_str(self.rw.expr(cond))})
                if tr:
                    ns["transitions"] = tr
                bt = st.get("blend_transition")
                if isinstance(bt, (int, float)):
                    ns["blend_transition"] = bt
                elif isinstance(bt, dict):
                    try:
                        ns["blend_transition"] = max(float(k) for k in bt)
                    except ValueError:
                        pass
                if st.get("blend_via_shortest_path"):
                    ns["blend_via_shortest_path"] = True
                states[smap[sn]] = ns
            if not states:
                continue
            init = smap.get(c.get("initial_state"), "default")
            if init not in states:
                init = "default" if "default" in states else next(iter(states))
            model_ctrls.append((nid, {"initial_state": init, "states": states}))

        # --- principal: locomoção + emotes (estados exclusivos, evita soma de poses) ---
        main = {"initial_state": "idle", "states": {}}
        want = self._want_chain(has)
        loco = []
        for st in MAIN_STATE_CODE:
            if st in ("extra",):
                continue
            anim = st
            if st == "idle" or has(anim):
                loco.append(st)
        for st in loco:
            code = MAIN_STATE_CODE[st]
            node = {"on_entry": [f"v.yq_mst={code};"], "blend_transition": 0.2,
                    "transitions": [{o: f"v.yq_want=={MAIN_STATE_CODE[o]}"} for o in loco if o != st]}
            if has(st):
                node["animations"] = [s(st)]
            main["states"][st] = node
        extras = [(n, label) for n, label in self.m.extras if has(n)][:MAX_EXTRAS]
        self.extras = extras
        for i, (an, _label) in enumerate(extras):
            sn = f"extra_{i}"
            loops = self.m.animations[an].get("loop") in (True, "true", "hold_on_last_frame")
            # sai do emote ao parar (act=-1), trocar de emote, andar rápido ou mudar de pose (pular, agachar...)
            end = "v.yq_act!={i}||v.yq_aseq!=v.yast_seen||v.yq_ground_speed>1.2||(v.yq_want!={idle}&&v.yq_want!={walk})".format(
                i=i, idle=MAIN_STATE_CODE["idle"], walk=MAIN_STATE_CODE["walk"])
            if not loops:
                end += "||q.all_animations_finished"
            main["states"][sn] = {
                "animations": [s(an)], "blend_transition": 0.2,
                "on_entry": ["v.yast_seen=v.yq_aseq;", f"v.yq_mst={MAIN_STATE_CODE['extra']};"],
                "transitions": [{"idle": end}],
            }
        if extras:
            trig = [{f"extra_{i}": f"v.yq_act=={i}&&v.yq_aseq!=v.yast_seen"} for i in range(len(extras))]
            for st in loco:
                main["states"][st]["transitions"] = trig + main["states"][st]["transitions"]
        ctrls[f"{self.prefix_ctrl}.main"] = main
        self.animate.append("yast_main")
        self.want_script = want

        if "__head_look" in self.short:
            self.animate.append(s("__head_look"))
        if "__breast" in self.short:
            self.animate.append(s("__breast"))

        # --- paralelas sempre ligadas (o YSM toca pre_parallelN/parallelN o tempo todo) ---
        for n in [f"pre_parallel{i}" for i in range(9)] + [f"parallel{i}" for i in range(9)]:
            if has(n) and n not in referenced:
                self.animate.append(s(n))

        for nid, c in model_ctrls:
            full = f"{self.prefix_ctrl}.m_{nid}"
            ctrls[full] = c
            self.animate.append(f"m_{nid}")
            self.ctrl_alias = getattr(self, "ctrl_alias", {})
            self.ctrl_alias[f"m_{nid}"] = full

        # --- ações (Fase 6): golpe, uso de item, dano ---
        self._action_controllers(ctrls, has, s, referenced)
        return {"format_version": "1.10.0", "animation_controllers": ctrls}

    def _want_chain(self, has):
        """pre_animation: decide o estado de locomoção desejado (v.yq_want).

        Ordem de prioridade igual à do conversor 0.4.x (validada em jogo), com
        fallback para estados que o modelo não tem.
        """
        C = MAIN_STATE_CODE
        st = lambda b: f"(math.mod(math.floor(v.yq_st/{b}),2)>=1)"
        dead, sneak, sprint, swim, glide, ground, water, riding, sleep, fly, climb = (
            st(4096), st(1), st(2), st(4), st(8), st(16), st(32), st(64), st(128), st(512), st(1024))
        pick = lambda *names: next((n for n in names if n == "idle" or has(n)), "idle")
        moving = "v.yq_ground_speed>0.25"
        chain = [
            (dead, pick("death", "sleep")),
            (sleep, pick("sleep")),
            (f"{riding}&&v.yq_veh==1", pick("boat", "sit", "ride")),
            (f"{riding}&&v.yq_veh==2", pick("sit", "ride")),
            (f"{riding}&&v.yq_veh==4", pick("ride_pig", "ride", "sit")),
            (riding, pick("ride", "sit")),
            (glide, pick("elytra_fly", "fly", "jump")),
            (swim, pick("swim", "swim_stand")),
            (f"{water}&&!{ground}", pick("swim_stand", "swim", "idle")),
            (f"{climb}&&v.yq_vertical_speed>0.1", pick("ladder_up", "climb", "climbing")),
            (f"{climb}&&v.yq_vertical_speed<-0.1", pick("ladder_down", "climbing", "climb")),
            (f"{climb}&&!{ground}", pick("ladder_stillness", "climbing", "climb")),
            (f"{sneak}&&{moving}", pick("sneak", "sneaking", "walk")),
            (sneak, pick("sneaking", "sneak")),
            (fly, pick("fly", "jump")),
            (f"!{ground}&&!{water}&&v.yq_air_time>0.6", pick("fly", "jump")),
            (f"!{ground}&&!{water}", pick("jump")),
            (f"{sprint}||v.yq_mms>0.95", pick("run", "walk")),
            ("v.yq_mms>0.05", pick("walk")),
        ]
        expr = str(C["idle"])
        for cond, target in reversed(chain):
            expr = f"({cond})?{C[target]}:({expr})"
        return f"v.yq_want={expr};"

    def _action_controllers(self, ctrls, has, s, referenced):
        # golpe: dois estados alternados permitem reiniciar a animação a cada clique
        sw = "swing_hand" if has("swing_hand") else None
        if sw and sw not in referenced:
            def swing_anims():
                opts = []
                for cat, n in (("1", "swing:sword"), ("7", "swing:axe")):
                    if has(n):
                        opts.append({s(n): f"v.yq_main=={cat}"})
                if opts:
                    cond = "&&".join(f"v.yq_main!={c}" for c, n in (("1", "swing:sword"), ("7", "swing:axe")) if has(n))
                    opts.append({s(sw): cond})
                    return opts
                return [s(sw)]
            ctrls[f"{self.prefix_ctrl}.swing"] = {"initial_state": "default", "states": {
                "default": {"transitions": [{"a": "v.yq_swing!=v.yast_swing_seen"}]},
                "a": {"animations": swing_anims(), "on_entry": ["v.yast_swing_seen=v.yq_swing;"], "blend_transition": 0.1,
                      "transitions": [{"b": "v.yq_swing!=v.yast_swing_seen"}, {"default": "q.all_animations_finished"}]},
                "b": {"animations": swing_anims(), "on_entry": ["v.yast_swing_seen=v.yq_swing;"], "blend_transition": 0.1,
                      "transitions": [{"a": "v.yq_swing!=v.yast_swing_seen"}, {"default": "q.all_animations_finished"}]},
            }}
            self.animate.append("yast_swing")
        # uso de item (comer, arco, escudo...)
        states = {"default": {"transitions": []}}
        for hand, code in (("mainhand", 1), ("offhand", 2)):
            base = f"use_{hand}"
            if not has(base) or base in referenced:
                continue
            slot = "v.yq_main" if code == 1 else "v.yq_off"
            for cat, suffix in ((2, "bow"), (3, "crossbow"), (5, "spear"), (12, "eat"), (13, "drink"), (14, "spyglass"), (4, "shield")):
                n = f"{base}:{suffix}"
                if suffix == "shield" and not has(n):
                    n = f"{base}$minecraft:shield"
                if has(n):
                    sn = f"{hand}_{suffix}"
                    cond = f"v.yq_use=={code}&&{slot}=={cat}"
                    states[sn] = {"animations": [s(n)], "blend_transition": 0.15, "transitions": [{"default": f"!({cond})"}]}
                    states["default"]["transitions"].append({sn: cond})
            states[hand] = {"animations": [s(base)], "blend_transition": 0.15, "transitions": [{"default": f"v.yq_use!={code}"}]}
            states["default"]["transitions"].append({hand: f"v.yq_use=={code}"})
        if len(states) > 1:
            ctrls[f"{self.prefix_ctrl}.use"] = {"initial_state": "default", "states": states}
            self.animate.append("yast_use")
        # segurando item (YSM 2: hold_mainhand:<tipo>)
        for hand, slot in (("mainhand", "v.yq_main"), ("offhand", "v.yq_off")):
            hs = {"default": {"transitions": []}}
            for cat, suffix in ((1, "sword"), (2, "bow"), (4, "shield"), (5, "spear"), (6, "pickaxe"), (7, "axe"),
                                (10, "$minecraft:mace"), (15, "fishing"), (21, "charged_crossbow")):
                n = f"hold_{hand}:{suffix}" if not suffix.startswith("$") else f"hold_{hand}{suffix}"
                if has(n) and n not in referenced:
                    sn = re.sub(r"\W", "_", suffix).strip("_")
                    hs[sn] = {"animations": [s(n)], "blend_transition": 0.15, "transitions": [{"default": f"{slot}!={cat}"}]}
                    hs["default"]["transitions"].append({sn: f"{slot}=={cat}"})
            if len(hs) > 1:
                ctrls[f"{self.prefix_ctrl}.hold_{hand}"] = {"initial_state": "default", "states": hs}
                self.animate.append(f"yast_hold_{hand}")
        # dano
        if has("attacked") and "attacked" not in referenced:
            ctrls[f"{self.prefix_ctrl}.hurt"] = {"initial_state": "default", "states": {
                "default": {"transitions": [{"hit": "v.yq_hurt!=v.yast_hurt_seen"}]},
                "hit": {"animations": [s("attacked")], "on_entry": ["v.yast_hurt_seen=v.yq_hurt;"],
                        "blend_transition": 0.1, "transitions": [{"default": "q.all_animations_finished||v.yq_hurt_time>0.6"}]},
            }}
            self.animate.append("yast_hurt")

    # ------------------------------------------------------------------ entidade cliente
    def client_entity(self, texture_paths, generated=()):
        anims = {}
        for name, short in self.short.items():
            anims[short] = f"{self.prefix_anim}.{short}"
        anims["yast_main"] = f"{self.prefix_ctrl}.main"
        for k in ("swing", "use", "hold_mainhand", "hold_offhand", "hurt"):
            anims[f"yast_{k}"] = f"{self.prefix_ctrl}.{k}"
        anims.update(getattr(self, "ctrl_alias", {}))
        anims = {k: v for k, v in anims.items() if k in self.animate or v.startswith(self.prefix_anim)}
        textures = {f"v{i}": texture_paths[min(i, len(texture_paths) - 1)] for i in range(MAX_VARIANTS)}
        ticks = []
        for length, body in self.tick_scripts:
            # passos fixos do tamanho que o modelo espera, quantos couberem no frame (tempo real)
            ticks.append(f"t.n=math.clamp(math.round(v.yq_dt/{_fmt_num(length)}),1,6);loop(t.n,{{{body}}});")
        pre = (shim_script(len(self.configs)) + [self.want_script] + ticks
               + self.rw.dynamics_scripts() + self._radio_scripts())
        init = ["v.yast_seen=0;v.yast_swing_seen=0;v.yast_hurt_seen=0;v.yq_mst=0;v.yq_want=0;"]
        init += _init_vars([pre, *generated])
        self.config_defaults = self._config_defaults(generated)
        if self.config_defaults:
            init.append("".join(f"v.yast_cfg{i}={_fmt_num(d)};" for i, d in enumerate(self.config_defaults)))
        init += _chunk(self.const_init)
        return {
            "format_version": "1.10.0",
            "minecraft:client_entity": {"description": {
                "identifier": self.entity,
                "materials": {"default": "entity_alphatest"},
                "textures": textures,
                "geometry": {"default": f"geometry.yast.{self.id}"},
                # 2º controlador: ossos ysmGlow* sem iluminação (brilham no escuro, como no YSM)
                "render_controllers": [{"controller.render.yast.avatar": "!v.yast_hide"},
                                       {"controller.render.yast.avatar_glow": "!v.yast_hide"}],
                "enable_attachables": True,
                "scripts": {
                    "scale": SCALE,
                    "initialize": init,
                    "pre_animation": pre,
                    "animate": self.animate,
                    "should_update_bones_and_effects_offscreen": True,
                },
                "animations": anims,
            }},
        }

    def _config_defaults(self, generated):
        """Valor inicial de cada config = o que o próprio modelo usa quando ninguém mexeu.

        Procura `v.<cfg> ?? N` (padrão explícito) e depois `v.<cfg> = N` (init do modelo).
        Sem pista: slider começa em 1 se couber no intervalo (tamanho!), senão no mínimo;
        checkbox/radio em 0. Antes o slider ia para o mínimo: "tamanho de formiga".
        """
        blob = json.dumps(list(generated), ensure_ascii=False)
        out = []
        for i, c in enumerate(self.configs):
            m = re.search(rf"v\.yast_cfg{i}\s*\?\?\s*(-?\d+(?:\.\d+)?)", blob) or \
                re.search(rf"v\.yast_cfg{i}\s*=\s*(-?\d+(?:\.\d+)?)\s*;", blob)
            if m:
                d = float(m.group(1))
            elif c.kind == "range":
                d = 1.0 if c.min <= 1 <= c.max else c.min
            else:
                d = 0.0
            if c.kind == "range":
                d = min(max(d, c.min), c.max)
            out.append(d)
        return out

    def _radio_scripts(self):
        out = []
        for i, c in enumerate(self.configs):
            if c.kind != "radio":
                continue
            parts = [f"t.c=v.yast_cfg{i};"]
            for n, (_label, stmts) in enumerate(c.labels):
                body = self.rw.stmts(stmts)
                if body:
                    parts.append(f"(t.c=={n})?{{{body}}};")
            out.append("".join(parts))
        return out

    # ------------------------------------------------------------------ entidade servidor
    def server_entity(self):
        return server_entity_json(self.entity)

    # ------------------------------------------------------------------ tudo
    def run(self):
        rp = os.path.join(self.out, "RP")
        bp = os.path.join(self.out, "BP")
        geo = self.geometry()
        anim = self.animations()
        ac = self.controllers()
        tex_rel = []
        texs = self.m.textures[:MAX_VARIANTS]
        if not texs:
            raise ValueError("modelo sem textura")
        if len(self.m.textures) > MAX_VARIANTS:
            self.notes.append(f"{len(self.m.textures) - MAX_VARIANTS} variações além de {MAX_VARIANTS} ignoradas")
        for i, t in enumerate(texs):
            dst = os.path.join(rp, "textures", "yast", self.id, f"v{i}.png")
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(t.path, dst)
            tex_rel.append(f"textures/yast/{self.id}/v{i}")
        ce = self.client_entity(tex_rel, (anim, ac))
        _write(os.path.join(rp, "models", "entity", "yast", f"{self.id}.geo.json"), geo)
        _write(os.path.join(rp, "animations", "yast", f"{self.id}.animation.json"), anim)
        _write(os.path.join(rp, "animation_controllers", "yast", f"{self.id}.ac.json"), ac)
        _write(os.path.join(rp, "entity", "yast", f"{self.id}.entity.json"), ce)
        _write(os.path.join(bp, "entities", "yast", f"{self.id}.json"), self.server_entity())
        default = min(self.m.default_texture, len(texs) - 1)
        return {
            "id": self.id, "entity": self.entity, "name": self.m.name, "collection": self.m.collection,
            "format": self.m.fmt, "license": self.m.license, "authors": self.m.authors[:6],
            "variants": [t.name for t in texs], "defaultVariant": default,
            "extras": [label for _a, label in self.extras],
            "configs": [dict(_config_entry(i, c), default=self.config_defaults[i]) for i, c in enumerate(self.configs)],
            "report": {"unsupported": dict(self.rw.report.most_common()), "notes": self.notes,
                       "animations": len(self.short), "dynamics": len(self.rw.dynamics),
                       "invalid_molang": self.rw.invalid[:50]},
        }


def _config_entry(i, c):
    e = {"slot": i, "kind": c.kind, "title": c.title}
    if c.kind == "radio":
        e["labels"] = [label for label, _ in c.labels]
    if c.kind == "range":
        e.update({"min": c.min, "max": c.max, "step": c.step, "default": c.default})
    return e


_VAR_RE = re.compile(r"\bv(?:ariable)?\.([a-z_][a-z0-9_]*)", re.I)
_OURS = ("yq_", "yast_", "yso")
_GUARD_DEFAULT_RE = re.compile(r"\bv(?:ariable)?\.([a-z_][a-z0-9_]*)\s*\?\?\s*(-?\d+(?:\.\d+)?)", re.I)
_GUARD_RE = re.compile(r"\bv(?:ariable)?\.([a-z_][a-z0-9_]*)\s*\?\?", re.I)


def _init_vars(objs):
    """Toda variável lida pelo modelo começa em 0.

    No YSM variável não definida vale 0; no Bedrock ler uma variável que ainda não
    existe dá erro e a EXPRESSÃO INTEIRA vira 0. Num canal scale isso some com o osso
    (Magical Wine Fox: AllBody = 1-v.roaming_a -> 0 -> corpo invisível, só o cajado
    aparecia). Também eram os 240 mil erros "unknown variable" do Content Log.
    """
    names = set()
    def walk(o):
        if isinstance(o, str):
            names.update(m.lower() for m in _VAR_RE.findall(o))
        elif isinstance(o, dict):
            for k, v in o.items():
                walk(k)
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(list(objs))
    # `v.x ?? padrão` já trata o caso "não definida" — iniciar em 0 mataria o padrão.
    guarded = set()
    def walk_g(o):
        if isinstance(o, str):
            guarded.update(m.lower() for m in _GUARD_RE.findall(o))
        elif isinstance(o, dict):
            for v in o.values():
                walk_g(v)
        elif isinstance(o, list):
            for v in o:
                walk_g(v)
    walk_g(list(objs))
    defaults = {}
    def walk_d(o):
        if isinstance(o, str):
            for n, val in _GUARD_DEFAULT_RE.findall(o):
                defaults.setdefault(n.lower(), val)
        elif isinstance(o, dict):
            for v in o.values():
                walk_d(v)
        elif isinstance(o, list):
            for v in o:
                walk_d(v)
    walk_d(list(objs))
    # Antes as protegidas por ?? ficavam sem init e erravam quando lidas em outro lugar
    # (v.z_d, v.roaming_eyestyle no log do teste 02). Agora recebem o próprio padrão.
    names = sorted(n for n in names if not n.startswith(_OURS))
    out, cur = [], ""
    for n in names:
        piece = f"v.{n}={defaults.get(n, '0') if n in guarded else '0'};"
        if len(cur) + len(piece) > 2000:
            out.append(cur)
            cur = ""
        cur += piece
    if cur:
        out.append(cur)
    return out


_ALWAYS_ON = re.compile(r"(?:pre_)?parallel\d+")
_CONST_ASSIGN = re.compile(r"\s*v\.([a-z_][a-z0-9_]*)\s*=\s*([^;=]+);?\s*", re.I)
_READS_STATE = re.compile(r"\b(?:q|query|ysm|ctrl|c|context)\.|\bv\.yq_|\bv\.yso|\bt\.|\breturn\b|\?", re.I)


def _neutral_when(v, cond, ident):
    """Cada componente vira `(cond)?ident:(valor)` (valor já igual ao neutro fica como está)."""
    def comp(x):
        if isinstance(x, (int, float)) and not isinstance(x, bool) and float(x) == ident:
            return x
        if isinstance(x, str) and (";" in x or "return" in x):
            return x                # expressão complexa não cabe num ternário: fica como está
        return f"({cond})?{ident}:({x})"
    def vec(x):
        if isinstance(x, list):
            return [comp(c) for c in x]
        if isinstance(x, dict):
            return {k: vec(c) for k, c in x.items()} if "pre" in x or "post" in x else x
        return comp(x)
    if isinstance(v, dict):
        out = {}
        for t, kf in v.items():
            if isinstance(kf, dict):
                out[t] = {k: (vec(c) if k in ("pre", "post") else c) for k, c in kf.items()}
            else:
                out[t] = vec(kf)
        dynamic = any(isinstance(c, str) for kf in out.values()
                      for part in ([kf.get("pre"), kf.get("post")] if isinstance(kf, dict) else [kf])
                      if isinstance(part, list) for c in part)
        if dynamic:                 # Bedrock: catmullrom só com keyframes constantes
            for kf in out.values():
                if isinstance(kf, dict) and kf.get("lerp_mode") == "catmullrom":
                    kf["lerp_mode"] = "linear"
        return out
    return vec(v)


def _as_str(v):
    """Transições e condições de controlador só aceitam string ("0", não 0)."""
    if isinstance(v, bool):
        return "1" if v else "0"
    return v if isinstance(v, str) else _fmt_num(float(v))


def _fmt_num(x):
    return f"{x:.6f}".rstrip("0").rstrip(".")


def _chunk(stmts, limit=2000):
    out, cur = [], ""
    for x in stmts:
        if cur and len(cur) + len(x) > limit:
            out.append(cur)
            cur = ""
        cur += x
    if cur:
        out.append(cur)
    return out


def _num(x, default=0.0):
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def _flat_var(v):
    v = v.strip().lower().replace("variable.", "v.")
    parts = v.split(".")
    return parts[0] + "." + "_".join(parts[1:])


_HEAD_LOOK_RE = re.compile(r"(?:ysm\.head_pitch|ysm\.head_yaw|q(?:uery)?\.(?:target|head|eye_target)_[xy]_rotation)", re.I)


def _strip_head_look(v):
    """O olhar já vem da animação head_look; remove do canal Head para não somar duas vezes."""
    if isinstance(v, str):
        return _HEAD_LOOK_RE.sub("0", v)
    if isinstance(v, list):
        return [_strip_head_look(x) for x in v]
    if isinstance(v, dict):
        return {k: _strip_head_look(x) for k, x in v.items()}
    return v


def shim_script(n_configs):
    """pre_animation comum a todos os avatares: Entity Properties -> v.yq_*."""
    p = lambda n: f"q.property('yast:{n}')"
    lines = [
        "v.yq_dt=math.clamp(q.delta_time,0.001,0.1);",
        f"v.yq_st={p('st')};v.yq_var={p('var')};v.yq_vx={p('vx')};v.yq_vy={p('vy')};v.yq_vz={p('vz')};",
        "t.a=math.clamp(math.clamp(q.delta_time,0.001,0.1)*15,0,1);"
        f"v.yq_pitch=math.lerp(v.yq_pitch??{p('pitch')},{p('pitch')},t.a);"
        f"v.yq_hyaw=math.lerp(v.yq_hyaw??{p('hyaw')},{p('hyaw')},t.a);"
        f"v.yq_yaw_speed=math.lerp(v.yq_yaw_speed??0,{p('yspd')},t.a);",
        "v.yq_ground_speed=math.sqrt(v.yq_vx*v.yq_vx+v.yq_vz*v.yq_vz);v.yq_vertical_speed=v.yq_vy;"
        "v.yq_mms=math.clamp(v.yq_ground_speed/5.6,0,1);v.yq_dist=(v.yq_dist??0)+v.yq_ground_speed*v.yq_dt;"
        "v.yq_pdx=v.yq_vx*v.yq_dt;v.yq_pdy=v.yq_vy*v.yq_dt;v.yq_pdz=v.yq_vz*v.yq_dt;",
        f"v.yq_health={p('hp')};v.yq_max_health={p('mhp')};v.yq_food={p('food')};v.yq_main={p('main')};"
        f"v.yq_off={p('off')};v.yq_armor={p('armor')};v.yq_use={p('use')};v.yq_veh={p('veh')};"
        f"v.yq_act={p('act')};v.yq_aseq={p('aseq')};",
        f"t.s={p('swing')};v.yq_swing_t0=(t.s!=(v.yq_swing??t.s))?q.life_time:(v.yq_swing_t0??-100);v.yq_swing=t.s;"
        "v.yq_swing_time=q.life_time-v.yq_swing_t0;",
        f"t.h={p('hurt')};v.yq_hurt_t0=(t.h!=(v.yq_hurt??t.h))?q.life_time:(v.yq_hurt_t0??-100);v.yq_hurt=t.h;"
        "v.yq_hurt_time=q.life_time-v.yq_hurt_t0;",
        "v.yq_use_t0=(v.yq_use>0)?(v.yq_use_t0??q.life_time):q.life_time;v.yq_use_time=q.life_time-v.yq_use_t0;",
        "t.g=(math.mod(math.floor(v.yq_st/16),2)>=1)||(math.mod(math.floor(v.yq_st/32),2)>=1);"
        "v.yq_ground_t=t.g?q.life_time:(v.yq_ground_t??q.life_time);v.yq_air_time=q.life_time-v.yq_ground_t;"
        "v.yq_ground_since=t.g?(v.yq_ground_since??q.life_time):q.life_time;v.yq_ground_time=q.life_time-v.yq_ground_since;",
        f"v.yast_hide=q.distance_from_camera<{FP_HIDE_DISTANCE}||(math.mod(math.floor(v.yq_st/{HIDDEN_BIT}),2)>=1);",
    ]
    # Config: só aplica quando a propriedade MUDA (e não é o "sem valor" CONFIG_UNSET).
    # Assim o padrão do próprio modelo vale até o jogador mexer, e emotes que alternam a
    # mesma variável (transformação) não são desfeitos a cada frame.
    for i in range(n_configs):
        lines.append(f"t.c={p(f'c{i}')};(t.c!=(v.yast_cfgp{i}??{CONFIG_UNSET}))?{{v.yast_cfgp{i}=t.c;"
                     f"(t.c>{CONFIG_UNSET + 1})?{{v.yast_cfg{i}=t.c;}};}};")
    return lines


def server_entity_json(identifier):
    return {
        "format_version": "1.21.0",
        "minecraft:entity": {
            "description": {"identifier": identifier, "is_spawnable": False, "is_summonable": True,
                            "properties": PROPERTIES},
            "components": {
                "minecraft:type_family": {"family": ["yast_avatar", "inanimate"]},
                "minecraft:collision_box": {"width": 0.01, "height": 0.01},
                "minecraft:physics": {"has_gravity": False, "has_collision": False},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": "no"}]},
                "minecraft:health": {"value": 1, "max": 1},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": {},
                "minecraft:movement": {"value": 0},
                "minecraft:nameable": {"always_show": False, "allow_name_tag_renaming": False},
                "minecraft:equipment": {"slot_drop_chance": [
                    {"slot": "slot.weapon.mainhand", "drop_chance": 0},
                    {"slot": "slot.weapon.offhand", "drop_chance": 0}]},
                "minecraft:conditional_bandwidth_optimization": {"default_values": {
                    "max_optimized_distance": 0.0, "max_dropped_ticks": 0, "use_motion_prediction_hints": True}},
            },
        },
    }


def _write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
