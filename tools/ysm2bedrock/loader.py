"""Carrega um modelo YSM em qualquer um dos três formatos encontrados em modelos_ysm/.

  * spec 2  : ysm.json (YSM 2.x)                         ~710 modelos
  * legado  : info.json + main.json/... na raiz (YSM 1.x) ~110 modelos
  * plano   : só main.json/main.animation.json/texture.png ~290 modelos

Tudo vira um `YsmModel` normalizado, que é o único formato que o resto do
conversor conhece. Bug de formato novo? Corrige aqui e vale para todos.
"""
import json
import os
import re
from dataclasses import dataclass, field

# Arquivos de animação que só fazem sentido com mods Java (TaC, CarryOn, TLM...).
MOD_ANIM_KEYS = {
    "arm", "fp.arm", "fp_arm", "tac", "carryon", "tlm", "irons_spell_books", "iss", "slashblade",
    "arrow", "parcool", "trident", "boat", "chest_boat", "horse", "pig", "swem", "vehicle",
}


@dataclass
class Texture:
    name: str          # rótulo mostrado no menu
    path: str          # caminho absoluto do PNG


@dataclass
class ConfigForm:
    kind: str          # checkbox | radio | range
    title: str
    variable: str      # variável YSM controlada (ex.: v.roaming.B)
    labels: list = field(default_factory=list)   # radio: [(rótulo, statements)]
    min: float = 0.0
    max: float = 1.0
    step: float = 1.0
    default: float = 0.0


@dataclass
class YsmModel:
    src: str
    fmt: str
    name: str
    collection: str
    authors: list
    license: str
    tips: str
    main_geo: dict
    animations: dict           # nome YSM -> json da animação
    controllers: dict          # id -> json do controlador
    textures: list             # [Texture]
    default_texture: int
    extras: list               # [(nome_animacao, rótulo)]
    configs: list              # [ConfigForm]
    width_scale: float = 1.0
    height_scale: float = 1.0
    warnings: list = field(default_factory=list)


def read_json(path):
    """JSON tolerante: BOM, vírgula sobrando, comentários e caracteres de controle."""
    with open(path, "rb") as f:
        raw = f.read().decode("utf-8-sig", errors="replace")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    txt = re.sub(r"^\s*//.*$", "", raw, flags=re.M)
    txt = re.sub(r",(\s*[}\]])", r"\1", txt)
    txt = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", txt)
    try:
        return json.loads(txt, strict=False)
    except json.JSONDecodeError:
        txt = re.sub(r'"\s*\n\s*"', '",\n"', txt)       # vírgula esquecida entre linhas
        txt = re.sub(r'([}\]])\s*\n\s*"', r'\1,\n"', txt)
        return json.loads(txt, strict=False)


def _lang(folder):
    for name in ("en_us.json", "en_US.json"):
        p = os.path.join(folder, "lang", name)
        if os.path.isfile(p):
            try:
                return read_json(p)
            except Exception:
                return {}
    return {}


def _strip_fmt(s):
    return re.sub(r"§.", "", s or "").strip()


def _merge_anims(paths, warnings):
    anims = {}
    for p in paths:
        if not p or not os.path.isfile(p):
            continue
        try:
            d = read_json(p)
        except Exception as e:
            warnings.append(f"animação ilegível {os.path.basename(p)}: {e}")
            continue
        for k, v in (d.get("animations") or {}).items():
            if isinstance(v, dict):
                anims.setdefault(k, v)
    return anims


def _controllers(paths, warnings):
    out = {}
    for p in paths:
        if not os.path.isfile(p):
            continue
        try:
            d = read_json(p)
        except Exception as e:
            warnings.append(f"controlador ilegível {os.path.basename(p)}: {e}")
            continue
        out.update(d.get("animation_controllers") or {})
    return out


def _extras_from_map(mapping, anims, lang, out, prefix=""):
    for key, label in (mapping or {}).items():
        if not isinstance(key, str) or key.startswith("#") or key not in anims:
            continue
        if isinstance(label, str) and label.startswith("#"):
            continue           # aponta para um botão de configuração, não é emote
        nice = lang.get(f"properties.extra_animation.{key}") or label or key
        out.append((key, prefix + _strip_fmt(str(nice))))


def load(folder, collection):
    folder = os.path.abspath(folder)
    files = set(os.listdir(folder))
    warnings = []
    if "ysm.json" in files:
        try:
            return _load_spec2(folder, collection, read_json(os.path.join(folder, "ysm.json")), warnings)
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            warnings.append(f"ysm.json inválido ({e}); tentando layout plano")
    info = {}
    if "info.json" in files:
        try:
            info = read_json(os.path.join(folder, "info.json"))
        except Exception as e:
            warnings.append(f"info.json inválido: {e}")
    return _load_flat(folder, collection, info, warnings)


def _load_spec2(folder, collection, y, warnings):
    meta = y.get("metadata") or {}
    props = y.get("properties") or {}
    player = (y.get("files") or {}).get("player") or {}
    lang = _lang(folder)
    j = lambda rel: os.path.join(folder, rel) if rel else None

    model = player.get("model") or {}
    main_rel = model.get("main") if isinstance(model, dict) else model
    geo = read_json(j(main_rel))

    anim = player.get("animation") or {}
    if isinstance(anim, str):
        anim = {"main": anim}
    order = ["main", "extra"] + [k for k in anim if k not in ("main", "extra")]
    paths = [j(anim[k]) for k in order if k in anim and k not in MOD_ANIM_KEYS]
    anims = _merge_anims(paths, warnings)

    ctrls = _controllers([j(p) for p in (player.get("animation_controllers") or []) if isinstance(p, str)], warnings)

    textures = []
    for t in player.get("texture") or []:
        rel = t.get("uv") if isinstance(t, dict) else t
        if not isinstance(rel, str) or not os.path.isfile(j(rel)):
            continue
        stem = os.path.splitext(os.path.basename(rel))[0]
        label = lang.get(f"files.player.texture.{stem}") or stem
        textures.append(Texture(_strip_fmt(label), j(rel)))
    default = 0
    dt = props.get("default_texture")
    if isinstance(dt, str):
        for i, t in enumerate(textures):
            if os.path.splitext(os.path.basename(t.path))[0] == os.path.splitext(os.path.basename(dt))[0]:
                default = i

    extras = []
    _extras_from_map(props.get("extra_animation"), anims, lang, extras)
    for cl in props.get("extra_animation_classify") or []:
        if isinstance(cl, dict):
            _extras_from_map(cl.get("extra_animation"), anims, lang, extras)
    seen = set()
    extras = [e for e in extras if not (e[0] in seen or seen.add(e[0]))]

    configs = []
    for b in props.get("extra_animation_buttons") or []:
        for n, cf in enumerate((b or {}).get("config_forms") or []):
            c = _config(cf, lang, (b or {}).get("id", ""), n)
            if c:
                configs.append(c)

    authors = []
    for a in meta.get("authors") or []:
        if isinstance(a, dict):
            authors.append(f"{a.get('name', '?')} ({a.get('role', '')})".replace(" ()", ""))
        elif isinstance(a, str):
            authors.append(a)
    lic = meta.get("license")
    lic = lic.get("type", "") if isinstance(lic, dict) else (lic or "")
    name = lang.get("metadata.name") or meta.get("name") or os.path.basename(folder)
    return YsmModel(
        src=folder, fmt="spec2", name=_strip_fmt(name), collection=collection, authors=authors,
        license=lic, tips=_strip_fmt(lang.get("metadata.tips") or meta.get("tips") or ""),
        main_geo=geo, animations=anims, controllers=ctrls, textures=textures,
        default_texture=default, extras=extras, configs=configs,
        width_scale=float(props.get("width_scale") or 1), height_scale=float(props.get("height_scale") or 1),
        warnings=warnings,
    )


def _config(cf, lang, button_id, n):
    if not isinstance(cf, dict):
        return None
    kind = cf.get("type")
    var = cf.get("value")
    title = lang.get(f"properties.extra_animation_buttons.{button_id}.config_forms.{n}.title") or cf.get("title") or button_id
    title = _strip_fmt(str(title)).rstrip(": ：")
    if kind == "radio":
        labels = [(_strip_fmt(k), v) for k, v in (cf.get("labels") or {}).items() if isinstance(v, str)]
        if not labels or not isinstance(var, str):
            return None
        return ConfigForm("radio", title, var, labels=labels)
    if not isinstance(var, str):
        return None
    if kind == "range":
        try:
            mn, mx = float(cf.get("min", 0)), float(cf.get("max", 1))
            step = float(cf.get("step", 0.1) or 0.1)
            dv = float(cf.get("default", cf.get("value_default", mn)) if not isinstance(cf.get("default"), str) else mn)
        except (TypeError, ValueError):
            return None
        return ConfigForm("range", title, var, min=mn, max=mx, step=step, default=dv)
    # checkbox e tipos customizados ("狸猫开关") se comportam como liga/desliga
    return ConfigForm("checkbox", title, var)


def _load_flat(folder, collection, info, warnings):
    j = lambda n: os.path.join(folder, n)
    if not os.path.isfile(j("main.json")):
        raise FileNotFoundError(f"{folder}: sem ysm.json nem main.json")
    geo = read_json(j("main.json"))
    anims = _merge_anims([j("main.animation.json"), j("extra.animation.json")], warnings)
    pngs = sorted(f for f in os.listdir(folder) if f.lower().endswith(".png"))
    pngs.sort(key=lambda f: (f.lower() != "texture.png", f.lower()))
    textures = [Texture(os.path.splitext(p)[0], j(p)) for p in pngs]
    names = info.get("extra_animation_names") or []
    extras = []
    for k in sorted((a for a in anims if re.fullmatch(r"extra\d+", a)), key=lambda a: int(a[5:])):
        i = int(k[5:])
        label = names[i] if i < len(names) and names[i] else f"Extra {i}"
        extras.append((k, _strip_fmt(str(label))))
    authors = info.get("authors") or []
    if isinstance(authors, str):
        authors = [authors]
    return YsmModel(
        src=folder, fmt="legacy" if info else "flat",
        name=_strip_fmt(info.get("name") or os.path.basename(folder)), collection=collection,
        authors=[str(a) for a in authors], license=str(info.get("license") or ""),
        tips=_strip_fmt(info.get("tips") or ""), main_geo=geo, animations=anims, controllers={},
        textures=textures, default_texture=0, extras=extras, configs=[], warnings=warnings,
    )
