"""Simula os primeiros frames de um avatar convertido e mede o que fica visível.

Reproduz o caminho do jogo: initialize -> (pre_animation -> controladores -> animações) por
frame, com as propriedades que o script envia no spawn. No fim calcula a escala efetiva de
cada osso (produto da cadeia de pais) e conta quantos cubos ficaram visíveis.

Diagnóstico típico:
  visível 0%          -> modelo "não aparece"
  escala mediana 0.2  -> "tamanho de formiga"
  ossos FOX/fox visíveis e corpo escondido -> nasce na forma de raposa
"""
import json
import os

from .molang_eval import Ctx, _num
from .convert import PROPERTIES


def _load(rp, mid):
    j = lambda *p: json.load(open(os.path.join(rp, *p), encoding="utf-8"))
    ce = j("entity", "yast", f"{mid}.entity.json")["minecraft:client_entity"]["description"]
    anims = j("animations", "yast", f"{mid}.animation.json")["animations"]
    ctrls = j("animation_controllers", "yast", f"{mid}.ac.json")["animation_controllers"]
    geo = j("models", "entity", "yast", f"{mid}.geo.json")["minecraft:geometry"][0]
    return ce, anims, ctrls, geo


def _length(a):
    if "animation_length" in a:
        return _num(a["animation_length"])
    mx = 0.0
    for chans in (a.get("bones") or {}).values():
        for v in chans.values():
            if isinstance(v, dict):
                for t in v:
                    try:
                        mx = max(mx, float(t))
                    except ValueError:
                        pass
    for t in (a.get("timeline") or {}):
        mx = max(mx, _num(t))
    return mx


class _Anim:
    def __init__(self, a):
        self.a = a
        self.time = 0.0
        self.len = _length(a)
        self.loop = a.get("loop") is True
        self.hold = a.get("loop") == "hold_on_last_frame"

    def step(self, ctx, dt):
        prev = self.time
        self.time += dt
        if self.len > 0 and self.time > self.len:
            if self.loop:
                self.time %= self.len
                prev = -1
            else:
                self.time = self.len
        for t, stmts in (self.a.get("timeline") or {}).items():
            tt = _num(t)
            if prev < tt <= self.time or (prev < 0 and tt <= self.time):
                for s in stmts:
                    ctx.run(s)

    @property
    def finished(self):
        return not self.loop and self.len > 0 and self.time >= self.len

    @property
    def applies(self):
        """Bedrock: animação sem loop que terminou deixa de ser aplicada (a não ser hold)."""
        return not self.finished or self.hold


def _eval_vec(ctx, v):
    if isinstance(v, list):
        return [_num(ctx.run(x)) for x in v]
    x = _num(ctx.run(v))
    return [x, x, x]


def _channel(ctx, v, t):
    if not isinstance(v, dict):
        return _eval_vec(ctx, v)
    keys = sorted((float(k), k) for k in v)
    if not keys:
        return None
    def val(k, side):
        kf = v[k]
        if isinstance(kf, dict):
            kf = kf.get(side, kf.get("post", kf.get("pre")))
        return _eval_vec(ctx, kf)
    if t <= keys[0][0]:
        return val(keys[0][1], "pre")
    for (t0, k0), (t1, k1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            a, b = val(k0, "post"), val(k1, "pre")
            f = (t - t0) / (t1 - t0) if t1 > t0 else 0
            return [x + (y - x) * f for x, y in zip(a, b)]
    last = v[keys[-1][1]]
    if isinstance(last, dict) and "pre" not in last:
        return [0.0, 0.0, 0.0]      # Bedrock: depois do último keyframe vale o "pre" (ausente = 0)
    return val(keys[-1][1], "post")


def simulate(rp, mid, frames=45, props=None, state=16):
    ce, anims, ctrls, geo = _load(rp, mid)
    p = {k: v["default"] for k, v in PROPERTIES.items()}
    p.update({"yast:st": state, "yast:act": -1})
    p.update(props or {})
    ctx = Ctx(p)
    sc = ce["scripts"]
    for s in sc.get("initialize", []):
        ctx.run(s)
    amap = ce["animations"]
    ctl_state = {}
    playing = {}
    dt = 1 / 60
    bones = {}
    rots, poss = {}, {}
    for f in range(frames):
        ctx.q["life_time"] += dt
        for s in sc.get("pre_animation", []):
            ctx.run(s)
        active = []
        for entry in sc.get("animate", []):
            name = entry if isinstance(entry, str) else next(iter(entry))
            if not isinstance(entry, str) and not ctx.run(entry[name]):
                continue
            full = amap.get(name)
            if full in ctrls:
                c = ctrls[full]
                st = ctl_state.get(full)
                if st is None:
                    st = c.get("initial_state", "default")
                    for x in c["states"].get(st, {}).get("on_entry", []):
                        ctx.run(x)
                node = c["states"].get(st, {})
                ctx.q["all_animations_finished"] = 1.0 if all(
                    playing.get((full, st, a if isinstance(a, str) else next(iter(a)))) is None
                    or playing[(full, st, a if isinstance(a, str) else next(iter(a)))].finished
                    for a in node.get("animations", [])) and node.get("animations") else 0.0
                for t in node.get("transitions", []):
                    target, cond = next(iter(t.items()))
                    if ctx.run(cond):
                        for x in node.get("on_exit", []):
                            ctx.run(x)
                        st = target
                        for x in c["states"].get(st, {}).get("on_entry", []):
                            ctx.run(x)
                        for k in [k for k in playing if k[0] == full]:
                            del playing[k]
                        break
                ctl_state[full] = st
                for a in c["states"].get(st, {}).get("animations", []):
                    an = a if isinstance(a, str) else next(iter(a))
                    if isinstance(a, dict) and not ctx.run(a[an]):
                        continue
                    if amap.get(an) in anims:
                        active.append(((full, st, an), anims[amap[an]]))
            elif full in anims:
                active.append(((None, None, name), anims[full]))
        bones = {}
        rots, poss = {}, {}
        live = set()
        for key, a in active:
            live.add(key)
            inst = playing.setdefault(key, _Anim(a))
            inst.step(ctx, dt)
            if not inst.applies:
                continue
            ctx.q["anim_time"] = inst.time
            for b, chans in (a.get("bones") or {}).items():
                if "scale" in chans:
                    s = _channel(ctx, chans["scale"], inst.time)
                    if s:
                        cur = bones.setdefault(b.lower(), [1.0, 1.0, 1.0])
                        bones[b.lower()] = [c * x for c, x in zip(cur, s)]
                for ch, store in (("rotation", rots), ("position", poss)):
                    if ch in chans:
                        v = _channel(ctx, chans[ch], inst.time)
                        if v:
                            cur = store.setdefault(b.lower(), [0.0, 0.0, 0.0])
                            store[b.lower()] = [c + x for c, x in zip(cur, v)]
        for k in [k for k in playing if k not in live]:
            del playing[k]

    parent = {b["name"].lower(): (b.get("parent") or "").lower() for b in geo["bones"]}
    def eff(b):
        s = 1.0
        while b:
            sc_ = bones.get(b, [1, 1, 1])
            s *= min(abs(x) for x in sc_)
            b = parent.get(b)
        return s
    total = vis = 0
    sizes = []
    hidden_roots = []
    for b in geo["bones"]:
        n = len(b.get("cubes", []))
        if not n:
            continue
        e = eff(b["name"].lower())
        total += n
        if e > 0.01:
            vis += n
            sizes += [e] * n
    for b, s in bones.items():
        if min(abs(x) for x in s) < 0.01:
            hidden_roots.append(b)
    sizes.sort()
    return {
        "visible": vis / total if total else 0.0,
        "median_scale": sizes[len(sizes) // 2] if sizes else 0.0,
        "hidden_bones": sorted(hidden_roots),
        "unknown_vars": dict(sorted(ctx.unknown.items(), key=lambda kv: -kv[1])[:15]),
        "main_state": next((v for k, v in ctl_state.items() if k.endswith(".main")), None),
        "vars": ctx.v,
        "pose": {"scale": bones, "rotation": rots, "position": poss},
        "geo": geo,
    }
