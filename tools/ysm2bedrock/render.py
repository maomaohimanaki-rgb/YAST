"""Renderizador offline de um avatar convertido (para depurar sem abrir o jogo).

Posa a geometria com a pose do simulador (simulate.py) e rasteriza os cubos com a textura,
recorte por alfa como o material entity_alphatest. Convenções do Blockbench para Bedrock:
X da geometria espelhado, rotação aplicada na ordem Z·Y·X com X e Y invertidos, frente do
modelo olhando para -Z (face "north").

    python3 -m ysm2bedrock.render RP_DIR MODEL_ID saida.png [--bone Head] [--side front|back|left|right]
"""
import math
import os
import sys

import numpy as np
from PIL import Image


def _rot(rx, ry, rz):
    rx, ry, rz = (math.radians(a) for a in (rx, ry, rz))
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def _affine(R=None, t=None, s=None):
    M = np.eye(4)
    if R is not None:
        M[:3, :3] = R
    if s is not None:
        M[:3, :3] = M[:3, :3] @ np.diag(s)
    if t is not None:
        M[:3, 3] = t
    return M


def _T(v):
    return _affine(t=np.array(v, dtype=float))


def bone_matrices(geo, pose):
    bones = {b["name"]: b for b in geo["bones"]}
    cache = {}

    def mat(name):
        if name in cache:
            return cache[name]
        b = bones[name]
        low = name.lower()
        p = b.get("pivot", [0, 0, 0])
        piv = np.array([-p[0], p[1], p[2]], dtype=float)
        r0 = b.get("rotation", [0, 0, 0])
        ra = pose["rotation"].get(low, [0, 0, 0])
        rx, ry, rz = r0[0] + ra[0], r0[1] + ra[1], r0[2] + ra[2]
        sc = pose["scale"].get(low, [1, 1, 1])
        pa = pose["position"].get(low, [0, 0, 0])
        local = _T([-pa[0], pa[1], pa[2]]) @ _T(piv) @ _affine(R=_rot(-rx, -ry, rz), s=sc) @ _T(-piv)
        parent = b.get("parent")
        M = (mat(parent) if parent in bones else np.eye(4)) @ local
        cache[name] = M
        return M

    return {n: mat(n) for n in bones}, bones


# faces: nome -> (cantos do quad em coordenadas 0..1 do cubo: TL, TR, BR, BL vistos de fora)
_FACES = {
    "north": [(1, 1, 0), (0, 1, 0), (0, 0, 0), (1, 0, 0)],
    "south": [(0, 1, 1), (1, 1, 1), (1, 0, 1), (0, 0, 1)],
    "east": [(0, 1, 0), (0, 1, 1), (0, 0, 1), (0, 0, 0)],
    "west": [(1, 1, 1), (1, 1, 0), (1, 0, 0), (1, 0, 1)],
    "up": [(1, 1, 1), (0, 1, 1), (0, 1, 0), (1, 1, 0)],
    "down": [(1, 0, 0), (0, 0, 0), (0, 0, 1), (1, 0, 1)],
}


def _box_uv(u, v, w, h, d, mirror):
    f = {
        "east": (u, v + d, d, h), "north": (u + d, v + d, w, h), "west": (u + d + w, v + d, d, h),
        "south": (u + 2 * d + w, v + d, w, h), "up": (u + d, v, w, d), "down": (u + d + w, v + d, w, -d),
    }
    if mirror:
        f = {k: (a + c, b, -c, e) for k, (a, b, c, e) in f.items()}
        f["east"], f["west"] = f["west"], f["east"]
    return f


def render(rp, mid, pose, geo, out, size=512, focus=None, side="front"):
    tex_path = os.path.join(rp, "textures", "yast", mid, "v0.png")
    tex = np.asarray(Image.open(tex_path).convert("RGBA"), dtype=np.uint8)
    th, tw = tex.shape[:2]
    desc = geo["description"]
    TW, TH = float(desc.get("texture_width", 64)), float(desc.get("texture_height", 64))
    mats, bones = bone_matrices(geo, pose)
    view = {"front": _rot(0, 180, 0), "back": np.eye(3), "left": _rot(0, 90, 0), "right": _rot(0, -90, 0)}[side]

    quads = []
    for name, b in bones.items():
        M = mats[name]
        for c in b.get("cubes", []):
            o = np.array(c["origin"], dtype=float)
            s = np.array(c["size"], dtype=float)
            inf = float(c.get("inflate", 0) or 0)
            x0, x1 = -(o[0] + s[0]) - inf, -o[0] + inf
            lo = np.array([x0, o[1] - inf, o[2] - inf])
            hi = np.array([x1, o[1] + s[1] + inf, o[2] + s[2] + inf])
            CM = np.eye(4)
            if "rotation" in c:
                cp = c.get("pivot", [0, 0, 0])
                cr = c["rotation"]
                piv = np.array([-cp[0], cp[1], cp[2]])
                CM = _T(piv) @ _affine(R=_rot(-cr[0], -cr[1], cr[2])) @ _T(-piv)
            uv = c.get("uv", [0, 0])
            if isinstance(uv, list):
                faces = _box_uv(uv[0], uv[1], s[0], s[1], s[2], c.get("mirror", False))
            else:
                faces = {k: (f["uv"][0], f["uv"][1], f.get("uv_size", [0, 0])[0], f.get("uv_size", [0, 0])[1])
                         for k, f in uv.items() if isinstance(f, dict) and "uv" in f}
            for fname, corners in _FACES.items():
                if fname not in faces:
                    continue
                u, v, uw, vh = faces[fname]
                pts = []
                for cx, cy, cz in corners:
                    # X espelhado: canto "1" de x fica no lado de x0
                    p = np.array([hi[0] - cx * (hi[0] - lo[0]), lo[1] + cy * (hi[1] - lo[1]), lo[2] + cz * (hi[2] - lo[2]), 1])
                    pts.append((M @ CM @ p)[:3])
                uvs = [(u, v), (u + uw, v), (u + uw, v + vh), (u, v + vh)]
                quads.append((np.array(pts), uvs))
    if not quads:
        raise ValueError("sem cubos")

    allp = np.concatenate([q[0] for q in quads]) @ view.T
    if focus and focus in mats:
        center = (mats[focus] @ np.array([0, 0, 0, 1.0]))[:3]
        fb = bones[focus]
        piv = fb.get("pivot", [0, 0, 0])
        center = (mats[focus] @ np.array([-piv[0], piv[1] + 4, piv[2], 1.0]))[:3] @ view.T
        half = 6.0
        xmin, xmax, ymin, ymax = center[0] - half, center[0] + half, center[1] - half, center[1] + half
    else:
        # só o que está perto do corpo (efeitos/cenários a centenas de pixels estragam o quadro)
        near = allp[(np.abs(allp[:, 0]) < 40) & (allp[:, 1] > -16) & (allp[:, 1] < 96) & (np.abs(allp[:, 2]) < 40)]
        if len(near):
            allp = near
        xmin, ymin = allp[:, 0].min(), allp[:, 1].min()
        xmax, ymax = allp[:, 0].max(), allp[:, 1].max()
        pad = 0.05 * max(xmax - xmin, ymax - ymin)
        xmin, xmax, ymin, ymax = xmin - pad, xmax + pad, ymin - pad, ymax + pad
    span = max(xmax - xmin, ymax - ymin)
    scale = size / span
    img = np.zeros((size, size, 4), dtype=np.uint8)
    img[..., :3] = 40
    img[..., 3] = 255
    zbuf = np.full((size, size), -np.inf)

    for pts, uvs in quads:
        P = pts @ view.T
        sx = (P[:, 0] - xmin) * scale
        sy = (ymax - P[:, 1]) * scale
        sz = P[:, 2]
        for tri in ((0, 1, 2), (0, 2, 3)):
            _raster(img, zbuf, sx[list(tri)], sy[list(tri)], sz[list(tri)], [uvs[i] for i in tri], tex, tw / TW, th / TH)
    Image.fromarray(img).save(out)


def _raster(img, zbuf, xs, ys, zs, uvs, tex, ku, kv):
    H, W = zbuf.shape
    x0, x1 = max(int(math.floor(xs.min())), 0), min(int(math.ceil(xs.max())), W - 1)
    y0, y1 = max(int(math.floor(ys.min())), 0), min(int(math.ceil(ys.max())), H - 1)
    if x0 > x1 or y0 > y1:
        return
    (ax, bx, cx), (ay, by, cy) = xs, ys
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(den) < 1e-9:
        return
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    w0 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
    w1 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
    w2 = 1 - w0 - w1
    inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
    if not inside.any():
        return
    z = w0 * zs[0] + w1 * zs[1] + w2 * zs[2]
    u = (w0 * uvs[0][0] + w1 * uvs[1][0] + w2 * uvs[2][0]) * ku
    v = (w0 * uvs[0][1] + w1 * uvs[1][1] + w2 * uvs[2][1]) * kv
    th, tw = tex.shape[:2]
    ui = np.clip(np.floor(u).astype(int), 0, tw - 1)
    vi = np.clip(np.floor(v).astype(int), 0, th - 1)
    texel = tex[vi, ui]
    sub = zbuf[y0:y1 + 1, x0:x1 + 1]
    ok = inside & (texel[..., 3] >= 128) & (z > sub)
    sub[ok] = z[ok]
    region = img[y0:y1 + 1, x0:x1 + 1]
    region[ok, :3] = texel[ok, :3]


def main():
    from .simulate import simulate
    rp, mid, out = sys.argv[1:4]
    focus = sys.argv[sys.argv.index("--bone") + 1] if "--bone" in sys.argv else None
    side = sys.argv[sys.argv.index("--side") + 1] if "--side" in sys.argv else "front"
    r = simulate(rp, mid, props={f"yast:c{i}": -99999 for i in range(12)})
    render(rp, mid, r["pose"], r["geo"], out, focus=focus, side=side)


if __name__ == "__main__":
    main()
