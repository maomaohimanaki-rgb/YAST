"""Parser de verificação do Molang Bedrock (só sintaxe).

O jogo descarta a animação inteira quando uma expressão não compila e isso só
aparece no Content Log. Este parser roda no build/audit e pega o erro antes.
"""
import json
import os

from .molang import tokenize


class MolangError(Exception):
    pass


class _P:
    def __init__(self, s):
        self.t = tokenize(s)
        for k, v in self.t:
            if k == "other":
                raise MolangError(f"caractere inválido {v!r}")
        self.i = 0

    def peek(self, o=0):
        j = self.i + o
        return self.t[j] if j < len(self.t) else ("eof", "")

    def take(self, val=None):
        tok = self.peek()
        if val is not None and tok[1] != val:
            raise MolangError(f"esperado {val!r}, veio {tok[1]!r} (token {self.i})")
        self.i += 1
        return tok

    def statements(self, closer=None):
        while True:
            if self.peek()[0] == "eof" or (closer and self.peek()[1] == closer):
                return
            self.statement()
            if self.peek()[1] == ";":
                self.take(";")
                continue
            if self.peek()[0] == "eof" or (closer and self.peek()[1] == closer):
                return
            raise MolangError(f"';' esperado antes de {self.peek()[1]!r}")

    def statement(self):
        k, v = self.peek()
        lv = v.lower()
        if k == "id" and lv == "return":
            self.take()
            return self.expr()
        if k == "id" and lv in ("break", "continue"):
            self.take()
            return
        if k == "id" and lv == "loop":
            self.take()
            self.take("(")
            self.expr()
            self.take(",")
            self.block()
            self.take(")")
            return
        if k == "id" and lv == "for_each":
            self.take()
            self.take("(")
            self.take()
            self.take(",")
            self.expr()
            self.take(",")
            self.block()
            self.take(")")
            return
        self.expr()

    def block(self):
        # Bedrock: dentro de { } todo statement termina em ';' (mesmo um só)
        self.take("{")
        while self.peek()[1] != "}":
            if self.peek()[0] == "eof":
                raise MolangError("'}' faltando")
            self.statement()
            self.take(";")
        self.take("}")

    def expr(self):
        start = self.i
        self.conditional()
        if self.peek()[1] == "=":
            # atribuição: lado esquerdo precisa ser variável
            k, v = self.t[start]
            if self.i - start != 1 or k != "id" or v.split(".")[0].lower() not in ("v", "variable", "t", "temp", "c", "context"):
                raise MolangError("atribuição a algo que não é variável")
            self.take("=")
            self.expr()

    def conditional(self):
        self.nullco()
        if self.peek()[1] == "?":
            self.take("?")
            if self.peek()[1] == "{":
                self.block()
            else:
                self.conditional()
            if self.peek()[1] == ":":
                self.take(":")
                if self.peek()[1] == "{":
                    self.block()
                else:
                    self.conditional()

    def nullco(self):
        self.binary(0)
        while self.peek()[1] == "??":
            self.take()
            self.binary(0)

    LEVELS = [("||",), ("&&",), ("==", "!="), ("<", ">", "<=", ">="), ("+", "-"), ("*", "/")]

    def binary(self, lvl):
        if lvl == len(self.LEVELS):
            return self.unary()
        self.binary(lvl + 1)
        while self.peek()[1] in self.LEVELS[lvl]:
            self.take()
            self.binary(lvl + 1)

    def unary(self):
        if self.peek()[1] in ("!", "-", "+"):
            self.take()
            return self.unary()
        self.primary()

    def primary(self):
        k, v = self.peek()
        if k in ("num", "str"):
            self.take()
        elif k == "id":
            self.take()
            if self.peek()[1] == "(":
                self.take("(")
                if self.peek()[1] != ")":
                    self.expr()
                    while self.peek()[1] == ",":
                        self.take()
                        self.expr()
                self.take(")")
        elif v == "(":
            self.take()
            self.expr()
            self.take(")")
        else:
            raise MolangError(f"token inesperado {v!r}")
        while self.peek()[1] in ("->", "["):
            if self.take()[1] == "->":
                self.primary()
            else:
                self.expr()
                self.take("]")


def check(expr):
    if isinstance(expr, (int, float, bool)):
        return
    p = _P(expr)
    if not p.t:
        raise MolangError("expressão vazia")
    p.statements()
    if p.peek()[0] != "eof":
        raise MolangError(f"sobrou {p.peek()[1]!r}")


def _schema_errors(a):
    """Regras de schema que o Bedrock aplica (vistas no Content Log do 1.26.52)."""
    errs = []
    for bone, chans in (a.get("bones") or {}).items():
        if not bone.strip():
            errs.append("osso com nome vazio")
        for ch in ("rotation", "position", "scale"):
            v = chans.get(ch)
            if not isinstance(v, dict):
                if isinstance(v, list) and len(v) != 3:
                    errs.append(f"{bone}.{ch}: vetor com {len(v)} valores")
                continue
            dynamic, cubic = False, False
            for t, kf in v.items():
                parts = [kf.get("pre"), kf.get("post")] if isinstance(kf, dict) else [kf]
                for p in parts:
                    if p is None:
                        continue
                    if not isinstance(p, list) or len(p) != 3:
                        errs.append(f"{bone}.{ch}@{t}: keyframe precisa ser [x,y,z]")
                    elif any(isinstance(c, str) for c in p):
                        dynamic = True
                if isinstance(kf, dict) and kf.get("lerp_mode") == "catmullrom":
                    cubic = True
            if dynamic and cubic:
                errs.append(f"{bone}.{ch}: catmullrom com keyframe não constante")
    return errs


def _anim_exprs(a):
    for k in ("start_delay", "loop_delay", "anim_time_update", "blend_weight"):
        if k in a:
            yield a[k]
    for chans in (a.get("bones") or {}).values():
        for ch in ("rotation", "position", "scale"):
            v = chans.get(ch)
            if v is None:
                continue
            frames = v.values() if isinstance(v, dict) else [v]
            for f in frames:
                if isinstance(f, dict):
                    f = [f.get("pre"), f.get("post")]
                for x in (f if isinstance(f, list) else [f]):
                    if isinstance(x, list):
                        yield from x
                    elif x is not None:
                        yield x
    for lst in (a.get("timeline") or {}).values():
        yield from lst


def validate_dir(rp):
    """Valida todas as expressões dos JSON gerados num RP. Retorna [(arquivo, expr, erro)]."""
    errs = []

    def chk(path, e):
        if isinstance(e, str):
            try:
                check(e)
            except MolangError as ex:
                errs.append((os.path.relpath(path, rp), e[:160], str(ex)))

    for sub, kind in (("animations", "a"), ("animation_controllers", "c"), ("entity", "e")):
        base = os.path.join(rp, sub, "yast")
        if not os.path.isdir(base):
            continue
        for f in os.listdir(base):
            path = os.path.join(base, f)
            with open(path, encoding="utf-8") as fh:
                d = json.load(fh)
            if kind == "a":
                for an, a in d["animations"].items():
                    for e in _anim_exprs(a):
                        chk(path, e)
                    for err in _schema_errors(a):
                        errs.append((os.path.relpath(path, rp), an, err))
            elif kind == "c":
                for c in d["animation_controllers"].values():
                    for st in c["states"].values():
                        for x in st.get("on_entry", []) + st.get("on_exit", []):
                            chk(path, x)
                        for t in st.get("transitions", []):
                            for x in t.values():
                                chk(path, x)
                        for a in st.get("animations", []):
                            if isinstance(a, dict):
                                for x in a.values():
                                    chk(path, x)
            else:
                sc = d["minecraft:client_entity"]["description"]["scripts"]
                for x in sc.get("initialize", []) + sc.get("pre_animation", []):
                    chk(path, x)
                for a in sc.get("animate", []):
                    if isinstance(a, dict):
                        for x in a.values():
                            chk(path, x)
    return errs


def validate_structure(rp):
    """Referências quebradas: animate -> animations, controlador -> animação, transição -> estado."""
    errs = []
    base = os.path.join(rp, "entity", "yast")
    if not os.path.isdir(base):
        return errs
    for f in os.listdir(base):
        mid = f[: -len(".entity.json")]
        with open(os.path.join(base, f), encoding="utf-8") as fh:
            desc = json.load(fh)["minecraft:client_entity"]["description"]
        with open(os.path.join(rp, "animations", "yast", f"{mid}.animation.json"), encoding="utf-8") as fh:
            anim_ids = set(json.load(fh)["animations"])
        with open(os.path.join(rp, "animation_controllers", "yast", f"{mid}.ac.json"), encoding="utf-8") as fh:
            ctrls = json.load(fh)["animation_controllers"]
        amap = desc["animations"]
        for short, full in amap.items():
            if full not in anim_ids and full not in ctrls:
                errs.append((f, f"animations.{short} -> {full} não existe"))
        for a in desc["scripts"]["animate"]:
            name = a if isinstance(a, str) else next(iter(a))
            if name not in amap:
                errs.append((f, f"animate {name} não declarado"))
        for cid, c in ctrls.items():
            states = c["states"]
            for sn in states:
                if not sn.isascii() or not sn.replace("_", "a").isalnum():
                    errs.append((f, f"{cid}: nome de estado inválido {sn!r}"))
            if c.get("initial_state", "default") not in states:
                errs.append((f, f"{cid}: initial_state inexistente"))
            for sn, st in states.items():
                for a in st.get("animations", []):
                    name = a if isinstance(a, str) else next(iter(a))
                    if name not in amap:
                        errs.append((f, f"{cid}.{sn}: animação {name} não declarada"))
                for t in st.get("transitions", []):
                    for target in t:
                        if target not in states:
                            errs.append((f, f"{cid}.{sn}: transição para {target} inexistente"))
    return errs
