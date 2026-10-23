// 下划线开头的变量是脚本占用变量
// x y z 可以是实数也可以是变量
// m 是矩阵名
function rot_mat(x, y, z, m) {
    return `
"v._cy = math.cos(${x});",
"v._sy = math.sin(${x});",
"v._cb = math.cos(${y});",
"v._sb = math.sin(${y});",
"v._ca = math.cos(${z});",
"v._sa = math.sin(${z});",

"v.${m}_00 = v._ca * v._cb;",
"v.${m}_01 = v._ca * v._sb * v._sy - v._sa * v._cy;",
"v.${m}_02 = v._ca * v._sb * v._cy + v._sa * v._sy;",
"v.${m}_03 = 0;",

"v.${m}_10 = v._sa * v._cb;",
"v.${m}_11 = v._sa * v._sb * v._sy + v._ca * v._cy;",
"v.${m}_12 = v._sa * v._sb * v._cy - v._ca * v._sy;",
"v.${m}_13 = 0;",

"v.${m}_20 = -v._sb;",
"v.${m}_21 = v._cb * v._sy;",
"v.${m}_22 = v._cb * v._cy;",
"v.${m}_23 = 0;",

"v.${m}_30 = 0;",
"v.${m}_31 = 0;",
"v.${m}_32 = 0;",
"v.${m}_33 = 1;",
`
}

function rot_mat_inv(m) {
    return `
"v._t = v.${m}_01;",
"v.${m}_01 = v.${m}_10;",
"v.${m}_10 = v._t;",
"v._t = v.${m}_02;",
"v.${m}_02 = v.${m}_20;",
"v.${m}_20 = v._t;",
"v._t = v.${m}_12;",
"v.${m}_12 = v.${m}_21;",
"v.${m}_21 = v._t;",
`
}

// x y z 可以是实数也可以是变量
function trans_mat(x, y, z, m) {
    return `
"v.${m}_00 = 1;",
"v.${m}_01 = 0;",
"v.${m}_02 = 0;",
"v.${m}_03 = ${x};",

"v.${m}_10 = 0;",
"v.${m}_11 = 1;",
"v.${m}_12 = 0;",
"v.${m}_13 = ${y};",

"v.${m}_20 = 0;",
"v.${m}_21 = 0;",
"v.${m}_22 = 1;",
"v.${m}_23 = ${z};",

"v.${m}_30 = 0;",
"v.${m}_31 = 0;",
"v.${m}_32 = 0;",
"v.${m}_33 = 1;",
`
}

function trans_mat_inv(m) {
    return `
"v.${m}_03 = -v.${m}_03;",
"v.${m}_13 = -v.${m}_13;",
"v.${m}_23 = -v.${m}_23;",
`
}

function mat_mul(m, m0, m1) {
    let s = '';
    for (let i = 0; i < 4; ++i) {
        for (let j = 0; j < 4; ++j) {
            s += `"v.${m1}_${i}${j} = v.${m}_${i}0 * v.${m0}_0${j}`;
            for (let k = 1; k < 4; ++k) {
                s += ` + v.${m}_${i}${k} * v.${m0}_${k}${j}`;
            }
            s += `;",\n`;
        }
    }
    return s;
}

function mat_mulv_(m, v, v0, t) {
    let s = '';
    for (let i = 0; i < 3; ++i) {
        s += `"${v0[i]} = v.${m}_${i}0 * ${v[0]}`;
        for (let j = 1; j < 3; ++j) {
            s += ` + v.${m}_${i}${j} * ${v[j]}`;
        }
        if (t) {
            s += ` + v.${m}_${i}3`;
        }
        s += `;",\n`;
    }
    return s;
}

function mat_mulv(m, v, v0, t) {
    return mat_mulv_(m, v, [`v.${v0}_x`, `v.${v0}_y`, `v.${v0}_z`], t);
}

function normalize(v) {
    return `
"v._l = math.sqrt(v.${v}_x * v.${v}_x + v.${v}_y * v.${v}_y + v.${v}_z * v.${v}_z);",
"v.${v}_x = v.${v}_x / v._l;",
"v.${v}_y = v.${v}_y / v._l;",
"v.${v}_z = v.${v}_z / v._l;",
`
}

function rot_mat_from(x, z, m) {
    return `
"v.r_z = math.atan2({x[1]}, {x[0]}) * 180 / math.pi;",
"v.t_x = {z[0]} * math.cos(v.r_z) + {z[1]} * math.sin(v.r_z);",
"v.t_y = -{z[0]} * math.sin(v.r_z) + {z[1]} * math.cos(v.r_z);",
"v.r_x = -math.atan2(v.t_y, math.sqrt(v.t_x * v.t_x + {z[2]} * {z[2]})) * 180 / math.pi;",
"v.r_x = {z[2]} < 0 ? 180 - v.r_x : v.r_x;",
"v.r_y = math.atan2(v.t_x, {z[2]}) * 180 / math.pi;",
"v.r_y = {z[2]} < 0 ? 180 + v.r_y : v.r_y;",
${rot_mat('v.r_x', 'v.r_y', 'v.r_z', m)}
`    
}

function tmp(params) {
    let bs = Group.multi_selected;
    let b = bs[0].parent;
    let ns = b.name;
    let fgp = b.origin.V3_toThree();

    let s = `
"v.p = ysm.bone_pivot_abs('${ns}');",
"v.p_x = ysm.bone_pivot_abs('${ns}X');",
"v.p_z = ysm.bone_pivot_abs('${ns}Z');",
"v.ax_x = -v.p_x.x + v.p.x;",
"v.ax_y = v.p_x.y - v.p.y;",
"v.ax_z = v.p_x.z - v.p.z;",
"v.az_x = -v.p_z.x + v.p.x;",
"v.az_y = v.p_z.y - v.p.y;",
"v.az_z = v.p_z.z - v.p.z;",
${trans_mat('-v.p.x', 'v.p.y', 'v.p.z', 't_m')}
${rot_mat_from(['v.ax_x', 'v.ax_y', 'v.ax_z'], ['v.az_x', 'v.az_y', 'v.az_z'], 't_m0')}
${mat_mul('t_m', 't_m0', 'l2g_m')}

${trans_mat_inv('t_m')}
${rot_mat_inv('t_m0')}
${mat_mul('t_m0', 't_m', 'g2l_m')}

"v.fp_g_x = -v.p.x;",
"v.fp_g_y = v.p.y;",
"v.fp_g_z = v.p.z;",
`;

    for (let i = 0; i < bs.length; ++i) {
        const b = bs[i];
        const ns = b.name;
        const gp = b.origin.V3_toThree();
        const la = b.rotation.V3_toThree();
        const le = gp.sub(fgp).length();
        fgp = gp;
    }
}




function get_l2g_mat(obj, map, cube) {
    let mat = map.get(obj.name);
    if (mat === undefined) {
        let pori;
        let rot = obj.rotation;
        let ori = obj.origin;

        if (obj.parent === 'root') {
            mat = new THREE.Matrix4();
            pori = [0, 0, 0];
        } else {
            mat = get_l2g_mat(obj.parent, map, false);
            pori = obj.parent.origin;
        }

        mat.multiply(new THREE.Matrix4().makeTranslation(ori[0] - pori[0], ori[1] - pori[1], ori[2] - pori[2]))
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0] / 180 * Math.PI, rot[1] / 180 * Math.PI, rot[2] / 180 * Math.PI, 'ZYX')));

        if (!cube) {
            map.set(obj.name, mat);
        }
    }

    return mat.clone();
}

function get_g2l_mat(obj) {
    let mat = new THREE.Matrix4();

    for (;  obj !== 'root'; obj = obj.parent) {
        let pori;
        let rot = obj.rotation;
        let ori = obj.origin;

        if (obj.parent === 'root') {
            pori = [0, 0, 0];
        } else {
            pori = obj.parent.origin;
        }

        mat.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-rot[0] / 180 * Math.PI, -rot[1] / 180 * Math.PI, -rot[2] / 180 * Math.PI, 'XYZ')))
        .multiply(new THREE.Matrix4().makeTranslation(pori[0] - ori[0], pori[1] - ori[1], pori[2] - ori[2]));
    }

    return mat;
}

function move_to_group() {
    Undo.initEdit({
        outliner: true,
        elements: Cube.selected
    });

    let g2l = get_g2l_mat(Group.first_selected);

    let map = new Map();
    for (const cube of Cube.selected) {
        let l2g = get_l2g_mat(cube, map, true).premultiply(g2l);
        let rot = new THREE.Euler().setFromRotationMatrix(l2g, 'ZYX');
        let ori = new THREE.Vector3().setFromMatrixPosition(l2g);

        let dtx = ori.x + Group.first_selected.origin[0] - cube.origin[0];
        let dty = ori.y + Group.first_selected.origin[1] - cube.origin[1];
        let dtz = ori.z + Group.first_selected.origin[2] - cube.origin[2];

        cube.from[0] += dtx;
        cube.from[1] += dty;
        cube.from[2] += dtz;
        cube.to[0] += dtx;
        cube.to[1] += dty;
        cube.to[2] += dtz;

        cube.rotation[0] = rot.x * 180 / Math.PI;
        cube.rotation[1] = rot.y * 180 / Math.PI;
        cube.rotation[2] = rot.z * 180 / Math.PI;
        cube.origin[0] += dtx;
        cube.origin[1] += dty;
        cube.origin[2] += dtz;

        cube.addTo(Group.first_selected);
    }

    Undo.finishEdit('move_to_group');
}













function get_content(obj, cubes, groups) {
    if (obj instanceof Group) {
        groups.push(obj);
        for (const child of obj.children) {
            get_content(child, cubes, groups);
        }
    } else {
        cubes.push(obj);
    }
}

BBPlugin.register('JDWL', {
    title: 'JDWL',
    author: '1n4i34',
    description: '',
    variant: 'desktop',
    onload() {
        new BarMenu('JDWL', [
            {
                name: '迁移先选组到后选组',
                id: 'add_group_to_group',
                icon: 'Move',
                click() {
                    new Dialog(
                        'add_group_to_group', {
                            title: '迁移先选组到后选组',
                            lines: [
                                '此操作将:<br/>',
                                `&emsp;&emsp;保持组${Group.multi_selected[0].name}内容的全局位置与旋转不变，<br/>`,
                                `&emsp;&emsp;同时将它们迁移到组${Group.multi_selected[1].name}下。<br/>`,
                                '确定执行此操作吗？',
                            ],
                            onConfirm() {
                                let cubes = [];
                                let groups = [];
                                get_content(Group.multi_selected[0], cubes, groups);

                                Undo.initEdit({
                                    outliner: true,
                                    elements: cubes
                                });

                                let g2l = new THREE.Matrix4();
                                for (let obj = Group.multi_selected[1];  obj !== 'root'; obj = obj.parent) {
                                    let pori;
                                    let rot = obj.rotation;
                                    let ori = obj.origin;

                                    if (obj.parent === 'root') {
                                        pori = [0, 0, 0];
                                    } else {
                                        pori = obj.parent.origin;
                                    }

                                    g2l.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-rot[0] / 180 * Math.PI, -rot[1] / 180 * Math.PI, -rot[2] / 180 * Math.PI, 'XYZ')))
                                    .multiply(new THREE.Matrix4().makeTranslation(pori[0] - ori[0], pori[1] - ori[1], pori[2] - ori[2]));
                                }

                                let l2g = new THREE.Matrix4();
                                for (let obj = Group.multi_selected[0];  obj !== 'root'; obj = obj.parent) {
                                    let pori;
                                    let rot = obj.rotation;
                                    let ori = obj.origin;

                                    if (obj.parent === 'root') {
                                        pori = [0, 0, 0];
                                    } else {
                                        pori = obj.parent.origin;
                                    }

                                    l2g.premultiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0] / 180 * Math.PI, rot[1] / 180 * Math.PI, rot[2] / 180 * Math.PI, 'ZYX')))
                                    .premultiply(new THREE.Matrix4().makeTranslation(ori[0] - pori[0], ori[1] - pori[1], ori[2] - pori[2]));
                                }
                                
                                l2g.premultiply(g2l);
                                let rot = new THREE.Euler().setFromRotationMatrix(l2g, 'ZYX');
                                let ori = new THREE.Vector3().setFromMatrixPosition(l2g);

                                let dtx = ori.x + Group.multi_selected[1].origin[0] - Group.multi_selected[0].origin[0];
                                let dty = ori.y + Group.multi_selected[1].origin[1] - Group.multi_selected[0].origin[1];
                                let dtz = ori.z + Group.multi_selected[1].origin[2] - Group.multi_selected[0].origin[2];

                                for (const cube of cubes) {
                                    cube.origin[0] += dtx;
                                    cube.origin[1] += dty;
                                    cube.origin[2] += dtz;
                                    cube.from[0] += dtx;
                                    cube.from[1] += dty;
                                    cube.from[2] += dtz;
                                    cube.to[0] += dtx;
                                    cube.to[1] += dty;
                                    cube.to[2] += dtz;
                                }

                                for (const group of groups) {
                                    group.origin[0] += dtx;
                                    group.origin[1] += dty;
                                    group.origin[2] += dtz;
                                }

                                Group.multi_selected[0].rotation[0] = rot.x * 180 / Math.PI;
                                Group.multi_selected[0].rotation[1] = rot.y * 180 / Math.PI;
                                Group.multi_selected[0].rotation[2] = rot.z * 180 / Math.PI;

                                Group.multi_selected[0].addTo(Group.multi_selected[1]);

                                Undo.finishEdit('add_group_to_group');
                            }
                        }
                    ).show();
                }
            },
            {
                name: '生成所选组参数并创建XZ辅助组',
                id: 'gen_params_and_creat_xz',
                icon: 'Build',
                click() {
                    s = '';
                    for (let i = 0; i < Group.multi_selected.length - 1; ++i) {
                        const group = Group.multi_selected[i];
                        s += `('${group.name}', [${group.origin[0]}, ${group.origin[1]}, ${group.origin[2]}], [${group.rotation[0]}, ${group.rotation[1]}, ${group.rotation[2]}], ${group.origin[1] - Group.multi_selected[i + 1].origin[1]}),\n`;
                    }

                    new Dialog(
                        'gen_params_and_creat_xz', {
                            title: '生成所选组参数并创建XZ辅助组',
                            lines: [
                                '为所选组生成了以下参数，请复制到python脚本中使用。<br/>',
                                '是否需要创建XZ辅助组？(底部选项)'
                            ],
                            form: {
                                'params': { type: 'textarea', value: s }
                            },
                            onConfirm() {
                                let has_x = false;
                                let has_z = false;
                                for (const child of Group.first_selected.children) {
                                    if (child instanceof Group) {
                                        if (child.name === `${Group.first_selected.name}X`) {
                                            has_x = true;
                                        }
                                        if (child.name === `${Group.first_selected.name}Z`) {
                                            has_z = true;
                                        }
                                    }
                                }

                                Undo.initEdit({
                                    outliner: true,
                                });

                                if (!has_x) {
                                    new Group({
                                        name: `${Group.first_selected.name}X`,
                                        origin: [Group.first_selected.origin[0] + 1, Group.first_selected.origin[1], Group.first_selected.origin[2]],
                                    }).addTo(Group.first_selected).init();
                                }

                                if (!has_z) {
                                    new Group({
                                        name: `${Group.first_selected.name}Z`,
                                        origin: [Group.first_selected.origin[0], Group.first_selected.origin[1], Group.first_selected.origin[2] + 1],
                                    }).addTo(Group.first_selected).init();
                                }

                                Undo.finishEdit('create_xz');
                            }
                        }
                    ).show();
                }
            }
        ],
        {
            name: 'JDWL',
        });

        MenuBar.update();
    }
})