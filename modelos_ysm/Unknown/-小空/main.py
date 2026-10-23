import math
from scipy.spatial.transform import Rotation as R

def rot_mat(x, y, z, m):
    return f'''
"v.cy = math.cos({x});",
"v.sy = math.sin({x});",
"v.cb = math.cos({y});",
"v.sb = math.sin({y});",
"v.ca = math.cos({z});",
"v.sa = math.sin({z});",

"v.{m}_00 = v.ca * v.cb;",
"v.{m}_01 = v.ca * v.sb * v.sy - v.sa * v.cy;",
"v.{m}_02 = v.ca * v.sb * v.cy + v.sa * v.sy;",
"v.{m}_03 = 0;",

"v.{m}_10 = v.sa * v.cb;",
"v.{m}_11 = v.sa * v.sb * v.sy + v.ca * v.cy;",
"v.{m}_12 = v.sa * v.sb * v.cy - v.ca * v.sy;",
"v.{m}_13 = 0;",

"v.{m}_20 = -v.sb;",
"v.{m}_21 = v.cb * v.sy;",
"v.{m}_22 = v.cb * v.cy;",
"v.{m}_23 = 0;",

"v.{m}_30 = 0;",
"v.{m}_31 = 0;",
"v.{m}_32 = 0;",
"v.{m}_33 = 1;",
'''

def rot_mat_inv(m):
    return f'''
"v.t = v.{m}_01;",
"v.{m}_01 = v.{m}_10;",
"v.{m}_10 = v.t;",
"v.t = v.{m}_02;",
"v.{m}_02 = v.{m}_20;",
"v.{m}_20 = v.t;",
"v.t = v.{m}_12;",
"v.{m}_12 = v.{m}_21;",
"v.{m}_21 = v.t;",
'''

def trans_mat(x, y, z, m):
    return f'''
"v.{m}_00 = 1;",
"v.{m}_01 = 0;",
"v.{m}_02 = 0;",
"v.{m}_03 = {x};",

"v.{m}_10 = 0;",
"v.{m}_11 = 1;",
"v.{m}_12 = 0;",
"v.{m}_13 = {y};",

"v.{m}_20 = 0;",
"v.{m}_21 = 0;",
"v.{m}_22 = 1;",
"v.{m}_23 = {z};",

"v.{m}_30 = 0;",
"v.{m}_31 = 0;",
"v.{m}_32 = 0;",
"v.{m}_33 = 1;",
'''

def trans_mat_inv(m):
    return f'''
"v.{m}_03 = -v.{m}_03;",
"v.{m}_13 = -v.{m}_13;",
"v.{m}_23 = -v.{m}_23;",
'''

def mat_mul(m, m0, m1):
    s = ""
    for i in range(4):
        for j in range(4):
            s += f'"v.{m1}_{i}{j} = v.{m}_{i}0 * v.{m0}_0{j}'
            for k in range(1, 4):
                s += f' + v.{m}_{i}{k} * v.{m0}_{k}{j}'
            s += ';",\n'
    return s

def mat_mulv_(m, v, v0, t):
    s = ""
    for i in range(3):
        s += f'"{v0[i]} = v.{m}_{i}0 * {v[0]}'
        for j in range(1, 3 + t):
            s += f' + v.{m}_{i}{j} * {v[j]}'
        s += ';",\n'
    return s

def mat_mulv(m, v, v0, t):
    return mat_mulv_(m, v, [f'v.{v0}_x', f'v.{v0}_y', f'v.{v0}_z'], t)

# ! l2g_m * off * rot = l2g_m'
# ! -rot * -off * g2l_m = g2l_m'
# def nxt_l2g_m(m, o, r, m0):
#     return f'''
# {trans_mat(o[0], o[1], o[2], 't_m')}
# {mat_mul(m, 't_m', 't_m0')}
# {rot_mat(r[0], r[1], r[2], 't_m')}
# {mat_mul('t_m0', 't_m', m0)}
# '''
def normalize(v):
    return f'''
"v.l = math.sqrt(v.{v}_x * v.{v}_x + v.{v}_y * v.{v}_y + v.{v}_z * v.{v}_z);",
"v.{v}_x = v.{v}_x / v.l;",
"v.{v}_y = v.{v}_y / v.l;",
"v.{v}_z = v.{v}_z / v.l;",
'''

def rot_mat_from(x, z, m):
    return f'''
"v.r_z = math.atan2({x[1]}, {x[0]}) * 180 / math.pi;",
"v.t_x = {z[0]} * math.cos(v.r_z) + {z[1]} * math.sin(v.r_z);",
"v.t_y = -{z[0]} * math.sin(v.r_z) + {z[1]} * math.cos(v.r_z);",
"v.r_x = -math.atan2(v.t_y, math.sqrt(v.t_x * v.t_x + {z[2]} * {z[2]})) * 180 / math.pi;",
"v.r_x = {z[2]} < 0 ? 180 - v.r_x : v.r_x;",
"v.r_y = math.atan2(v.t_x, {z[2]}) * 180 / math.pi;",
"v.r_y = {z[2]} < 0 ? 180 + v.r_y : v.r_y;",
{rot_mat('v.r_x', 'v.r_y', 'v.r_z', m)}
'''

def modify_yaw_rclk(v, t, v0):
    return f'''
"v.{v0}_x = v.{v}_x * v.cos_{t} + v.{v}_z * v.sin_{t};",
"v.{v0}_y = v.{v}_y;",
"v.{v0}_z = -v.{v}_x * v.sin_{t} + v.{v}_z * v.cos_{t};",
'''

def func(bs, t, v, h, hk, hv, hh, v0, pc, yc):
    ns, fgp, _, _ = bs[0]

    s = f'''
"v.p = ysm.bone_pivot_abs('{ns}');",
"v.p_x = ysm.bone_pivot_abs('{ns}X');",
"v.p_z = ysm.bone_pivot_abs('{ns}Z');",
"v.ax_x = -v.p_x.x + v.p.x;",
"v.ax_y = v.p_x.y - v.p.y;",
"v.ax_z = v.p_x.z - v.p.z;",
"v.az_x = -v.p_z.x + v.p.x;",
"v.az_y = v.p_z.y - v.p.y;",
"v.az_z = v.p_z.z - v.p.z;",
{trans_mat('-v.p.x', 'v.p.y', 'v.p.z', 't_m')}
{rot_mat_from(['v.ax_x', 'v.ax_y', 'v.ax_z'], ['v.az_x', 'v.az_y', 'v.az_z'], 't_m0')}
{mat_mul('t_m', 't_m0', 'l2g_m')}

{trans_mat_inv('t_m')}
{rot_mat_inv('t_m0')}
{mat_mul('t_m0', 't_m', 'g2l_m')}

"v.fp_g_x = -v.p.x;",
"v.fp_g_y = v.p.y;",
"v.fp_g_z = v.p.z;",
'''

    if hh:
        s += '''
"v.p = ysm.bone_pivot_abs('UpperBody');",
"v.p_y = ysm.bone_pivot_abs('UpperBodyY');",
"v.p_z = ysm.bone_pivot_abs('UpperBodyZ');",
"v.ay_x = -v.p_y.x + v.p.x;",
"v.ay_y = v.p_y.y - v.p.y;",
"v.ay_z = v.p_y.z - v.p.z;",
"v.az_x = -v.p_z.x + v.p.x;",
"v.az_y = v.p_z.y - v.p.y;",
"v.az_z = v.p_z.z - v.p.z;",
'''

    for i in range(0, len(bs) - 1):
        # * p_g 求的是 当前骨骼 枢轴点 的全局坐标
        # TODO 用 lp + lv 求尾点吧？不用了好像
        # * v_g 求的是 当前骨骼 的尾点 的默认情况全局坐标，尾点是骨骼空间中，负 y 轴上的一个点
        # [0, -ls[i], 0] zhuan pyr
        ns, gp, la, le = bs[i + 1]
        lp = [gp[0] - fgp[0], gp[1] - fgp[1], gp[2] - fgp[2]]
        lv = R.from_euler('xyz', [la[0], la[1], la[2]], degrees=True).apply([0, -le, 0])
        fgp = gp

        s += f'''
{mat_mulv('l2g_m', [lp[0], lp[1], lp[2], 1], 'p_g', True)}
{mat_mulv('l2g_m', [lv[0], lv[1], lv[2], 1], 'v_g', False)}
'''

        if h:
#             s += f'''
# "v.v_g_l = math.sqrt(v.v_g_x * v.v_g_x + v.v_g_z * v.v_g_z);",
# "v.v_g_x = {le} * v.v_g_x / v.v_g_l * math.sin({t});",
# "v.v_g_y = -{le} * math.cos({t});",
# "v.v_g_z = {le} * v.v_g_z / v.v_g_l * math.sin({t});",
# '''
            s += f'''
"v.v_g_x = {hk} * v.v_g_x + {hv[0]};",
"v.v_g_y = {hk} * v.v_g_y + {hv[1]};",
"v.v_g_z = {hk} * v.v_g_z + {hv[2]};",
'''

        if hh:
            s += '''
"v.azs_l = v.v_g_x * v.az_x + v.v_g_y * v.az_y + v.v_g_z * v.az_z;",
"v.xys_x = v.v_g_x - v.azs_l * v.az_x;",
"v.xys_y = v.v_g_y - v.azs_l * v.az_y;",
"v.xys_z = v.v_g_z - v.azs_l * v.az_z;",
"v.ays_l = v.v_g_x * v.ay_x + v.v_g_y * v.ay_y + v.v_g_z * v.ay_z;",
"v.xys_x = (v.ays_l > 0 ? -v.xys_x : v.xys_x) - v.ay_x + 0.1 * v.az_x;",
"v.xys_y = (v.ays_l > 0 ? -v.xys_y : v.xys_y) - v.ay_y + 0.1 * v.az_y;",
"v.xys_z = (v.ays_l > 0 ? -v.xys_z : v.xys_z) - v.ay_z + 0.1 * v.az_z;",
"v.theta = math.atan2(math.abs(v.azs_l), math.abs(v.ays_l)) * 180 / math.pi;",
"v.cond = v.azs_l < 0 && (v.ays_l < 0 || v.theta > 80);",
"v.v_g_x = v.cond ? v.xys_x : v.v_g_x;",
"v.v_g_y = v.cond ? v.xys_y : v.v_g_y;",
"v.v_g_z = v.cond ? v.xys_z : v.v_g_z;",
'''

        s += f'''
{modify_yaw_rclk(f'{ns}_p_g_s', 'md_yaw_d', 't')}
"v.t_x = (v.t_x - v.md_spd_x - v.p_g_x) + {v[0]} * v.v_g_x;",
"v.t_y = (v.t_y - v.md_spd_y - v.p_g_y) + {v[1]} * v.v_g_y;",
"v.t_z = (v.t_z - v.md_spd_z - v.p_g_z) + {v[2]} * v.v_g_z;",
'''
        
        if h and False:
            s += '''
"v.azs_l = v.t_x * v.az_x + v.t_y * v.az_y + v.t_z * v.az_z;",
"v.xys_x = v.t_x - v.azs_l * v.az_x;",
"v.xys_y = v.t_y - v.azs_l * v.az_y;",
"v.xys_z = v.t_z - v.azs_l * v.az_z;",
"v.ays_l = v.t_x * v.ay_x + v.t_y * v.ay_y + v.t_z * v.ay_z;",
"v.xys_x = (v.ays_l > 0 ? -v.xys_x : v.xys_x) - v.ay_x + 0.1 * v.az_x;",
"v.xys_y = (v.ays_l > 0 ? -v.xys_y : v.xys_y) - v.ay_y + 0.1 * v.az_y;",
"v.xys_z = (v.ays_l > 0 ? -v.xys_z : v.xys_z) - v.ay_z + 0.1 * v.az_z;",
"v.t_x = v.azs_l > 0 ? v.t_x : v.xys_x;",
"v.t_y = v.azs_l > 0 ? v.t_y : v.xys_y;",
"v.t_z = v.azs_l > 0 ? v.t_z : v.xys_z;",
'''

        s += f'''
{normalize('t')}
"v.t_x = v.t_x + v.fp_g_x;",
"v.t_y = v.t_y + v.fp_g_y;",
"v.t_z = v.t_z + v.fp_g_z;",
"v.fp_g_x = v.p_g_x;",
"v.fp_g_y = v.p_g_y;",
"v.fp_g_z = v.p_g_z;",
{mat_mulv('g2l_m', ['v.t_x', 'v.t_y', 'v.t_z', 1], 't_l', True)}
"v.{ns}_p = math.asin(math.min(math.abs(v.t_l_z), 1)) * 180 / math.pi;",
"v.{ns}_p = v.t_l_y > 0 ? 180 - v.{ns}_p : v.{ns}_p;",
"v.{ns}_p = v.t_l_z > 0 ? -v.{ns}_p : v.{ns}_p;",
"v.{ns}_y = math.asin(math.clamp(v.t_l_x, -1, 1)) * 180 / math.pi;",
"v.{ns}_y = v.t_l_y > 0 ? -v.{ns}_y : v.{ns}_y;",
'''
        
        if pc:
            s += f'''
"v.{ns}_p = math.clamp(v.{ns}_p, {pc[0]}, {pc[1]});",
'''
        if yc:
            s += f'''
"v.{ns}_y = math.clamp(v.{ns}_y, {yc[0]}, {yc[1]});",
'''

        s += f'''
{trans_mat(lp[0], lp[1], lp[2], 't_m')}
{rot_mat(f'v.{ns}_p', 0, f'v.{ns}_y', 't_m0')}
{mat_mul('l2g_m', 't_m', 't_m1')}
{mat_mul('t_m1', 't_m0', 'l2g_m')}
'''

        if i < len(bs) - 2:
            s += f'''
{trans_mat_inv('t_m')}
{rot_mat_inv('t_m0')}
{mat_mul('t_m', 'g2l_m', 't_m1')}
{mat_mul('t_m0', 't_m1', 'g2l_m')}
'''

# TODO 直接通过 v.t 计算 p_g?
        s += f'''
{mat_mulv('l2g_m', [0, -le, 0, 1], 't', True)}
"v.{ns}_p_g_s_x = v.{ns}_p_g_s_x * {1 - v0[0]} + {v0[0]} * v.t_x;",
"v.{ns}_p_g_s_y = v.{ns}_p_g_s_y * {1 - v0[1]} + {v0[1]} * v.t_y;",
"v.{ns}_p_g_s_z = v.{ns}_p_g_s_z * {1 - v0[2]} + {v0[2]} * v.t_z;",
'''
        
    return s


def func0():
    return '''
"LEar": {
    "rotation": [
        "v.lear = v.lear ? v.lear == 1000 ? 0 : v.lear + 1 : math.random(0, 1) < 0.001 ? 1 : 0; v.lear_ = math.floor(v.lear / 10); return v.lear_ == 1 || v.lear_ == 3 ? 8.9833571671 : 0",
        "v.lear_ == 1 || v.lear_ == 3 ? 12.55719447 : 0",
        "v.lear_ == 1 || v.lear_ == 3 ? 4.7719803237 : 0"
    ]
},

"REar": {
    "rotation": [
        "v.rear = v.rear ? v.rear == 1000 ? 0 : v.rear + 1 : math.random(0, 1) < 0.001 ? 1 : 0; v.rear_ = math.floor(v.rear / 10); return v.rear_ == 1 || v.rear_ == 3 ? 15.5399735599 : 0",
        "v.rear_ == 1 || v.rear_ == 3 ? -12.021964607 : 0",
        "v.rear_ == 1 || v.rear_ == 3 ? -5.8565169911 : 0"
    ]
}

"w": {
    "scale": "v.mouth_type_ = ctrl.death || ctrl.attacked ? 5 : ysm.food_level <= 6 ? 1 : v.roaming.mouth_type; return v.mouth_type_ == 0;"
},
"pingdan": {
    "scale": "v.mouth_type_ == 1"
},
"sanjiaozui": {
    "scale": "v.mouth_type_ == 2"
},
"ciyaxiao": {
    "scale": "v.mouth_type_ == 3"
},
"kaikouxiao": {
    "scale": "v.mouth_type_ == 4"
},
"haqi": {
    "scale": "v.mouth_type_ == 5"
},
"shengqi": {
    "scale": "v.mouth_type_ == 6"
},
"Eyes": {
    "scale": "v.eye_type_ = ctrl.sleep || ysm.food_level <= 6 ? 0 : ctrl.death || ctrl.attacked ? 1 : v.roaming.eye_type; return v.eye_type_ == 0;"
},
"haqieyes": {
    "scale": "v.eye_type_ == 1"
},
"tongchang": {
    "scale": "v.brow_type_ = ctrl.death || ctrl.attacked || ysm.food_level <= 6 ? 2 : v.roaming.brow_type; return v.brow_type_ == 0;"
},
"shenqi": {
    "scale": "v.brow_type_ == 1"
},
"zhoumei": {
    "scale": "v.brow_type_ == 2"
},

"Bangs2": {
    "rotation": ["math.min(-v.fhr_p, 15)", 0, "v.fhr_y"]
},
"Bangs3": {
    "rotation": ["math.min(-v.fhr_p, 15)", 0, "v.fhr_y"]
},
"Bangs4": {
    "rotation": ["math.min(-v.fhr_p, 15)", 0, "v.fhr_y"]
},
"Bangs5": {
    "rotation": ["math.min(-v.fhr_p, 15)", 0, "v.fhr_y"]
},
"Bangs6": {
    "rotation": ["math.min(-v.fhr_p, 15)", 0, "v.fhr_y"]
},
"Bangs7": {
    "rotation": ["math.min(-v.fhr_p, 15)", 0, "v.fhr_y"]
},
"LCH2": {
    "rotation": ["-v.fhr_p", 0, "v.fhr_y"]
},
"RCH2": {
    "rotation": ["-v.fhr_p", 0, "v.fhr_y"]
},
"LSH": {
    "rotation": ["math.min(-v.fhr_p, 0)", 0, "math.clamp(v.fhr_y, -15, 15)"]
},
"RSH": {
    "rotation": ["math.min(-v.fhr_p, 0)", 0, "math.clamp(v.fhr_y, -15, 15)"]
},
"LS": {
    "rotation": ["-v.str_p", 0, "v.str_y"]
},
"RS": {
    "rotation": ["-v.str_p", 0, "v.str_y"]
},
'''


# def rot_around_mat(x, y, z, x0, y0, z0, m):
#     return f'''
# {trans_mat(x0, y0, z0, 't_m')}
# {rot_mat(x, y, z, 't_m0')}
# {mat_mul('t_m', 't_m0', 't_m1')}
# {trans_mat(f'-{x0}', f'-{y0}', f'-{z0}', 't_m')}
# {mat_mul('t_m1', 't_m', m)}
# '''



# print(
#     rot_mat(90, 0, 0, 'm') +
#     rot_mat(0, 0, 90, 'm0') +
#     mat_mul('m0', 'm', 'm1') +
#     mat_mulv('m1', [0, 0, -1, 1], ['v.cnm.x', 'v.cnm.y', 'v.cnm.z'])
# )

# print(
#     rot_mat(-52, -24, -90, 'm') +
#     mat_mulv('m', [1, 0, 0, 1], 'cnmx', True) +
#     mat_mulv('m', [0, 0, 1, 1], 'cnmz', True) +
#     rot_mat_from(['v.cnmx_x', 'v.cnmx_y', 'v.cnmx_z'], ['v.cnmz_x', 'v.cnmz_y', 'v.cnmz_z'], 'm0')
# )

# 后发
print(
    func(
        [
            ('Head', [0, 33.3, 0], [], 0),
            ('hr', [0, 33.7894, 4.4021], [-10, 0, 0], 1.7464249196572994),
            ('hr0', [0, 32.0429750803427, 4.4021], [0, 0, 0], 3.202440475637291),
            ('hr1', [0, 28.840534604705407, 4.4021], [0, 0, 0], 4.716990566028302),
            ('hr2', [0, 24.123544038677107, 4.4021], [0, 0, 0], 4)
        ],
        10,
        [0.4, 0.4, 0.4],
        True,
        0.5,
        [0, -0.5, 0.05],
        True,
        [0.7, 0.7, 0.7],
        None,
        None
    )
)

# 前发
print(
    func(
        [
            ('Head', [0, 33.3, 0], [], 0),
            ('fhr', [-0.05, 35.25, -3.825], [0, 0, 0], 2)
        ],
        10,
        [0.4, 0.4, 0.4],
        True,
        0.5,
        [0, -1, 0],
        False,
        [0.7, 0.7, 0.7],
        None,
        None
    )
)

# 带子
print(
    func(
        [
            ('UpperBody', [0, 25.5, 0], [], 0),
            ('str', [0, 30.3623, -2.8604], [0, 0, 0], 3)
        ],
        10,
        [0.4, 0.4, 0.4],
        True,
        0,
        [0, -1, 0],
        False,
        [0.7, 0.7, 0.7],
        [0, 360],
        None
    )
)

# 尾巴
print(
    func(
        [
            ('UpBody', [0, 20.5, 0], [], 0),
            ('tl', [0, 20.9, 3.3], [-46.5, 0, 0], 4),
            ('tl0', [0, 16.7, 3.6], [-55, 0, 0], 4),
            ('tl1', [0, 13.1, 3.6], [-37.5, 0, 0], 5),
            ('tl2', [0, 8.2, 3.9], [-40, 0, 0], 3.5),
            ('tl3', [0, 4.9, 3.8], [40, 0, 0], 1.5),
            ('tl4', [0, 3.3, 3.8], [42.5, 0, 0], 3),
            ('tl5', [0, 0.8, 3.8], [45, 0, 0], 2.5)
        ],
        10,
        [0.5, 0.5, 0.5],
        False,
        0,
        [0, -1, 0],
        False,
        [0.5, 0.5, 0.5],
        None,
        None
    )
)

# 左耳朵
print(
    func(
        [
            ('learrt', [-2.7508, 40.5467, -0.2798], [], 0),
            ('learpy', [-2.7508, 40.5467, -0.2798], [0, 0, 0], 3)
        ],
        10,
        [0.4, 0.4, 0.4],
        False,
        0,
        [0, -1, 0],
        False,
        [1, 1, 1],
        # [0.7, 0.7, 0.7],
        # None,
        # None
        [-25, 25],
        [-25, 25]
    )
)

# 右耳朵
print(
    func(
        [
            ('rearrt', [2.7508, 40.5467, -0.2798], [], 0),
            ('rearpy', [2.7508, 40.5467, -0.2798], [0, 0, 0], 3)
        ],
        10,
        [0.4, 0.4, 0.4],
        False,
        0,
        [0, -1, 0],
        False,
        [1, 1, 1],
        # [0.7, 0.7, 0.7],
        # None,
        # None
        [-25, 25],
        [-25, 25]
    )
)

# print(R.from_euler('xyz', [175.2963, -12.4159, -52.2556], True).inv().as_euler('xyz', True))
# print(R.from_euler('xyz', [175.7838, 12.0456, 50.8091], True).inv().as_euler('xyz', True))