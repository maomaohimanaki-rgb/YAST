"""Interpretador de Molang com a semântica do Bedrock — para diagnosticar sem abrir o jogo.

Regras imitadas (vistas no Content Log):
  * ler variável que não existe -> a expressão INTEIRA devolve 0 (efeitos já feitos ficam);
  * `v.x ?? y` não dá erro quando v.x não existe;
  * divisão por zero -> 0;
  * expressão complexa (com `;`) sem `return` devolve 0.
"""
import math
import random

from .molang import tokenize


class UnknownVar(Exception):
    pass


class _Return(Exception):
    def __init__(self, v):
        self.v = v


class _Break(Exception):
    pass


class _Continue(Exception):
    pass


# --------------------------------------------------------------------------- parser -> AST
class _Parser:
    def __init__(self, s):
        self.t = tokenize(s)
        self.i = 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else ("eof", "")

    def take(self, v=None):
        tok = self.peek()
        if v is not None and tok[1] != v:
            raise SyntaxError(f"esperado {v}, veio {tok[1]}")
        self.i += 1
        return tok

    def program(self):
        stmts = []
        complex_ = False
        while self.peek()[0] != "eof":
            stmts.append(self.statement())
            if self.peek()[1] == ";":
                self.take()
                complex_ = True
        return ("prog", stmts, complex_)

    def statement(self):
        k, v = self.peek()
        lv = v.lower()
        if k == "id" and lv == "return":
            self.take()
            return ("return", self.expr())
        if k == "id" and lv in ("break", "continue"):
            self.take()
            return (lv,)
        if k == "id" and lv == "loop":
            self.take()
            self.take("(")
            n = self.expr()
            self.take(",")
            b = self.block()
            self.take(")")
            return ("loop", n, b)
        if k == "id" and lv == "for_each":
            self.take()
            self.take("(")
            var = self.take()[1].lower()
            self.take(",")
            arr = self.expr()
            self.take(",")
            b = self.block()
            self.take(")")
            return ("foreach", var, arr, b)
        return self.expr()

    def block(self):
        self.take("{")
        stmts = []
        while self.peek()[1] != "}":
            stmts.append(self.statement())
            if self.peek()[1] == ";":
                self.take()
        self.take("}")
        return ("block", stmts)

    def expr(self):
        left = self.cond()
        if self.peek()[1] == "=":
            self.take()
            return ("assign", left, self.expr())
        return left

    def cond(self):
        c = self.nullco()
        if self.peek()[1] == "?":
            self.take()
            a = self.block() if self.peek()[1] == "{" else self.cond()
            b = None
            if self.peek()[1] == ":":
                self.take()
                b = self.block() if self.peek()[1] == "{" else self.cond()
            return ("tern", c, a, b)
        return c

    def nullco(self):
        a = self.binary(0)
        while self.peek()[1] == "??":
            self.take()
            a = ("nc", a, self.binary(0))
        return a

    LV = [("||",), ("&&",), ("==", "!="), ("<", ">", "<=", ">="), ("+", "-"), ("*", "/")]

    def binary(self, lvl):
        if lvl == len(self.LV):
            return self.unary()
        a = self.binary(lvl + 1)
        while self.peek()[1] in self.LV[lvl]:
            op = self.take()[1]
            a = ("bin", op, a, self.binary(lvl + 1))
        return a

    def unary(self):
        if self.peek()[1] in ("!", "-", "+"):
            op = self.take()[1]
            return ("un", op, self.unary())
        return self.postfix()

    def postfix(self):
        k, v = self.peek()
        if k == "num":
            self.take()
            node = ("num", float(v.rstrip("fF")))
        elif k == "str":
            self.take()
            node = ("str", v[1:-1])
        elif k == "id":
            self.take()
            name = v.lower()
            if self.peek()[1] == "(":
                self.take()
                args = []
                if self.peek()[1] != ")":
                    args.append(self.expr())
                    while self.peek()[1] == ",":
                        self.take()
                        args.append(self.expr())
                self.take(")")
                node = ("call", name, args)
            else:
                node = ("id", name)
        elif v == "(":
            self.take()
            node = self.expr()
            self.take(")")
        elif v == "{":
            node = self.block()
        else:
            raise SyntaxError(f"token {v}")
        while self.peek()[1] in ("->", "["):
            if self.take()[1] == "->":
                self.postfix()
                node = ("num", 0.0)
            else:
                self.expr()
                self.take("]")
        return node


_CACHE = {}


def parse(s):
    if s not in _CACHE:
        _CACHE[s] = _Parser(s).program()
    return _CACHE[s]


# --------------------------------------------------------------------------- avaliação
class Ctx:
    def __init__(self, props, variables=None):
        self.props = props
        self.v = variables if variables is not None else {}
        self.t = {}
        self.q = {"life_time": 0.0, "anim_time": 0.0, "delta_time": 1 / 60, "distance_from_camera": 4.0,
                  "all_animations_finished": 0.0, "any_animation_finished": 0.0, "time_of_day": 0.25,
                  "time_stamp": 0.0, "body_y_rotation": 0.0, "is_alive": 1.0, "frame_alpha": 0.0,
                  "cardinal_facing_2d": 2.0, "actor_count": 1.0, "moon_phase": 0.0, "day": 0.0}
        self.unknown = {}

    def run(self, s):
        """Executa uma expressão. Erro de variável = devolve 0 (efeitos anteriores ficam)."""
        if isinstance(s, (int, float)):
            return float(s)
        if not isinstance(s, str):
            return 0.0
        try:
            prog = parse(s)
        except Exception:  # noqa: BLE001 — sintaxe já é verificada no molang_check
            return 0.0
        self.t = {}
        try:
            return self._prog(prog)
        except UnknownVar as e:
            self.unknown[str(e)] = self.unknown.get(str(e), 0) + 1
            return 0.0
        except (_Break, _Continue):
            return 0.0

    def _prog(self, prog):
        _, stmts, complex_ = prog
        try:
            val = 0.0
            for st in stmts:
                val = self.ev(st)
            return 0.0 if complex_ else _num(val)
        except _Return as r:
            return _num(r.v)

    def ev(self, n):
        k = n[0]
        if k == "num":
            return n[1]
        if k == "str":
            return n[1]
        if k == "id":
            return self.read(n[1])
        if k == "assign":
            name = n[1][1] if n[1][0] == "id" else None
            val = self.ev(n[2])
            if name:
                self.write(name, val)
            return val
        if k == "bin":
            op = n[1]
            if op == "&&":
                return 1.0 if _truth(self.ev(n[2])) and _truth(self.ev(n[3])) else 0.0
            if op == "||":
                return 1.0 if _truth(self.ev(n[2])) or _truth(self.ev(n[3])) else 0.0
            a, b = self.ev(n[2]), self.ev(n[3])
            if op in ("==", "!="):
                eq = a == b if isinstance(a, str) or isinstance(b, str) else abs(_num(a) - _num(b)) < 1e-9
                return 1.0 if eq == (op == "==") else 0.0
            a, b = _num(a), _num(b)
            if op == "+": return a + b
            if op == "-": return a - b
            if op == "*": return a * b
            if op == "/": return a / b if b != 0 else 0.0
            if op == "<": return 1.0 if a < b else 0.0
            if op == ">": return 1.0 if a > b else 0.0
            if op == "<=": return 1.0 if a <= b else 0.0
            if op == ">=": return 1.0 if a >= b else 0.0
        if k == "un":
            x = self.ev(n[2])
            if n[1] == "!": return 0.0 if _truth(x) else 1.0
            if n[1] == "-": return -_num(x)
            return _num(x)
        if k == "tern":
            if _truth(self.ev(n[1])):
                return self.ev(n[2])
            return self.ev(n[3]) if n[3] is not None else 0.0
        if k == "nc":
            try:
                return self.ev(n[1])
            except UnknownVar:
                return self.ev(n[2])
        if k == "block":
            for st in n[1]:
                self.ev(st)
            return 0.0
        if k == "return":
            raise _Return(self.ev(n[1]))
        if k == "break":
            raise _Break()
        if k == "continue":
            raise _Continue()
        if k == "loop":
            cnt = int(min(max(_num(self.ev(n[1])), 0), 1024))
            for _ in range(cnt):
                try:
                    self.ev(n[2])
                except _Break:
                    break
                except _Continue:
                    continue
            return 0.0
        if k == "foreach":
            return 0.0
        if k == "call":
            return self.call(n[1], [self.ev(a) for a in n[2]])
        return 0.0

    def read(self, name):
        ns, _, rest = name.partition(".")
        if ns in ("v", "variable"):
            if rest in self.v:
                return self.v[rest]
            raise UnknownVar("v." + rest)
        if ns in ("t", "temp"):
            if rest in self.t:
                return self.t[rest]
            raise UnknownVar("t." + rest)
        if ns in ("q", "query"):
            return self.q.get(rest, 0.0)
        if ns == "math" and rest == "pi":
            return math.pi
        return 0.0

    def write(self, name, val):
        ns, _, rest = name.partition(".")
        if ns in ("v", "variable"):
            self.v[rest] = val
        elif ns in ("t", "temp"):
            self.t[rest] = val

    def call(self, name, a):
        f = name.split(".", 1)[1] if "." in name else name
        x = [_num(v) if not isinstance(v, str) else v for v in a]
        if name.startswith(("q.", "query.")):
            if f == "property":
                return self.props.get(a[0], 0.0) if a else 0.0
            if f == "has_property":
                return 1.0
            return self.q.get(f, 0.0)
        try:
            if f == "abs": return abs(x[0])
            if f == "sin": return math.sin(math.radians(x[0]))
            if f == "cos": return math.cos(math.radians(x[0]))
            if f == "asin": return math.degrees(math.asin(max(-1, min(1, x[0]))))
            if f == "acos": return math.degrees(math.acos(max(-1, min(1, x[0]))))
            if f == "atan": return math.degrees(math.atan(x[0]))
            if f == "atan2": return math.degrees(math.atan2(x[0], x[1]))
            if f == "clamp": return max(x[1], min(x[2], x[0]))
            if f == "min": return min(x[0], x[1])
            if f == "max": return max(x[0], x[1])
            if f == "floor": return math.floor(x[0])
            if f == "ceil": return math.ceil(x[0])
            if f == "round": return float(round(x[0]))
            if f == "trunc": return float(math.trunc(x[0]))
            if f == "mod": return math.fmod(x[0], x[1]) if x[1] else 0.0
            if f == "pow": return math.pow(x[0], x[1])
            if f == "sqrt": return math.sqrt(x[0]) if x[0] >= 0 else 0.0
            if f == "exp": return math.exp(min(x[0], 700))
            if f == "ln": return math.log(x[0]) if x[0] > 0 else 0.0
            if f == "lerp": return x[0] + (x[1] - x[0]) * x[2]
            if f == "lerprotate": return x[0] + (x[1] - x[0]) * x[2]
            if f == "random": return random.uniform(x[0], x[1])
            if f == "random_integer": return float(random.randint(int(x[0]), int(x[1])))
            if f == "die_roll": return sum(random.uniform(x[1], x[2]) for _ in range(int(x[0])))
            if f == "hermite_blend": return 3 * x[0] ** 2 - 2 * x[0] ** 3
            if f == "sign": return math.copysign(1.0, x[0])
            if f == "min_angle": return (x[0] + 180) % 360 - 180
        except (IndexError, ValueError, OverflowError, ZeroDivisionError):
            return 0.0
        return 0.0


def _num(v):
    if isinstance(v, str):
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _truth(v):
    return bool(v) if isinstance(v, str) else _num(v) != 0
