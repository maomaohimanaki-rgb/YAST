"""Cópias de diagnóstico de um avatar já convertido (só para packs de teste).

Cada cópia tira UMA peça do modelo; no jogo, a cópia que se comporta diferente aponta a causa
sem eu precisar adivinhar a semântica do motor. Configurado no pack:

    "diagnostics": [
      {"base": "winefox_17_mini", "suffix": "d1", "label": "sem piscar", "ops": ["drop_anim:pre_parallel1"]}
    ]

Operações:
  drop_anim:<nome>    tira a animação do `animate` da entidade (nome curto, ex.: pre_parallel1)
  drop_parallels      tira todas as pre_parallelN/parallelN
  only_pose           deixa só o controlador principal e o olhar
  drop_scale:<osso>   tira o canal scale desse osso de todas as animações
  texture_res         reduz as texturas para a resolução declarada na geometria (texture_width)
  drop_guards         tira as linhas "v.x=v.x??N;" do começo do pre_animation
"""
import copy
import json
import os
import re
import shutil

from PIL import Image


def _files(bp, rp, mid):
    return [
        os.path.join(bp, "entities", "yast", f"{mid}.json"),
        os.path.join(rp, "entity", "yast", f"{mid}.entity.json"),
        os.path.join(rp, "animations", "yast", f"{mid}.animation.json"),
        os.path.join(rp, "animation_controllers", "yast", f"{mid}.ac.json"),
        os.path.join(rp, "models", "entity", "yast", f"{mid}.geo.json"),
    ]


def _entry_name(entry):
    return entry if isinstance(entry, str) else next(iter(entry))


def apply(diags, bp, rp, catalog):
    by_id = {e["id"]: e for e in catalog}
    for d in diags:
        base = by_id.get(d["base"])
        if base is None:
            print(f"  diag: modelo {d['base']} não está no pack")
            continue
        mid = f"{d['base']}_{d['suffix']}"
        for src in _files(bp, rp, d["base"]):
            if not os.path.isfile(src):
                continue
            with open(src, encoding="utf-8") as f:
                text = f.read().replace(d["base"], mid)
            with open(src.replace(d["base"], mid), "w", encoding="utf-8") as f:
                f.write(text)
        tsrc = os.path.join(rp, "textures", "yast", d["base"])
        tdst = os.path.join(rp, "textures", "yast", mid)
        shutil.copytree(tsrc, tdst, dirs_exist_ok=True)

        ent_p = os.path.join(rp, "entity", "yast", f"{mid}.entity.json")
        anim_p = os.path.join(rp, "animations", "yast", f"{mid}.animation.json")
        geo_p = os.path.join(rp, "models", "entity", "yast", f"{mid}.geo.json")
        ent, anim, geo = (json.load(open(p, encoding="utf-8")) for p in (ent_p, anim_p, geo_p))
        desc = ent["minecraft:client_entity"]["description"]
        animate = desc["scripts"]["animate"]
        for op in d["ops"]:
            kind, _, arg = op.partition(":")
            if kind == "drop_anim":
                animate[:] = [a for a in animate if _entry_name(a) != arg]
            elif kind == "drop_parallels":
                animate[:] = [a for a in animate if not re.fullmatch(r"(pre_)?parallel\d+", _entry_name(a))]
            elif kind == "only_pose":
                animate[:] = [a for a in animate if _entry_name(a) in ("yast_main", "yast_head_look")]
            elif kind == "drop_scale":
                for a in anim["animations"].values():
                    ch = (a.get("bones") or {}).get(arg)
                    if ch:
                        ch.pop("scale", None)
            elif kind == "drop_guards":
                guard = re.compile(r"^(v\.[\w.]+=v\.[\w.]+\?\?-?[\d.]+;)+$")
                pre = desc["scripts"]["pre_animation"]
                pre[:] = [x for x in pre if not guard.match(x)]
            elif kind == "texture_res":
                g = geo["minecraft:geometry"][0]["description"]
                w, h = int(float(g.get("texture_width", 64))), int(float(g.get("texture_height", 64)))
                for fn in os.listdir(tdst):
                    p = os.path.join(tdst, fn)
                    im = Image.open(p)
                    if im.size != (w, h):
                        im.convert("RGBA").resize((w, h), Image.NEAREST).save(p)
            else:
                raise ValueError(f"diag: operação desconhecida {op}")
        for p, data in ((ent_p, ent), (anim_p, anim)):
            with open(p, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)

        e = copy.deepcopy(base)
        e.update(id=mid, entity=f"yast:av_{mid}", name=f"{base['name']} [{d['label']}]", collection="Diagnóstico",
                 src=f"{base['src']} (diag {d['suffix']})")
        catalog.append(e)
