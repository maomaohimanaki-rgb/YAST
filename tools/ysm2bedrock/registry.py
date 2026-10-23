"""IDs estáveis dos modelos.

O ID vai para a DynamicProperty do jogador (`yast:avatar`). Se ele mudasse a
cada build (ex.: índice na lista), quem salvou "avatar 37" num pack de 100
receberia outro personagem no pack de 500. Por isso o ID é derivado do caminho
e gravado em catalog/model_ids.json — uma vez atribuído, nunca muda, mesmo que
o pack seja montado com outros modelos.
"""
import json
import os

from .convert import slug, short_hash

SKIP_DIRS = {"avatar", "models", "animations", "textures", "controller", "lang", "sounds", "functions"}


def find_models(root):
    """[(relpath, colecao)] — todo diretório com ysm.json ou main.json, dois níveis abaixo de root."""
    out = []
    for col in sorted(os.listdir(root)):
        cp = os.path.join(root, col)
        if not os.path.isdir(cp):
            continue
        for m in sorted(os.listdir(cp)):
            mp = os.path.join(cp, m)
            if os.path.isdir(mp) and m not in SKIP_DIRS and (
                    os.path.isfile(os.path.join(mp, "ysm.json")) or os.path.isfile(os.path.join(mp, "main.json"))):
                out.append((f"{col}/{m}", collection_name(col)))
    return out


def collection_name(folder):
    return folder.lstrip("_") or folder


def load_ids(path):
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def assign_ids(rels, ids):
    """Completa `ids` (relpath -> id) sem alterar os já existentes.

    id = slug da pasta do modelo ("GI_Furina" -> "gi_furina"). Começa com dígito
    -> prefixa a coleção ("_WineFox/05_magical" -> "winefox_05_magical").
    Só em colisão (ou pasta sem letras latinas) entra um hash curto do caminho.
    """
    taken = set(ids.values())
    for rel in rels:
        if rel in ids:
            continue
        col, name = rel.split("/", 1)
        base = slug(name, 32)
        if base and base[0].isdigit():
            base = f"{slug(col, 12)}_{base}"[:40].strip("_")
        if base and base[0].isdigit():
            base = "m" + base
        cand = base if base and len(base) >= 3 else ""
        if not cand or cand in taken:
            cand = f"{(base or 'm')[:30]}_{short_hash(rel)}"
        ids[rel] = cand
        taken.add(cand)
    return ids


def save_ids(path, ids):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(ids.items())), f, ensure_ascii=False, indent=1)
        f.write("\n")
