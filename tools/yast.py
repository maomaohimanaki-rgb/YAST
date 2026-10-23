#!/usr/bin/env python3
"""Ferramenta de linha de comando do YAST.

  python3 tools/yast.py ids                 # atribui IDs estáveis a modelos novos (catalog/model_ids.json)
  python3 tools/yast.py audit [--out DIR]   # converte TODOS os modelos e gera relatório (não monta pack)
  python3 tools/yast.py build packs/debug.json   # monta dist/<pack>/ e dist/<pack>.mcaddon
"""
import argparse
import fnmatch
import json
import os
import shutil
import sys
import tempfile
import time
import uuid
import zipfile
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

from ysm2bedrock import loader, registry  # noqa: E402
from ysm2bedrock.convert import Converter  # noqa: E402
from ysm2bedrock.molang_check import validate_dir, validate_structure  # noqa: E402

MODELS = os.path.join(ROOT, "modelos_ysm")
IDS = os.path.join(ROOT, "catalog", "model_ids.json")
CORE = os.path.join(ROOT, "addon")
DIST = os.path.join(ROOT, "dist")


def cmd_ids(_args):
    rels = [r for r, _ in registry.find_models(MODELS)]
    ids = registry.load_ids(IDS)
    before = len(ids)
    registry.assign_ids(rels, ids)
    registry.save_ids(IDS, ids)
    missing = [r for r in ids if r not in set(rels)]
    print(f"{len(ids)} IDs ({len(ids) - before} novos). Sem pasta (removidos? mantidos p/ estabilidade): {len(missing)}")


def convert_one(rel, collection, model_id, out):
    m = loader.load(os.path.join(MODELS, rel), collection)
    entry = Converter(m, model_id, out).run()
    entry["src"] = rel
    return entry


def cmd_audit(args):
    ids = registry.load_ids(IDS)
    models = registry.find_models(MODELS)
    if args.only:
        models = [m for m in models if fnmatch.fnmatch(m[0], args.only)]
    out = args.out or tempfile.mkdtemp(prefix="yast_audit_")
    unsupported, fails, notes, fmts = Counter(), [], Counter(), Counter()
    molang_errs = []
    t0 = time.time()
    for n, (rel, col) in enumerate(models):
        if rel not in ids:
            fails.append((rel, "sem ID (rode: yast.py ids)"))
            continue
        try:
            e = convert_one(rel, col, ids[rel], out)
            fmts[e["format"]] += 1
            for k, v in e["report"]["unsupported"].items():
                unsupported[k] += v
            for x in e["report"]["notes"]:
                notes[x.split(":")[0][:60]] += 1
            rpo = os.path.join(out, "RP")
            for err in validate_dir(rpo) + [(f, "", x) for f, x in validate_structure(rpo)]:
                molang_errs.append((rel,) + err)
        except Exception as ex:  # noqa: BLE001 — relatório, não aborta
            fails.append((rel, f"{type(ex).__name__}: {ex}"[:200]))
        if args.clean:
            shutil.rmtree(out, ignore_errors=True)
    print(f"{len(models)} modelos em {time.time() - t0:.0f}s — formatos {dict(fmts)} — falhas {len(fails)}")
    for rel, err in fails:
        print("  FALHA", rel, "->", err)
    print(f"Erros de sintaxe Molang: {len(molang_errs)} em {len({e[0] for e in molang_errs})} modelos")
    for e in molang_errs[:args.show]:
        print("  MOLANG", e)
    print("Notas:", notes.most_common(15))
    print("Não suportados (top 40):", unsupported.most_common(40))
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump({"fails": fails, "molang": molang_errs, "unsupported": unsupported.most_common(), "notes": notes.most_common()},
                      f, ensure_ascii=False, indent=1)


# ------------------------------------------------------------------------------- build
def _match(pack, rels):
    sel = []
    for pat in pack.get("models", []):
        hit = [r for r in rels if fnmatch.fnmatch(r, pat)]
        if not hit:
            print(f"  aviso: padrão sem modelo: {pat}")
        sel.extend(h for h in hit if h not in sel)
    for pat in pack.get("exclude", []):
        sel = [r for r in sel if not fnmatch.fnmatch(r, pat)]
    return sel


def _uuid(seed):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"yast/{seed}"))


def cmd_build(args):
    with open(args.pack, encoding="utf-8") as f:
        pack = json.load(f)
    name = pack["name"]
    version = pack.get("version", [0, 5, 0])
    ids = registry.load_ids(IDS)
    models = dict(registry.find_models(MODELS))
    sel = _match(pack, list(models))
    print(f"pack {name}: {len(sel)} modelos")
    out = os.path.join(DIST, name)
    shutil.rmtree(out, ignore_errors=True)
    bp, rp = os.path.join(out, f"YAST_{name}_BP"), os.path.join(out, f"YAST_{name}_RP")
    shutil.copytree(os.path.join(CORE, "BP"), bp)
    shutil.copytree(os.path.join(CORE, "RP"), rp)
    gen = os.path.join(out, "_gen")
    catalog, fails = [], []
    for rel in sel:
        if rel not in ids:
            fails.append((rel, "sem ID"))
            continue
        try:
            catalog.append(convert_one(rel, models[rel], ids[rel], gen))
        except Exception as ex:  # noqa: BLE001
            fails.append((rel, f"{type(ex).__name__}: {ex}"))
    for side, dst in (("BP", bp), ("RP", rp)):
        src = os.path.join(gen, side)
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)
    shutil.rmtree(gen, ignore_errors=True)

    molang_errs = validate_dir(rp) + [(f, "", e) for f, e in validate_structure(rp)]
    if molang_errs:
        print(f"  {len(molang_errs)} expressões Molang inválidas (ver conversion_report.json)")

    # catálogo para o script (sem o relatório, que só serve para depuração)
    slim = [{k: v for k, v in e.items() if k not in ("report",)} for e in catalog]
    js = ("// GERADO por tools/yast.py build — não edite à mão.\n"
          f"export const PACK_NAME = {json.dumps(name)};\n"
          f"export const CATALOG = {json.dumps(slim, ensure_ascii=False, indent=1)};\n")
    with open(os.path.join(bp, "scripts", "generated", "catalog.js"), "w", encoding="utf-8") as f:
        f.write(js)
    credits = ["Modelos/animações/texturas convertidos de modelos Yes Steve Model (YSM).",
               "Licença de cada modelo = a declarada no ysm.json/info.json original. Mantenha a atribuição.",
               "CC BY-NC-SA: uso não comercial e compartilhamento pela mesma licença.", ""]
    for e in catalog:
        credits.append(f"{e['name']}  [{e['license'] or 'licença não declarada'}]  ({e['src']})")
        credits.extend(f"   - {a}" for a in e["authors"])
    for base in (bp, rp):
        with open(os.path.join(base, "CREDITS.txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(credits) + "\n")
    with open(os.path.join(out, "conversion_report.json"), "w", encoding="utf-8") as f:
        json.dump({"fails": fails, "molang_errors": molang_errs, "models": [{"id": e["id"], "src": e["src"], **e["report"]} for e in catalog]},
                  f, ensure_ascii=False, indent=1)

    # manifests: UUIDs determinísticos por pack (cada pack é um add-on separado; não misture dois)
    seed = pack.get("uuid_seed", name)
    for path, kind in ((bp, "BP"), (rp, "RP")):
        mpath = os.path.join(path, "manifest.json")
        with open(mpath, encoding="utf-8") as f:
            man = json.load(f)
        man["header"]["name"] = man["header"]["name"].replace("{PACK}", name)
        man["header"]["description"] = man["header"]["description"].replace("{PACK}", name).replace("{N}", str(len(catalog)))
        man["header"]["uuid"] = _uuid(f"{seed}/{kind}/header")
        man["header"]["version"] = version
        for i, mod in enumerate(man["modules"]):
            mod["uuid"] = _uuid(f"{seed}/{kind}/module{i}")
            mod["version"] = version
        for d in man.get("dependencies", []):
            if d.get("uuid") in ("{BP}", "{RP}"):
                d["uuid"] = _uuid(f"{seed}/{d['uuid'][1:3]}/header")
                d["version"] = version
        with open(mpath, "w", encoding="utf-8") as f:
            json.dump(man, f, ensure_ascii=False, indent=2)

    zpath = os.path.join(DIST, f"YAST_{name}_v{'.'.join(map(str, version))}.mcaddon")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for base in (bp, rp):
            for dp, _dn, fn in os.walk(base):
                for fname in fn:
                    full = os.path.join(dp, fname)
                    z.write(full, os.path.relpath(full, out))
    print(f"ok: {len(catalog)} convertidos, {len(fails)} falhas -> {zpath}")
    for rel, err in fails:
        print("  FALHA", rel, err)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("ids")
    a = sub.add_parser("audit")
    a.add_argument("--out")
    a.add_argument("--report")
    a.add_argument("--clean", action="store_true", help="apaga a saída a cada modelo (economiza disco)")
    a.add_argument("--only", help="glob de modelos (ex.: '_WineFox/*')")
    a.add_argument("--show", type=int, default=20)
    b = sub.add_parser("build")
    b.add_argument("pack")
    args = ap.parse_args()
    {"ids": cmd_ids, "audit": cmd_audit, "build": cmd_build}[args.cmd](args)


if __name__ == "__main__":
    main()
