let button;

Plugin.register('yyhq_plugin', {
  title: 'Ysm Convenient Tool by yyhq',
  author: 'yyhq',
  icon: 'icon',
  description: '烟雨画桥的工具箱',
  version: '1.0.9',
  variant: 'both',
  about: `变量转换：\n
  q.anim_time=>粒子存在时间\n
  v.random_num=>随机数（个）有限轮次模式下固定（0->1）\n
  v.random_group_num=>随机数（0->1）\n
  v.gp_num=>团序号数（1->n）\n
  v.part_num=>粒子在团中序号数（1->n）\n
  v.follow=>粒子在绑定跟随后的参数\n
  v.part_set_x=>组x坐标只能在缩放使用（用于粒子）\n
  v.part_set_y=>组y坐标只能在缩放使用（用于粒子）\n
  v.part_set_z=>组z坐标只能在缩放使用（用于粒子）\n
  v.part_scale=>粒子缩放只能在缩放使用（用于粒子）\n
  `,

  onload() {

    tw_test = new Action('tw_test', {
      icon: '>>',     // 图标
      name: `测试`,
      click: test
    })
    tw_path = new Action('tw_path', {
      icon: '>>',     // 图标
      name: `导入数据`,
      click: tw_run
    })
    tw_path2 = new Action('tw_path2', {
      icon: '>>',     // 图标
      name: `导出数据`,
      click: tw_run2
    })
    tw_input = new Action('tw_input', {
      icon: '>>',     // 图标
      name: `数据面版`,
      click: frame
    })
    track_model = new Action('track_model', {
      icon: '>>',     // 图标
      name: `连杆`,
      click: track_model_frame
    })
    track_model2 = new Action('track_model2', {
      icon: '>>',     // 图标
      name: `轨迹`,
      click: track_model_frame2
    })
    dissipate_test = new Action('dissipate_test', {
      icon: '>>',     // 图标
      name: `面板`,
      click: dissipate_model_frame
    })
    dissipate_resave = new Action('dissipate_resave', {
      icon: '>>',     // 图标
      name: `解析组`,
      click: dissipate_model_resolve
    })
    // ==================== 主菜单栏菜单 ====================
    MenuBar.addAction(new BarMenu('ysm_more', [
      {
        name: '粒子',      // 显示名称
        icon: '~',     // 图标
        children: [tw_path, tw_path2, tw_input],
      },
      {
        id: 'stop_test',
        name: '绝对静止',      // 显示名称
        icon: '>>',     // 图标
        click: stop_model_frame
      },
      {
        id: 'follow_test',
        name: '目标跟随',      // 显示名称
        icon: '>>',     // 图标
        click: follow_model_frame
      },
      {
        id: 'boids',
        name: '鱼群',      // 显示名称
        icon: '>>',     // 图标
        click: boids_model_frame
      },
      {
        name: '路径跟踪',      // 显示名称
        icon: '~',     // 图标
        children: [track_model, track_model2],
      },
      {
        id: 'dissipate_test',
        name: '消散',      // 显示名称
        icon: '~',     // 图标
        children: [dissipate_test, dissipate_resave],
      }
    ], {
      name: 'yyhq工具包',
      condition: {
        modes: ['model', 'edit', 'animate', 'paint']
      }
    }))


    MenuBar.update();
  },

  onunload() {
    // 清理菜单
    tw_test.delete()
    tw_path.delete()
    tw_path2.delete()
    tw_input.delete()
    track_model.delete()
    track_model2.delete()
    dissipate_resave.delete()
    dissipate_test.delete()
  }
});

let pathsj, tw_data;
let ysm;
let sjbf;
let tw1_frame, path, model_name, animation_name, controller_name, particle_name, particle_animation_name, particle_follow, particle_auther_gp_num, particle_no_auther_num, particle_auther_num
let particle_auther_show_time, particle_auther_show_speed, particle_auther_disappear_speed, particle_auther_disappear_time, particle_auther_range_x, particle_auther_range_y, track_rate
let particle_auther_range_z, particle_range_def_x, particle_range_def_y, particle_range_def_z, particle_auther_scale, part_parent, part_children, follow_model_name, follow_animation_name, include_follow_name
let follow_range, follow_velocity, follow_angular_velocity, stop_model_name, stop_animation_name, stop_auther_rot, stop_auther_range_x, stop_auther_range_y, stop_auther_range_z, track_model_num, play_in, track_tail_name
let dissipate_animation_name, dissipate_first_time, dissipate_need_time, dissipate_random_time, dissipate_speed, dissipate_set_speed, dissipate_set_x, dissipate_set_y, dissipate_set_z, dissipate_def_x, dissipate_def_y, dissipate_def_z, dissipate_transform, dissipate_uncover
let boids_animation_name

function boids_model_frame() {
  let boids_mianban = new Dialog({
    title: '参数面板',
    id: 'boids_mianban',
    form: {
      folder: { label: `模型位置`, type: `folder`, value: localStorage.getItem(`path`) },

      boids_play_in: { label: "实时", type: "checkbox", value: localStorage.getItem(`boids_play_in`) === `true` ? true : false },

      boids_name: { label: `样本名`, type: `text`, value: localStorage.getItem(`boids_name`) || `boids` },
      boids_part_animation_name: { label: `样本动画名`, type: `text`, value: localStorage.getItem(`boids_part_animation_name`) || `boids` },
      boids_animation_name: { label: `动画名`, type: `text`, value: localStorage.getItem(`boids_animation_name`) || `boids_show` },
      boids_rate: { label: `帧率`, type: `number`, value: parseFloat(localStorage.getItem(`boids_rate`)) || 10, min: 1 },
      boids_time: { label: `时间`, type: `number`, value: parseFloat(localStorage.getItem(`boids_time`)) || 40, min: 0 },
      boids_n_boids: { label: `数量`, type: `number`, value: parseFloat(localStorage.getItem(`boids_n_boids`)) || 10, min: 0 },
      boids_scale: { label: `倍率`, type: `number`, value: parseFloat(localStorage.getItem(`boids_scale`)) || 1, min: 0 },
      boids_center_name: { label: `中心点组名`, type: `text`, value: localStorage.getItem(`boids_center_name`) || `boids_center` },
      boids_width: { label: `宽`, type: `number`, value: parseFloat(localStorage.getItem(`boids_width`)) || 200, min: 0 },
      boids_height: { label: `长`, type: `number`, value: parseFloat(localStorage.getItem(`boids_height`)) || 200, min: 0 },
      boids_depth: { label: `深`, type: `number`, value: parseFloat(localStorage.getItem(`boids_depth`)) || 200, min: 0 },
      boids_max_speed: { label: `最大速度`, type: `number`, value: parseFloat(localStorage.getItem(`boids_max_speed`)) || 8, min: 0 },
      boids_min_speed: { label: `最小速度`, type: `number`, value: parseFloat(localStorage.getItem(`boids_min_speed`)) || 4, min: 0 },
      boids_perception_radius: { label: `视野范围`, type: `number`, value: parseFloat(localStorage.getItem(`boids_perception_radius`)) || 30, min: 0 },
      boids_max_steering_force: { label: `最大转向力`, type: `number`, value: parseFloat(localStorage.getItem(`boids_max_steering_force`)) || 0.3, min: 0 },
      boids_separation_weight: { label: `分离权重`, type: `number`, value: parseFloat(localStorage.getItem(`boids_separation_weight`)) || 6, min: 0 },
      boids_alignment_weight: { label: `对齐权重`, type: `number`, value: parseFloat(localStorage.getItem(`boids_alignment_weight`)) || 3, min: 0 },
      boids_cohesion_weight: { label: `聚集权重`, type: `number`, value: parseFloat(localStorage.getItem(`boids_cohesion_weight`)) || 1.6, min: 0 },
      boids_margin: { label: `边界警戒距离`, type: `number`, value: parseFloat(localStorage.getItem(`boids_margin`)) || 60, min: 0 },
      boids_turn_factor: { label: `转向系数`, type: `number`, value: parseFloat(localStorage.getItem(`boids_turn_factor`)) || 0.5, min: 0 },
      boids_part_repel_radius: { label: `个体排斥作用半径`, type: `number`, value: parseFloat(localStorage.getItem(`boids_part_repel_radius`)) || 2, min: 0 },
      boids_repel_name: { label: `排斥点组名`, type: `text`, value: localStorage.getItem(`boids_repel_name`) || `boids_repel` },
      boids_repel_radius: { label: `排斥作用半径`, type: `number`, value: parseFloat(localStorage.getItem(`boids_repel_radius`)) || 10, min: 0 },
      boids_repel_weight: { label: `排斥力权重`, type: `number`, value: parseFloat(localStorage.getItem(`boids_repel_weight`)) || 10, min: 0 },
      boids_name1: { label: `额外样本名1`, type: `text`, value: localStorage.getItem(`boids_name1`) || `boids` },
      boids_name2: { label: `额外样本名2`, type: `text`, value: localStorage.getItem(`boids_name2`) || `boids` },
      boids_name3: { label: `额外样本名3`, type: `text`, value: localStorage.getItem(`boids_name3`) || `boids` },
      boids_name4: { label: `额外样本名4`, type: `text`, value: localStorage.getItem(`boids_name4`) || `boids` },
      boids_name5: { label: `额外样本名5`, type: `text`, value: localStorage.getItem(`boids_name5`) || `boids` },
      boids_name6: { label: `额外样本名6`, type: `text`, value: localStorage.getItem(`boids_name6`) || `boids` },
      boids_name7: { label: `额外样本名7`, type: `text`, value: localStorage.getItem(`boids_name7`) || `boids` },
      boids_name8: { label: `额外样本名8`, type: `text`, value: localStorage.getItem(`boids_name8`) || `boids` },
      boids_name9: { label: `额外样本名9`, type: `text`, value: localStorage.getItem(`boids_name9`) || `boids` },


    },
    onFormChange() {
      boids_cunchu()
    },
    onConfirm() {
      boids_cunchu()
      Blockbench.readFile(path + `/ysm.json`, { type: 'text' }, (file) => {
        ysm = JSON.parse(file[0].content);
      });

      Undo.initEdit({
        outliner: true,
        animations: []
      });
      if (boids_play_in)
        boids_run2()
      else
        boids_run()
      Undo.finishEdit(`Finished  model`);
    }

  })
  boids_mianban.show()
}
function boids_cunchu() {

  path = $('.dialog#boids_mianban input#folder').val();
  boids_play_in = $('.dialog#boids_mianban input#boids_play_in').is(`:checked`);
  boids_animation_name = $('.dialog#boids_mianban input#boids_animation_name').val();
  boids_scale = $('.dialog#boids_mianban input#boids_scale').val();
  boids_name = $('.dialog#boids_mianban input#boids_name').val();
  boids_part_animation_name = $('.dialog#boids_mianban input#boids_part_animation_name').val();
  boids_n_boids = $('.dialog#boids_mianban input#boids_n_boids').val();
  boids_rate = $('.dialog#boids_mianban input#boids_rate').val();
  boids_time = $('.dialog#boids_mianban input#boids_time').val();
  boids_center_name = $('.dialog#boids_mianban input#boids_center_name').val();
  boids_repel_name = $('.dialog#boids_mianban input#boids_repel_name').val();
  boids_width = $('.dialog#boids_mianban input#boids_width').val();
  boids_height = $('.dialog#boids_mianban input#boids_height').val();
  boids_depth = $('.dialog#boids_mianban input#boids_depth').val();
  boids_max_speed = $('.dialog#boids_mianban input#boids_max_speed').val();
  boids_min_speed = $('.dialog#boids_mianban input#boids_min_speed').val();
  boids_perception_radius = $('.dialog#boids_mianban input#boids_perception_radius').val();
  boids_max_steering_force = $('.dialog#boids_mianban input#boids_max_steering_force').val();
  boids_separation_weight = $('.dialog#boids_mianban input#boids_separation_weight').val();
  boids_alignment_weight = $('.dialog#boids_mianban input#boids_alignment_weight').val();
  boids_cohesion_weight = $('.dialog#boids_mianban input#boids_cohesion_weight').val();
  boids_margin = $('.dialog#boids_mianban input#boids_margin').val();
  boids_turn_factor = $('.dialog#boids_mianban input#boids_turn_factor').val();
  boids_part_repel_radius = $('.dialog#boids_mianban input#boids_part_repel_radius').val();
  boids_repel_radius = $('.dialog#boids_mianban input#boids_repel_radius').val();
  boids_repel_weight = $('.dialog#boids_mianban input#boids_repel_weight').val();
  boids_name1 = $('.dialog#boids_mianban input#boids_name1').val();
  boids_name2 = $('.dialog#boids_mianban input#boids_name2').val();
  boids_name3 = $('.dialog#boids_mianban input#boids_name3').val();
  boids_name4 = $('.dialog#boids_mianban input#boids_name4').val();
  boids_name5 = $('.dialog#boids_mianban input#boids_name5').val();
  boids_name6 = $('.dialog#boids_mianban input#boids_name6').val();
  boids_name7 = $('.dialog#boids_mianban input#boids_name7').val();
  boids_name8 = $('.dialog#boids_mianban input#boids_name8').val();
  boids_name9 = $('.dialog#boids_mianban input#boids_name9').val();


  localStorage.setItem(`path`, path);
  localStorage.setItem(`boids_play_in`, boids_play_in);
  localStorage.setItem(`boids_animation_name`, boids_animation_name);
  localStorage.setItem(`boids_name`, boids_name);
  localStorage.setItem(`boids_part_animation_name`, boids_part_animation_name);
  localStorage.setItem(`boids_scale`, boids_scale);
  localStorage.setItem(`boids_rate`, boids_rate);
  localStorage.setItem(`boids_time`, boids_time);
  localStorage.setItem(`boids_n_boids`, boids_n_boids);
  localStorage.setItem(`boids_center_name`, boids_center_name);
  localStorage.setItem(`boids_repel_name`, boids_repel_name);
  localStorage.setItem(`boids_width`, boids_width);
  localStorage.setItem(`boids_height`, boids_height);
  localStorage.setItem(`boids_depth`, boids_depth);
  localStorage.setItem(`boids_max_speed`, boids_max_speed);
  localStorage.setItem(`boids_min_speed`, boids_min_speed);
  localStorage.setItem(`boids_perception_radius`, boids_perception_radius);
  localStorage.setItem(`boids_max_steering_force`, boids_max_steering_force);
  localStorage.setItem(`boids_separation_weight`, boids_separation_weight);
  localStorage.setItem(`boids_alignment_weight`, boids_alignment_weight);
  localStorage.setItem(`boids_cohesion_weight`, boids_cohesion_weight);
  localStorage.setItem(`boids_margin`, boids_margin);
  localStorage.setItem(`boids_turn_factor`, boids_turn_factor);
  localStorage.setItem(`boids_part_repel_radius`, boids_part_repel_radius);
  localStorage.setItem(`boids_repel_radius`, boids_repel_radius);
  localStorage.setItem(`boids_repel_weight`, boids_repel_weight);
  localStorage.setItem(`boids_name1`, boids_name1);
  localStorage.setItem(`boids_name2`, boids_name2);
  localStorage.setItem(`boids_name3`, boids_name3);
  localStorage.setItem(`boids_name4`, boids_name4);
  localStorage.setItem(`boids_name5`, boids_name5);
  localStorage.setItem(`boids_name6`, boids_name6);
  localStorage.setItem(`boids_name7`, boids_name7);
  localStorage.setItem(`boids_name8`, boids_name8);
  localStorage.setItem(`boids_name9`, boids_name9);

}
function boids_run() {

  anim_and_ctrl_reload(boids_animation_name, undefined)

  boids_width *= boids_scale
  boids_height *= boids_scale
  boids_depth *= boids_scale
  boids_max_speed *= boids_scale
  boids_min_speed *= boids_scale
  boids_perception_radius *= boids_scale
  boids_max_steering_force *= boids_scale
  boids_margin *= boids_scale
  boids_repel_radius *= 1
  boids_part_repel_radius *= boids_scale



  boneGroups = []
  boneGroup = Group.all.find(group => group.name === `${boids_name}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name1}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name2}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name3}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name4}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name5}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name6}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name7}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name8}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name9}`)
  if (boneGroup) boneGroups.push(boneGroup)

  boids_part_animation = Animation.all.find(group => group.name === `${boids_part_animation_name}`)

  boids_animation = new Animation(
    {
      name: boids_animation_name,
      length: boids_time,
      loop: `loop`,
      snapping: 500,
      path: path + `/` + ysm['files']['player'][`animation`][`main`],
    }
  )
  Undo.initEdit({
    animations: [boids_animation]
  })
  boids_animation.add()

  Undo.finishEdit(`Finished  model`);

  name_group = {}
  Group.all.forEach(anion => {
    if (anion.name == `${boids_name}_boids_all`) {
      anion.remove({ undo: true })
    }
  });
  boids_g_all_a = new Group({
    name: `${boids_name}_boids_all_a`,
    origin: [0, 0, 0]
  });
  boids_g_all_a.init()
  boids_g_all = new Group({
    name: `${boids_name}_boids_all`,
    origin: [0, 0, 0]
  });
  boids_g_all.init()
  boids_g_all_a.addTo(boids_g_all)
  for (i = 0; i < boids_n_boids; i++) {
    boids_group_gets = []
    boids_group = []
    if (boneGroups.length == 0) {
      boids_cube = new Cube({
        origin: [0, 0, 0],
        name: boids_name,
        from: [-1, -1, -1],
        to: [1, 1, 1],
        rotation: [0, 0, 0]
      });
      boids_g = new Group({
        name: `${boids_name}_boids_${i}`,
        origin: [0, 0, 0]
      });
      name_group[boids_g.name] = boids_g
      boids_g.addTo(boids_g_all_a)
      boids_g.init()
      boids_cube.addTo(boids_g)
      boids_cube.init()
    } else {
      //console.log(boneGroups.length)
      boids_group.push(boneGroups[i % boneGroups.length])

      group_boids = new Group({
        name: `${boids_name}_boids_${boneGroups[i % boneGroups.length].name}_${i}`
      })
      boids_g = new Group({
        name: `${boids_name}_boids_${i}`,
        origin: [0, 0, 0]
      });
      name_group[boids_g.name] = boids_g
      boids_g.addTo(boids_g_all_a)
      boids_g.init()
      name_group[group_boids.name] = group_boids
      group_boids.addTo(boids_g)
      group_boids.init()
      boids_group_gets.push(group_boids)
      for (j = 0; j < boids_group.length; j++) {
        boids_group[j].children.forEach(children => {
          if (children instanceof Group) {
            boids_group.push(children)
            //console.log(children.name)

            group_boids = new Group({
              name: `${boids_name}_boids_${children.name}_${i}`,
              origin: children.origin,
              rotation: children.rotation
            })
            name_group[group_boids.name] = group_boids
            group_boids.addTo(boids_group_gets[j])
            group_boids.init()
            boids_group_gets.push(group_boids)
          } else {
            boids_cube = new Cube({
              origin: children.origin,
              name: `${boids_name}_boids_${children.name}_${i}`,
              from: children.from,
              to: children.to,
              rotation: children.rotation,
              autouv: children.autouv,
              shade: children.shade,
              mirror_uv: children.mirror_uv,
              inflate: children.inflate,
              color: children.color,
              visibility: children.visibility,
              box_uv: children.box_uv,
              uv_offset: children.uv_offset,
              faces: children.faces,
            })
            boids_cube.faces = children.faces
            //console.log(children)
            boids_cube.addTo(boids_group_gets[j])
            boids_cube.init()
          }
        })

      }
    }
  }
  boids_center_point = Group.all.find(group => group.name === `${boids_center_name}`)
  if (boids_center_point)
    boids_center_point = boids_center_point.origin
  else
    boids_center_point = [0, 0, 0]
  boids_repel_point = Group.all.find(group => group.name === `${boids_repel_name}`)
  boids_repel_point_all = []
  if (boids_repel_point) {
    boids_repel_point_all.push(boids_repel_point)
    boids_repel_point = []
    for (i = 0; i < boids_repel_point_all.length; i++) {
      boids_repel_point.push(boids_repel_point_all[i].origin)
      boids_repel_point_all[i].children.forEach(children => {
        if (children instanceof Group) {
          boids_repel_point_all.push(children)
        }
      })
    }
  } else {
    boids_repel_point = []
  }
  //console.log(boids_repel_point)
  boids_smooth_factor = 0.2
  //console.log('cs')
  let boids_position_all = []
  let boids_velocities_all = []
  let boids_rotation_last_all = []
  let boids_rotation_all = []
  for (i = 0; i < boids_n_boids; i++) {
    boids_rotation_all.push({})
    boids_position_all.push([
      parseFloat((Math.random() - 0.5) * boids_width) + parseFloat(-boids_center_point[0]),
      parseFloat((Math.random() - 0.5) * boids_height) + parseFloat(boids_center_point[1]),
      parseFloat((Math.random() - 0.5) * boids_depth) + parseFloat(boids_center_point[2])
    ])
    boids_velocities_all.push([
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    ])
    boids_rotation_last_all.push(0)
  }
  time_lines = []
  for (i = 0; i < boids_time; i += 1 / boids_rate) {
    time_lines.push(i)
  }
  for (q = 0; q < time_lines.length; q++) {
    boids_old_velocities = []
    for (i = 0; i < boids_n_boids; i++) {
      boids_old_velocities.push([
        boids_velocities_all[i][0],
        boids_velocities_all[i][1],
        boids_velocities_all[i][2]
      ])

    }
    boids_separation = []
    boids_alignment = []
    boids_cohesion = []
    boids_repulsion = []
    for (i = 0; i < boids_n_boids; i++) {
      boids_separation.push([0, 0, 0])
      boids_alignment.push([0, 0, 0])
      boids_cohesion.push([0, 0, 0])
      boids_repulsion.push([0, 0, 0])
    }

    for (i = 0; i < boids_n_boids; i++) {
      neighbors = []  // 存储邻近鸟的索引

      avg_diff = [0, 0, 0]  // 平均差异向量
      // 寻找感知范围内的邻近鸟
      for (j = 0; j < boids_n_boids; j++) {
        if (i == j)  // 跳过自己
          continue;

        // 计算与另一只鸟的距离
        dx = parseFloat(boids_position_all[i][0]) - parseFloat(boids_position_all[j][0])
        dy = parseFloat(boids_position_all[i][1]) - parseFloat(boids_position_all[j][1])
        dz = parseFloat(boids_position_all[i][2]) - parseFloat(boids_position_all[j][2])
        distance = Math.sqrt(parseFloat(dx * dx) + parseFloat(dy * dy) + parseFloat(dz * dz))


        // 如果距离在感知范围内，加入邻居列表
        if (distance < boids_perception_radius / 2) {
          neighbors.push(j)
        }

      }
      // 如果有邻居，计算平均远离方向
      if (neighbors.length) {


        for (j = 0; j < neighbors.length; j++) {
          avg_diff[0] = parseFloat(avg_diff[0]) + parseFloat(parseFloat(boids_position_all[i][0]) - parseFloat(boids_position_all[neighbors[j]][0]))
          avg_diff[1] = parseFloat(avg_diff[1]) + parseFloat(parseFloat(boids_position_all[i][1]) - parseFloat(boids_position_all[neighbors[j]][1]))
          avg_diff[2] = parseFloat(avg_diff[2]) + parseFloat(parseFloat(boids_position_all[i][2]) - parseFloat(boids_position_all[neighbors[j]][2]))

        }

        // 计算平均值
        avg_diff[0] /= neighbors.length
        avg_diff[1] /= neighbors.length
        avg_diff[2] /= neighbors.length
        boids_separation[i][0] = avg_diff[0]
        boids_separation[i][1] = avg_diff[1]
        boids_separation[i][2] = avg_diff[2]

      }

    }
    // 限制分离力的大小
    for (i = 0; i < boids_n_boids; i++) {
      force_mag = Math.sqrt(
        parseFloat(boids_separation[i][0]) * parseFloat(boids_separation[i][0]) +
        parseFloat(boids_separation[i][1]) * parseFloat(boids_separation[i][1]) +
        parseFloat(boids_separation[i][2]) * parseFloat(boids_separation[i][2])
      )
      if (force_mag > boids_max_steering_force) {
        scale = boids_max_steering_force / force_mag
        boids_separation[i] = [
          parseFloat(scale) * parseFloat(boids_separation[i][0]),
          parseFloat(scale) * parseFloat(boids_separation[i][1]),
          parseFloat(scale) * parseFloat(boids_separation[i][2])
        ]
      }
    }


    for (i = 0; i < boids_n_boids; i++) {
      neighbors = []  // 存储邻近鸟的索引

      // 寻找感知范围内的邻近鸟
      for (j = 0; j < boids_n_boids; j++) {
        if ((i == j) || (i % boneGroups.length != j % boneGroups.length))  // 跳过自己,与异类  // 跳过自己,与异类
          continue

        // 计算与另一只鸟的距离
        dx = parseFloat(boids_position_all[i][0]) - parseFloat(boids_position_all[j][0])
        dy = parseFloat(boids_position_all[i][1]) - parseFloat(boids_position_all[j][1])
        dz = parseFloat(boids_position_all[i][2]) - parseFloat(boids_position_all[j][2])
        distance = Math.sqrt(parseFloat(dx * dx) + parseFloat(dy * dy) + parseFloat(dz * dz))

        if (distance < boids_perception_radius)
          neighbors.push(j)
      }
      // 如果有邻居，计算平均速度方向
      if (neighbors.length) {
        avg_vel = [0, 0, 0]  // 平均速度向量
        for (j = 0; j < neighbors.length; j++) {
          avg_vel[0] = parseFloat(avg_vel[0]) + parseFloat(boids_velocities_all[neighbors[j]][0])
          avg_vel[1] = parseFloat(avg_vel[1]) + parseFloat(boids_velocities_all[neighbors[j]][1])
          avg_vel[2] = parseFloat(avg_vel[2]) + parseFloat(boids_velocities_all[neighbors[j]][2])

        }

        // 计算平均值并得到调整方向
        avg_vel[0] /= neighbors.length
        avg_vel[1] /= neighbors.length
        avg_vel[2] /= neighbors.length
        boids_alignment[i][0] = parseFloat(avg_vel[0]) - parseFloat(boids_velocities_all[i][0])
        boids_alignment[i][1] = parseFloat(avg_vel[1]) - parseFloat(boids_velocities_all[i][1])
        boids_alignment[i][2] = parseFloat(avg_vel[2]) - parseFloat(boids_velocities_all[i][2])


      }
    }
    // 限制对齐力的大小
    for (i = 0; i < boids_n_boids; i++) {
      force_mag = Math.sqrt(
        parseFloat(boids_alignment[i][0]) * parseFloat(boids_alignment[i][0]) +
        parseFloat(boids_alignment[i][1]) * parseFloat(boids_alignment[i][1]) +
        parseFloat(boids_alignment[i][2]) * parseFloat(boids_alignment[i][2])
      )
      if (force_mag > boids_max_steering_force) {
        scale = boids_max_steering_force / force_mag
        boids_alignment[i] = [
          parseFloat(scale) * parseFloat(boids_alignment[i][0]),
          parseFloat(scale) * parseFloat(boids_alignment[i][1]),
          parseFloat(scale) * parseFloat(boids_alignment[i][2])
        ]
      }
    }


    for (i = 0; i < boids_n_boids; i++) {
      neighbors = []  // 存储邻近鸟的索引

      // 寻找感知范围内的邻近鸟
      for (j = 0; j < boids_n_boids; j++) {
        if ((i == j) || (i % boneGroups.length != j % boneGroups.length))  // 跳过自己,与异类
          continue

        // 计算与另一只鸟的距离
        dx = parseFloat(boids_position_all[i][0]) - parseFloat(boids_position_all[j][0])
        dy = parseFloat(boids_position_all[i][1]) - parseFloat(boids_position_all[j][1])
        dz = parseFloat(boids_position_all[i][2]) - parseFloat(boids_position_all[j][2])
        distance = Math.sqrt(parseFloat(dx * dx) + parseFloat(dy * dy) + parseFloat(dz * dz))

        if (distance < boids_perception_radius)
          neighbors.push(j)
      }
      // 如果有邻居，计算它们的中心位置
      if (neighbors.length) {
        center = [0, 0, 0]  // 邻居群体的中心位置
        for (j = 0; j < neighbors.length; j++) {
          center[0] = parseFloat(center[0]) + parseFloat(boids_position_all[neighbors[j]][0])
          center[1] = parseFloat(center[1]) + parseFloat(boids_position_all[neighbors[j]][1])
          center[2] = parseFloat(center[2]) + parseFloat(boids_position_all[neighbors[j]][2])

        }

        // 计算平均值并得到朝向中心的向量
        center[0] /= neighbors.length
        center[1] /= neighbors.length
        center[2] /= neighbors.length
        boids_cohesion[i][0] = parseFloat(center[0] - boids_position_all[i][0])
        boids_cohesion[i][1] = parseFloat(center[1] - boids_position_all[i][1])
        boids_cohesion[i][2] = parseFloat(center[2] - boids_position_all[i][2])

      }
    }
    // 限制聚合力的大小
    for (i = 0; i < boids_n_boids; i++) {
      force_mag = Math.sqrt(boids_cohesion[i][0] * boids_cohesion[i][0] + boids_cohesion[i][1] * boids_cohesion[i][1] + boids_cohesion[i][2] * boids_cohesion[i][2])
      if (force_mag > boids_max_steering_force) {
        scale = boids_max_steering_force / force_mag
        boids_cohesion[i] = [
          parseFloat(scale * boids_cohesion[i][0]),
          parseFloat(scale * boids_cohesion[i][1]),
          parseFloat(scale * boids_cohesion[i][2])
        ]
      }
    }


    for (i = 0; i < boids_n_boids; i++) {
      for (j = 0; j < boids_n_boids; j++) {
        if (i == j)  // 跳过自己
          continue;

        // 计算与另一只鸟的距离
        dx = parseFloat(boids_position_all[i][0]) - parseFloat(boids_position_all[j][0])
        dy = parseFloat(boids_position_all[i][1]) - parseFloat(boids_position_all[j][1])
        dz = parseFloat(boids_position_all[i][2]) - parseFloat(boids_position_all[j][2])
        distance = Math.sqrt(parseFloat(dx * dx) + parseFloat(dy * dy) + parseFloat(dz * dz))
        if (distance < boids_part_repel_radius) {
          // 距离越近，排斥力越强(线性关系)
          strength = 1 - (distance / boids_part_repel_radius)
          // 计算归一化方向并乘以强度
          boids_repulsion[i][0] = parseFloat(boids_repulsion[i][0]) + parseFloat(dx) * parseFloat(strength)  // +1e-6避免除以零
          boids_repulsion[i][1] = parseFloat(boids_repulsion[i][1]) + parseFloat(dy) * parseFloat(strength)
          boids_repulsion[i][2] = parseFloat(boids_repulsion[i][2]) + parseFloat(dz) * parseFloat(strength)
        }
      }
      for (j = 0; j < boids_repel_point.length; j++) {
        // 计算与排斥点的距离和方向
        dx = parseFloat(boids_position_all[i][0]) - parseFloat(-boids_repel_point[j][0])
        dy = parseFloat(boids_position_all[i][1]) - parseFloat(boids_repel_point[j][1])
        dz = parseFloat(boids_position_all[i][2]) - parseFloat(boids_repel_point[j][2])
        distance = Math.sqrt(parseFloat(dx * dx) + parseFloat(dy * dy) + parseFloat(dz * dz))

        // 如果在排斥范围内，计算排斥力
        if (distance < boids_repel_radius) {
          // 距离越近，排斥力越强(线性关系)
          strength = 2 - (distance / boids_repel_radius)
          // 计算归一化方向并乘以强度
          boids_repulsion[i][0] = parseFloat(boids_repulsion[i][0]) + parseFloat(dx) * parseFloat(strength)  // +1e-6避免除以零
          boids_repulsion[i][1] = parseFloat(boids_repulsion[i][1]) + parseFloat(dy) * parseFloat(strength)
          boids_repulsion[i][2] = parseFloat(boids_repulsion[i][2]) + parseFloat(dz) * parseFloat(strength)
        }
      }
    }

    for (i = 0; i < boids_n_boids; i++) {
      boids_velocities_all[i][0] = parseFloat(boids_velocities_all[i][0]) + parseFloat(
        parseFloat(boids_separation[i][0]) * parseFloat(boids_separation_weight) +
        parseFloat(boids_alignment[i][0]) * parseFloat(boids_alignment_weight) +
        parseFloat(boids_cohesion[i][0]) * parseFloat(boids_cohesion_weight) +
        parseFloat(boids_repulsion[i][0]) * parseFloat(boids_repel_weight)
      )
      boids_velocities_all[i][1] = parseFloat(boids_velocities_all[i][1]) + parseFloat(
        parseFloat(boids_separation[i][1]) * parseFloat(boids_separation_weight) +
        parseFloat(boids_alignment[i][1]) * parseFloat(boids_alignment_weight) +
        parseFloat(boids_cohesion[i][1]) * parseFloat(boids_cohesion_weight) +
        parseFloat(boids_repulsion[i][1]) * parseFloat(boids_repel_weight)
      )
      boids_velocities_all[i][2] = parseFloat(boids_velocities_all[i][2]) + parseFloat(
        parseFloat(boids_separation[i][2]) * parseFloat(boids_separation_weight) +
        parseFloat(boids_alignment[i][2]) * parseFloat(boids_alignment_weight) +
        parseFloat(boids_cohesion[i][2]) * parseFloat(boids_cohesion_weight) +
        parseFloat(boids_repulsion[i][2]) * parseFloat(boids_repel_weight)
      )

    }

    for (i = 0; i < boids_n_boids; i++) {

      edge_x = Math.min(0, parseFloat(boids_position_all[i][0]) - parseFloat(-boids_center_point[0]) + parseFloat(boids_width / 2),
        parseFloat(boids_width / 2) + parseFloat(-boids_center_point[0]) - parseFloat(boids_position_all[i][0])) / boids_margin
      edge_y = Math.min(0, parseFloat(boids_position_all[i][1]) - parseFloat(boids_center_point[1]) + parseFloat(boids_height / 2),
        parseFloat(boids_height / 2) + parseFloat(boids_center_point[1]) - parseFloat(boids_position_all[i][1])) / boids_margin
      edge_z = Math.min(0, parseFloat(boids_position_all[i][2]) - parseFloat(boids_center_point[2]) + parseFloat(boids_depth / 2),
        parseFloat(boids_depth / 2) + parseFloat(boids_center_point[2]) - parseFloat(boids_position_all[i][2])) / boids_margin

      if ((boids_position_all[i][0] - parseFloat(-boids_center_point[0])) < (boids_margin - boids_width / 2))  // 接近左边界
        boids_velocities_all[i][0] = parseFloat(boids_velocities_all[i][0]) + parseFloat(boids_turn_factor) * (1 - edge_x) * parseFloat(boids_max_speed)    // 向右转
      else
        if ((boids_position_all[i][0] - parseFloat(-boids_center_point[0])) > (boids_width / 2 - boids_margin)) {  // 接近右边界
          boids_velocities_all[i][0] = parseFloat(boids_velocities_all[i][0]) - parseFloat(boids_turn_factor) * (1 - edge_x) * parseFloat(boids_max_speed)    // 向左转
        }
      // Y轴边界处理
      if ((boids_position_all[i][1] - parseFloat(boids_center_point[1])) < (boids_margin - boids_height / 2))  // 接近下边界
        boids_velocities_all[i][1] = parseFloat(boids_velocities_all[i][1]) + parseFloat(boids_turn_factor) * (1 - edge_y) * parseFloat(boids_max_speed)   // 向上转
      else
        if ((boids_position_all[i][1] - parseFloat(boids_center_point[1])) > (boids_height / 2 - boids_margin)) {  // 接近上边界
          boids_velocities_all[i][1] = parseFloat(boids_velocities_all[i][1]) - parseFloat(boids_turn_factor) * (1 - edge_y) * parseFloat(boids_max_speed)  // 向下转
        }
      // Z轴边界处理
      if ((boids_position_all[i][2] - parseFloat(boids_center_point[2])) < (boids_margin - boids_depth / 2)) {  // 接近前边界
        boids_velocities_all[i][2] = parseFloat(boids_velocities_all[i][2]) + parseFloat(boids_turn_factor) * (1 - edge_z) * parseFloat(boids_max_speed)
      }  // 向后转
      else
        if ((boids_position_all[i][2] - parseFloat(boids_center_point[2])) > (boids_depth / 2 - boids_margin)) {  // 接近后边界
          boids_velocities_all[i][2] = parseFloat(boids_velocities_all[i][2]) - parseFloat(boids_turn_factor) * (1 - edge_z) * parseFloat(boids_max_speed)  // 向前转
        }
    }

    // 限制速度范围
    for (i = 0; i < boids_n_boids; i++) {
      // 计算当前速度大小
      speed = Math.sqrt(parseFloat(boids_velocities_all[i][0] * boids_velocities_all[i][0]) + parseFloat(boids_velocities_all[i][1] * boids_velocities_all[i][1]) + parseFloat(boids_velocities_all[i][2] * boids_velocities_all[i][2]))

      // 如果速度超过最大值，按比例缩小
      if (speed > boids_max_speed) {
        scale = boids_max_speed / speed
        boids_velocities_all[i] = [
          parseFloat(scale) * parseFloat(boids_velocities_all[i][0]),
          parseFloat(scale) * parseFloat(boids_velocities_all[i][1]),
          parseFloat(scale) * parseFloat(boids_velocities_all[i][2])
        ]
      }
      // 如果速度低于最小值，按比例放大
      else if (speed < boids_min_speed) {
        scale = boids_min_speed / speed
        boids_velocities_all[i] = [
          parseFloat(scale) * parseFloat(boids_velocities_all[i][0]),
          parseFloat(scale) * parseFloat(boids_velocities_all[i][1]),
          parseFloat(scale) * parseFloat(boids_velocities_all[i][2])
        ]
      }
      boids_velocities_all[i][0] = (boids_smooth_factor * boids_old_velocities[i][0] + (1 - boids_smooth_factor) * boids_velocities_all[i][0])
      boids_velocities_all[i][1] = (boids_smooth_factor * boids_old_velocities[i][1] + (1 - boids_smooth_factor) * boids_velocities_all[i][1])
      boids_velocities_all[i][2] = (boids_smooth_factor * boids_old_velocities[i][2] + (1 - boids_smooth_factor) * boids_velocities_all[i][2])
    }


    // 更新位置
    for (i = 0; i < boids_n_boids; i++) {
      boids_position_all[i][0] = parseFloat(boids_position_all[i][0]) + parseFloat(boids_velocities_all[i][0]) * 10 / boids_rate
      boids_position_all[i][1] = parseFloat(boids_position_all[i][1]) + parseFloat(boids_velocities_all[i][1]) * 10 / boids_rate
      boids_position_all[i][2] = parseFloat(boids_position_all[i][2]) + parseFloat(boids_velocities_all[i][2]) * 10 / boids_rate

      rot_y = ((Math.atan2(boids_velocities_all[i][0], boids_velocities_all[i][2]) * 180 / Math.PI - boids_rotation_last_all[i] + 180) % 360 - 180)
      rot_y = ((rot_y - 180) % 360 + 180)
      rot_y += parseFloat(boids_rotation_last_all[i])
      rot_x = Math.atan2(boids_velocities_all[i][1], Math.sqrt(boids_velocities_all[i][0] * boids_velocities_all[i][0] + boids_velocities_all[i][2] * boids_velocities_all[i][2])) * 180 / Math.PI

      boids_rotation_last_all[i] = rot_y
      boids_group_c = name_group[`${boids_name}_boids_${i}`]
      addnameanimate_position(boids_animation, boids_group_c, time_lines[q],
        [
          1 * boids_position_all[i][0].toFixed(10),
          1 * boids_position_all[i][1].toFixed(10),
          1 * boids_position_all[i][2].toFixed(10)
        ])
      boids_rotation_all[i][time_lines[q]] = {
        x: rot_x,
        y: rot_y,
        z: 0
      }
    }
    if (boids_part_animation) {

      for (b_n = 0; b_n < boids_n_boids; b_n++) {
        if (boids_part_animation.length) {
          q_time = (time_lines[q] + parseFloat(boids_part_animation.length * b_n / boids_n_boids)) % boids_part_animation.length
        } else {
          q_time = 0
        }
        boids_group = []
        if (boneGroups.length != 0) {

          //console.log(boneGroups.length)
          boids_group.push(boneGroups[b_n % boneGroups.length])

          group_boids = name_group[`${boids_name}_boids_${boneGroups[b_n % boneGroups.length].name}_${b_n}`]

          keyframes = []
          if (1) {
            Undo.initEdit({ keyframes })
          }
          var keyframe = new Keyframe({
            channel: "position",
            time: q_time
          }, null, boids_part_animation.getBoneAnimator(boneGroups[b_n % boneGroups.length]));

          boids_part_animation.getBoneAnimator(boneGroups[b_n % boneGroups.length]).fillValues(keyframe, null, true);
          keyframe.time = time_lines[q]
          boids_animation.getBoneAnimator(group_boids).addKeyframe(keyframe)

          var keyframe = new Keyframe({
            channel: "rotation",
            time: q_time
          }, null, boids_part_animation.getBoneAnimator(boneGroups[b_n % boneGroups.length]));

          boids_part_animation.getBoneAnimator(boneGroups[b_n % boneGroups.length]).fillValues(keyframe, null, true);
          keyframe.time = time_lines[q]
          boids_animation.getBoneAnimator(group_boids).addKeyframe(keyframe)

          var keyframe = new Keyframe({
            channel: "scale",
            time: q_time
          }, null, boids_part_animation.getBoneAnimator(boneGroups[b_n % boneGroups.length]));

          boids_part_animation.getBoneAnimator(boneGroups[b_n % boneGroups.length]).fillValues(keyframe, null, true);
          keyframe.time = time_lines[q]
          boids_animation.getBoneAnimator(group_boids).addKeyframe(keyframe)


          if (1) {
            Undo.finishEdit('Add keyframe')
          }


          for (j = 0; j < boids_group.length; j++) {
            boids_group[j].children.forEach(children => {
              if (children instanceof Group) {

                boids_group.push(children)
                group_boids = name_group[`${boids_name}_boids_${children.name}_${b_n}`]



                keyframes = []
                if (1) {
                  Undo.initEdit({ keyframes })
                }

                var keyframe = new Keyframe({
                  channel: "position",
                  time: q_time
                }, null, boids_part_animation.getBoneAnimator(children));

                boids_part_animation.getBoneAnimator(children).fillValues(keyframe, null, true);
                keyframe.time = time_lines[q]
                boids_animation.getBoneAnimator(group_boids).addKeyframe(keyframe)

                var keyframe = new Keyframe({
                  channel: "rotation",
                  time: q_time
                }, null, boids_part_animation.getBoneAnimator(children));

                boids_part_animation.getBoneAnimator(children).fillValues(keyframe, null, true);
                keyframe.time = time_lines[q]
                boids_animation.getBoneAnimator(group_boids).addKeyframe(keyframe)

                var keyframe = new Keyframe({
                  channel: "scale",
                  time: q_time
                }, null, boids_part_animation.getBoneAnimator(children));

                boids_part_animation.getBoneAnimator(children).fillValues(keyframe, null, true);
                keyframe.time = time_lines[q]
                boids_animation.getBoneAnimator(group_boids).addKeyframe(keyframe)


                if (1) {
                  Undo.finishEdit('Add keyframe')
                }

              }
            })

          }
        }
      }
    }


  }
  for (i = 0; i < boids_n_boids; i++)
    boids_rotation_all[i] = gaussianFilter3D(boids_rotation_all[i], time_lines)
  for (q = 0; q < time_lines.length; q++) {
    for (i = 0; i < boids_n_boids; i++) {
      boids_group_c = name_group[`${boids_name}_boids_${i}`]
      addnameanimate_rotation(boids_animation, boids_group_c, time_lines[q],
        [
          boids_rotation_all[i][time_lines[q]].x,
          boids_rotation_all[i][time_lines[q]].y,
          boids_rotation_all[i][time_lines[q]].z
        ])
    }
  }
  for (i = 0; i < boids_n_boids; i++) {
    boids_group_c = name_group[`${boids_name}_boids_${i}`]
    addnameanimate_scale_uniform(boids_animation, boids_group_c, 0,
      boids_scale)
  }
}

function boids_run2() {

  anim_and_ctrl_reload(boids_animation_name, undefined)

  boids_width *= boids_scale * 0.7 / 16
  boids_height *= boids_scale * 0.7 / 16
  boids_depth *= boids_scale * 0.7 / 16
  boids_max_speed *= boids_scale * 0.7 / 16
  boids_min_speed *= boids_scale * 0.7 / 16
  boids_perception_radius *= boids_scale * 0.7 / 16
  boids_max_steering_force *= boids_scale * 0.7 / 16
  boids_margin *= boids_scale * 0.7 / 16
  boids_repel_radius *= 1 * 0.7 / 16
  boids_part_repel_radius *= boids_scale * 0.7 / 16



  boneGroups = []
  boneGroup = Group.all.find(group => group.name === `${boids_name}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name1}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name2}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name3}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name4}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name5}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name6}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name7}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name8}`)
  if (boneGroup) boneGroups.push(boneGroup)
  boneGroup = Group.all.find(group => group.name === `${boids_name9}`)
  if (boneGroup) boneGroups.push(boneGroup)

  boids_part_animation = Animation.all.find(group => group.name === `${boids_part_animation_name}`)

  boids_animation = new Animation(
    {
      name: boids_animation_name,
      length: 0,
      loop: `loop`,
      snapping: 500,
      path: path + `/` + ysm['files']['player'][`animation`][`main`],
    }
  )
  Undo.initEdit({
    animations: [boids_animation]
  })
  boids_animation.add()

  Undo.finishEdit(`Finished  model`);

  name_group = {}
  Group.all.forEach(anion => {
    if (anion.name == `${boids_name}_boids_all`) {
      anion.remove({ undo: true })
    }
  });
  boids_g_all_a = new Group({
    name: `${boids_name}_boids_all_a`,
    origin: [0, 0, 0]
  });

  name_group[boids_g_all_a.name] = boids_g_all_a
  boids_g_all_a.init()
  boids_g_all = new Group({
    name: `${boids_name}_boids_all`,
    origin: [0, 0, 0]
  });

  name_group[boids_g_all.name] = boids_g_all
  boids_g_all.init()
  boids_g_all_a.addTo(boids_g_all)
  for (i = 0; i < boids_n_boids; i++) {
    boids_group_gets = []
    boids_group = []
    if (boneGroups.length == 0) {
      boids_cube = new Cube({
        origin: [0, 0, 0],
        name: boids_name,
        from: [-1, -1, -1],
        to: [1, 1, 1],
        rotation: [0, 0, 0]
      });
      boids_g = new Group({
        name: `${boids_name}_boids_${i}`,
        origin: [0, 0, 0]
      });
      name_group[boids_g.name] = boids_g
      boids_g.addTo(boids_g_all_a)
      boids_g.init()
      boids_cube.addTo(boids_g)
      boids_cube.init()
    } else {
      //console.log(boneGroups.length)
      boids_group.push(boneGroups[i % boneGroups.length])

      group_boids = new Group({
        name: `${boids_name}_boids_${boneGroups[i % boneGroups.length].name}_${i}`
      })
      boids_g = new Group({
        name: `${boids_name}_boids_${i}`,
        origin: [0, 0, 0]
      });
      name_group[boids_g.name] = boids_g
      boids_g.addTo(boids_g_all_a)
      boids_g.init()
      name_group[group_boids.name] = group_boids
      group_boids.addTo(boids_g)
      group_boids.init()
      boids_group_gets.push(group_boids)
      for (j = 0; j < boids_group.length; j++) {
        boids_group[j].children.forEach(children => {
          if (children instanceof Group) {
            boids_group.push(children)
            //console.log(children.name)

            group_boids = new Group({
              name: `${boids_name}_boids_${children.name}_${i}`,
              origin: children.origin,
              rotation: children.rotation
            })
            name_group[group_boids.name] = group_boids
            group_boids.addTo(boids_group_gets[j])
            group_boids.init()
            boids_group_gets.push(group_boids)
          } else {
            boids_cube = new Cube({
              origin: children.origin,
              name: `${boids_name}_boids_${children.name}_${i}`,
              from: children.from,
              to: children.to,
              rotation: children.rotation,
              autouv: children.autouv,
              shade: children.shade,
              mirror_uv: children.mirror_uv,
              inflate: children.inflate,
              color: children.color,
              visibility: children.visibility,
              box_uv: children.box_uv,
              uv_offset: children.uv_offset,
              faces: children.faces,
            })
            boids_cube.faces = children.faces
            //console.log(children)
            boids_cube.addTo(boids_group_gets[j])
            boids_cube.init()
          }
        })

      }
    }
  }

  effect = new EffectAnimator(boids_animation)//初始化
  let boids_molang;
  boids_molang = Group.all.find(group => group.name === `${boids_animation_name}_boids_molang`);
  if (!boids_molang) {
    boids_molang = new Group({
      name: `${boids_animation_name}_boids_molang`
    })
    boids_molang.init()
  }
  molang_in_text = ``
  molang_text = []
  boids_timeline = ``

  ////////////////////////////////////////////////////////////////


  boids_center_point = [
    `((ysm.bone_pivot_abs('${boids_center_name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${boids_center_name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0))`,
    `(ysm.bone_pivot_abs('${boids_center_name}').y*0.7/16+q.position(1))`,
    `((ysm.bone_pivot_abs('${boids_center_name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${boids_center_name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2))`]


  boids_repel_point = Group.all.find(group => group.name === `${boids_repel_name}`)
  boids_repel_point_all = []

  if (boids_repel_point) {
    boids_repel_point_all.push(boids_repel_point)
    boids_repel_point = []
    for (i = 0; i < boids_repel_point_all.length; i++) {

      boids_repel_point.push([
        `((ysm.bone_pivot_abs('${boids_repel_point_all[i].name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${boids_repel_point_all[i].name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0))`,
        `(ysm.bone_pivot_abs('${boids_repel_point_all[i].name}').y*0.7/16+q.position(1))`,
        `((ysm.bone_pivot_abs('${boids_repel_point_all[i].name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${boids_repel_point_all[i].name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2))`]
      )
      boids_repel_point_all[i].children.forEach(children => {
        if (children instanceof Group) {
          boids_repel_point_all.push(children)
        }
      })
    }
  } else {
    boids_repel_point = []
  }


  //console.log(boids_repel_point)

  boids_smooth_factor = 0.2

  let boids_position_all = []
  let boids_velocities_all = []
  let boids_rotation_last_all = []
  let boids_rotation_all = []
  for (i = 0; i < boids_n_boids; i++) {
    //boids_rotation_all.push({})
    //boids_position_all.push([
    //  parseFloat((Math.random() - 0.5) * boids_width) + parseFloat(-boids_center_point[0]),
    //  parseFloat((Math.random() - 0.5) * boids_height) + parseFloat(boids_center_point[1]),
    //  parseFloat((Math.random() - 0.5) * boids_depth) + parseFloat(boids_center_point[2])
    //])
    boids_timeline += `v.${boids_animation_name}_boids_position_all_${i}_0=${boids_center_point[0]}+${parseFloat((Math.random() - 0.5) * (boids_width - boids_margin * 2) / 4)};\n`
    boids_timeline += `v.${boids_animation_name}_boids_position_all_${i}_1=${boids_center_point[1]}+${parseFloat((Math.random() - 0.5) * (boids_height - boids_margin * 2) / 4)};\n`
    boids_timeline += `v.${boids_animation_name}_boids_position_all_${i}_2=${boids_center_point[2]}+${parseFloat((Math.random() - 0.5) * (boids_depth - boids_margin * 2) / 4)} ;\n`
    //boids_velocities_all.push([
    //  (Math.random() - 0.5) * 5,
    //  (Math.random() - 0.5) * 5,
    //  (Math.random() - 0.5) * 5
    //])
    boids_timeline += `v.${boids_animation_name}_boids_velocities_all_${i}_0=${(Math.random() - 0.5) * 5};\n`
    boids_timeline += `v.${boids_animation_name}_boids_velocities_all_${i}_1=${(Math.random() - 0.5) * 5};\n`
    boids_timeline += `v.${boids_animation_name}_boids_velocities_all_${i}_2=${(Math.random() - 0.5) * 5};\n`
    boids_timeline += `v.${boids_animation_name}_boids_rotation_last_all_${i}_0=math.atan2(v.${boids_animation_name}_boids_velocities_all_${i}_0, v.${boids_animation_name}_boids_velocities_all_${i}_2) * 180 / math.pi;\n`
    boids_timeline += `v.${boids_animation_name}_boids_rotation_last_all_${i}_1= math.atan2(v.${boids_animation_name}_boids_velocities_all_${i}_1, v.${boids_animation_name}_boids_velocities_all_${i}_0 * v.${boids_animation_name}_boids_velocities_all_${i}_0 + v.${boids_animation_name}_boids_velocities_all_${i}_2 * v.${boids_animation_name}_boids_velocities_all_${i}_2)) * 180 / math.pi;\n`
  }
  //for (q = 0; q < time_lines.length; q++) {
  //boids_old_velocities = []
  for (i = 0; i < boids_n_boids; i++) {
    // boids_old_velocities.push([
    //   boids_velocities_all[i][0],
    //   boids_velocities_all[i][1],
    //   boids_velocities_all[i][2]
    // ])

    molang_text.push(`v.${boids_animation_name}_boids_old_velocities_${i}_0=v.${boids_animation_name}_boids_velocities_all_${i}_0`)
    molang_text.push(`v.${boids_animation_name}_boids_old_velocities_${i}_1=v.${boids_animation_name}_boids_velocities_all_${i}_1`)
    molang_text.push(`v.${boids_animation_name}_boids_old_velocities_${i}_2=v.${boids_animation_name}_boids_velocities_all_${i}_2`)

  }
  boids_separation = []
  boids_alignment = []
  boids_cohesion = []
  boids_repulsion = []
  for (i = 0; i < boids_n_boids; i++) {
    molang_text.push(`v.${boids_animation_name}_boids_separation_${i}_0=0`)
    molang_text.push(`v.${boids_animation_name}_boids_separation_${i}_1=0`)
    molang_text.push(`v.${boids_animation_name}_boids_separation_${i}_2=0`)
    molang_text.push(`v.${boids_animation_name}_boids_alignment_${i}_0=0`)
    molang_text.push(`v.${boids_animation_name}_boids_alignment_${i}_1=0`)
    molang_text.push(`v.${boids_animation_name}_boids_alignment_${i}_2=0`)
    molang_text.push(`v.${boids_animation_name}_boids_cohesion_${i}_0=0`)
    molang_text.push(`v.${boids_animation_name}_boids_cohesion_${i}_1=0`)
    molang_text.push(`v.${boids_animation_name}_boids_cohesion_${i}_2=0`)
    molang_text.push(`v.${boids_animation_name}_boids_repulsion_${i}_0=0`)
    molang_text.push(`v.${boids_animation_name}_boids_repulsion_${i}_1=0`)
    molang_text.push(`v.${boids_animation_name}_boids_repulsion_${i}_2=0`)

    //boids_separation.push([0, 0, 0])
    //boids_alignment.push([0, 0, 0])
    //boids_cohesion.push([0, 0, 0])
    //boids_repulsion.push([0, 0, 0])
  }
  // 分离
  for (i = 0; i < boids_n_boids; i++) {

    molang_text.push(`v.${boids_animation_name}_avg_diff_0=0`)
    molang_text.push(`v.${boids_animation_name}_avg_diff_1=0`)
    molang_text.push(`v.${boids_animation_name}_avg_diff_2=0`)
    molang_text.push(`v.${boids_animation_name}_boids_neighbors_length=0`)
    // 寻找感知范围内的邻近鸟
    for (j = 0; j < boids_n_boids; j++) {
      if (i == j)  // 跳过自己
        continue;

      // 计算与另一只鸟的距离
      molang_text.push(`v.${boids_animation_name}_boids_dx=v.${boids_animation_name}_boids_position_all_${i}_0 - v.${boids_animation_name}_boids_position_all_${j}_0`)
      molang_text.push(`v.${boids_animation_name}_boids_dy=v.${boids_animation_name}_boids_position_all_${i}_1 - v.${boids_animation_name}_boids_position_all_${j}_1`)
      molang_text.push(`v.${boids_animation_name}_boids_dz=v.${boids_animation_name}_boids_position_all_${i}_2 - v.${boids_animation_name}_boids_position_all_${j}_2`)
      molang_text.push(`v.${boids_animation_name}_boids_distance=math.sqrt(v.${boids_animation_name}_boids_dx*v.${boids_animation_name}_boids_dx+
                                                                   v.${boids_animation_name}_boids_dy*v.${boids_animation_name}_boids_dy+
                                                                   v.${boids_animation_name}_boids_dz*v.${boids_animation_name}_boids_dz)
                                                                    `)
      molang_text.push(`v.${boids_animation_name}_boids_neighbors_${j}=(v.${boids_animation_name}_boids_distance<${boids_perception_radius / 2})`)

      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_boids_neighbors_length=v.${boids_animation_name}_boids_neighbors_length+1)`)

      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_part_repel_radius})?(v.${boids_animation_name}_boids_strength=1 - (v.${boids_animation_name}_boids_distance / ${boids_part_repel_radius}))`)
      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_part_repel_radius})?(v.${boids_animation_name}_boids_repulsion_${i}_0=v.${boids_animation_name}_boids_repulsion_${i}_0 -v.${boids_animation_name}_boids_dx*v.${boids_animation_name}_boids_strength)`)
      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_part_repel_radius})?(v.${boids_animation_name}_boids_repulsion_${i}_1=v.${boids_animation_name}_boids_repulsion_${i}_1 -v.${boids_animation_name}_boids_dy*v.${boids_animation_name}_boids_strength)`)
      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_part_repel_radius})?(v.${boids_animation_name}_boids_repulsion_${i}_2=v.${boids_animation_name}_boids_repulsion_${i}_2 -v.${boids_animation_name}_boids_dz*v.${boids_animation_name}_boids_strength)`)
    }

    for (j = 0; j < boids_n_boids; j++) {
      if (i == j)  // 跳过自己
        continue;
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_avg_diff_0=v.${boids_animation_name}_avg_diff_0+v.${boids_animation_name}_boids_position_all_${i}_0 - v.${boids_animation_name}_boids_position_all_${j}_0)`)
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_avg_diff_1=v.${boids_animation_name}_avg_diff_1+v.${boids_animation_name}_boids_position_all_${i}_1 - v.${boids_animation_name}_boids_position_all_${j}_1)`)
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_avg_diff_2=v.${boids_animation_name}_avg_diff_2+v.${boids_animation_name}_boids_position_all_${i}_2 - v.${boids_animation_name}_boids_position_all_${j}_2)`)
    }
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_separation_${i}_0=v.${boids_animation_name}_avg_diff_0/v.${boids_animation_name}_boids_neighbors_length)`)
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_separation_${i}_1=v.${boids_animation_name}_avg_diff_1/v.${boids_animation_name}_boids_neighbors_length)`)
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_separation_${i}_2=v.${boids_animation_name}_avg_diff_2/v.${boids_animation_name}_boids_neighbors_length)`)


  }

  for (i = 0; i < boids_n_boids; i++) {

    //对齐力
    molang_text.push(`v.${boids_animation_name}_avg_vel_0=0`)
    molang_text.push(`v.${boids_animation_name}_avg_vel_1=0`)
    molang_text.push(`v.${boids_animation_name}_avg_vel_2=0`)

    //聚合力
    molang_text.push(`v.${boids_animation_name}_center_0=0`)
    molang_text.push(`v.${boids_animation_name}_center_1=0`)
    molang_text.push(`v.${boids_animation_name}_center_2=0`)
    molang_text.push(`v.${boids_animation_name}_boids_neighbors_length=0`)
    // 寻找感知范围内的邻近鸟
    for (j = 0; j < boids_n_boids; j++) {
      if ((i == j) || (i % boneGroups.length != j % boneGroups.length))  // 跳过自己,与异类  // 跳过自己,与异类
        continue


      molang_text.push(`v.${boids_animation_name}_boids_dx=v.${boids_animation_name}_boids_position_all_${i}_0 - v.${boids_animation_name}_boids_position_all_${j}_0`)
      molang_text.push(`v.${boids_animation_name}_boids_dy=v.${boids_animation_name}_boids_position_all_${i}_1 - v.${boids_animation_name}_boids_position_all_${j}_1`)
      molang_text.push(`v.${boids_animation_name}_boids_dz=v.${boids_animation_name}_boids_position_all_${i}_2 - v.${boids_animation_name}_boids_position_all_${j}_2`)
      molang_text.push(`v.${boids_animation_name}_boids_distance=math.sqrt(v.${boids_animation_name}_boids_dx*v.${boids_animation_name}_boids_dx+
                                                                   v.${boids_animation_name}_boids_dy*v.${boids_animation_name}_boids_dy+
                                                                   v.${boids_animation_name}_boids_dz*v.${boids_animation_name}_boids_dz)
                                                                      `)
      molang_text.push(`v.${boids_animation_name}_boids_neighbors_${j}=(v.${boids_animation_name}_boids_distance<${boids_perception_radius})`)

      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_boids_neighbors_length=v.${boids_animation_name}_boids_neighbors_length+1)`)

    }


    for (j = 0; j < boids_n_boids; j++) {
      if ((i == j) || (i % boneGroups.length != j % boneGroups.length))  // 跳过自己,与异类  // 跳过自己,与异类
        continue
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_avg_vel_0=v.${boids_animation_name}_avg_vel_0+v.${boids_animation_name}_boids_velocities_all_${j}_0)`)
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_avg_vel_1=v.${boids_animation_name}_avg_vel_1+v.${boids_animation_name}_boids_velocities_all_${j}_1)`)
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_avg_vel_2=v.${boids_animation_name}_avg_vel_2+v.${boids_animation_name}_boids_velocities_all_${j}_2)`)

    }
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_alignment_${i}_0=v.${boids_animation_name}_avg_vel_0/v.${boids_animation_name}_boids_neighbors_length)`)
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_alignment_${i}_1=v.${boids_animation_name}_avg_vel_1/v.${boids_animation_name}_boids_neighbors_length)`)
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_alignment_${i}_2=v.${boids_animation_name}_avg_vel_2/v.${boids_animation_name}_boids_neighbors_length)`)

    //聚合力
    // 如果有邻居，计算它们的中心位置
    for (j = 0; j < boids_n_boids; j++) {
      if ((i == j) || (i % boneGroups.length != j % boneGroups.length))  // 跳过自己,与异类
        continue
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_center_0=v.${boids_animation_name}_center_0+v.${boids_animation_name}_boids_position_all_${j}_0)`)
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_center_1=v.${boids_animation_name}_center_1+v.${boids_animation_name}_boids_position_all_${j}_1)`)
      molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length&&v.${boids_animation_name}_boids_neighbors_${j})?(v.${boids_animation_name}_center_2=v.${boids_animation_name}_center_2+v.${boids_animation_name}_boids_position_all_${j}_2)`)

    }
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_cohesion_${i}_0=v.${boids_animation_name}_center_0/v.${boids_animation_name}_boids_neighbors_length-v.${boids_animation_name}_boids_position_all_${i}_0)`)
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_cohesion_${i}_1=v.${boids_animation_name}_center_1/v.${boids_animation_name}_boids_neighbors_length-v.${boids_animation_name}_boids_position_all_${i}_1)`)
    molang_text.push(`(v.${boids_animation_name}_boids_neighbors_length)?(v.${boids_animation_name}_boids_cohesion_${i}_2=v.${boids_animation_name}_center_2/v.${boids_animation_name}_boids_neighbors_length-v.${boids_animation_name}_boids_position_all_${i}_2)`)
    // 计算平均值并得到朝向中心的向量

  }



  // 限制分离力的大小
  for (i = 0; i < boids_n_boids; i++) {

    molang_text.push(`v.${boids_animation_name}_boids_force_mag=math.sqrt(v.${boids_animation_name}_boids_separation_${i}_0*v.${boids_animation_name}_boids_separation_${i}_0+
                                                                  v.${boids_animation_name}_boids_separation_${i}_1*v.${boids_animation_name}_boids_separation_${i}_1+
                                                                  v.${boids_animation_name}_boids_separation_${i}_2*v.${boids_animation_name}_boids_separation_${i}_2)
        `)


    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_separation_${i}_0=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_separation_${i}_0)`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_separation_${i}_1=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_separation_${i}_1)`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_separation_${i}_2=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_separation_${i}_2)`)

  }

  // 限制对齐力的大小
  for (i = 0; i < boids_n_boids; i++) {
    molang_text.push(`v.${boids_animation_name}_boids_force_mag=math.sqrt(v.${boids_animation_name}_boids_alignment_${i}_0*v.${boids_animation_name}_boids_alignment_${i}_0+
                                                                  v.${boids_animation_name}_boids_alignment_${i}_1*v.${boids_animation_name}_boids_alignment_${i}_1+
                                                                  v.${boids_animation_name}_boids_alignment_${i}_2*v.${boids_animation_name}_boids_alignment_${i}_2)
`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_alignment_${i}_0=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_alignment_${i}_0)`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_alignment_${i}_1=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_alignment_${i}_1)`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_alignment_${i}_2=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_alignment_${i}_2)`)
    //force_mag = Math.sqrt(
    //  parseFloat(boids_alignment[i][0]) * parseFloat(boids_alignment[i][0]) +
    //  parseFloat(boids_alignment[i][1]) * parseFloat(boids_alignment[i][1]) +
    //  parseFloat(boids_alignment[i][2]) * parseFloat(boids_alignment[i][2])
    //)
    //if (force_mag > boids_max_steering_force) {
    //  scale = boids_max_steering_force / force_mag
    //  boids_alignment[i] = [
    //    parseFloat(scale) * parseFloat(boids_alignment[i][0]),
    //    parseFloat(scale) * parseFloat(boids_alignment[i][1]),
    //    parseFloat(scale) * parseFloat(boids_alignment[i][2])
    //  ]
    //}
  }
  // 限制聚合力的大小
  for (i = 0; i < boids_n_boids; i++) {
    molang_text.push(`v.${boids_animation_name}_boids_force_mag=math.sqrt(v.${boids_animation_name}_boids_cohesion_${i}_0*v.${boids_animation_name}_boids_cohesion_${i}_0+
                                                                  v.${boids_animation_name}_boids_cohesion_${i}_1*v.${boids_animation_name}_boids_cohesion_${i}_1+
                                                                  v.${boids_animation_name}_boids_cohesion_${i}_2*v.${boids_animation_name}_boids_cohesion_${i}_2)
`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_cohesion_${i}_0=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_cohesion_${i}_0)`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_cohesion_${i}_1=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_cohesion_${i}_1)`)
    molang_text.push(`(v.${boids_animation_name}_boids_force_mag>${boids_max_steering_force})?(v.${boids_animation_name}_boids_cohesion_${i}_2=${boids_max_steering_force} / v.${boids_animation_name}_boids_force_mag*v.${boids_animation_name}_boids_cohesion_${i}_2)`)
    //force_mag = Math.sqrt(boids_cohesion[i][0] * boids_cohesion[i][0])
    //if (force_mag > boids_max_steering_force) {
    //  scale = boids_max_steering_force / force_mag
    //  boids_cohesion[i] = [
    //    parseFloat(scale * boids_cohesion[i][0]),
    //    parseFloat(scale * boids_cohesion[i][1]),
    //    parseFloat(scale * boids_cohesion[i][2])
    //  ]
    //}
  }

  //排斥力
  for (i = 0; i < boids_n_boids; i++) {

    for (j = 0; j < boids_repel_point.length; j++) {
      molang_text.push(`v.${boids_animation_name}_boids_dx=v.${boids_animation_name}_boids_position_all_${i}_0 - ${boids_repel_point[j][0]}`)
      molang_text.push(`v.${boids_animation_name}_boids_dy=v.${boids_animation_name}_boids_position_all_${i}_1 - ${boids_repel_point[j][1]}`)
      molang_text.push(`v.${boids_animation_name}_boids_dz=v.${boids_animation_name}_boids_position_all_${i}_2 - ${boids_repel_point[j][2]}`)
      //distance = Math.sqrt(parseFloat(dx * dx) + parseFloat(dy * dy) + parseFloat(dz * dz))
      molang_text.push(`v.${boids_animation_name}_boids_distance=math.sqrt(v.${boids_animation_name}_boids_dx*v.${boids_animation_name}_boids_dx+
                                                                       v.${boids_animation_name}_boids_dy*v.${boids_animation_name}_boids_dy+
                                                                       v.${boids_animation_name}_boids_dz*v.${boids_animation_name}_boids_dz)
                                                                          `)

      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_repel_radius})?(v.${boids_animation_name}_boids_strength=2 - (v.${boids_animation_name}_boids_distance / ${boids_repel_radius}))`)
      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_repel_radius})?(v.${boids_animation_name}_boids_repulsion_${i}_0=v.${boids_animation_name}_boids_repulsion_${i}_0 + v.${boids_animation_name}_boids_dx*v.${boids_animation_name}_boids_strength)`)
      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_repel_radius})?(v.${boids_animation_name}_boids_repulsion_${i}_1=v.${boids_animation_name}_boids_repulsion_${i}_1 + v.${boids_animation_name}_boids_dy*v.${boids_animation_name}_boids_strength)`)
      molang_text.push(`(v.${boids_animation_name}_boids_distance<${boids_repel_radius})?(v.${boids_animation_name}_boids_repulsion_${i}_2=v.${boids_animation_name}_boids_repulsion_${i}_2 + v.${boids_animation_name}_boids_dz*v.${boids_animation_name}_boids_strength)`)
      // 计算与排斥点的距离和方向

    }
  }

  //速度计算
  for (i = 0; i < boids_n_boids; i++) {
    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_0=v.${boids_animation_name}_boids_velocities_all_${i}_0+
          v.${boids_animation_name}_boids_separation_${i}_0*${boids_separation_weight}+
          v.${boids_animation_name}_boids_alignment_${i}_0*${boids_alignment_weight}+
          v.${boids_animation_name}_boids_cohesion_${i}_0*${boids_cohesion_weight}+
          v.${boids_animation_name}_boids_repulsion_${i}_0*${boids_repel_weight}
          `)
    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_1=v.${boids_animation_name}_boids_velocities_all_${i}_1+
          v.${boids_animation_name}_boids_separation_${i}_1*${boids_separation_weight}+
          v.${boids_animation_name}_boids_alignment_${i}_1*${boids_alignment_weight}+
          v.${boids_animation_name}_boids_cohesion_${i}_1*${boids_cohesion_weight}+
          v.${boids_animation_name}_boids_repulsion_${i}_1*${boids_repel_weight}
          `)
    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_2=v.${boids_animation_name}_boids_velocities_all_${i}_2+
          v.${boids_animation_name}_boids_separation_${i}_2*${boids_separation_weight}+
          v.${boids_animation_name}_boids_alignment_${i}_2*${boids_alignment_weight}+
          v.${boids_animation_name}_boids_cohesion_${i}_2*${boids_cohesion_weight}+
          v.${boids_animation_name}_boids_repulsion_${i}_2*${boids_repel_weight}
          `)

    //boids_velocities_all[i][0] = parseFloat(boids_velocities_all[i][0]) + parseFloat(
    //  parseFloat(boids_separation[i][0]) * parseFloat(boids_separation_weight) +
    //  parseFloat(boids_alignment[i][0]) * parseFloat(boids_alignment_weight) +
    //  parseFloat(boids_cohesion[i][0]) * parseFloat(boids_cohesion_weight) +
    //  parseFloat(boids_repulsion[i][0]) * parseFloat(boids_repel_weight)
    //)
    //boids_velocities_all[i][1] = parseFloat(boids_velocities_all[i][1]) + parseFloat(
    //  parseFloat(boids_separation[i][1]) * parseFloat(boids_separation_weight) +
    //  parseFloat(boids_alignment[i][1]) * parseFloat(boids_alignment_weight) +
    //  parseFloat(boids_cohesion[i][1]) * parseFloat(boids_cohesion_weight) +
    //  parseFloat(boids_repulsion[i][1]) * parseFloat(boids_repel_weight)
    //)
    //boids_velocities_all[i][2] = parseFloat(boids_velocities_all[i][2]) + parseFloat(
    //  parseFloat(boids_separation[i][2]) * parseFloat(boids_separation_weight) +
    //  parseFloat(boids_alignment[i][2]) * parseFloat(boids_alignment_weight) +
    //  parseFloat(boids_cohesion[i][2]) * parseFloat(boids_cohesion_weight) +
    //  parseFloat(boids_repulsion[i][2]) * parseFloat(boids_repel_weight)
    //)

  }

  // 限制速度范围
  for (i = 0; i < boids_n_boids; i++) {
    // 计算当前速度大小

    molang_text.push(`v.${boids_animation_name}_boids_speed = math.sqrt(v.${boids_animation_name}_boids_velocities_all_${i}_0*v.${boids_animation_name}_boids_velocities_all_${i}_0+v.${boids_animation_name}_boids_velocities_all_${i}_1*v.${boids_animation_name}_boids_velocities_all_${i}_1+v.${boids_animation_name}_boids_velocities_all_${i}_2*v.${boids_animation_name}_boids_velocities_all_${i}_2) `)

    molang_text.push(`(v.${boids_animation_name}_boids_speed>${boids_max_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_0=v.${boids_animation_name}_boids_velocities_all_${i}_0*${boids_max_speed} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed>${boids_max_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_1=v.${boids_animation_name}_boids_velocities_all_${i}_1*${boids_max_speed} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed>${boids_max_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_2=v.${boids_animation_name}_boids_velocities_all_${i}_2*${boids_max_speed} / v.${boids_animation_name}_boids_speed) `)

    molang_text.push(`(v.${boids_animation_name}_boids_speed<${boids_min_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_0=v.${boids_animation_name}_boids_velocities_all_${i}_0*${boids_min_speed} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed<${boids_min_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_1=v.${boids_animation_name}_boids_velocities_all_${i}_1*${boids_min_speed} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed<${boids_min_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_2=v.${boids_animation_name}_boids_velocities_all_${i}_2*${boids_min_speed} / v.${boids_animation_name}_boids_speed) `)

    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_0=${boids_smooth_factor}*v.${boids_animation_name}_boids_old_velocities_${i}_0+v.${boids_animation_name}_boids_velocities_all_${i}_0*${1 - boids_smooth_factor} `)
    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_1=${boids_smooth_factor}*v.${boids_animation_name}_boids_old_velocities_${i}_1+v.${boids_animation_name}_boids_velocities_all_${i}_1*${1 - boids_smooth_factor} `)
    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_2=${boids_smooth_factor}*v.${boids_animation_name}_boids_old_velocities_${i}_2+v.${boids_animation_name}_boids_velocities_all_${i}_2*${1 - boids_smooth_factor} `)

  }
  //边界
  for (i = 0; i < boids_n_boids; i++) {
    molang_text.push(`v.${boids_animation_name}_edge_x= math.min(v.${boids_animation_name}_boids_position_all_${i}_0 -${boids_center_point[0]} + ${boids_width / 2},
                                                                              ${boids_width / 2}  + ${boids_center_point[0]} - v.${boids_animation_name}_boids_position_all_${i}_0) / ${boids_margin}`)
    molang_text.push(`v.${boids_animation_name}_edge_y= math.min(v.${boids_animation_name}_boids_position_all_${i}_1 -${boids_center_point[1]} + ${boids_height / 2},
                                                                              ${boids_height / 2}  + ${boids_center_point[1]} - v.${boids_animation_name}_boids_position_all_${i}_1) / ${boids_margin}`)
    molang_text.push(`v.${boids_animation_name}_edge_z= math.min(v.${boids_animation_name}_boids_position_all_${i}_2 -${boids_center_point[2]} + ${boids_depth / 2},
                                                                              ${boids_depth / 2}  + ${boids_center_point[2]} - v.${boids_animation_name}_boids_position_all_${i}_2) / ${boids_margin}`)



    molang_text.push(`((v.${boids_animation_name}_boids_position_all_${i}_0 - ${boids_center_point[0]}) < (${boids_margin - boids_width / 2}))?(v.${boids_animation_name}_boids_velocities_all_${i}_0 = v.${boids_animation_name}_boids_velocities_all_${i}_0 + (1 - v.${boids_animation_name}_edge_x) *${boids_turn_factor * boids_max_speed})`)
    molang_text.push(`((v.${boids_animation_name}_boids_position_all_${i}_0 - ${boids_center_point[0]}) > (${boids_width / 2 - boids_margin}))?(v.${boids_animation_name}_boids_velocities_all_${i}_0 = v.${boids_animation_name}_boids_velocities_all_${i}_0 - (1 - v.${boids_animation_name}_edge_x) *${boids_turn_factor * boids_max_speed})`)

    molang_text.push(`((v.${boids_animation_name}_boids_position_all_${i}_1 - ${boids_center_point[1]}) < (${boids_margin - boids_height / 2}))?(v.${boids_animation_name}_boids_velocities_all_${i}_1 = v.${boids_animation_name}_boids_velocities_all_${i}_1 + (1 - v.${boids_animation_name}_edge_y) *${boids_turn_factor * boids_max_speed})`)
    molang_text.push(`((v.${boids_animation_name}_boids_position_all_${i}_1 - ${boids_center_point[1]}) > (${boids_height / 2 - boids_margin}))?(v.${boids_animation_name}_boids_velocities_all_${i}_1 = v.${boids_animation_name}_boids_velocities_all_${i}_1 - (1 - v.${boids_animation_name}_edge_y) *${boids_turn_factor * boids_max_speed})`)

    molang_text.push(`((v.${boids_animation_name}_boids_position_all_${i}_2 - ${boids_center_point[2]}) < (${boids_margin - boids_depth / 2}))?(v.${boids_animation_name}_boids_velocities_all_${i}_2 = v.${boids_animation_name}_boids_velocities_all_${i}_2 + (1 - v.${boids_animation_name}_edge_z) *${boids_turn_factor * boids_max_speed})`)
    molang_text.push(`((v.${boids_animation_name}_boids_position_all_${i}_2 - ${boids_center_point[2]}) > (${boids_depth / 2 - boids_margin}))?(v.${boids_animation_name}_boids_velocities_all_${i}_2 = v.${boids_animation_name}_boids_velocities_all_${i}_2 - (1 - v.${boids_animation_name}_edge_z) *${boids_turn_factor * boids_max_speed})`)

  }

  // 限制速度范围
  for (i = 0; i < boids_n_boids; i++) {
    // 计算当前速度大小

    molang_text.push(`v.${boids_animation_name}_boids_speed = math.sqrt(v.${boids_animation_name}_boids_velocities_all_${i}_0*v.${boids_animation_name}_boids_velocities_all_${i}_0+v.${boids_animation_name}_boids_velocities_all_${i}_1*v.${boids_animation_name}_boids_velocities_all_${i}_1+v.${boids_animation_name}_boids_velocities_all_${i}_2*v.${boids_animation_name}_boids_velocities_all_${i}_2) `)

    molang_text.push(`(v.${boids_animation_name}_boids_speed>${boids_max_speed * 4})?(v.${boids_animation_name}_boids_velocities_all_${i}_0=v.${boids_animation_name}_boids_velocities_all_${i}_0*${boids_max_speed * 4} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed>${boids_max_speed * 4})?(v.${boids_animation_name}_boids_velocities_all_${i}_1=v.${boids_animation_name}_boids_velocities_all_${i}_1*${boids_max_speed * 4} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed>${boids_max_speed * 4})?(v.${boids_animation_name}_boids_velocities_all_${i}_2=v.${boids_animation_name}_boids_velocities_all_${i}_2*${boids_max_speed * 4} / v.${boids_animation_name}_boids_speed) `)

    molang_text.push(`(v.${boids_animation_name}_boids_speed<${boids_min_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_0=v.${boids_animation_name}_boids_velocities_all_${i}_0*${boids_min_speed} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed<${boids_min_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_1=v.${boids_animation_name}_boids_velocities_all_${i}_1*${boids_min_speed} / v.${boids_animation_name}_boids_speed) `)
    molang_text.push(`(v.${boids_animation_name}_boids_speed<${boids_min_speed})?(v.${boids_animation_name}_boids_velocities_all_${i}_2=v.${boids_animation_name}_boids_velocities_all_${i}_2*${boids_min_speed} / v.${boids_animation_name}_boids_speed) `)

    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_0=${boids_smooth_factor}*v.${boids_animation_name}_boids_old_velocities_${i}_0+v.${boids_animation_name}_boids_velocities_all_${i}_0*${1 - boids_smooth_factor} `)
    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_1=${boids_smooth_factor}*v.${boids_animation_name}_boids_old_velocities_${i}_1+v.${boids_animation_name}_boids_velocities_all_${i}_1*${1 - boids_smooth_factor} `)
    molang_text.push(`v.${boids_animation_name}_boids_velocities_all_${i}_2=${boids_smooth_factor}*v.${boids_animation_name}_boids_old_velocities_${i}_2+v.${boids_animation_name}_boids_velocities_all_${i}_2*${1 - boids_smooth_factor} `)

  }

  for (i = 0; i < molang_text.length; i++) {
    molang_in_text += `(q.anim_time-v.boids_${boids_name}_new_time_have>0.1)?(${molang_text[i]});\n`
  }
  molang_text = []
  // 更新位置
  for (i = 0; i < boids_n_boids; i++) {
    molang_text.push(`v.${boids_animation_name}_boids_position_all_${i}_0=v.${boids_animation_name}_boids_position_all_${i}_0+v.${boids_animation_name}_boids_velocities_all_${i}_0*0.1`)
    molang_text.push(`v.${boids_animation_name}_boids_position_all_${i}_1=v.${boids_animation_name}_boids_position_all_${i}_1+v.${boids_animation_name}_boids_velocities_all_${i}_1*0.1`)
    molang_text.push(`v.${boids_animation_name}_boids_position_all_${i}_2=v.${boids_animation_name}_boids_position_all_${i}_2+v.${boids_animation_name}_boids_velocities_all_${i}_2*0.1`)

    molang_text.push(`v.${boids_animation_name}_boids_rot_${i}_y=math.min_angle(-math.atan2(v.${boids_animation_name}_boids_velocities_all_${i}_0, v.${boids_animation_name}_boids_velocities_all_${i}_2) * 180 / math.pi - v.${boids_animation_name}_boids_rotation_last_all_${i}_1  )`)

    molang_text.push(`v.${boids_animation_name}_boids_rot_${i}_y=v.${boids_animation_name}_boids_rotation_last_all_${i}_1+v.${boids_animation_name}_boids_rot_${i}_y*0.1`)
    molang_text.push(`v.${boids_animation_name}_boids_rot_${i}_x=-math.atan2(v.${boids_animation_name}_boids_velocities_all_${i}_1, math.sqrt(v.${boids_animation_name}_boids_velocities_all_${i}_0 * v.${boids_animation_name}_boids_velocities_all_${i}_0 + v.${boids_animation_name}_boids_velocities_all_${i}_2 *v.${boids_animation_name}_boids_velocities_all_${i}_2)) * 180 / math.pi-v.${boids_animation_name}_boids_rotation_last_all_${i}_0`)
    molang_text.push(`v.${boids_animation_name}_boids_rot_${i}_x=v.${boids_animation_name}_boids_rotation_last_all_${i}_0+v.${boids_animation_name}_boids_rot_${i}_x*0.1`)
    molang_text.push(`v.${boids_animation_name}_boids_rotation_last_all_${i}_1=v.${boids_animation_name}_boids_rot_${i}_y`)
    molang_text.push(`v.${boids_animation_name}_boids_rotation_last_all_${i}_0=v.${boids_animation_name}_boids_rot_${i}_x`)

  }




  if (boids_part_animation) {

    for (b_n = 0; b_n < boids_n_boids; b_n++) {

      boids_group = []
      if (boneGroups.length != 0) {

        //console.log(boneGroups.length)
        boids_group.push(boneGroups[b_n % boneGroups.length])

        group_boids = name_group[`${boids_name}_boids_${boneGroups[b_n % boneGroups.length].name}_${b_n}`]


        for (j = 0; j < boids_group.length; j++) {

          group_boids = name_group[`${boids_name}_boids_${boids_group[j].name}_${b_n}`]
          if (boids_part_animation != undefined) {
            if (boids_part_animation.getBoneAnimator(boids_group[j]).rotation.length > 0)
              addnameanimate_rotation(boids_animation, group_boids, 0,
                [`${boids_part_animation.getBoneAnimator(boids_group[j]).rotation[0].data_points[0].x}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`),
                `${boids_part_animation.getBoneAnimator(boids_group[j]).rotation[0].data_points[0].y}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`),
                `${boids_part_animation.getBoneAnimator(boids_group[j]).rotation[0].data_points[0].z}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`)
                ])
            if (boids_part_animation.getBoneAnimator(boids_group[j]).position.length > 0)
              addnameanimate_position(boids_animation, group_boids, 0,
                [`${boids_part_animation.getBoneAnimator(boids_group[j]).position[0].data_points[0].x}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`),
                `${boids_part_animation.getBoneAnimator(boids_group[j]).position[0].data_points[0].y}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`),
                `${boids_part_animation.getBoneAnimator(boids_group[j]).position[0].data_points[0].z}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`)
                ])
            if (boids_part_animation.getBoneAnimator(boids_group[j]).scale.length > 0) {
              if (boids_part_animation.getBoneAnimator(boids_group[j]).scale[0].uniform) {
                addnameanimate_scale_uniform(boids_animation, group_boids, 0,
                  `${boids_part_animation.getBoneAnimator(boids_group[j]).scale[0].data_points[0].x}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${group_boids.name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${group_boids.name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${group_boids.name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${group_boids.name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${group_boids.name}').z*math.cos(q.body_y_rotation))/16*0.7`),
                )
              } else {
                addnameanimate_scale(boids_animation, group_boids, 0,
                  [`${boids_part_animation.getBoneAnimator(boids_group[j]).scale[0].data_points[0].x}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`),
                  `${boids_part_animation.getBoneAnimator(boids_group[j]).scale[0].data_points[0].y}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`),
                  `${boids_part_animation.getBoneAnimator(boids_group[j]).scale[0].data_points[0].z}`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${j}`)
                  ])
              }
            }
          }



          boids_group[j].children.forEach(children => {
            if (children instanceof Group) {
              boids_group.push(children)

            }
          })

        }
      }
    }
  }


  boids_all = name_group[`${boids_name}_boids_all`]
  boids_all_a = name_group[`${boids_name}_boids_all_a`]
  addnameanimate_rotation(boids_animation, boids_all, 0, [0, `-q.body_y_rotation`, 0])

  addnameanimate_scale_uniform(boids_animation, boids_all, 0, 1)

  //model_name + '_all'
  addnameanimate_position(boids_animation, boids_all_a, 0,
    [
      `-q.position(0)*16/0.7`,
      `-q.position(1)*16/0.7+(ctrl.sneak||ctrl.sneaking)*3`,
      `q.position(2)*16/0.7`])

  for (i = 0; i < boids_n_boids; i++) {
    boids_group_c = name_group[`${boids_name}_boids_${i}`]

    addnameanimate_scale_uniform(boids_animation, boids_group_c, 0,
      boids_scale)
    addnameanimate_rotation(boids_animation, boids_group_c, 0,
      [
        `v.${boids_animation_name}_boids_rot_${i}_x`,
        `v.${boids_animation_name}_boids_rot_${i}_y`,
        0
      ])
    addnameanimate_position(boids_animation, boids_group_c, 0,
      [
        `v.${boids_animation_name}_boids_position_all_${i}_0*16/0.7`,
        `v.${boids_animation_name}_boids_position_all_${i}_1*16/0.7`,
        `-v.${boids_animation_name}_boids_position_all_${i}_2*16/0.7`
      ])
  }


  for (i = 0; i < molang_text.length; i++) {
    molang_in_text += `(q.anim_time-v.boids_${boids_name}_var_time_have>0.01)?(${molang_text[i]});\n`
  }

  molang_in_text += `v.boids_${boids_name}_new_time_have=(q.anim_time-v.boids_${boids_name}_new_time_have>0.1?v.boids_${boids_name}_new_time_have+0.1:math.min(q.anim_time,v.boids_${boids_name}_new_time_have));\n`
  molang_in_text += `v.boids_${boids_name}_var_time_have=(q.anim_time-v.boids_${boids_name}_var_time_have>0.01?v.boids_${boids_name}_var_time_have+0.01:math.min(q.anim_time,v.boids_${boids_name}_var_time_have));\n`

  effect.addKeyframe({
    channel: 'timeline'
  }).set('script', boids_timeline)

  boids_animation.animators['effects'] = effect
  addnameanimate_scale_uniform(boids_animation, boids_molang, 0, molang_in_text)

}
function dissipate_model_resolve() {
  dissipate_name = localStorage.getItem(`dissipate_name`)
  anim_and_ctrl_reload(undefined, undefined)
  for (i = 0; i < Cube.all.length; i++) {
    if (Cube.all[i].visibility && Cube.all[i].parent.name.includes(dissipate_name + `_view`)) {

      Undo.initEdit({ groups: [Cube.all[i].parent] })
      Cube.all[i].parent.resolve(true)

      Undo.finishEdit(`Finished  model`);
    }
  }
  Canvas.updateView({
    elements: Outliner.all,
    element_aspects: { transform: true, geometry: true },
    groups: Group.all,
    selection: true
  });
}

function dissipate_model_frame() {

  let dissipate_mianban = new Dialog({
    title: '参数面板',
    id: 'dissipate_mianban',
    form: {
      folder: { label: `模型位置`, type: `folder`, value: localStorage.getItem(`path`) },

      dissipate_transform: { label: "翻转", type: "checkbox", value: localStorage.getItem(`dissipate_transform`) === `true` ? true : false },
      dissipate_uncover: { label: "附加", type: "checkbox", value: localStorage.getItem(`dissipate_uncover`) === `true` ? true : false },
      dissipate_animation_name: { label: `动画名`, type: `text`, value: localStorage.getItem(`dissipate_animation_name`) || `dissipate` },
      dissipate_name: { label: `组名前缀`, type: `text`, value: localStorage.getItem(`dissipate_name`) || `dissipate` },
      dissipate_first_time: { label: `开始时间`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_first_time`)) || 0, min: 0 },
      dissipate_need_time: { label: `需要时间`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_need_time`)) || 0, min: 0 },
      dissipate_random_time: { label: `随机时间区间`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_random_time`)) || 0, min: 0 },
      dissipate_speed: { label: `变化速度`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_speed`)) || 0.2 },
      dissipate_set_speed: { label: `位移速度`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_set_speed`)) || 0 },
      dissipate_set_x: { label: `中心位置(x)`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_set_x`)) || 0 },
      dissipate_set_y: { label: `中心位置(y)`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_set_y`)) || 0 },
      dissipate_set_z: { label: `中心位置(z)`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_set_z`)) || 0 },
      dissipate_def_x: { label: `影响尺度(x)`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_def_x`)) || 0.0001, min: 0.0001 },
      dissipate_def_y: { label: `影响尺度(y)`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_def_y`)) || 0.0001, min: 0.0001 },
      dissipate_def_z: { label: `影响尺度(z)`, type: `number`, value: parseFloat(localStorage.getItem(`dissipate_def_z`)) || 0.0001, min: 0.0001 },

    },
    onFormChange() {
      dissipate_cunchu()
    },
    onConfirm() {
      dissipate_cunchu()
      Blockbench.readFile(path + `/ysm.json`, { type: 'text' }, (file) => {
        ysm = JSON.parse(file[0].content);
      });

      Undo.initEdit({
        outliner: true,
        animations: []
      });
      dissipate_run()
      Undo.finishEdit(`Finished  model`);
    }

  })
  dissipate_mianban.show()
}
function dissipate_cunchu() {

  path = $('.dialog#dissipate_mianban input#folder').val();
  dissipate_transform = $('.dialog#dissipate_mianban input#dissipate_transform').is(`:checked`);
  dissipate_uncover = $('.dialog#dissipate_mianban input#dissipate_uncover').is(`:checked`);
  dissipate_animation_name = $('.dialog#dissipate_mianban input#dissipate_animation_name').val();
  dissipate_name = $('.dialog#dissipate_mianban input#dissipate_name').val();
  dissipate_first_time = $('.dialog#dissipate_mianban input#dissipate_first_time').val();
  dissipate_need_time = $('.dialog#dissipate_mianban input#dissipate_need_time').val();
  dissipate_random_time = $('.dialog#dissipate_mianban input#dissipate_random_time').val();
  dissipate_speed = $('.dialog#dissipate_mianban input#dissipate_speed').val();
  dissipate_set_speed = $('.dialog#dissipate_mianban input#dissipate_set_speed').val();
  dissipate_set_x = $('.dialog#dissipate_mianban input#dissipate_set_x').val();
  dissipate_set_y = $('.dialog#dissipate_mianban input#dissipate_set_y').val();
  dissipate_set_z = $('.dialog#dissipate_mianban input#dissipate_set_z').val();
  dissipate_def_x = $('.dialog#dissipate_mianban input#dissipate_def_x').val();
  dissipate_def_y = $('.dialog#dissipate_mianban input#dissipate_def_y').val();
  dissipate_def_z = $('.dialog#dissipate_mianban input#dissipate_def_z').val();


  localStorage.setItem(`path`, path);
  localStorage.setItem(`dissipate_transform`, dissipate_transform);
  localStorage.setItem(`dissipate_uncover`, dissipate_uncover);
  localStorage.setItem(`dissipate_animation_name`, dissipate_animation_name);
  localStorage.setItem(`dissipate_name`, dissipate_name);
  localStorage.setItem(`dissipate_first_time`, dissipate_first_time);
  localStorage.setItem(`dissipate_need_time`, dissipate_need_time);
  localStorage.setItem(`dissipate_random_time`, dissipate_random_time);
  localStorage.setItem(`dissipate_speed`, dissipate_speed);
  localStorage.setItem(`dissipate_set_speed`, dissipate_set_speed);
  localStorage.setItem(`dissipate_set_x`, dissipate_set_x);
  localStorage.setItem(`dissipate_set_y`, dissipate_set_y);
  localStorage.setItem(`dissipate_set_z`, dissipate_set_z);
  localStorage.setItem(`dissipate_def_x`, dissipate_def_x);
  localStorage.setItem(`dissipate_def_y`, dissipate_def_y);
  localStorage.setItem(`dissipate_def_z`, dissipate_def_z);
}
function dissipate_run() {

  dissipate_T = 5 / Math.abs(parseFloat(dissipate_speed)) / 8
  if (dissipate_uncover)
    anim_and_ctrl_reload(undefined, undefined)
  else
    anim_and_ctrl_reload(dissipate_animation_name, undefined)

  x_min = 100000000000
  x_max = -100000000000
  y_min = 100000000000
  y_max = -100000000000
  z_min = 100000000000
  z_max = -100000000000
  show_group = []
  cube_world_set = []
  Undo.initEdit({ groups: show_group })
  for (i = 0; i < Cube.all.length; i++) {
    if (Cube.all[i].visibility) {
      //console.log()
      if (!Cube.all[i].parent.name.includes(dissipate_name)) {
        let position = new THREE.Vector3();

        position.add(Cube.all[i].getWorldCenter()); // 累加子元素的世界中心

        // 转换到组的局部坐标系
        Cube.all[i].mesh.parent.worldToLocal(position);

        // 如果组有父级，调整 origin 偏移
        if (Cube.all[i].parent instanceof Group) {
          position.x += Cube.all[i].parent.origin[0];
          position.y += Cube.all[i].parent.origin[1];
          position.z += Cube.all[i].parent.origin[2];
        }
        if (Cube.all[i].parent.name.includes(`ysmGlow`)) {
          show_group.push(
            new Group({
              name: `ysmGlow_${dissipate_name}_view_${show_group.length}`,
              origin: [position.x,
              position.y,
              position.z
              ]
            })
          )

        } else {
          show_group.push(
            new Group({
              name: `${dissipate_name}_view_${show_group.length}`,
              origin: [position.x,
              position.y,
              position.z
              ]
            })
          )
        }
        Undo.initEdit({ groups: [show_group[show_group.length - 1]] })
        show_group[show_group.length - 1].init()
        show_group[show_group.length - 1].addTo(Cube.all[i].parent)
        Cube.all[i].addTo(show_group[show_group.length - 1])

        Undo.finishEdit(`Finished  model`);
      } else {
        Cube.all[i].parent.name = `${dissipate_name}_view_${show_group.length}`
        show_group.push(Cube.all[i].parent)
      }
      cube_world_set.push([Cube.all[i].getWorldCenter().x, Cube.all[i].getWorldCenter().y, Cube.all[i].getWorldCenter().z])
      x_min = Math.min(x_min, Cube.all[i].getWorldCenter().x)
      x_max = Math.max(x_max, Cube.all[i].getWorldCenter().x)
      y_min = Math.min(y_min, Cube.all[i].getWorldCenter().y)
      y_max = Math.max(y_max, Cube.all[i].getWorldCenter().y)
      z_min = Math.min(z_min, Cube.all[i].getWorldCenter().z)
      z_max = Math.max(z_max, Cube.all[i].getWorldCenter().z)
    }
  }
  Undo.finishEdit(`Finished  model`);
  length_x = (x_max - x_min) / 2
  length_y = (y_max - y_min) / 2
  length_z = (z_max - z_min) / 2
  center_x = (parseFloat(x_max) + parseFloat(x_min)) / 2
  center_y = (parseFloat(y_max) + parseFloat(y_min)) / 2
  center_z = (parseFloat(z_max) + parseFloat(z_min)) / 2
  max_time_x = 1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_x)
  max_time_y = 1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_y)
  max_time_z = 1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_z)
  min_time_x = max_time_x
  min_time_y = max_time_y
  min_time_z = max_time_z

  Canvas.updateView({
    elements: Outliner.all,
    element_aspects: { transform: true, geometry: true },
    groups: Group.all,
    selection: true
  });
  groups_time = []
  for (i = 0; i < show_group.length; i++) {
    if (0) {
      groups_time.push(
        [
          1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_x) * Math.exp(-((cube_world_set[i][0] - center_x) / length_x - dissipate_set_x) * ((cube_world_set[i][0] - center_x) / length_x - dissipate_set_x) / 2 / parseFloat(dissipate_def_x) / parseFloat(dissipate_def_x)),
          1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_y) * Math.exp(-((cube_world_set[i][1] - center_y) / length_y - dissipate_set_y) * ((cube_world_set[i][1] - center_y) / length_y - dissipate_set_y) / 2 / parseFloat(dissipate_def_y) / parseFloat(dissipate_def_y)),
          1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_z) * Math.exp(-((cube_world_set[i][2] - center_z) / length_z - dissipate_set_z) * ((cube_world_set[i][2] - center_z) / length_z - dissipate_set_z) / 2 / parseFloat(dissipate_def_z) / parseFloat(dissipate_def_z))
        ])

    } else {
      groups_time.push(
        [
          1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_x) * Math.exp(-((cube_world_set[i][0] - center_x) / length_x - dissipate_set_x) * ((cube_world_set[i][0] - center_x) / length_x - dissipate_set_x) / 2 / parseFloat(dissipate_def_x) / parseFloat(dissipate_def_x)),
          1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_y) * Math.exp(-((cube_world_set[i][1] - center_y) / length_y - dissipate_set_y) * ((cube_world_set[i][1] - center_y) / length_y - dissipate_set_y) / 2 / parseFloat(dissipate_def_y) / parseFloat(dissipate_def_y)),
          1 / Math.sqrt(2 * Math.PI) / parseFloat(dissipate_def_z) * Math.exp(-((cube_world_set[i][2] - center_z) / length_z - dissipate_set_z) * ((cube_world_set[i][2] - center_z) / length_z - dissipate_set_z) / 2 / parseFloat(dissipate_def_z) / parseFloat(dissipate_def_z))
        ])
    }
    min_time_x = Math.min(min_time_x, groups_time[i][0])
    min_time_y = Math.min(min_time_y, groups_time[i][1])
    min_time_z = Math.min(min_time_z, groups_time[i][2])
  }

  //console.log(Math.min(min_time_x / max_time_x, min_time_y / max_time_y, min_time_z / max_time_z))
  groups_postions = []
  groups_time_all = []
  for (i = 0; i < show_group.length; i++) {

    groups_postions.push([
      ((dissipate_set_x * length_x + center_x)) / parseFloat(dissipate_def_x) + cube_world_set[i][0] * (1 - 1 / parseFloat(dissipate_def_x)),
      ((dissipate_set_y * length_y + center_y)) / parseFloat(dissipate_def_y) + cube_world_set[i][1] * (1 - 1 / parseFloat(dissipate_def_y)),
      ((dissipate_set_z * length_z + center_z)) / parseFloat(dissipate_def_z) + cube_world_set[i][2] * (1 - 1 / parseFloat(dissipate_def_z))
    ])
    let position = new THREE.Vector3();
    position.x = groups_postions[i][0]
    position.y = groups_postions[i][1]
    position.z = groups_postions[i][2]
    show_group[i].mesh.worldToLocal(position);
    //console.log(((dissipate_set_x * length_x + center_x)), cube_world_set[i][0])

    groups_postions[i][0] = -position.x * parseFloat(dissipate_set_speed) / parseFloat(dissipate_speed)
    groups_postions[i][1] = position.y * parseFloat(dissipate_set_speed) / parseFloat(dissipate_speed)
    groups_postions[i][2] = position.z * parseFloat(dissipate_set_speed) / parseFloat(dissipate_speed)

    groups_time[i][0] = (groups_time[i][0]) / (max_time_x)
    groups_time[i][1] = (groups_time[i][1]) / (max_time_y)
    groups_time[i][2] = (groups_time[i][2]) / (max_time_z)

    groups_time_all.push(groups_time[i][0] * groups_time[i][1] * groups_time[i][2] + 0.1 - Math.min(min_time_x / max_time_x, min_time_y / max_time_y, min_time_z / max_time_z))
    if (dissipate_transform) {
      groups_time_all[i] = -groups_time_all[i] + 1 + 0.1 - Math.min(min_time_x / max_time_x, min_time_y / max_time_y, min_time_z / max_time_z)
    }
  }

  dissipate_animation = Animation.all.find(group => group.name === dissipate_animation_name)



  dissipate_animation_length = parseFloat(dissipate_first_time) + parseFloat(dissipate_need_time) + parseFloat(dissipate_random_time) + parseFloat(dissipate_T) * 2
  if (!dissipate_animation) {
    dissipate_animation = new Animation(
      {
        name: dissipate_animation_name,
        length: dissipate_animation_length,
        loop: `loop`,
        snapping: 500,
        path: path + `/` + ysm['files']['player'][`animation`][`main`],
      }
    )
    Undo.initEdit({
      animations: [dissipate_animation]
    })
    dissipate_animation.add()

    Undo.finishEdit(`Finished  model`);
  }
  for (i = 0; i < show_group.length; i++) {
    q_time = groups_time_all[i] * parseFloat(dissipate_need_time) + parseFloat(dissipate_first_time) + parseFloat(Math.random() * dissipate_random_time) + parseFloat(dissipate_T)
    Undo.initEdit({
      animations: [dissipate_animation]
    })
    if (dissipate_animation.getBoneAnimator(show_group[i]).scale.length > 0) {

      dissipate_animation.getBoneAnimator(show_group[i]).scale[0].data_points[0].x = `(${dissipate_animation.getBoneAnimator(show_group[i]).scale[0].data_points[0].x})*math.max(0,1.01*(1/(1+math.exp(${dissipate_speed}*8*(q.anim_time-${q_time})))-0.01))`
      dissipate_animation.getBoneAnimator(show_group[i]).scale[0].data_points[0].y = `(${dissipate_animation.getBoneAnimator(show_group[i]).scale[0].data_points[0].y})*math.max(0,1.01*(1/(1+math.exp(${dissipate_speed}*8*(q.anim_time-${q_time})))-0.01))`
      dissipate_animation.getBoneAnimator(show_group[i]).scale[0].data_points[0].z = `(${dissipate_animation.getBoneAnimator(show_group[i]).scale[0].data_points[0].z})*math.max(0,1.01*(1/(1+math.exp(${dissipate_speed}*8*(q.anim_time-${q_time})))-0.01))`

    } else {
      addnameanimate_scale_uniform(dissipate_animation, show_group[i], q_time,
        `math.max(0,1.01*(1/(1+math.exp(${dissipate_speed}*8*(q.anim_time-${q_time})))-0.01))`
      )
    }
    if (dissipate_animation.getBoneAnimator(show_group[i]).position.length > 0) {

      dissipate_animation.getBoneAnimator(show_group[i]).position[0].data_points[0].x = `(${dissipate_animation.getBoneAnimator(show_group[i]).position[0].data_points[0].x})+${groups_postions[i][0].toFixed(10)}*math.max(0,(1/(1+math.exp(${dissipate_speed}*-8*(q.anim_time-${q_time})))-0.01))`
      dissipate_animation.getBoneAnimator(show_group[i]).position[0].data_points[0].y = `(${dissipate_animation.getBoneAnimator(show_group[i]).position[0].data_points[0].y})+${groups_postions[i][1].toFixed(10)}*math.max(0,(1/(1+math.exp(${dissipate_speed}*-8*(q.anim_time-${q_time})))-0.01))`
      dissipate_animation.getBoneAnimator(show_group[i]).position[0].data_points[0].z = `(${dissipate_animation.getBoneAnimator(show_group[i]).position[0].data_points[0].z})+${groups_postions[i][2].toFixed(10)}*math.max(0,(1/(1+math.exp(${dissipate_speed}*-8*(q.anim_time-${q_time})))-0.01))`

    } else {
      addnameanimate_position(dissipate_animation, show_group[i], q_time,
        [`${groups_postions[i][0].toFixed(10)}*math.max(0,(1/(1+math.exp(${dissipate_speed}*-8*(q.anim_time-${q_time})))-0.01))`,
        `${groups_postions[i][1].toFixed(10)}*math.max(0,(1/(1+math.exp(${dissipate_speed}*-8*(q.anim_time-${q_time})))-0.01))`,
        `${groups_postions[i][2].toFixed(10)}*math.max(0,(1/(1+math.exp(${dissipate_speed}*-8*(q.anim_time-${q_time})))-0.01))`

        ]
      )
    }
    Undo.finishEdit(`Finished  model`);
  }
  Canvas.updateAll()

}
function track_model_frame() {

  let track_mianban = new Dialog({
    title: '参数面板',
    id: 'track_mianban',
    form: {
      folder: { label: `模型位置`, type: `folder`, value: localStorage.getItem(`path`) },

      play_in: { label: "实时", type: "checkbox", value: localStorage.getItem(`play_in`) === `true` ? true : false },
      track_rate: { label: `帧率`, type: `number`, value: parseFloat(localStorage.getItem(`track_rate`)) || 100, min: 1 },
      track_model_name: { label: `头部组名`, type: `text`, value: localStorage.getItem(`track_model_name`) || `track_model` },
      track_animation_name: { label: `动画名`, type: `text`, value: localStorage.getItem(`track_animation_name`) || `track` },
      track_show_name: { label: `生成动画`, type: `text`, value: localStorage.getItem(`track_show_name`) || `track_show_name` },
      track_tail_name: { label: `尾部组名`, type: `text`, value: localStorage.getItem(`track_tail_name`) || `track_model` },

    },
    onFormChange() {
      track_cunchu()
    },
    onConfirm() {
      track_cunchu()
      Blockbench.readFile(path + `/ysm.json`, { type: 'text' }, (file) => {
        ysm = JSON.parse(file[0].content);
      });

      Undo.initEdit({
        outliner: true,
        animations: []
      });
      if (play_in)
        track_run3()
      else
        track_run()
      Undo.finishEdit(`Finished  model`);
    }

  })

  track_mianban.show();
}

function track_model_frame2() {

  let track2_mianban = new Dialog({
    title: '参数面板',
    id: 'track2_mianban',
    form: {
      folder: { label: `模型位置`, type: `folder`, value: localStorage.getItem(`path`) },

      track_rate: { label: `帧率`, type: `number`, value: parseFloat(localStorage.getItem(`track_rate`)) || 100, min: 1 },
      track_model_num: { label: `分段数`, type: `number`, value: parseFloat(localStorage.getItem(`track_model_num`)) || 100, min: 1 },
      track_model_name: { label: `头部组名`, type: `text`, value: localStorage.getItem(`track_model_name`) || `track_model` },
      track_animation_name: { label: `动画名`, type: `text`, value: localStorage.getItem(`track_animation_name`) || `track` },
      track_show_name: { label: `生成动画`, type: `text`, value: localStorage.getItem(`track_show_name`) || `track_show_name` },
      track_tail_name: { label: `尾部组名`, type: `text`, value: localStorage.getItem(`track_tail_name`) || `track_model` },
    },
    onFormChange() {
      track2_cunchu()
    },
    onConfirm() {
      track2_cunchu()
      Blockbench.readFile(path + `/ysm.json`, { type: 'text' }, (file) => {
        ysm = JSON.parse(file[0].content);
      });

      Undo.initEdit({
        outliner: true,
        animations: []
      });
      track_run2()
      Undo.finishEdit(`Finished  model`);
    }

  })

  track2_mianban.show();
}

function track2_cunchu() {

  path = $('.dialog#track2_mianban input#folder').val();
  track_model_name = $('.dialog#track2_mianban input#track_model_name').val();
  track_animation_name = $('.dialog#track2_mianban input#track_animation_name').val();
  track_model_num = $('.dialog#track2_mianban input#track_model_num').val();
  track_rate = $('.dialog#track2_mianban input#track_rate').val();
  track_show_name = $('.dialog#track2_mianban input#track_show_name').val();
  track_tail_name = $('.dialog#track2_mianban input#track_tail_name').val();

  localStorage.setItem(`path`, path);
  localStorage.setItem(`track_model_name`, track_model_name);
  localStorage.setItem(`track_rate`, track_rate);
  localStorage.setItem(`track_animation_name`, track_animation_name);
  localStorage.setItem(`track_model_num`, track_model_num);
  localStorage.setItem(`track_show_name`, track_show_name);
  localStorage.setItem(`track_tail_name`, track_tail_name);
}
function track_cunchu() {

  path = $('.dialog#track_mianban input#folder').val();
  play_in = $('.dialog#track_mianban input#play_in').is(`:checked`);
  track_rate = $('.dialog#track_mianban input#track_rate').val();
  track_model_name = $('.dialog#track_mianban input#track_model_name').val();
  track_animation_name = $('.dialog#track_mianban input#track_animation_name').val();
  track_show_name = $('.dialog#track_mianban input#track_show_name').val();
  track_tail_name = $('.dialog#track_mianban input#track_tail_name').val();

  localStorage.setItem(`path`, path);
  localStorage.setItem(`play_in`, play_in);
  localStorage.setItem(`track_rate`, track_rate);
  localStorage.setItem(`track_model_name`, track_model_name);
  localStorage.setItem(`track_animation_name`, track_animation_name);
  localStorage.setItem(`track_show_name`, track_show_name);
  localStorage.setItem(`track_tail_name`, track_tail_name);
}

function track_run2() {
  let extra_group = []
  let all_group = []
  let view_group = []
  let track_group = []
  let origin_d = []
  let track_length = 0
  let min_length = 100000000000000000000
  anim_and_ctrl_reload(track_show_name, undefined)
  track_animation = Animation.all.find(group => group.name === track_animation_name)
  if (!track_animation) {

    Blockbench.showQuickMessage(`未找到样本动画`);
    return
  }
  groupremove = Group.all.find(group => group.name === `${track_model_name}_View`)
  //console.log(track_animation)
  if (groupremove) {
    groupremove.remove()
  }
  track_view = new Group({
    name: `${track_model_name}_View`,
    origin: [0, 0, 0]
  })
  track_view.init()
  all_group[0] = Group.all.find(group => group.name === track_model_name)
  extra_group[0] = Group.all.find(group => group.name === track_tail_name)
  while (extra_group[extra_group.length - 1].parent.name != track_model_name && extra_group[extra_group.length - 1].parent != "root") {
    extra_group.push(extra_group[extra_group.length - 1].parent)
  }
  for (i = 0; i < extra_group.length + 1; i++) {
    if (i == 0) {
      origin_d.push(0)
    } else {
      all_group.push(extra_group[extra_group.length - i])
      origin_d.push(Math.sqrt(
        (all_group[i].origin[0] - all_group[i - 1].origin[0]) * (all_group[i].origin[0] - all_group[i - 1].origin[0]) +
        (all_group[i].origin[1] - all_group[i - 1].origin[1]) * (all_group[i].origin[1] - all_group[i - 1].origin[1]) +
        (all_group[i].origin[2] - all_group[i - 1].origin[2]) * (all_group[i].origin[2] - all_group[i - 1].origin[2])
      ))
      if (min_length > origin_d[i]) {
        min_length = origin_d[i]
      }
    }

    track_length += origin_d[i]

    view_group.push(
      new Group({
        name: `${track_model_name}_View_${i}`,
        origin: all_group[i].origin
      })
    )
    view_group[i].addTo(track_view)

    view_group[i].init()
    cube_view = new Cube({
      origin: all_group[i].origin,
      name: `cube`,
      from: [all_group[i].origin[0] - 1, all_group[i].origin[1] - 1, all_group[i].origin[2] - 1],
      to: [all_group[i].origin[0] + 1, all_group[i].origin[1] + 1, all_group[i].origin[2] + 1],
      rotation: [0, 0, 0]
    })

    cube_view.addTo(view_group[i])
    cube_view.init()


  }

  //console.log(all_group)
  track_length *= 2
  if (track_length / (track_model_num - 1) > min_length) {
    track_model_num = Math.ceil(track_length / min_length) * 2
  }
  for (i = 0; i < track_model_num; i++) {
    track_group.push(
      new Group({
        name: `${track_model_name}_track_group_${i}`,
        origin: [0, 0, 0]
      })
    )

    track_group[i].addTo(track_view)

    track_group[i].init()
    cube_view = new Cube({
      origin: [0, 0, 0],
      name: `cube`,
      from: [-0.1, -0.1, -0.1],
      to: [0.1, 0.1, 0.1],
      rotation: [0, 0, 0]
    })

    cube_view.addTo(track_group[i])
    cube_view.init()
  }

  track_show_animation = new Animation(
    {
      name: track_show_name,
      length: track_animation.length,
      loop: `loop`,
      snapping: track_rate,
      path: path + `/` + ysm['files']['player'][`animation`][`main`],
    }
  )
  Undo.initEdit({
    animations: [track_show_animation]
  })

  Undo.finishEdit(`Finished  model`);
  track_show_animation.add()
  //console.log(track_animation.getBoneAnimator(all_group[0]))
  for (i = 0; i < track_animation.getBoneAnimator(all_group[0]).position.length; i++) {
    addnameanimate_position(track_show_animation, all_group[0], track_animation.getBoneAnimator(all_group[0]).position[i].time, [
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].x,
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].y,
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].z
    ])
  }
  head_positions = {}
  head_positions2 = {}
  head_rotations = {}
  time_lines = []
  for (q_time = 0; q_time <= track_animation.length; q_time += 1 / parseFloat(track_rate)) {
    //tk = track_show_animation.getBoneAnimator(view_group[0]).createKeyframe(null, q_time, "position", true);
    var keyframes = [];
    if (1) {
      Undo.initEdit({ keyframes })
    }
    var keyframe = new Keyframe({
      channel: "position",
      time: q_time
    }, null, track_show_animation.getBoneAnimator(all_group[0]));

    track_show_animation.getBoneAnimator(all_group[0]).fillValues(keyframe, null, true);

    //   console.log(keyframe)
    position = {
      x: parseFloat(keyframe.data_points[0].x),
      y: parseFloat(keyframe.data_points[0].y),
      z: parseFloat(keyframe.data_points[0].z)
    }
    time_lines.push(q_time)
    head_positions[q_time] = position





    if (1) {
      Undo.finishEdit('Add keyframe')
    }

  }
  all_positions = []
  all_positions.push(head_positions)

  alpha = -track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].x * Math.PI / 180
  beta = track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].y * Math.PI / 180
  gamma = -track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].z * Math.PI / 180
  R_x = [[1, 0, 0],
  [0, Math.cos(alpha), -Math.sin(alpha)],
  [0, Math.sin(alpha), Math.cos(alpha)]]

  R_y = [[Math.cos(beta), 0, Math.sin(beta)],
  [0, 1, 0],
  [-Math.sin(beta), 0, Math.cos(beta)]]

  R_z = [[Math.cos(gamma), -Math.sin(gamma), 0],
  [Math.sin(gamma), Math.cos(gamma), 0],
  [0, 0, 1]]

  R = matrixMultiply(R_z, matrixMultiply(R_y, R_x))

  all_rotations = []
  all_rotations.push({
    0: R
  })
  //console.log(all_rotations)
  all_positions_track = []
  //console.log(parseFloat(all_positions[0][time_lines[26]].x))
  for (i = 0; i < time_lines.length; i++) {
    if (i != 0) {
      position_d = Math.sqrt(
        (all_positions_track[0][time_lines[i - 1]].x - all_positions[0][time_lines[i]].x) * (all_positions_track[0][time_lines[i - 1]].x - all_positions[0][time_lines[i]].x) +
        (all_positions_track[0][time_lines[i - 1]].y - all_positions[0][time_lines[i]].y) * (all_positions_track[0][time_lines[i - 1]].y - all_positions[0][time_lines[i]].y) +
        (all_positions_track[0][time_lines[i - 1]].z - all_positions[0][time_lines[i]].z) * (all_positions_track[0][time_lines[i - 1]].z - all_positions[0][time_lines[i]].z)
      )
    } else {
      position_d = 0
    }
    for (j = 0; j < track_model_num; j++) {
      if (time_lines[i] == 0) {
        R = all_rotations[0][time_lines[i]]
        v = multiplyMatrixAndVector(R, [0, 0, track_length / (track_model_num - 1) * j])

        all_positions_track.push({
          0: {
            x: all_positions[0][time_lines[i]].x + v[0],
            y: all_positions[0][time_lines[i]].y + v[1],
            z: all_positions[0][time_lines[i]].z + v[2]
          }
        })
      } else {
        if (position_d > track_length / (track_model_num - 1)) {
          //console.log()
          if (j == 0) {
            all_positions_track[j][time_lines[i]] = {
              x: all_positions[0][time_lines[i]].x,
              y: all_positions[0][time_lines[i]].y,
              z: all_positions[0][time_lines[i]].z
            }
          } else {
            all_positions_track[j][time_lines[i]] = {
              x: all_positions_track[j - 1][time_lines[i - 1]].x,
              y: all_positions_track[j - 1][time_lines[i - 1]].y,
              z: all_positions_track[j - 1][time_lines[i - 1]].z
            }
          }
        } else {
          all_positions_track[j][time_lines[i]] = {
            x: all_positions_track[j][time_lines[i - 1]].x,
            y: all_positions_track[j][time_lines[i - 1]].y,
            z: all_positions_track[j][time_lines[i - 1]].z
          }
        }
      }
    }
    z_j = 1
    for (j = 1; j < view_group.length; j++) {
      p_d = Math.sqrt(
        (all_positions_track[z_j - 1][time_lines[i]].x - all_positions[j - 1][time_lines[i]].x) * (all_positions_track[z_j - 1][time_lines[i]].x - all_positions[j - 1][time_lines[i]].x) +
        (all_positions_track[z_j - 1][time_lines[i]].y - all_positions[j - 1][time_lines[i]].y) * (all_positions_track[z_j - 1][time_lines[i]].y - all_positions[j - 1][time_lines[i]].y) +
        (all_positions_track[z_j - 1][time_lines[i]].z - all_positions[j - 1][time_lines[i]].z) * (all_positions_track[z_j - 1][time_lines[i]].z - all_positions[j - 1][time_lines[i]].z)
      )
      t = (origin_d[j] - p_d) % (track_length / (track_model_num - 1)) / (track_length / (track_model_num - 1))
      z_j += Math.floor((origin_d[j] - p_d) / (track_length / (track_model_num - 1)))

      A = [
        all_positions_track[z_j - 1][time_lines[i]].x,
        all_positions_track[z_j - 1][time_lines[i]].y,
        all_positions_track[z_j - 1][time_lines[i]].z
      ]
      B = [
        all_positions_track[z_j][time_lines[i]].x,
        all_positions_track[z_j][time_lines[i]].y,
        all_positions_track[z_j][time_lines[i]].z
      ]
      C = [
        all_positions[j - 1][time_lines[i]].x,
        all_positions[j - 1][time_lines[i]].y,
        all_positions[j - 1][time_lines[i]].z
      ]
      l = origin_d[j]

      const d = [
        B[0] - A[0],
        B[1] - A[1],
        B[2] - A[2]
      ];

      if (i == 0) {
        all_positions.push({
          0: {
            x: A[0] + t * d[0],
            y: A[1] + t * d[1],
            z: A[2] + t * d[2]
          }
        })
      }
      else {
        all_positions[j][time_lines[i]] =
        {
          x: all_positions_track[z_j - 1][time_lines[i]].x + t * d[0],
          y: all_positions_track[z_j - 1][time_lines[i]].y + t * d[1],
          z: all_positions_track[z_j - 1][time_lines[i]].z + t * d[2]
        };
      }
      //      if (time_lines[i] == 0) {
      //
      //        R = all_rotations[0][time_lines[i]]
      //        v = multiplyMatrixAndVector(R, [view_group[j].origin[0], view_group[j].origin[1], view_group[j].origin[2]])
      //        all_positions.push({
      //          0: {
      //            x: v[0] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].x),
      //            y: v[1] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].y),
      //            z: v[2] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].z)
      //          }
      //        })
      //        continue;
      //      }
      //      position_d = Math.sqrt(
      //        (all_positions[j][time_lines[i - 1]].x - all_positions[j - 1][time_lines[i]].x) * (all_positions[j][time_lines[i - 1]].x - all_positions[j - 1][time_lines[i]].x) +
      //        (all_positions[j][time_lines[i - 1]].y - all_positions[j - 1][time_lines[i]].y) * (all_positions[j][time_lines[i - 1]].y - all_positions[j - 1][time_lines[i]].y) +
      //        (all_positions[j][time_lines[i - 1]].z - all_positions[j - 1][time_lines[i]].z) * (all_positions[j][time_lines[i - 1]].z - all_positions[j - 1][time_lines[i]].z)
      //      )
      //      all_positions[j][time_lines[i]] = {
      //        x: parseFloat(all_positions[j - 1][time_lines[i]].x) - parseFloat(all_positions[j - 1][time_lines[i]].x - all_positions[j][time_lines[i - 1]].x) * origin_d[j] / position_d,
      //        y: parseFloat(all_positions[j - 1][time_lines[i]].y) - parseFloat(all_positions[j - 1][time_lines[i]].y - all_positions[j][time_lines[i - 1]].y) * origin_d[j] / position_d,
      //        z: parseFloat(all_positions[j - 1][time_lines[i]].z) - parseFloat(all_positions[j - 1][time_lines[i]].z - all_positions[j][time_lines[i - 1]].z) * origin_d[j] / position_d
      //      }
      //    }

    }
  }

  for (i = 0; i < time_lines.length; i++) {
    for (j = 1; j < view_group.length; j++) {

      position_d = Math.sqrt(
        (all_positions[j][time_lines[i]].x - all_positions[j - 1][time_lines[i]].x) * (all_positions[j][time_lines[i]].x - all_positions[j - 1][time_lines[i]].x) +
        (all_positions[j][time_lines[i]].y - all_positions[j - 1][time_lines[i]].y) * (all_positions[j][time_lines[i]].y - all_positions[j - 1][time_lines[i]].y) +
        (all_positions[j][time_lines[i]].z - all_positions[j - 1][time_lines[i]].z) * (all_positions[j][time_lines[i]].z - all_positions[j - 1][time_lines[i]].z)
      )
      all_positions[j][time_lines[i]] = {
        x: parseFloat(all_positions[j - 1][time_lines[i]].x) - parseFloat(all_positions[j - 1][time_lines[i]].x - all_positions[j][time_lines[i]].x) * origin_d[j] / position_d,
        y: parseFloat(all_positions[j - 1][time_lines[i]].y) - parseFloat(all_positions[j - 1][time_lines[i]].y - all_positions[j][time_lines[i]].y) * origin_d[j] / position_d,
        z: parseFloat(all_positions[j - 1][time_lines[i]].z) - parseFloat(all_positions[j - 1][time_lines[i]].z - all_positions[j][time_lines[i]].z) * origin_d[j] / position_d
      }
    }

  }
  worldRotationMatrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  //滤波
  for (j = 1; j < view_group.length; j++) {
    all_positions[j] = movingAverage3D(all_positions[j], time_lines)
    all_positions[j] = movingAverage3D(all_positions[j], time_lines)
  }

  for (i = 0; i < time_lines.length; i++) {
    for (j = 0; j < all_group.length - 1; j++) {

      //console.log(all_positions[j + 1][time_lines[i]].x)
      x_d = all_positions[j + 1][time_lines[i]].x - all_positions[j][time_lines[i]].x
      y_d = all_positions[j + 1][time_lines[i]].y - all_positions[j][time_lines[i]].y
      z_d = all_positions[j + 1][time_lines[i]].z - all_positions[j][time_lines[i]].z
      if (j != 0) {
        v_d = multiplyMatrixAndVector(transposeMatrix(all_rotations[j - 1][time_lines[i]]), [x_d, y_d, z_d])
      } else {
        v_d = [x_d, y_d, z_d]
      }
      if (i > 0) {

        rot_y = ((Math.atan2(v_d[0], v_d[2]) * 180 / Math.PI - track_show_animation.getBoneAnimator(all_group[j]).rotation[i - 1].data_points[0].y + 180) % 360 - 180)
        rot_y = ((rot_y - 180) % 360 + 180)

        last_rot_y = parseFloat(track_show_animation.getBoneAnimator(all_group[j]).rotation[i - 1].data_points[0].y)
      }
      else {
        rot_y = ((Math.atan2(v_d[0], v_d[2]) * 180 / Math.PI - 0 + 180) % 360 - 180)
        rot_y = ((rot_y - 180) % 360 + 180)
        last_rot_y = 0
      }

      rot_y += last_rot_y

      rot_x = Math.atan2(v_d[1], Math.sqrt(v_d[0] * v_d[0] + v_d[2] * v_d[2])) * 180 / Math.PI

      alpha = -rot_x * Math.PI / 180
      beta = rot_y * Math.PI / 180
      gamma = 0 * Math.PI / 180
      R_x = [[1, 0, 0],
      [0, Math.cos(alpha), -Math.sin(alpha)],
      [0, Math.sin(alpha), Math.cos(alpha)]]

      R_y = [[Math.cos(beta), 0, Math.sin(beta)],
      [0, 1, 0],
      [-Math.sin(beta), 0, Math.cos(beta)]]

      R_z = [[Math.cos(gamma), -Math.sin(gamma), 0],
      [Math.sin(gamma), Math.cos(gamma), 0],
      [0, 0, 1]]
      if (j == 1) {
        //console.log(i, Math.atan2(v_d[0] , v_d[2]) * 180 / Math.PI)
      }
      addnameanimate_rotation(track_show_animation, all_group[j], time_lines[i], [
        rot_x.toFixed(10),
        rot_y.toFixed(10),
        0
      ])
      d_v = matrixMultiply(matrixMultiply(R_z, R_y), R_x)
      if (j != 0) {
        d_new = matrixMultiply(all_rotations[j - 1][time_lines[i]], d_v)
      }
      else {
        d_new = d_v
      }
      if (time_lines[i] == 0) {
        all_rotations.push({
          0: d_new
        })
      } else {
        all_rotations[j][time_lines[i]] = d_new
      }
    }
  }
  //console.log(time_lines[i], head_positions[time_lines[i]])
  track_view.remove()
}

function track_run() {

  let extra_group = []
  let all_group = []
  let view_group = []
  let origin_d = []
  anim_and_ctrl_reload(track_show_name, undefined)
  track_animation = Animation.all.find(group => group.name === track_animation_name)
  if (!track_animation) {

    Blockbench.showQuickMessage(`未找到样本动画`);
    return
  }
  groupremove = Group.all.find(group => group.name === `${track_model_name}_View`)
  //console.log(track_animation)
  if (groupremove) {
    groupremove.remove()
  }
  track_view = new Group({
    name: `${track_model_name}_View`,
    origin: [0, 0, 0]
  })
  track_view.init()
  all_group[0] = Group.all.find(group => group.name === track_model_name)
  extra_group[0] = Group.all.find(group => group.name === track_tail_name)
  while (extra_group[extra_group.length - 1].parent.name != track_model_name && extra_group[extra_group.length - 1].parent != "root") {
    extra_group.push(extra_group[extra_group.length - 1].parent)
  }
  for (i = 0; i < extra_group.length + 1; i++) {
    if (i == 0) {
      origin_d.push(0)
    } else {

      all_group.push(extra_group[extra_group.length - i])
      origin_d.push(Math.sqrt(
        (all_group[i].origin[0] - all_group[i - 1].origin[0]) * (all_group[i].origin[0] - all_group[i - 1].origin[0]) +
        (all_group[i].origin[1] - all_group[i - 1].origin[1]) * (all_group[i].origin[1] - all_group[i - 1].origin[1]) +
        (all_group[i].origin[2] - all_group[i - 1].origin[2]) * (all_group[i].origin[2] - all_group[i - 1].origin[2])
      ))
    }
    view_group.push(
      new Group({
        name: `${track_model_name}_View_${i}`,
        origin: [0, 0, 0]
      })
    )
    view_group[i].addTo(track_view)

    view_group[i].init()
    cube_view = new Cube({
      origin: [0, 0, 0],
      name: `cube`,
      from: [- 1, - 1, - 1],
      to: [1, 1, 1],
      rotation: [0, 0, 0]
    })
    cube_view.addTo(view_group[i])
    cube_view.init()

  }
  track_show_animation = new Animation(
    {
      name: track_show_name,
      length: track_animation.length,
      loop: `loop`,
      snapping: track_rate,
      path: path + `/` + ysm['files']['player'][`animation`][`main`],
    }
  )
  Undo.initEdit({
    animations: [track_show_animation]
  })
  Undo.finishEdit(`Finished  model`);
  track_show_animation.add()
  //console.log(track_animation.getBoneAnimator(all_group[0]))
  for (i = 0; i < track_animation.getBoneAnimator(all_group[0]).position.length; i++) {
    addnameanimate_position(track_show_animation, all_group[0], track_animation.getBoneAnimator(all_group[0]).position[i].time, [
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].x,
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].y,
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].z
    ])
    addnameanimate_position(track_show_animation, view_group[0], track_animation.getBoneAnimator(all_group[0]).position[i].time, [
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].x,
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].y,
      track_animation.getBoneAnimator(all_group[0]).position[i].data_points[0].z
    ])
  }
  // for (i = 0; i < track_animation.getBoneAnimator(all_group[0]).rotation.length; i++) {
  //   alpha = track_animation.getBoneAnimator(all_group[0]).rotation[i].data_points[0].x
  //   beta = track_animation.getBoneAnimator(all_group[0]).rotation[i].data_points[0].y
  //   gamma = track_animation.getBoneAnimator(all_group[0]).rotation[i].data_points[0].z
  //   console.log(alpha, beta, gamma)
  //   addnameanimate_rotation(track_show_animation, all_group[0], track_animation.getBoneAnimator(all_group[0]).rotation[i].time, [
  //     alpha,
  //     beta,
  //     gamma
  //   ])
  // }
  head_positions = {}
  head_positions2 = {}
  head_rotations = {}
  time_lines = []
  all_positions = []
  worldRotationMatrix = []
  for (i = 0; i < view_group.length; i++) {
    all_positions.push({})
  }
  for (q_time = 0; q_time <= track_animation.length; q_time += 1 / parseFloat(track_rate)) {
    //tk = track_show_animation.getBoneAnimator(view_group[0]).createKeyframe(null, q_time, "position", true);
    var keyframes = [];
    if (1) {
      Undo.initEdit({ keyframes })
    }
    var keyframe = new Keyframe({
      channel: "position",
      time: q_time
    }, null, track_show_animation.getBoneAnimator(view_group[0]));

    track_show_animation.getBoneAnimator(view_group[0]).fillValues(keyframe, null, true);

    //   console.log(keyframe)
    position = {
      x: parseFloat(keyframe.data_points[0].x),
      y: parseFloat(keyframe.data_points[0].y),
      z: parseFloat(keyframe.data_points[0].z)
    }
    time_lines.push(q_time)
    all_positions[0][q_time] = position

    var keyframe = new Keyframe({
      channel: "rotation",
      time: q_time
    }, null, track_animation.getBoneAnimator(all_group[0]));

    track_animation.getBoneAnimator(all_group[0]).fillValues(keyframe, null, true);

    head_rotations[q_time] = {
      x: parseFloat(keyframe.data_points[0].x),
      y: parseFloat(keyframe.data_points[0].y),
      z: parseFloat(keyframe.data_points[0].z)
    }

    if (1) {
      Undo.finishEdit('Add keyframe')
    }
    //console.log(head_rotations[q_time])


    //    gamma = -rotation.z * Math.PI / 180
    //
    //    R_z = [[Math.cos(gamma), -Math.sin(gamma), 0],
    //    [Math.sin(gamma), Math.cos(gamma), 0],
    //    [0, 0, 1]]
    //
    //
    //    worldRotationMatrix[q_time] = R_z


  }


  if (track_animation.getBoneAnimator(all_group[0]).rotation.length) {
    alpha = -track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].x * Math.PI / 180
    beta = track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].y * Math.PI / 180
    gamma = -track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].z * Math.PI / 180
  } else {
    alpha = 0
    beta = 0
    gamma = 0
  }
  R_x = [[1, 0, 0],
  [0, Math.cos(alpha), -Math.sin(alpha)],
  [0, Math.sin(alpha), Math.cos(alpha)]]

  R_y = [[Math.cos(beta), 0, Math.sin(beta)],
  [0, 1, 0],
  [-Math.sin(beta), 0, Math.cos(beta)]]

  R_z = [[Math.cos(gamma), -Math.sin(gamma), 0],
  [Math.sin(gamma), Math.cos(gamma), 0],
  [0, 0, 1]]

  R = matrixMultiply(R_z, matrixMultiply(R_y, R_x))

  all_rotations = []
  all_rotations.push({
    0: R
  })
  //console.log(all_rotations)



  //console.log(parseFloat(all_positions[0][time_lines[26]].x))
  for (i = 0; i < time_lines.length; i++) {

    for (j = 1; j < view_group.length; j++) {
      if (time_lines[i] == 0) {

        R = all_rotations[0][time_lines[i]]
        v = multiplyMatrixAndVector(R, [all_group[j].origin[0], all_group[j].origin[1], all_group[j].origin[2]])
        all_positions[j][time_lines[i]] =
        {
          x: v[0] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].x),
          y: v[1] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].y),
          z: v[2] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].z)
        }

        continue;
      }
      position_d = Math.sqrt(
        (all_positions[j][time_lines[i - 1]].x - all_positions[j - 1][time_lines[i]].x) * (all_positions[j][time_lines[i - 1]].x - all_positions[j - 1][time_lines[i]].x) +
        (all_positions[j][time_lines[i - 1]].y - all_positions[j - 1][time_lines[i]].y) * (all_positions[j][time_lines[i - 1]].y - all_positions[j - 1][time_lines[i]].y) +
        (all_positions[j][time_lines[i - 1]].z - all_positions[j - 1][time_lines[i]].z) * (all_positions[j][time_lines[i - 1]].z - all_positions[j - 1][time_lines[i]].z)
      )
      all_positions[j][time_lines[i]] = {
        x: parseFloat(all_positions[j - 1][time_lines[i]].x) - parseFloat(all_positions[j - 1][time_lines[i]].x - all_positions[j][time_lines[i - 1]].x) * origin_d[j] / position_d,
        y: parseFloat(all_positions[j - 1][time_lines[i]].y) - parseFloat(all_positions[j - 1][time_lines[i]].y - all_positions[j][time_lines[i - 1]].y) * origin_d[j] / position_d,
        z: parseFloat(all_positions[j - 1][time_lines[i]].z) - parseFloat(all_positions[j - 1][time_lines[i]].z - all_positions[j][time_lines[i - 1]].z) * origin_d[j] / position_d
      }
    }
    for (j = 0; j < all_group.length - 1; j++) {
      x_d = all_positions[j + 1][time_lines[i]].x - all_positions[j][time_lines[i]].x
      y_d = all_positions[j + 1][time_lines[i]].y - all_positions[j][time_lines[i]].y
      z_d = all_positions[j + 1][time_lines[i]].z - all_positions[j][time_lines[i]].z
      if (j != 0)
        v_d = multiplyMatrixAndVector(transposeMatrix(all_rotations[j - 1][time_lines[i]]), [x_d, y_d, z_d])
      else
        v_d = [x_d, y_d, z_d]

      if (i > 0) {
        rot_y = ((Math.atan2(v_d[0], v_d[2]) * 180 / Math.PI - track_show_animation.getBoneAnimator(all_group[j]).rotation[i - 1].data_points[0].y + 180) % 360 - 180)


        rot_y = ((rot_y - 180) % 360 + 180)

        last_rot_y = parseFloat(track_show_animation.getBoneAnimator(all_group[j]).rotation[i - 1].data_points[0].y)
      }
      else {
        rot_y = ((Math.atan2(v_d[0], v_d[2]) * 180 / Math.PI - 0 + 180) % 360 - 180)

        rot_y = ((rot_y - 180) % 360 + 180)
        last_rot_y = 0
      }

      rot_y += last_rot_y

      rot_x = Math.atan2(v_d[1], Math.sqrt(v_d[0] * v_d[0] + v_d[2] * v_d[2])) * 180 / Math.PI

      alpha = -rot_x * Math.PI / 180
      beta = rot_y * Math.PI / 180
      gamma = -0 * Math.PI / 180
      R_x = [[1, 0, 0],
      [0, Math.cos(alpha), -Math.sin(alpha)],
      [0, Math.sin(alpha), Math.cos(alpha)]]

      R_y = [[Math.cos(beta), 0, Math.sin(beta)],
      [0, 1, 0],
      [-Math.sin(beta), 0, Math.cos(beta)]]

      R_z = [[Math.cos(gamma), -Math.sin(gamma), 0],
      [Math.sin(gamma), Math.cos(gamma), 0],
      [0, 0, 1]]
      if (j == 1) {
        //console.log(i, Math.atan2(v_d[0] , v_d[2]) * 180 / Math.PI)
      }
      addnameanimate_rotation(track_show_animation, all_group[j], time_lines[i], [
        parseFloat(rot_x).toFixed(10),
        parseFloat(rot_y).toFixed(10),
        0
      ])
      d_v = matrixMultiply(matrixMultiply(R_z, R_y), R_x)
      if (j != 0)
        d_new = matrixMultiply(all_rotations[j - 1][time_lines[i]], d_v)
      else
        d_new = d_v
      if (time_lines[i] == 0) {
        all_rotations.push({
          0: d_new
        })
      } else {
        all_rotations[j][time_lines[i]] = d_new
      }
    }
    //console.log(time_lines[i], head_positions[time_lines[i]])
  }
  track_view.remove()
}
function track_run3() {

  let extra_group = []
  let all_group = []
  let view_group = []
  let origin_d = []
  anim_and_ctrl_reload(track_show_name, undefined)

  groupremove = Group.all.find(group => group.name === `${track_model_name}_View`)
  if (groupremove) {
    groupremove.remove()
  }
  track_view = new Group({
    name: `${track_model_name}_View`,
    origin: [0, 0, 0]
  })
  track_view.init()
  all_parents = []

  all_group[0] = Group.all.find(group => group.name === track_model_name)

  all_parents[0] = all_group[0].parent
  //初始位置数据
  extra_group[0] = Group.all.find(group => group.name === track_tail_name)
  while (extra_group[extra_group.length - 1].parent.name != track_model_name && extra_group[extra_group.length - 1].parent != "root") {
    extra_group.push(extra_group[extra_group.length - 1].parent)
  }
  for (i = 0; i < extra_group.length + 1; i++) {
    if (i == 0) {
      origin_d.push(0)
    } else {
      all_group.push(extra_group[extra_group.length - i])
      origin_d.push(Math.sqrt(
        (all_group[i].origin[0] - all_group[i - 1].origin[0]) * (all_group[i].origin[0] - all_group[i - 1].origin[0]) +
        (all_group[i].origin[1] - all_group[i - 1].origin[1]) * (all_group[i].origin[1] - all_group[i - 1].origin[1]) +
        (all_group[i].origin[2] - all_group[i - 1].origin[2]) * (all_group[i].origin[2] - all_group[i - 1].origin[2])
      ))
    }

    view_group.push(
      new Group({
        name: `${track_model_name}_View_${i}`,
        origin: [0, 0, 0]
      })
    )
    view_group[i].addTo(track_view)

    view_group[i].init()
    cube_view = new Cube({
      origin: [0, 0, 0],
      name: `cube`,
      from: [- 1, - 1, - 1],
      to: [1, 1, 1],
      rotation: [0, 0, 0]
    })

    cube_view.addTo(view_group[i])
    cube_view.init()


  }



  let track_molang;
  track_molang = Group.all.find(group => group.name === `${track_animation_name}_track_molang`);
  if (!track_molang) {
    track_molang = new Group({
      name: `${track_animation_name}_track_molang`
    })
    track_molang.init()
  }
  //动画
  track_show_animation = new Animation(
    {
      name: track_show_name,
      length: 0,
      loop: `loop`,
      snapping: 500,
      path: path + `/` + ysm['files']['player'][`animation`][`main`],
    }
  )
  Undo.initEdit({
    animations: [track_show_animation]
  })
  Undo.finishEdit(`Finished  model`);
  track_show_animation.add()
  // for (i = 0; i < track_animation.getBoneAnimator(all_group[0]).rotation.length; i++) {
  //   alpha = track_animation.getBoneAnimator(all_group[0]).rotation[i].data_points[0].x
  //   beta = track_animation.getBoneAnimator(all_group[0]).rotation[i].data_points[0].y
  //   gamma = track_animation.getBoneAnimator(all_group[0]).rotation[i].data_points[0].z
  //   console.log(alpha, beta, gamma)
  //   addnameanimate_rotation(track_show_animation, all_group[0], track_animation.getBoneAnimator(all_group[0]).rotation[i].time, [
  //     alpha,
  //     beta,
  //     gamma
  //   ])
  // }
  effect = new EffectAnimator(track_show_animation)//初始化
  track_timeline = `v.track_${track_animation_name}_body_0_last_set_x=(ysm.bone_pivot_abs('${track_model_name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${track_model_name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0);\n`
  track_timeline += `v.track_${track_animation_name}_body_0_last_set_z=(ysm.bone_pivot_abs('${track_model_name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${track_model_name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2);\n`
  track_timeline += `v.track_${track_animation_name}_body_0_last_set_y=ysm.bone_pivot_abs('${track_model_name}').y*0.7/16+q.position(1);\n`
  track_timeline += `v.track_${track_animation_name}_body_0_last_rot_x=ysm.bone_rot('${track_model_name}').x;\n`
  track_timeline += `v.track_${track_animation_name}_body_0_last_rot_z=ysm.bone_rot('${track_model_name}').z;\n`
  track_timeline += `v.track_${track_animation_name}_body_0_last_rot_y=ysm.bone_rot('${track_model_name}').y;\n`

  head_positions = {}
  head_positions2 = {}
  head_rotations = {}
  time_lines = []

  worldRotationMatrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];


  //alpha = -track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].x * Math.PI / 180
  track_timeline += `v.track_${track_animation_name}_alpha=-ysm.bone_rot('${track_model_name}').x;\n`

  //beta = track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].y * Math.PI / 180
  track_timeline += `v.track_${track_animation_name}_beta=ysm.bone_rot('${track_model_name}').y;\n`

  //gamma = -track_animation.getBoneAnimator(all_group[0]).rotation[0].data_points[0].z * Math.PI / 180
  track_timeline += `v.track_${track_animation_name}_gamma=-ysm.bone_rot('${track_model_name}').z;\n`


  // 进行矩阵相乘

  R = new Array(3);
  for (let i = 0; i < 3; i++) {
    R[i] = new Array(3).fill(0);
  }
  // 进行矩阵相乘
  //R[0][0] = Math.cos(gamma) * Math.cos(beta);
  //R[0][1] = -Math.sin(gamma) * Math.cos(alpha) + Math.cos(gamma) * Math.sin(beta) * Math.sin(alpha);
  //R[0][2] = -Math.sin(gamma) * -Math.sin(alpha) + Math.cos(gamma) * Math.sin(beta) * Math.cos(alpha);
  //R[1][0] = Math.sin(gamma) * Math.cos(beta)
  //R[1][1] = Math.cos(gamma) * Math.cos(alpha) + Math.sin(gamma) * Math.sin(beta) * Math.sin(alpha);
  //R[1][2] = Math.cos(gamma) * -Math.sin(alpha) + Math.sin(gamma) * Math.sin(beta) * Math.cos(alpha);
  //R[2][0] = -Math.sin(beta);
  //R[2][1] = Math.cos(beta) * Math.sin(alpha);
  //R[2][2] = Math.cos(beta) * Math.cos(alpha);

  track_timeline += `v.track_${track_animation_name}_R_0_0 = math.cos(v.track_${track_model_name}_gamma) * math.cos(v.track_${track_model_name}_beta);\n`
  track_timeline += `v.track_${track_animation_name}_R_0_1 = -math.sin(v.track_${track_model_name}_gamma) * math.cos(v.track_${track_model_name}_alpha) + math.cos(v.track_${track_model_name}_gamma) * math.sin(v.track_${track_model_name}_beta) * math.sin(v.track_${track_model_name}_alpha);\n`
  track_timeline += `v.track_${track_animation_name}_R_0_2 = -math.sin(v.track_${track_model_name}_gamma) * -math.sin(v.track_${track_model_name}_alpha) + math.cos(v.track_${track_model_name}_gamma) * math.sin(v.track_${track_model_name}_beta) * math.cos(v.track_${track_model_name}_alpha);\n`
  track_timeline += `v.track_${track_animation_name}_R_1_0 = math.sin(v.track_${track_model_name}_gamma) * math.cos(v.track_${track_model_name}_beta)\n`
  track_timeline += `v.track_${track_animation_name}_R_1_1 = math.cos(v.track_${track_model_name}_gamma) * math.cos(v.track_${track_model_name}_alpha) + math.sin(v.track_${track_model_name}_gamma) * math.sin(v.track_${track_model_name}_beta) * math.sin(v.track_${track_model_name}_alpha);\n`
  track_timeline += `v.track_${track_animation_name}_R_1_2 = math.cos(v.track_${track_model_name}_gamma) * -math.sin(v.track_${track_model_name}_alpha) + math.sin(v.track_${track_model_name}_gamma) * math.sin(v.track_${track_model_name}_beta) * math.cos(v.track_${track_model_name}_alpha);\n`
  track_timeline += `v.track_${track_animation_name}_R_2_0 = -math.sin(v.track_${track_model_name}_beta);\n`
  track_timeline += `v.track_${track_animation_name}_R_2_1 = math.cos(v.track_${track_model_name}_beta) * math.sin(v.track_${track_model_name}_alpha);\n`
  track_timeline += `v.track_${track_animation_name}_R_2_2 = math.cos(v.track_${track_model_name}_beta) * math.cos(v.track_${track_model_name}_alpha);\n`

  //all_rotations = []
  //all_positions = []
  //for (m = 0; m < view_group.length; m++) {
  //  all_positions.push({})
  //  all_rotations.push({ 0: worldRotationMatrix })
  //}
  //
  //all_rotations[0] = {
  //  0: R
  //}
  ////头部每帧的精确位置
  //for (q_time = 0; q_time <= track_animation.length; q_time += 0.01) {
  //  time_lines.push(q_time)
  //}


  molang_text = []
  //for (q_time = 0; q_time < 2; q_time++) {


  //var keyframe = new Keyframe({
  //  channel: "position",
  //  time: 0
  //}, null, track_show_animation.getBoneAnimator(view_group[0]));
  //
  //track_show_animation.getBoneAnimator(view_group[0]).fillValues(keyframe, null, true);
  //
  //position = {
  //  x: parseFloat(keyframe.data_points[0].x),
  //  y: parseFloat(keyframe.data_points[0].y),
  //  z: parseFloat(keyframe.data_points[0].z)
  //}

  //all_positions[0][time_lines[q_time]] = position
  molang_text.push(`v.track_${track_animation_name}_body_0_set_x=(ysm.bone_pivot_abs('${track_model_name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${track_model_name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0)`)
  molang_text.push(`v.track_${track_animation_name}_body_0_set_z=(ysm.bone_pivot_abs('${track_model_name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${track_model_name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2)`)
  molang_text.push(`v.track_${track_animation_name}_body_0_set_y=ysm.bone_pivot_abs('${track_model_name}').y*0.7/16+q.position(1)`)


  for (j = 1; j < view_group.length; j++) {
    //if (time_lines[q_time] == 0) {
    //
    //  R = all_rotations[0][time_lines[q_time]]
    //  v = []
    //  v[0] = R[0][0] * all_group[j].origin[0] + R[0][1] * all_group[j].origin[1] + R[0][2] * all_group[j].origin[2]
    //  v[1] = R[1][0] * all_group[j].origin[0] + R[1][1] * all_group[j].origin[1] + R[1][2] * all_group[j].origin[2]
    //  v[2] = R[2][0] * all_group[j].origin[0] + R[2][1] * all_group[j].origin[1] + R[2][2] * all_group[j].origin[2]

    track_timeline += `v.track_${track_animation_name}_v_0 = v.track_${track_animation_name}_R_0_0 * ${all_group[j].origin[0]} + v.track_${track_animation_name}_R_0_1 * ${all_group[j].origin[1]} + v.track_${track_animation_name}_R_0_2 * ${all_group[j].origin[2]};\n`
    track_timeline += `v.track_${track_animation_name}_v_1 = v.track_${track_animation_name}_R_1_0 * ${all_group[j].origin[0]} + v.track_${track_animation_name}_R_1_1 * ${all_group[j].origin[1]} + v.track_${track_animation_name}_R_1_2 * ${all_group[j].origin[2]};\n`
    track_timeline += `v.track_${track_animation_name}_v_2 = v.track_${track_animation_name}_R_2_0 * ${all_group[j].origin[0]} + v.track_${track_animation_name}_R_2_1 * ${all_group[j].origin[1]} + v.track_${track_animation_name}_R_2_2 * ${all_group[j].origin[2]};\n`
    track_timeline += `v.track_${track_animation_name}_body_${j}_last_set_x = ((ysm.bone_pivot_abs('${view_group[0].name}').z+v.track_${track_animation_name}_v_2)*math.sin(q.body_y_rotation)+(ysm.bone_pivot_abs('${view_group[0].name}').x+v.track_${track_animation_name}_v_0)*math.cos(q.body_y_rotation))/16*0.7+q.position(0) ;\n`
    track_timeline += `v.track_${track_animation_name}_body_${j}_last_set_z = ((ysm.bone_pivot_abs('${view_group[0].name}').x+v.track_${track_animation_name}_v_0)*math.sin(q.body_y_rotation)-(ysm.bone_pivot_abs('${view_group[0].name}').z+v.track_${track_animation_name}_v_2)*math.cos(q.body_y_rotation))/16*0.7+q.position(2);\n`
    track_timeline += `v.track_${track_animation_name}_body_${j}_last_set_y = (ysm.bone_pivot_abs('${view_group[0].name}').y+v.track_${track_animation_name}_v_1)*0.7/16+q.position(1) ;\n`
    track_timeline += `v.track_${track_animation_name}_body_${j}_set_x = ((ysm.bone_pivot_abs('${view_group[0].name}').z+v.track_${track_animation_name}_v_2)*math.sin(q.body_y_rotation)+(ysm.bone_pivot_abs('${view_group[0].name}').x+v.track_${track_animation_name}_v_0)*math.cos(q.body_y_rotation))/16*0.7+q.position(0) ;\n`
    track_timeline += `v.track_${track_animation_name}_body_${j}_set_z = ((ysm.bone_pivot_abs('${view_group[0].name}').x+v.track_${track_animation_name}_v_0)*math.sin(q.body_y_rotation)-(ysm.bone_pivot_abs('${view_group[0].name}').z+v.track_${track_animation_name}_v_2)*math.cos(q.body_y_rotation))/16*0.7+q.position(2);\n`
    track_timeline += `v.track_${track_animation_name}_body_${j}_set_y = (ysm.bone_pivot_abs('${view_group[0].name}').y+v.track_${track_animation_name}_v_1)*0.7/16+q.position(1) ;\n`
    //all_positions[j] = {
    //  0: {
    //    x: v[0] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].x),
    //    y: v[1] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].y),
    //    z: v[2] + parseFloat(track_animation.getBoneAnimator(all_group[0]).position[0].data_points[0].z)
    //  }
    //}
    //continue;
    //}


    //position_d = Math.sqrt(
    //  (all_positions[j][time_lines[q_time - 1]].x - all_positions[j - 1][time_lines[q_time]].x) * (all_positions[j][time_lines[q_time - 1]].x - all_positions[j - 1][time_lines[q_time]].x) +
    //  (all_positions[j][time_lines[q_time - 1]].y - all_positions[j - 1][time_lines[q_time]].y) * (all_positions[j][time_lines[q_time - 1]].y - all_positions[j - 1][time_lines[q_time]].y) +
    //  (all_positions[j][time_lines[q_time - 1]].z - all_positions[j - 1][time_lines[q_time]].z) * (all_positions[j][time_lines[q_time - 1]].z - all_positions[j - 1][time_lines[q_time]].z)
    //)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_last_set_x = v.track_${track_animation_name}_body_${j}_set_x`)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_last_set_z = v.track_${track_animation_name}_body_${j}_set_z`)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_last_set_y = v.track_${track_animation_name}_body_${j}_set_y`)
    molang_text.push(`v.track_${track_animation_name}_${j}_position_d=Math.sqrt(
        (v.track_${track_animation_name}_body_${j}_last_set_x - v.track_${track_animation_name}_body_${j - 1}_set_x) * (v.track_${track_animation_name}_body_${j}_last_set_x - v.track_${track_animation_name}_body_${j - 1}_set_x) +
        (v.track_${track_animation_name}_body_${j}_last_set_y - v.track_${track_animation_name}_body_${j - 1}_set_y) * (v.track_${track_animation_name}_body_${j}_last_set_y - v.track_${track_animation_name}_body_${j - 1}_set_y) +
        (v.track_${track_animation_name}_body_${j}_last_set_z - v.track_${track_animation_name}_body_${j - 1}_set_z) * (v.track_${track_animation_name}_body_${j}_last_set_z - v.track_${track_animation_name}_body_${j - 1}_set_z)
      )`)

    //all_positions[j][time_lines[q_time]] = {
    //  x: parseFloat(all_positions[j - 1][time_lines[q_time]].x) - parseFloat(all_positions[j - 1][time_lines[q_time]].x - all_positions[j][time_lines[q_time - 1]].x) * origin_d[j] / position_d,
    //  y: parseFloat(all_positions[j - 1][time_lines[q_time]].y) - parseFloat(all_positions[j - 1][time_lines[q_time]].y - all_positions[j][time_lines[q_time - 1]].y) * origin_d[j] / position_d,
    //  z: parseFloat(all_positions[j - 1][time_lines[q_time]].z) - parseFloat(all_positions[j - 1][time_lines[q_time]].z - all_positions[j][time_lines[q_time - 1]].z) * origin_d[j] / position_d
    //}
    molang_text.push(`v.track_${track_animation_name}_body_${j}_set_x = v.track_${track_animation_name}_body_${j - 1}_set_x-(v.track_${track_animation_name}_body_${j - 1}_set_x - v.track_${track_animation_name}_body_${j}_last_set_x) * ${origin_d[j]}/16*0.7 / v.track_${track_animation_name}_${j}_position_d`)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_set_y = v.track_${track_animation_name}_body_${j - 1}_set_y-(v.track_${track_animation_name}_body_${j - 1}_set_y - v.track_${track_animation_name}_body_${j}_last_set_y) * ${origin_d[j]}/16*0.7 / v.track_${track_animation_name}_${j}_position_d`)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_set_z = v.track_${track_animation_name}_body_${j - 1}_set_z-(v.track_${track_animation_name}_body_${j - 1}_set_z - v.track_${track_animation_name}_body_${j}_last_set_z) * ${origin_d[j]}/16*0.7 / v.track_${track_animation_name}_${j}_position_d`)

    //      addnameanimate_position(track_show_animation, view_group[j], time_lines[q_time], [
    //        parseFloat(all_positions[j][time_lines[q_time]].x),
    //        parseFloat(all_positions[j][time_lines[q_time]].y),
    //        parseFloat(all_positions[j][time_lines[q_time]].z)
    //      ])


  }
  for (j = 0; j < view_group.length; j++)
    addnameanimate_position(track_show_animation, view_group[j], 0,
      [
        `(v.track_${track_animation_name}_body_${j}_set_x-q.position(0))*16/0.7*math.cos(query.body_y_rotation)+(v.track_${track_animation_name}_body_${j}_set_z-q.position(2))*16/0.7*math.sin(query.body_y_rotation)`,
        `(v.track_${track_animation_name}_body_${j}_set_y-q.position(1))*16/0.7`,
        `(v.track_${track_animation_name}_body_${j}_set_x-q.position(0))*16/0.7*math.sin(query.body_y_rotation)-(v.track_${track_animation_name}_body_${j}_set_z-q.position(2))*16/0.7*math.cos(query.body_y_rotation)`
      ])

  molang_in_text = ``
  for (i = 0; i < molang_text.length; i++) {
    molang_in_text += `(q.anim_time-v.track_${track_animation_name}_var_time_have>0.01)?(${molang_text[i]}):0;\n`
  }
  //角度
  molang_text = []
  molang_text.push(`v.track_${track_animation_name}_all_rotations_0_0 = math.cos(q.body_y_rotation)`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_0_1 = 0`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_0_2 = math.sin(q.body_y_rotation)`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_1_0 = 0`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_1_1 = 1`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_1_2 = 0`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_2_0 = math.sin(q.body_y_rotation)`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_2_1 = 0`)
  molang_text.push(`v.track_${track_animation_name}_all_rotations_2_2 = -math.cos(q.body_y_rotation)`)




  for (j = 0; j < all_group.length - 1; j++) {
    //
    //      x_d = all_positions[j + 1][time_lines[q_time]].x - all_positions[j][time_lines[q_time]].x
    //      y_d = all_positions[j + 1][time_lines[q_time]].y - all_positions[j][time_lines[q_time]].y
    //      z_d = all_positions[j + 1][time_lines[q_time]].z - all_positions[j][time_lines[q_time]].z
    molang_text.push(`v.track_${track_animation_name}_x_d = v.track_${track_animation_name}_body_${j + 1}_set_x-v.track_${track_animation_name}_body_${j}_set_x`)
    molang_text.push(`v.track_${track_animation_name}_z_d = v.track_${track_animation_name}_body_${j + 1}_set_z-v.track_${track_animation_name}_body_${j}_set_z`)
    molang_text.push(`v.track_${track_animation_name}_y_d = v.track_${track_animation_name}_body_${j + 1}_set_y-v.track_${track_animation_name}_body_${j}_set_y`)
    molang_text.push(`v.track_${track_animation_name}_v_d_0 = v.track_${track_animation_name}_all_rotations_0_0 * v.track_${track_animation_name}_x_d + v.track_${track_animation_name}_all_rotations_1_0 * v.track_${track_animation_name}_y_d + v.track_${track_animation_name}_all_rotations_2_0 * v.track_${track_animation_name}_z_d`)
    molang_text.push(`v.track_${track_animation_name}_v_d_1 = v.track_${track_animation_name}_all_rotations_0_1 * v.track_${track_animation_name}_x_d + v.track_${track_animation_name}_all_rotations_1_1 * v.track_${track_animation_name}_y_d + v.track_${track_animation_name}_all_rotations_2_1 * v.track_${track_animation_name}_z_d`)
    molang_text.push(`v.track_${track_animation_name}_v_d_2 = v.track_${track_animation_name}_all_rotations_0_2 * v.track_${track_animation_name}_x_d + v.track_${track_animation_name}_all_rotations_1_2 * v.track_${track_animation_name}_y_d + v.track_${track_animation_name}_all_rotations_2_2 * v.track_${track_animation_name}_z_d`)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_rot_y = math.min_angle(math.atan2(v.track_${track_animation_name}_v_d_0, v.track_${track_animation_name}_v_d_2) * 180 / math.pi - v.track_${track_animation_name}_body_${j}_last_rot_y )`)

    molang_text.push(`v.track_${track_animation_name}_body_${j}_rot_y = (v.track_${track_animation_name}_body_${j}_rot_y + v.track_${track_animation_name}_body_${j}_last_rot_y) `)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_last_rot_y= (v.track_${track_animation_name}_body_${j}_rot_y ) `)
    molang_text.push(`v.track_${track_animation_name}_body_${j}_rot_x =math.atan2(v.track_${track_animation_name}_v_d_1, math.sqrt(v.track_${track_animation_name}_v_d_0 * v.track_${track_animation_name}_v_d_0 + v.track_${track_animation_name}_v_d_2 * v.track_${track_animation_name}_v_d_2)) * 180 / math.pi`)

    //      if (j != 0) {
    //        //转置
    //        v_d = []
    //        v_d[0] = all_rotations[j - 1][time_lines[q_time]][0][0] * x_d + all_rotations[j - 1][time_lines[q_time]][1][0] * y_d + all_rotations[j - 1][time_lines[q_time]][2][0] * z_d
    //        v_d[1] = all_rotations[j - 1][time_lines[q_time]][0][1] * x_d + all_rotations[j - 1][time_lines[q_time]][1][1] * y_d + all_rotations[j - 1][time_lines[q_time]][2][1] * z_d
    //        v_d[2] = all_rotations[j - 1][time_lines[q_time]][0][2] * x_d + all_rotations[j - 1][time_lines[q_time]][1][2] * y_d + all_rotations[j - 1][time_lines[q_time]][2][2] * z_d
    //
    //
    //      } else
    //        v_d = [x_d, y_d, z_d]
    //
    //      if (q_time > 0) {
    //        rot_y = ((Math.atan2(v_d[0], v_d[2]) * 180 / Math.PI - track_show_animation.getBoneAnimator(all_group[j]).rotation[q_time - 1].data_points[0].y + 180) % 360 - 180)
    //
    //
    //        rot_y = ((rot_y - 180) % 360 + 180)
    //
    //        last_rot_y = parseFloat(track_show_animation.getBoneAnimator(all_group[j]).rotation[q_time - 1].data_points[0].y)
    //      }
    //      else {
    //        rot_y = ((Math.atan2(v_d[0], v_d[2]) * 180 / Math.PI - 0 + 180) % 360 - 180)
    //
    //        rot_y = ((rot_y - 180) % 360 + 180)
    //        last_rot_y = 0
    //      }
    //
    //      rot_y += last_rot_y
    //
    //      rot_x = Math.atan2(v_d[1], Math.sqrt(v_d[0] * v_d[0] + v_d[2] * v_d[2])) * 180 / Math.PI
    //
    molang_text.push(`v.track_${track_animation_name}_alpha =-v.track_${track_animation_name}_body_${j}_rot_x`)
    molang_text.push(`v.track_${track_animation_name}_beta =v.track_${track_animation_name}_body_${j}_rot_y`)
    molang_text.push(`v.track_${track_animation_name}_gamma =0`)

    //      alpha = -rot_x * Math.PI / 180
    //      beta = rot_y * Math.PI / 180
    //      gamma = 0 * Math.PI / 180
    //
    //      if (j == 1) {
    //        //console.log(q_time, Math.atan2(v_d[0] , v_d[2]) * 180 / Math.PI)
    //      }
    //      //      addnameanimate_rotation(track_show_animation, all_group[j], time_lines[q_time], [
    //      //        parseFloat(rot_x),
    //      //        parseFloat(rot_y),
    //      //        0
    //      //      ])
    //      d_v_1 = new Array(3);
    //      for (let i = 0; i < 3; i++) {
    //        d_v_1[i] = new Array(3).fill(0);
    //      }
    //

    molang_text.push(`v.track_${track_animation_name}_d_v_0_0 =math.cos(v.track_${track_animation_name}_gamma) * math.cos(v.track_${track_animation_name}_beta)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_0_1 = -math.sin(v.track_${track_animation_name}_gamma) * math.cos(v.track_${track_animation_name}_alpha) + math.cos(v.track_${track_animation_name}_gamma) * math.sin(v.track_${track_animation_name}_beta) * math.sin(v.track_${track_animation_name}_alpha)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_0_2 =-math.sin(v.track_${track_animation_name}_gamma) * -math.sin(v.track_${track_animation_name}_alpha) + math.cos(v.track_${track_animation_name}_gamma) * math.sin(v.track_${track_animation_name}_beta) * math.cos(v.track_${track_animation_name}_alpha)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_1_0 =math.sin(v.track_${track_animation_name}_gamma) * math.cos(v.track_${track_animation_name}_beta)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_1_1 =math.cos(v.track_${track_animation_name}_gamma) * math.cos(v.track_${track_animation_name}_alpha) + math.sin(v.track_${track_animation_name}_gamma) * math.sin(v.track_${track_animation_name}_beta) * math.sin(v.track_${track_animation_name}_alpha)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_1_2 =math.cos(v.track_${track_animation_name}_gamma) * -math.sin(v.track_${track_animation_name}_alpha) + math.sin(v.track_${track_animation_name}_gamma) * math.sin(v.track_${track_animation_name}_beta) * math.cos(v.track_${track_animation_name}_alpha)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_2_0 =-math.sin(v.track_${track_animation_name}_beta)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_2_1 =math.cos(v.track_${track_animation_name}_beta) * math.sin(v.track_${track_animation_name}_alpha)`)
    molang_text.push(`v.track_${track_animation_name}_d_v_2_2 =math.cos(v.track_${track_animation_name}_beta) * math.cos(v.track_${track_animation_name}_alpha)`)
    //      // 进行矩阵相乘

    //      d_v = new Array(3);
    //      for (let i = 0; i < 3; i++) {
    //        d_v[i] = new Array(3).fill(0);
    //      }
    //      // 进行矩阵相乘
    //      d_v[0][0] = Math.cos(gamma) * Math.cos(beta);
    //      d_v[0][1] = -Math.sin(gamma) * Math.cos(alpha) + Math.cos(gamma) * Math.sin(beta) * Math.sin(alpha);
    //      d_v[0][2] = -Math.sin(gamma) * -Math.sin(alpha) + Math.cos(gamma) * Math.sin(beta) * Math.cos(alpha);
    //      d_v[1][0] = Math.sin(gamma) * Math.cos(beta);
    //      d_v[1][1] = Math.cos(gamma) * Math.cos(alpha) + Math.sin(gamma) * Math.sin(beta) * Math.sin(alpha);
    //      d_v[1][2] = Math.cos(gamma) * -Math.sin(alpha) + Math.sin(gamma) * Math.sin(beta) * Math.cos(alpha);
    //      d_v[2][0] = -Math.sin(beta);
    //      d_v[2][1] =  Math.cos(beta) * Math.sin(alpha);
    //      d_v[2][2] = Math.cos(beta) * Math.cos(alpha);
    //
    //      if (j != 0) {
    //        d_new = new Array(3);
    //        for (let i = 0; i < 3; i++) {
    //          d_new[i] = new Array(3).fill(0);
    //        }
    molang_text.push(`v.track_${track_animation_name}_d_new_0_0 =v.track_${track_animation_name}_all_rotations_0_0 * v.track_${track_animation_name}_d_v_0_0 + v.track_${track_animation_name}_all_rotations_0_1 * v.track_${track_animation_name}_d_v_1_0 + v.track_${track_animation_name}_all_rotations_0_2 * v.track_${track_animation_name}_d_v_2_0`)
    molang_text.push(`v.track_${track_animation_name}_d_new_0_1 =v.track_${track_animation_name}_all_rotations_0_0 * v.track_${track_animation_name}_d_v_0_1 + v.track_${track_animation_name}_all_rotations_0_1 * v.track_${track_animation_name}_d_v_1_1 + v.track_${track_animation_name}_all_rotations_0_2 * v.track_${track_animation_name}_d_v_2_1`)
    molang_text.push(`v.track_${track_animation_name}_d_new_0_2 =v.track_${track_animation_name}_all_rotations_0_0 * v.track_${track_animation_name}_d_v_0_2 + v.track_${track_animation_name}_all_rotations_0_1 * v.track_${track_animation_name}_d_v_1_2 + v.track_${track_animation_name}_all_rotations_0_2 * v.track_${track_animation_name}_d_v_2_2`)
    molang_text.push(`v.track_${track_animation_name}_d_new_1_0 =v.track_${track_animation_name}_all_rotations_1_0 * v.track_${track_animation_name}_d_v_0_0 + v.track_${track_animation_name}_all_rotations_1_1 * v.track_${track_animation_name}_d_v_1_0 + v.track_${track_animation_name}_all_rotations_1_2 * v.track_${track_animation_name}_d_v_2_0`)
    molang_text.push(`v.track_${track_animation_name}_d_new_1_1 =v.track_${track_animation_name}_all_rotations_1_0 * v.track_${track_animation_name}_d_v_0_1 + v.track_${track_animation_name}_all_rotations_1_1 * v.track_${track_animation_name}_d_v_1_1 + v.track_${track_animation_name}_all_rotations_1_2 * v.track_${track_animation_name}_d_v_2_1`)
    molang_text.push(`v.track_${track_animation_name}_d_new_1_2 =v.track_${track_animation_name}_all_rotations_1_0 * v.track_${track_animation_name}_d_v_0_2 + v.track_${track_animation_name}_all_rotations_1_1 * v.track_${track_animation_name}_d_v_1_2 + v.track_${track_animation_name}_all_rotations_1_2 * v.track_${track_animation_name}_d_v_2_2`)
    molang_text.push(`v.track_${track_animation_name}_d_new_2_0 =v.track_${track_animation_name}_all_rotations_2_0 * v.track_${track_animation_name}_d_v_0_0 + v.track_${track_animation_name}_all_rotations_2_1 * v.track_${track_animation_name}_d_v_1_0 + v.track_${track_animation_name}_all_rotations_2_2 * v.track_${track_animation_name}_d_v_2_0`)
    molang_text.push(`v.track_${track_animation_name}_d_new_2_1 =v.track_${track_animation_name}_all_rotations_2_0 * v.track_${track_animation_name}_d_v_0_1 + v.track_${track_animation_name}_all_rotations_2_1 * v.track_${track_animation_name}_d_v_1_1 + v.track_${track_animation_name}_all_rotations_2_2 * v.track_${track_animation_name}_d_v_2_1`)
    molang_text.push(`v.track_${track_animation_name}_d_new_2_2 =v.track_${track_animation_name}_all_rotations_2_0 * v.track_${track_animation_name}_d_v_0_2 + v.track_${track_animation_name}_all_rotations_2_1 * v.track_${track_animation_name}_d_v_1_2 + v.track_${track_animation_name}_all_rotations_2_2 * v.track_${track_animation_name}_d_v_2_2`)
    //        d_new[0][0] = all_rotations[j - 1][time_lines[q_time]][0][0] * d_v[0][0] + all_rotations[j - 1][time_lines[q_time]][0][1] * d_v[1][0] + all_rotations[j - 1][time_lines[q_time]][0][2] * d_v[2][0];
    //        d_new[0][1] = all_rotations[j - 1][time_lines[q_time]][0][0] * d_v[0][1] + all_rotations[j - 1][time_lines[q_time]][0][1] * d_v[1][1] + all_rotations[j - 1][time_lines[q_time]][0][2] * d_v[2][1];
    //        d_new[0][2] = all_rotations[j - 1][time_lines[q_time]][0][0] * d_v[0][2] + all_rotations[j - 1][time_lines[q_time]][0][1] * d_v[1][2] + all_rotations[j - 1][time_lines[q_time]][0][2] * d_v[2][2];
    //        d_new[1][0] = all_rotations[j - 1][time_lines[q_time]][1][0] * d_v[0][0] + all_rotations[j - 1][time_lines[q_time]][1][1] * d_v[1][0] + all_rotations[j - 1][time_lines[q_time]][1][2] * d_v[2][0];
    //        d_new[1][1] = all_rotations[j - 1][time_lines[q_time]][1][0] * d_v[0][1] + all_rotations[j - 1][time_lines[q_time]][1][1] * d_v[1][1] + all_rotations[j - 1][time_lines[q_time]][1][2] * d_v[2][1];
    //        d_new[1][2] = all_rotations[j - 1][time_lines[q_time]][1][0] * d_v[0][2] + all_rotations[j - 1][time_lines[q_time]][1][1] * d_v[1][2] + all_rotations[j - 1][time_lines[q_time]][1][2] * d_v[2][2];
    //        d_new[2][0] = all_rotations[j - 1][time_lines[q_time]][2][0] * d_v[0][0] + all_rotations[j - 1][time_lines[q_time]][2][1] * d_v[1][0] + all_rotations[j - 1][time_lines[q_time]][2][2] * d_v[2][0];
    //        d_new[2][1] = all_rotations[j - 1][time_lines[q_time]][2][0] * d_v[0][1] + all_rotations[j - 1][time_lines[q_time]][2][1] * d_v[1][1] + all_rotations[j - 1][time_lines[q_time]][2][2] * d_v[2][1];
    //        d_new[2][2] = all_rotations[j - 1][time_lines[q_time]][2][0] * d_v[0][2] + all_rotations[j - 1][time_lines[q_time]][2][1] * d_v[1][2] + all_rotations[j - 1][time_lines[q_time]][2][2] * d_v[2][2];
    //
    //      }
    //      else
    //        d_new = d_v
    molang_text.push(`v.track_${track_animation_name}_all_rotations_0_0=v.track_${track_animation_name}_d_new_0_0`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_0_1=v.track_${track_animation_name}_d_new_0_1`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_0_2=v.track_${track_animation_name}_d_new_0_2`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_1_0=v.track_${track_animation_name}_d_new_1_0`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_1_1=v.track_${track_animation_name}_d_new_1_1`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_1_2=v.track_${track_animation_name}_d_new_1_2`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_2_0=v.track_${track_animation_name}_d_new_2_0`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_2_1=v.track_${track_animation_name}_d_new_2_1`)
    molang_text.push(`v.track_${track_animation_name}_all_rotations_2_2=v.track_${track_animation_name}_d_new_2_2`)
    //      all_rotations[j][time_lines[q_time]] = d_new
    //
    //    }
    //console.log(time_lines[q_time], head_positions[time_lines[q_time]])
  }
  for (j = 0; j < all_group.length - 1; j++)
    addnameanimate_rotation(track_show_animation, all_group[j], 0,
      [`v.track_${track_animation_name}_body_${j}_rot_x`,
      `v.track_${track_animation_name}_body_${j}_rot_y`,
        `0`
      ])
  for (i = 0; i < molang_text.length; i++) {
    molang_in_text += `(${molang_text[i]});\n`
  }
  molang_in_text += `v.track_${track_animation_name}_var_time_have=(q.anim_time-v.track_${track_animation_name}_var_time_have>0.01?v.track_${track_animation_name}_var_time_have+0.01:math.min(q.anim_time,v.track_${track_animation_name}_var_time_have));`
  effect.addKeyframe({
    channel: 'timeline'
  }).set('script', track_timeline)

  track_show_animation.animators['effects'] = effect
  addnameanimate_scale_uniform(track_show_animation, track_molang, 0, molang_in_text)

}
function tw_run() {

  let tw_mianban = new Dialog({
    title: '参数面板',
    id: 'tw_mianban',
    form: {
      filesj: { label: `数据`, extensions: ['json'], type: `file`, accept: '数据' }
    },
    onConfirm() {
      tw_data = {}
      pathsj = $('.dialog#tw_mianban input#filesj').val();
      if (pathsj != undefined && pathsj != '') {
        Blockbench.readFile(pathsj, { type: 'text' }, (file) => {
          tw_data = JSON.parse(file[0].content);
        });
      }

      localStorage.setItem(`no_ctrl`, tw_data[`不使用动画控制器`] === "true" ? true : false);
      localStorage.setItem(`no_ctrl_timeline`, tw_data[`有限轮次`] === "true" ? true : false);
      localStorage.setItem(`model_name`, tw_data[`粒子名称`] || "particle");
      localStorage.setItem(`animation_name`, tw_data[`动画名`] || "particle");
      localStorage.setItem(`controller_name`, tw_data[`控制器名`] || "player.pre_parallel_2");
      localStorage.setItem(`particle_name`, tw_data[`样本粒子名`] || "part");
      localStorage.setItem(`particle_animation_name`, tw_data[`样本粒子动画名`] || "part");
      localStorage.setItem(`particle_gp_name_animation`, tw_data[`粒子团动画参考组名`] || "part_parent");
      localStorage.setItem(`particle_name_animation`, tw_data[`粒子动画参考组名`] || "part_children");
      localStorage.setItem(`particle_run_num`, tw_data[`轮次`]);
      localStorage.setItem(`particle_auther_gp_num`, tw_data[`数量(粒子团)`]);
      localStorage.setItem(`particle_no_auther_num`, tw_data[`空位数量(粒子团)`]);
      localStorage.setItem(`particle_auther_num`, tw_data[`数量(个/粒子团)`]);
      localStorage.setItem(`particle_auther_rot`, tw_data[`生成方向`] || "0");
      localStorage.setItem(`particle_auther_show_time`, tw_data[`生成时间`]);
      localStorage.setItem(`particle_auther_show_speed`, tw_data[`生成速度`]);
      localStorage.setItem(`particle_auther_disappear_speed`, tw_data[`初始消散速度`]);
      localStorage.setItem(`particle_auther_disappear_time`, tw_data[`初始消散时间`]);
      localStorage.setItem(`particle_auther_speed_int`, tw_data[`速度影响程度`]);
      localStorage.setItem(`particle_show_condition`, tw_data[`生成条件`] || 1);
      localStorage.setItem(`particle_follow`, tw_data[`跟踪骨骼`] || "Allbody");
      localStorage.setItem(`particle_auther_scale`, tw_data[`大小(个)`] || 'math.random(1,1)');
      localStorage.setItem(`particle_auther_random_num`, tw_data[`随机数`] || 'math.random(0,1)');
      localStorage.setItem(`particle_auther_range_x`, tw_data[`生成位置(个)(x)`] || 'math.random(0,0)');
      localStorage.setItem(`particle_auther_range_y`, tw_data[`生成位置(个)(y)`] || 'math.random(0,0)');
      localStorage.setItem(`particle_auther_range_z`, tw_data[`生成位置(个)(z)`] || 'math.random(0,0)');
      localStorage.setItem(`particle_range_def_x`, tw_data[`偏转方向(个)(x)`] || 'math.random(0,0)');
      localStorage.setItem(`particle_range_def_y`, tw_data[`偏转方向(个)(y)`] || 'math.random(0,0)');
      localStorage.setItem(`particle_range_def_z`, tw_data[`偏转方向(个)(z)`] || 'math.random(0,0)');
      localStorage.setItem(`extra_particle_name1`, tw_data[`额外样本粒子名1`] || "part");
      localStorage.setItem(`extra_particle_name2`, tw_data[`额外样本粒子名2`] || "part");
      localStorage.setItem(`extra_particle_name3`, tw_data[`额外样本粒子名3`] || "part");
      localStorage.setItem(`extra_particle_name4`, tw_data[`额外样本粒子名4`] || "part");
      localStorage.setItem(`extra_particle_name5`, tw_data[`额外样本粒子名5`] || "part");
      localStorage.setItem(`extra_particle_name6`, tw_data[`额外样本粒子名6`] || "part");
      localStorage.setItem(`extra_particle_name7`, tw_data[`额外样本粒子名7`] || "part");
      localStorage.setItem(`extra_particle_name8`, tw_data[`额外样本粒子名8`] || "part");
      localStorage.setItem(`extra_particle_name9`, tw_data[`额外样本粒子名9`] || "part");
      localStorage.setItem(`extra_particle_name10`, tw_data[`额外样本粒子名10`] || "part");
      localStorage.setItem(`extra_particle_name11`, tw_data[`额外样本粒子名11`] || "part");
      localStorage.setItem(`extra_particle_name12`, tw_data[`额外样本粒子名12`] || "part");

    }

  })

  tw_mianban.show();
}
function tw_run2() {

  let tw_mianban = new Dialog({
    title: '参数面板',
    id: 'tw2_mianban',
    form: {
      filesj_name: { label: `文件名`, type: `text`, value: `数据` },
      filesj: { label: `数据`, type: `folder`, accept: '数据' }
    },
    onConfirm() {
      pathsj = $('.dialog#tw2_mianban input#filesj').val();

      if (pathsj != undefined && pathsj != '') {

        tw_data = `{
      "不使用动画控制器":"${localStorage.getItem("no_ctrl") === "true" ? true : false}",
      "有限轮次":"${localStorage.getItem("no_ctrl_timeline") === "true" ? true : false}",
      "粒子名称":"${localStorage.getItem("model_name") || "particle"}",
      "动画名":"${localStorage.getItem("animation_name") || "particle"}",
      "控制器名":"${localStorage.getItem("controller_name") || "player.pre_parallel_2"}",
      "样本粒子名":"${localStorage.getItem("particle_name") || "part"}",
      "样本粒子动画名":"${localStorage.getItem("particle_animation_name") || "part"}",
      "粒子团动画参考组名":"${localStorage.getItem("particle_gp_name_animation") || "part_parent"}",
      "粒子动画参考组名":"${localStorage.getItem("particle_name_animation") || "part_children"}",
      "轮次":"${parseFloat(localStorage.getItem("particle_run_num")) || 5}",
      "数量(粒子团)":"${parseFloat(localStorage.getItem("particle_auther_gp_num")) || 5}",
      "空位数量(粒子团)":"${parseFloat(localStorage.getItem("particle_no_auther_num")) || 0}",
      "数量(个/粒子团)":"${parseFloat(localStorage.getItem("particle_auther_num")) || 5}",
      "生成方向":"${localStorage.getItem("particle_auther_rot") || "0"}",
      "生成时间":"${parseFloat(localStorage.getItem("particle_auther_show_time")) || 0}",
      "生成速度":"${parseFloat(localStorage.getItem("particle_auther_show_speed")) || 1}",
      "初始消散速度":"${parseFloat(localStorage.getItem("particle_auther_disappear_speed")) || 1}",
      "初始消散时间":"${parseFloat(localStorage.getItem("particle_auther_disappear_time")) || 4}",
      "速度影响程度":"${parseFloat(localStorage.getItem("particle_auther_speed_int")) || 1}",
      "生成条件":"${localStorage.getItem("particle_show_condition") || 1}",
      "跟踪骨骼":"${localStorage.getItem("particle_follow") || "Allbody"}",
      "大小(个)":"${localStorage.getItem("particle_auther_scale") || 'math.random(1,1)'}",
      "随机数":"${localStorage.getItem("particle_auther_random_num") || 'math.random(0,1)'}",
      "生成位置(个)(x)":"${localStorage.getItem("particle_auther_range_x") || 'math.random(0,0)'}",
      "生成位置(个)(y)":"${localStorage.getItem("particle_auther_range_y") || 'math.random(0,0)'}",
      "生成位置(个)(z)":"${localStorage.getItem("particle_auther_range_z") || 'math.random(0,0)'}",
      "偏转方向(个)(x)":"${localStorage.getItem("particle_range_def_x") || 'math.random(0,0)'}",
      "偏转方向(个)(y)":"${localStorage.getItem("particle_range_def_y") || 'math.random(0,0)'}",
      "偏转方向(个)(z)":"${localStorage.getItem("particle_range_def_z") || 'math.random(0,0)'}",
      "额外样本粒子名1":"${localStorage.getItem("extra_particle_name1") || "part"}",
      "额外样本粒子名2":"${localStorage.getItem("extra_particle_name2") || "part"}",
      "额外样本粒子名3":"${localStorage.getItem("extra_particle_name3") || "part"}",
      "额外样本粒子名4":"${localStorage.getItem("extra_particle_name4") || "part"}",
      "额外样本粒子名5":"${localStorage.getItem("extra_particle_name5") || "part"}",
      "额外样本粒子名6":"${localStorage.getItem("extra_particle_name6") || "part"}",
      "额外样本粒子名7":"${localStorage.getItem("extra_particle_name7") || "part"}",
      "额外样本粒子名8":"${localStorage.getItem("extra_particle_name8") || "part"}",
      "额外样本粒子名9":"${localStorage.getItem("extra_particle_name9") || "part"}",
      "额外样本粒子名10":"${localStorage.getItem("extra_particle_name10") || "part"}",
      "额外样本粒子名11":"${localStorage.getItem("extra_particle_name11") || "part"}",
      "额外样本粒子名12":"${localStorage.getItem("extra_particle_name12") || "part"}"
}`
        Blockbench.writeFile(pathsj + `/` + $('.dialog#tw2_mianban input#filesj_name').val() + `.json`, { content: tw_data, savetype: `text` })

      }
    }

  })

  tw_mianban.show();
}

function stop_model_frame() {
  stop_frame = new Dialog({
    title: '参数面板',
    id: 'stop_frame',
    width: 800,
    form: {
      folder: { label: `模型位置`, type: `folder`, value: localStorage.getItem(`path`) },

      stop_model_name: { label: `组名`, type: `text`, value: localStorage.getItem(`stop_model_name`) || `stop_model` },
      stop_animation_name: { label: `动画名`, type: `text`, value: localStorage.getItem(`stop_animation_name`) || `stop_animation` },
      stop_auther_rot: { label: `方向`, type: `text`, value: localStorage.getItem(`stop_auther_rot`) || `q.body_y_rotation` },
      stop_auther_range_x: { label: `位置坐标(x)`, type: `text`, value: localStorage.getItem(`stop_auther_range_x`) || 'q.position(0)' },
      stop_auther_range_y: { label: `位置坐标(y)`, type: `text`, value: localStorage.getItem(`stop_auther_range_y`) || 'q.position(1)' },
      stop_auther_range_z: { label: `位置坐标(z)`, type: `text`, value: localStorage.getItem(`stop_auther_range_z`) || 'q.position(2)' },
    },
    onFormChange() {
      stop_cunchu()
    },
    onConfirm() {
      stop_cunchu()
      anim_and_ctrl_reload(stop_animation_name, undefined)
      //console.log(path + `/ysm.json`);
      Blockbench.readFile(path + `/ysm.json`, { type: 'text' }, (file) => {
        ysm = JSON.parse(file[0].content);
      });
      //console.log(ysm)
      Undo.initEdit({
        outliner: true,
        animations: []
      });

      stop_run()
      Undo.finishEdit(`Finished  model`);
    }

  })
  stop_frame.show();
}
function follow_model_frame() {
  follow_frame = new Dialog({
    title: '参数面板',
    id: 'follow_frame',
    width: 800,
    form: {
      folder: { label: `模型位置`, type: `folder`, value: localStorage.getItem(`path`) },

      include_follow_name: { label: "是否选择其他包含组名的的组", type: "checkbox", value: localStorage.getItem(`include_follow_name`) === `true` ? true : false },
      follow_animation_name: { label: `动画名`, type: `text`, value: localStorage.getItem(`follow_animation_name`) || `follow_animation` },
      follow_model_name: { label: `组名`, type: `text`, value: localStorage.getItem(`follow_model_name`) || `follow_model` },
      follow_target_name: { label: `目标组名`, type: `text`, value: localStorage.getItem(`follow_target_name`) || `follow_target` },

      follow_range: { label: `位移停止最小范围`, type: `text`, value: localStorage.getItem(`follow_range`) || `0` },
      follow_velocity: { label: `位移速度`, type: `text`, value: localStorage.getItem(`follow_velocity`) || '0.21512' },
      follow_near_velocity: { label: `位移速度`, type: `text`, value: localStorage.getItem(`follow_near_velocity`) || '0.02002342' },
      follow_angular_velocity: { label: `角速度`, type: `text`, value: localStorage.getItem(`follow_angular_velocity`) || '2' }
    },
    onFormChange() {
      follow_cunchu()
    },
    onConfirm() {
      follow_cunchu()
      anim_and_ctrl_reload(follow_animation_name, undefined)
      //console.log(path + `/ysm.json`);
      Blockbench.readFile(path + `/ysm.json`, { type: 'text' }, (file) => {
        ysm = JSON.parse(file[0].content);
      });
      //console.log(ysm)
      Undo.initEdit({
        outliner: true,
        animations: []
      });

      follow_run()
      Undo.finishEdit(`Finished  model`);
    },
    lines: [
      '<p><span style="float:left;">重置数据: <button title="Reset values" id="reset_shape"><i class="material-icons" style="color:white">refresh</i></button></span></p><br/><br/>'
    ]

  })
  follow_frame.show();

  const resetButton = document.getElementById("reset_shape");
  if (resetButton) {
    resetButton.onclick = function () {
      document.querySelector('.dialog#follow_frame input#follow_range').value = '0';
      document.querySelector('.dialog#follow_frame input#follow_velocity').value = '0.21512';
      document.querySelector('.dialog#follow_frame input#follow_near_velocity').value = '0.02002342';
      document.querySelector('.dialog#follow_frame input#follow_angular_velocity').value = '2';
    }
  }
}

function follow_run() {
  if (include_follow_name) {
    let follow_molang;
    follow_molang = Group.all.find(group => group.name === `${follow_target_name}_follow_molang`);
    if (!follow_molang) {
      follow_molang = new Group({
        name: `${follow_target_name}_follow_molang`
      })
      follow_molang.init()
    }
    targetGroup = Group.all.find(group => group.name === follow_target_name);
    follow_Groups = [];
    Group.all.forEach(group => {
      if (group.name.includes(follow_model_name)) {
        follow_Groups.push(group)
      }
    })
    if (follow_Groups.length > 0 && targetGroup) {

      //console.log(stopGroup)
      //console.log(Animation.selected)

      //跟随动画
      let follow_animation;
      Animation.all.forEach(anion => {
        if (anion.name == follow_animation_name) {
          Undo.initEdit({ animations: [anion] })
          follow_animation = anion
          Undo.finishEdit('animadd')
        }
      });

      if (!follow_animation) {
        follow_animation = new Animation({
          name: follow_animation_name,
          length: 0,
          loop: `loop`,
          snapping: 500,
          path: path + `/` + ysm['files']['player'][`animation`][`main`],
        })
        Undo.initEdit({ animations: [follow_animation] })
        follow_animation.add()
        Undo.finishEdit('animadd')
      }

      //console.log(follow_animation)
      follow_timeline = ''
      effect = new EffectAnimator(follow_animation)//初始化
      for (i = 0; i < follow_Groups.length; i++) {
        follow_timeline += `v.follow_${follow_Groups[i].name}_x=q.position(0);\n`
        follow_timeline += `v.follow_${follow_Groups[i].name}_y=q.position(1);\n`
        follow_timeline += `v.follow_${follow_Groups[i].name}_z=q.position(2);\n`
      }
      effect.addKeyframe({
        channel: 'timeline'
      }).set('script', follow_timeline)

      follow_animation.animators['effects'] = effect


      //目标组坐标
      molang_text = `v.follow_${follow_target_name}_def_traget_x=(ysm.bone_pivot_abs('${follow_target_name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${follow_target_name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0);`
      molang_text += `v.follow_${follow_target_name}_def_traget_z=(ysm.bone_pivot_abs('${follow_target_name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${follow_target_name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2);`
      molang_text += `v.follow_${follow_target_name}_def_traget_y=ysm.bone_pivot_abs('${follow_target_name}').y*0.7/16+q.position(1);`
      //跟随组坐标
      for (i = 0; i < follow_Groups.length; i++) {
        molang_text += `v.follow_def_${follow_Groups[i].name}_x=(ysm.bone_pivot_abs('${follow_Groups[i].name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${follow_Groups[i].name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0);`
        molang_text += `v.follow_def_${follow_Groups[i].name}_z=(ysm.bone_pivot_abs('${follow_Groups[i].name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${follow_Groups[i].name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2);`
        molang_text += `v.follow_def_${follow_Groups[i].name}_y=ysm.bone_pivot_abs('${follow_Groups[i].name}').y*0.7/16+q.position(1);`

        //坐标差
        molang_text += `v.follow_move_${follow_Groups[i].name}_x=v.follow_${follow_target_name}_def_traget_x-v.follow_def_${follow_Groups[i].name}_x;`
        molang_text += `v.follow_move_${follow_Groups[i].name}_z=v.follow_${follow_target_name}_def_traget_z-v.follow_def_${follow_Groups[i].name}_z;`
        molang_text += `v.follow_move_${follow_Groups[i].name}_y=v.follow_${follow_target_name}_def_traget_y-v.follow_def_${follow_Groups[i].name}_y;`
        molang_text += `v.follow_move_${follow_Groups[i].name}_d=math.sqrt(v.follow_move_${follow_Groups[i].name}_x*v.follow_move_${follow_Groups[i].name}_x+v.follow_move_${follow_Groups[i].name}_y*v.follow_move_${follow_Groups[i].name}_y+v.follow_move_${follow_Groups[i].name}_z*v.follow_move_${follow_Groups[i].name}_z);`

        //下一帧跟随组坐标
        molang_text += `t.follow_${follow_Groups[i].name}_x=v.follow_def_${follow_Groups[i].name}_x;`
        molang_text += `(v.follow_move_${follow_Groups[i].name}_d>(${follow_range})&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_Groups[i].name}_x=t.follow_${follow_Groups[i].name}_x+math.min((${follow_near_velocity})*v.follow_move_${follow_Groups[i].name}_d,${follow_velocity})*v.follow_move_${follow_Groups[i].name}_x/v.follow_move_${follow_Groups[i].name}_d):0;`
        molang_text += `t.follow_${follow_Groups[i].name}_z=v.follow_def_${follow_Groups[i].name}_z;`
        molang_text += `(v.follow_move_${follow_Groups[i].name}_d>(${follow_range})&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_Groups[i].name}_z=t.follow_${follow_Groups[i].name}_z+math.min((${follow_near_velocity})*v.follow_move_${follow_Groups[i].name}_d,${follow_velocity})*v.follow_move_${follow_Groups[i].name}_z/v.follow_move_${follow_Groups[i].name}_d):0;`
        molang_text += `t.follow_${follow_Groups[i].name}_y=v.follow_def_${follow_Groups[i].name}_y;`
        molang_text += `(v.follow_move_${follow_Groups[i].name}_d>(${follow_range})&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_Groups[i].name}_y=t.follow_${follow_Groups[i].name}_y+math.min((${follow_near_velocity})*v.follow_move_${follow_Groups[i].name}_d,${follow_velocity})*v.follow_move_${follow_Groups[i].name}_y/v.follow_move_${follow_Groups[i].name}_d):0;`
        //方向拟合
        //计算跟随组上帧与本帧坐标差
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_d_x=v.follow_def_${follow_Groups[i].name}_x-v.follow_${follow_Groups[i].name}_last_x):0;`
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_d_y=v.follow_def_${follow_Groups[i].name}_y-v.follow_${follow_Groups[i].name}_last_y):0;`
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_d_z=v.follow_def_${follow_Groups[i].name}_z-v.follow_${follow_Groups[i].name}_last_z):0;`
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_d=math.sqrt(v.follow_${follow_Groups[i].name}_d_x*v.follow_${follow_Groups[i].name}_d_x+v.follow_${follow_Groups[i].name}_d_y*v.follow_${follow_Groups[i].name}_d_y+v.follow_${follow_Groups[i].name}_d_z*v.follow_${follow_Groups[i].name}_d_z)):0;`

        //计算x,y轴变化方向角
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_target_rot_x=-180/math.pi*math.asin(v.follow_${follow_Groups[i].name}_d_y/math.sqrt(v.follow_${follow_Groups[i].name}_d_x*v.follow_${follow_Groups[i].name}_d_x+v.follow_${follow_Groups[i].name}_d_y*v.follow_${follow_Groups[i].name}_d_y+v.follow_${follow_Groups[i].name}_d_z*v.follow_${follow_Groups[i].name}_d_z))):0;`
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_target_rot_y=math.min_angle(-90+180/math.pi*(v.follow_${follow_Groups[i].name}_d_x!=0)*math.atan(v.follow_${follow_Groups[i].name}_d_z/v.follow_${follow_Groups[i].name}_d_x)+180*(v.follow_${follow_Groups[i].name}_d_z>=0?1:-1)*(v.follow_${follow_Groups[i].name}_d_x<=0?(v.follow_${follow_Groups[i].name}_d_x==0?1/2:1):0))):0;`
        //记录上一帧坐标
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_last_x=v.follow_def_${follow_Groups[i].name}_x):0;`
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_last_y=v.follow_def_${follow_Groups[i].name}_y):0;`
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_Groups[i].name}_last_z=v.follow_def_${follow_Groups[i].name}_z):0;`

        //计算跟随组上帧与本帧方向角差
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_move_${follow_Groups[i].name}_rot_y=math.mod(v.follow_${follow_Groups[i].name}_target_rot_y-v.follow_${follow_Groups[i].name}_rot_y+180,360)-180):0;`
        molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_move_${follow_Groups[i].name}_rot_x=v.follow_${follow_Groups[i].name}_target_rot_x-v.follow_${follow_Groups[i].name}_rot_x):0;`
        molang_text += `t.follow_${follow_Groups[i].name}_rot_x=(v.follow_${follow_Groups[i].name}_rot_x);`
        molang_text += `t.follow_${follow_Groups[i].name}_rot_y=math.min_angle(v.follow_${follow_Groups[i].name}_rot_y)-720;`
        molang_text += `(v.follow_${follow_Groups[i].name}_d>0.01&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_Groups[i].name}_rot_x=t.follow_${follow_Groups[i].name}_rot_x+math.clamp(0.05*v.follow_move_${follow_Groups[i].name}_rot_x,-(${follow_angular_velocity}),${follow_angular_velocity})):0;`
        molang_text += `(v.follow_${follow_Groups[i].name}_d>0.01&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_Groups[i].name}_rot_y=t.follow_${follow_Groups[i].name}_rot_y+math.clamp(0.05*v.follow_move_${follow_Groups[i].name}_rot_y,-(${follow_angular_velocity}),${follow_angular_velocity})):0;`
        molang_text += `(v.follow_${follow_Groups[i].name}_d>0.01&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_Groups[i].name}_rot_z=ysm.second_order('侧身耦合', 8*math.clamp(0.1*v.follow_move_${follow_Groups[i].name}_rot_y,-(${follow_angular_velocity}),${follow_angular_velocity}), 1, 0.8, 0)):0;`
      }
      molang_text += `v.follow_${follow_target_name}_new_time_have=(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1?v.follow_${follow_target_name}_new_time_have+0.1:math.min(q.anim_time,v.follow_${follow_target_name}_new_time_have));`
      molang_text += `v.follow_${follow_target_name}_var_time_have=(q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01?v.follow_${follow_target_name}_var_time_have+0.01:math.min(q.anim_time,v.follow_${follow_target_name}_var_time_have));`
      if (!follow_animation) {
        follow_animation = new Animation({
          name: follow_animation_name,
          length: 0,
          loop: `loop`,
          snapping: 500,
          path: path + `/` + ysm['files']['player'][`animation`][`main`],
        })
        Undo.initEdit({ animations: [follow_animation] })
        follow_animation.add()
        Undo.finishEdit('animadd')
      }
      Undo.initEdit({ animations: [follow_animation] })

      Undo.finishEdit('animadd')
      addnameanimate_scale_uniform(follow_animation, follow_molang, 0, molang_text)
    } else {
      Blockbench.showQuickMessage(`未找到组`);
    }
  } else {
    follow_Group = Group.all.find(group => group.name === follow_model_name);
    targetGroup = Group.all.find(group => group.name === follow_target_name);
    if (follow_Group && targetGroup) {
      followGroup = new Group({
        name: `${follow_model_name}`
      })
      let follow_molang;
      follow_molang = Group.all.find(group => group.name === `${follow_target_name}_follow_molang`);
      if (!follow_molang) {
        follow_molang = new Group({
          name: `${follow_target_name}_follow_molang`
        })
        follow_molang.init()
      }
      followGroup.init()
      Undo.initEdit({ group: followGroup })
      follow_Group.addTo(followGroup)
      follow_Group.resolve()
      Undo.finishEdit(`Finished  model`);
      //console.log(stopGroup)
      //console.log(Animation.selected)

      //跟随动画
      let follow_animation;
      Animation.all.forEach(anion => {
        if (anion.name == follow_animation_name) {
          Undo.initEdit({ animations: [anion] })
          follow_animation = anion
          Undo.finishEdit('animadd')
        }
      });

      if (!follow_animation) {
        follow_animation = new Animation({
          name: follow_animation_name,
          length: 0,
          loop: `loop`,
          snapping: 500,
          path: path + `/` + ysm['files']['player'][`animation`][`main`],
        })
        Undo.initEdit({ animations: [follow_animation] })
        follow_animation.add()
        Undo.finishEdit('animadd')
      }

      effect = new EffectAnimator(follow_animation)//初始化
      stop_timeline = `v.follow_${follow_model_name}_x=q.position(0);\n`
      stop_timeline += `v.follow_${follow_model_name}_y=q.position(1);\n`
      stop_timeline += `v.follow_${follow_model_name}_z=q.position(2);\n`
      effect.addKeyframe({
        channel: 'timeline'
      }).set('script', stop_timeline)

      follow_animation.animators['effects'] = effect


      //目标组坐标
      molang_text = `v.follow_${follow_target_name}_def_traget_x=(ysm.bone_pivot_abs('${follow_target_name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${follow_target_name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0);`
      molang_text += `v.follow_${follow_target_name}_def_traget_z=(ysm.bone_pivot_abs('${follow_target_name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${follow_target_name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2);`
      molang_text += `v.follow_${follow_target_name}_def_traget_y=ysm.bone_pivot_abs('${follow_target_name}').y*0.7/16+q.position(1);`
      //跟随组坐标
      molang_text += `v.follow_def_${follow_model_name}_x=(ysm.bone_pivot_abs('${follow_model_name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${follow_model_name}').x*math.cos(q.body_y_rotation))/16*0.7+q.position(0);`
      molang_text += `v.follow_def_${follow_model_name}_z=(ysm.bone_pivot_abs('${follow_model_name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${follow_model_name}').z*math.cos(q.body_y_rotation))/16*0.7+q.position(2);`
      molang_text += `v.follow_def_${follow_model_name}_y=ysm.bone_pivot_abs('${follow_model_name}').y*0.7/16+q.position(1);`

      //坐标差
      molang_text += `v.follow_move_${follow_model_name}_x=v.follow_${follow_target_name}_def_traget_x-v.follow_def_${follow_model_name}_x;`
      molang_text += `v.follow_move_${follow_model_name}_z=v.follow_${follow_target_name}_def_traget_z-v.follow_def_${follow_model_name}_z;`
      molang_text += `v.follow_move_${follow_model_name}_y=v.follow_${follow_target_name}_def_traget_y-v.follow_def_${follow_model_name}_y;`
      molang_text += `v.follow_move_${follow_model_name}_d=math.sqrt(v.follow_move_${follow_model_name}_x*v.follow_move_${follow_model_name}_x+v.follow_move_${follow_model_name}_y*v.follow_move_${follow_model_name}_y+v.follow_move_${follow_model_name}_z*v.follow_move_${follow_model_name}_z);`

      //下一帧跟随组坐标
      molang_text += `t.follow_${follow_model_name}_x=v.follow_def_${follow_model_name}_x;`
      molang_text += `(v.follow_move_${follow_model_name}_d>(${follow_range})&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_model_name}_x=t.follow_${follow_model_name}_x+math.min((${follow_near_velocity})*v.follow_move_${follow_model_name}_d,${follow_velocity})*v.follow_move_${follow_model_name}_x/v.follow_move_${follow_model_name}_d):0;`
      molang_text += `t.follow_${follow_model_name}_z=v.follow_def_${follow_model_name}_z;`
      molang_text += `(v.follow_move_${follow_model_name}_d>(${follow_range})&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_model_name}_z=t.follow_${follow_model_name}_z+math.min((${follow_near_velocity})*v.follow_move_${follow_model_name}_d,${follow_velocity})*v.follow_move_${follow_model_name}_z/v.follow_move_${follow_model_name}_d):0;`
      molang_text += `t.follow_${follow_model_name}_y=v.follow_def_${follow_model_name}_y;`
      molang_text += `(v.follow_move_${follow_model_name}_d>(${follow_range})&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_model_name}_y=t.follow_${follow_model_name}_y+math.min((${follow_near_velocity})*v.follow_move_${follow_model_name}_d,${follow_velocity})*v.follow_move_${follow_model_name}_y/v.follow_move_${follow_model_name}_d):0;`
      //方向拟合
      //计算跟随组上帧与本帧坐标差
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_d_x=v.follow_def_${follow_model_name}_x-v.follow_${follow_model_name}_last_x):0;`
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_d_y=v.follow_def_${follow_model_name}_y-v.follow_${follow_model_name}_last_y):0;`
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_d_z=v.follow_def_${follow_model_name}_z-v.follow_${follow_model_name}_last_z):0;`
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_d=math.sqrt(v.follow_${follow_model_name}_d_x*v.follow_${follow_model_name}_d_x+v.follow_${follow_model_name}_d_y*v.follow_${follow_model_name}_d_y+v.follow_${follow_model_name}_d_z*v.follow_${follow_model_name}_d_z)):0;`

      //计算x,y轴变化方向角
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_target_rot_x=-180/math.pi*math.asin(v.follow_${follow_model_name}_d_y/math.sqrt(v.follow_${follow_model_name}_d_x*v.follow_${follow_model_name}_d_x+v.follow_${follow_model_name}_d_y*v.follow_${follow_model_name}_d_y+v.follow_${follow_model_name}_d_z*v.follow_${follow_model_name}_d_z))):0;`
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_target_rot_y=math.min_angle(-90+180/math.pi*(v.follow_${follow_model_name}_d_x!=0)*math.atan(v.follow_${follow_model_name}_d_z/v.follow_${follow_model_name}_d_x)+180*(v.follow_${follow_model_name}_d_z>=0?1:-1)*(v.follow_${follow_model_name}_d_x<=0?(v.follow_${follow_model_name}_d_x==0?1/2:1):0))):0;`
      //记录上一帧坐标
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_last_x=v.follow_def_${follow_model_name}_x):0;`
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_last_y=v.follow_def_${follow_model_name}_y):0;`
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_${follow_model_name}_last_z=v.follow_def_${follow_model_name}_z):0;`

      //计算跟随组上帧与本帧方向角差
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_move_${follow_model_name}_rot_y=math.mod(v.follow_${follow_model_name}_target_rot_y-v.follow_${follow_model_name}_rot_y+180,360)-180):0;`
      molang_text += `(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1)?(v.follow_move_${follow_model_name}_rot_x=v.follow_${follow_model_name}_target_rot_x-v.follow_${follow_model_name}_rot_x):0;`
      molang_text += `t.follow_${follow_model_name}_rot_x=(v.follow_${follow_model_name}_rot_x);`
      molang_text += `t.follow_${follow_model_name}_rot_y=math.min_angle(v.follow_${follow_model_name}_rot_y)-720;`
      molang_text += `(v.follow_${follow_model_name}_d>0.01&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_model_name}_rot_x=t.follow_${follow_model_name}_rot_x+math.clamp(0.05*v.follow_move_${follow_model_name}_rot_x,-(${follow_angular_velocity}),${follow_angular_velocity})):0;`
      molang_text += `(v.follow_${follow_model_name}_d>0.01&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_model_name}_rot_y=t.follow_${follow_model_name}_rot_y+math.clamp(0.05*v.follow_move_${follow_model_name}_rot_y,-(${follow_angular_velocity}),${follow_angular_velocity})):0;`
      molang_text += `(v.follow_${follow_model_name}_d>0.01&&q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01)?(v.follow_${follow_model_name}_rot_z=ysm.second_order('侧身耦合', 8*math.clamp(0.1*v.follow_move_${follow_model_name}_rot_y,-(${follow_angular_velocity}),${follow_angular_velocity}), 1, 0.8, 0)):0;`
      molang_text += `v.follow_${follow_target_name}_new_time_have=(q.anim_time-v.follow_${follow_target_name}_new_time_have>0.1?v.follow_${follow_target_name}_new_time_have+0.1:math.floor(q.anim_time/0.1)*0.1);`
      molang_text += `v.follow_${follow_target_name}_var_time_have=(q.anim_time-v.follow_${follow_target_name}_var_time_have>0.01?v.follow_${follow_target_name}_var_time_have+0.01:math.floor(q.anim_time/0.01)*0.01);`
      if (!follow_animation) {
        follow_animation = new Animation({
          name: follow_animation_name,
          length: 0,
          loop: `loop`,
          snapping: 500,
          path: path + `/` + ysm['files']['player'][`animation`][`main`],
        })
        Undo.initEdit({ animations: [follow_animation] })
        follow_animation.add()
        Undo.finishEdit('animadd')
      }
      Undo.initEdit({ animations: [follow_animation] })

      Undo.finishEdit('animadd')
      addnameanimate_scale_uniform(follow_animation, follow_molang, 0, molang_text)

      addnameanimate_rotation(follow_animation, followGroup, 0,
        [`v.follow_${follow_model_name}_rot_x`, `(v.follow_${follow_model_name}_rot_y-q.body_y_rotation)`, 0])
      addnameanimate_position(follow_animation, followGroup, 0,
        [`(v.follow_${follow_model_name}_x-q.position(0))*16/0.7*math.cos(query.body_y_rotation)+(v.follow_${follow_model_name}_z-q.position(2))*16/0.7*math.sin(query.body_y_rotation)`,
        `(v.follow_${follow_model_name}_y-q.position(1))*16/0.7`,
        `(v.follow_${follow_model_name}_x-q.position(0))*16/0.7*math.sin(query.body_y_rotation)-(v.follow_${follow_model_name}_z-q.position(2))*16/0.7*math.cos(query.body_y_rotation)`
        ])
      addnameanimate_scale_uniform(follow_animation, followGroup, 0, 1)

    } else {
      Blockbench.showQuickMessage(`未找到组`);
    }
  }
}
function follow_cunchu() {

  path = $('.dialog#follow_frame input#folder').val();
  follow_model_name = $('.dialog#follow_frame input#follow_model_name').val();
  follow_animation_name = $('.dialog#follow_frame input#follow_animation_name').val();
  follow_target_name = $('.dialog#follow_frame input#follow_target_name').val();
  include_follow_name = $('.dialog#follow_frame input#include_follow_name').is(':checked');
  follow_range = $('.dialog#follow_frame input#follow_range').val();
  follow_velocity = $('.dialog#follow_frame input#follow_velocity').val();
  follow_near_velocity = $('.dialog#follow_frame input#follow_near_velocity').val();
  follow_angular_velocity = $('.dialog#follow_frame input#follow_angular_velocity').val();
  follow_timed = $('.dialog#follow_frame input#follow_timed').val();

  localStorage.setItem(`path`, path);
  localStorage.setItem(`follow_model_name`, follow_model_name);
  localStorage.setItem(`follow_animation_name`, follow_animation_name);
  localStorage.setItem(`follow_target_name`, follow_target_name);
  localStorage.setItem(`include_follow_name`, include_follow_name);
  localStorage.setItem(`follow_range`, follow_range);
  localStorage.setItem(`follow_velocity`, follow_velocity);
  localStorage.setItem(`follow_near_velocity`, follow_near_velocity);
  localStorage.setItem(`follow_angular_velocity`, follow_angular_velocity);
  localStorage.setItem(`follow_timed`, follow_timed);
}

function stop_run() {
  stopGroup = Group.all.find(group => group.name === stop_model_name);
  if (stopGroup) {
    target_stop_Group = new Group({
      name: `${stop_model_name}`
    })
    target_stop_Group.init()
    Undo.initEdit({ group: stopGroup })
    stopGroup.addTo(target_stop_Group)
    stopGroup.resolve()
    Undo.finishEdit(`Finished  model`);
    //console.log(stopGroup)
    //console.log(Animation.selected)

    //静止动画
    let stop_animation;
    Animation.all.forEach(anion => {
      if (anion.name == stop_animation_name) {
        Undo.initEdit({ animations: [anion] })
        stop_animation = anion
        Undo.finishEdit('animadd')
      }
    });

    if (!stop_animation) {
      stop_animation = new Animation({
        name: stop_animation_name,
        length: 0,
        loop: `loop`,
        snapping: 500,
        path: path + `/` + ysm['files']['player'][`animation`][`main`],
      })
      Undo.initEdit({ animations: [stop_animation] })
      stop_animation.add()
      Undo.finishEdit('animadd')
    }
    Undo.initEdit({ animations: [stop_animation] })

    effect = new EffectAnimator(stop_animation)
    stop_timeline = `v.${stop_model_name}_stop_rot=${stop_auther_rot};\n`
    stop_timeline += `v.${stop_model_name}_stop_x=${stop_auther_range_x};\n`
    stop_timeline += `v.${stop_model_name}_stop_y=${stop_auther_range_y};\n`
    stop_timeline += `v.${stop_model_name}_stop_z=${stop_auther_range_z};\n`
    effect.addKeyframe({
      channel: 'timeline'
    }).set('script', stop_timeline)

    stop_animation.animators['effects'] = effect
    Undo.finishEdit('animadd')
    addnameanimate_rotation(stop_animation, target_stop_Group, 0,
      [0, `(v.${stop_model_name}_stop_rot-q.body_y_rotation)`, 0])
    addnameanimate_position(stop_animation, target_stop_Group, 0,
      [`(v.${stop_model_name}_stop_x-q.position(0))*16/0.7*math.cos(query.body_y_rotation)+(v.${stop_model_name}_stop_z-q.position(2))*16/0.7*math.sin(query.body_y_rotation)`,
      `(v.${stop_model_name}_stop_y-q.position(1))*16/0.7`,
      `(v.${stop_model_name}_stop_x-q.position(0))*16/0.7*math.sin(query.body_y_rotation)-(v.${stop_model_name}_stop_z-q.position(2))*16/0.7*math.cos(query.body_y_rotation)`
      ])
  } else {
    Blockbench.showQuickMessage(`未找到${stop_model_name}`);
  }
}
function stop_cunchu() {

  path = $('.dialog#stop_frame input#folder').val();
  stop_model_name = $('.dialog#stop_frame input#stop_model_name').val();
  stop_animation_name = $('.dialog#stop_frame input#stop_animation_name').val();
  stop_auther_rot = $('.dialog#stop_frame input#stop_auther_rot').val();
  stop_auther_range_x = $('.dialog#stop_frame input#stop_auther_range_x').val();
  stop_auther_range_y = $('.dialog#stop_frame input#stop_auther_range_y').val();
  stop_auther_range_z = $('.dialog#stop_frame input#stop_auther_range_z').val();


  localStorage.setItem(`path`, path);
  localStorage.setItem(`stop_model_name`, stop_model_name);
  localStorage.setItem(`stop_animation_name`, stop_animation_name);
  localStorage.setItem(`stop_auther_rot`, stop_auther_rot);
  localStorage.setItem(`stop_auther_range_x`, stop_auther_range_x);
  localStorage.setItem(`stop_auther_range_y`, stop_auther_range_y);
  localStorage.setItem(`stop_auther_range_z`, stop_auther_range_z);
}

function frame() {

  tw1_frame = new Dialog({
    title: '参数面板',
    id: 'tw1_frame',
    width: 800,
    form: {
      folder: { label: `模型位置`, type: `folder`, value: localStorage.getItem(`path`) },

      no_ctrl: { label: "不使用动画控制器", type: "checkbox", value: localStorage.getItem(`no_ctrl`) === `true` ? true : false },
      no_ctrl_timeline: { label: "有限轮次", type: "checkbox", value: localStorage.getItem(`no_ctrl_timeline`) === `true` ? true : false },
      model_name: { label: `粒子名称`, type: `text`, value: localStorage.getItem(`model_name`) || `particle` },
      animation_name: { label: `动画名`, type: `text`, value: localStorage.getItem(`animation_name`) || `particle` },
      controller_name: { label: `控制器名`, type: `text`, value: localStorage.getItem(`controller_name`) || `player.pre_parallel_2` },
      particle_name: { label: `样本粒子名`, type: `text`, value: localStorage.getItem(`particle_name`) || `part` },
      particle_animation_name: { label: `样本粒子动画名`, type: `text`, value: localStorage.getItem(`particle_animation_name`) || `part` },
      particle_gp_name_animation: { label: `粒子团动画参考组名`, type: `text`, value: localStorage.getItem(`particle_gp_name_animation`) || `part_parent` },
      particle_name_animation: { label: `粒子动画参考组名`, type: `text`, value: localStorage.getItem(`particle_name_animation`) || `part_children` },
      particle_run_num: { label: `轮次`, type: `number`, value: parseFloat(localStorage.getItem(`particle_run_num`)) || 5, min: 1 },
      particle_auther_gp_num: { label: `数量(粒子团)`, type: `number`, value: parseFloat(localStorage.getItem(`particle_auther_gp_num`)) || 5, min: 1 },
      particle_no_auther_num: { label: `空位数量(粒子团)`, type: `number`, value: parseFloat(localStorage.getItem(`particle_no_auther_num`)) || 0, min: 0 },
      particle_auther_num: { label: `数量(个/粒子团)`, type: `number`, value: parseFloat(localStorage.getItem(`particle_auther_num`)) || 5, min: 1 },
      particle_auther_rot: { label: `生成方向`, type: `text`, value: localStorage.getItem(`particle_auther_rot`) || `0` },
      particle_auther_show_time: { label: `生成时间`, type: `number`, value: parseFloat(localStorage.getItem(`particle_auther_show_time`)) || 0, min: 0 },
      particle_auther_show_speed: { label: `生成速度`, type: `number`, value: parseFloat(localStorage.getItem(`particle_auther_show_speed`)) || 1, min: 0.1 },
      particle_auther_disappear_speed: { label: `初始消散速度`, type: `number`, value: parseFloat(localStorage.getItem(`particle_auther_disappear_speed`)) || 1, min: 0 },
      particle_auther_disappear_time: { label: `初始消散时间`, type: `number`, value: parseFloat(localStorage.getItem(`particle_auther_disappear_time`)) || 4, min: 0 },
      particle_auther_speed_int: { label: `速度影响程度`, type: `text`, value: parseFloat(localStorage.getItem(`particle_auther_speed_int`)) || 1 },
      particle_show_condition: { label: `生成条件`, type: `text`, value: localStorage.getItem(`particle_show_condition`) || 1 },
      particle_follow: { label: `跟踪骨骼`, type: `text`, value: localStorage.getItem(`particle_follow`) || `Allbody` },
      particle_auther_scale: { label: `大小(个)`, type: `text`, value: localStorage.getItem(`particle_auther_scale`) || 'math.random(1,1)' },
      particle_auther_random_num: { label: `随机数`, type: `text`, value: localStorage.getItem(`particle_auther_random_num`) || 'math.random(0,1)' },
      particle_auther_range_x: { label: `生成位置(个)(x)`, type: `text`, value: localStorage.getItem(`particle_auther_range_x`) || 'math.random(0,0)' },
      particle_auther_range_y: { label: `生成位置(个)(y)`, type: `text`, value: localStorage.getItem(`particle_auther_range_y`) || 'math.random(0,0)' },
      particle_auther_range_z: { label: `生成位置(个)(z)`, type: `text`, value: localStorage.getItem(`particle_auther_range_z`) || 'math.random(0,0)' },
      particle_range_def_x: { label: `偏转方向(个)(x)`, type: `text`, value: localStorage.getItem(`particle_range_def_x`) || 'math.random(0,0)' },
      particle_range_def_y: { label: `偏转方向(个)(y)`, type: `text`, value: localStorage.getItem(`particle_range_def_y`) || 'math.random(0,0)' },
      particle_range_def_z: { label: `偏转方向(个)(z)`, type: `text`, value: localStorage.getItem(`particle_range_def_z`) || 'math.random(0,0)' },
      extra_particle_name1: { label: `额外样本粒子名1`, type: `text`, value: localStorage.getItem(`extra_particle_name1`) || `part` },
      extra_particle_name2: { label: `额外样本粒子名2`, type: `text`, value: localStorage.getItem(`extra_particle_name2`) || `part` },
      extra_particle_name3: { label: `额外样本粒子名3`, type: `text`, value: localStorage.getItem(`extra_particle_name3`) || `part` },
      extra_particle_name4: { label: `额外样本粒子名4`, type: `text`, value: localStorage.getItem(`extra_particle_name4`) || `part` },
      extra_particle_name5: { label: `额外样本粒子名5`, type: `text`, value: localStorage.getItem(`extra_particle_name5`) || `part` },
      extra_particle_name6: { label: `额外样本粒子名6`, type: `text`, value: localStorage.getItem(`extra_particle_name6`) || `part` },
      extra_particle_name7: { label: `额外样本粒子名7`, type: `text`, value: localStorage.getItem(`extra_particle_name7`) || `part` },
      extra_particle_name8: { label: `额外样本粒子名8`, type: `text`, value: localStorage.getItem(`extra_particle_name8`) || `part` },
      extra_particle_name9: { label: `额外样本粒子名9`, type: `text`, value: localStorage.getItem(`extra_particle_name9`) || `part` },
      extra_particle_name10: { label: `额外样本粒子名10`, type: `text`, value: localStorage.getItem(`extra_particle_name10`) || `part` },
      extra_particle_name11: { label: `额外样本粒子名11`, type: `text`, value: localStorage.getItem(`extra_particle_name11`) || `part` },
      extra_particle_name12: { label: `额外样本粒子名12`, type: `text`, value: localStorage.getItem(`extra_particle_name12`) || `part` }
    },
    lines: [
      '<p><span style="float:left;">重置样本粒子名: <button title="Reset values" id="reset_shape"><i class="material-icons" style="color:white">refresh</i></button></span></p><br/><br/>'
    ],
    onFormChange() {
      part_cunchu()
    },
    onConfirm() {
      part_cunchu()
      createmod();

      //console.log(path + `/ysm.json`);
      Blockbench.readFile(path + `/ysm.json`, { type: 'text' }, (file) => {
        ysm = JSON.parse(file[0].content);
      });
      //console.log(ysm)
      Undo.initEdit({
        outliner: true,
        animations: []
      });
      if (!$('.dialog#tw1_frame input#no_ctrl').is(':checked')) {
        createanim()
        createctrl()
      } else if (!$('.dialog#tw1_frame input#no_ctrl_timeline').is(':checked')) {
        createanim_no_ctrl()
      } else {
        createanim_no_tiemline()
      }

      Undo.finishEdit(`Finished  model`);
      Canvas.updateAll();
    }

  })
  tw1_frame.show();
  const resetButton = document.getElementById("reset_shape");
  if (resetButton) {
    resetButton.onclick = function () {
      document.querySelector('.dialog#tw1_frame input#particle_name').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name1').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name2').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name3').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name4').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name5').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name6').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name7').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name8').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name9').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name10').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name11').value = 'part';
      document.querySelector('.dialog#tw1_frame input#extra_particle_name12').value = 'part';
      document.querySelector('.dialog#tw1_frame input#particle_gp_name_animation').value = 'part_parent';
      document.querySelector('.dialog#tw1_frame input#particle_name_animation').value = 'part_children';
    }
  }
}


function test() {
  console.log(Cube.selected[0].getWorldCenter())
}

function test3() {
  const walkAnim = new Animation({
    name: `行走动画`,
    loop: true
  });
  const Animada = new AnimationController({
    name: `AnimationController`,
    path: path + `/` + ysm['files']['player'][`animation_controllers`][0]
  });

  Undo.initEdit({ animation_controllers: [Animada] })
  Animada.add()
  Undo.finishEdit('animadd')
  const Animsta = new AnimationControllerState(Animada, { name: 'dafualt' })
  const Animsata = new AnimationControllerState(Animada, { name: 'dafualt2' })
  Animsta.addAnimation(walkAnim)
  Animsta.addTransition(uuid = Animsata.uuid, condition = 1231)
  Animsata.addTransition(uuid = Animsta.uuid, condition = 1231)

  Animsta.on_entry = `121144`
  Animsta.on_exit = `121144`
  //console.log(Animada)
  //console.log(AnimationController.selected)
}

let name_group = {}
function test2() {


}

function addnameanimate_rotation(anim, group, key_time, rotation) {
  boneAnimator = anim.getBoneAnimator(group)

  if (rotation != undefined) {
    const keyframerotation = {
      channel: 'rotation',
      data_points: [],
      time: key_time,
      interpolation: 'linear'
    };
    const newKeyframerotation = boneAnimator.addKeyframe(keyframerotation);
    newKeyframerotation.set('x', rotation[0])
    newKeyframerotation.set('y', rotation[1])
    newKeyframerotation.set('z', rotation[2])
    return rotation
  }
  return undefined
}
function addnameanimate_position(anim, group, key_time, position) {
  boneAnimator = anim.getBoneAnimator(group)
  if (position != undefined) {
    const keyframeposition = {
      channel: 'position',
      data_points: [],
      time: key_time,
      interpolation: 'linear'
    };
    const newKeyframeposition = boneAnimator.addKeyframe(keyframeposition);
    newKeyframeposition.set('x', position[0])
    newKeyframeposition.set('y', position[1])
    newKeyframeposition.set('z', position[2])
    return position
  }
  return undefined
}
function addnameanimate_scale(anim, group, key_time, scale) {
  boneAnimator = anim.getBoneAnimator(group)
  if (scale != undefined) {
    const keyframescale = {
      channel: 'scale',
      data_points: [],
      time: key_time,
      interpolation: 'linear',
      uniform: false
    };
    const newKeyframescale = boneAnimator.addKeyframe(keyframescale);
    newKeyframescale.set('x', scale[0])
    newKeyframescale.set('y', scale[1])
    newKeyframescale.set('z', scale[2])
    return scale
  }
  return undefined
}
function addnameanimate_scale_uniform(anim, group, key_time, scale) {
  boneAnimator = anim.getBoneAnimator(group)
  if (scale != undefined) {
    const keyframescale = {
      channel: 'scale',
      data_points: [],
      time: key_time,
      interpolation: 'linear',
      uniform: true
    };
    const newKeyframescale = boneAnimator.addKeyframe(keyframescale);
    newKeyframescale.set('x', scale)
    return scale
  }
  return undefined
}
function addnameanimate_effect(anim, key_time, effect) {
  boneAnimator = anim.animators['effects']
  if (effect != undefined) {
    const keyframeeffect = {
      channel: 'timeline',
      data_points: [],
      time: key_time,
      interpolation: 'linear'
    };
    const newKeyframeeffect = boneAnimator.addKeyframe(keyframeeffect);
    newKeyframeeffect.set('script', effect)
    return effect
  }
  return undefined
}
function createmod() {
  part_cunchu()
  anim_and_ctrl_reload(animation_name, controller_name)

  //console.log(`cs`);
  const allGroups = Group.all;
  if (!allGroups || allGroups.length === 0) {
    //console.log(`未找到任何组`);
  }
  boneGroups = []
  boneGroup = allGroups.find(group => group.name === particle_name);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name1);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name2);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name3);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name4);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name5);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name6);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name7);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name8);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name9);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name10);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name11);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name12);
  if (!boneGroup) {
  } else {
    boneGroups.push(boneGroup)
  }
  //清除重复组
  Group.all.forEach(anion => {
    if (anion.name == model_name + '_all_a') {
      anion.remove({ undo: true })
    }
  });
  //molang
  particle_molang = new Group({
    name: model_name + '_MOL',
    origin: [0, 0, 0]
  })
  name_group[particle_molang.name] = particle_molang
  particle_molang.init()
  particle_all_a = new Group({
    name: model_name + '_all_a',
    origin: [0, 0, 0]
  })
  name_group[particle_all_a.name] = particle_all_a

  particle_all_a.init()
  particle_molang.addTo(particle_all_a)
  //particle_all粒子组模型生成
  particle_all = new Group({
    name: model_name + '_all',
    origin: [0, 0, 0]
  })
  name_group[particle_all.name] = particle_all

  particle_all.init()
  particle_all.addTo(particle_all_a)

  particle_gpb = []
  particle_gpc = []
  //console.log(particle_auther_gp_num);
  for (gp = 1; gp < parseFloat(particle_auther_gp_num) + 1; gp++) {

    //console.log(gp);
    //particle_gpb粒子团模型生成(1级)
    particle_gpb[gp] = new Group(
      {
        name: model_name + `_gpb` + gp,
        origin: [0, 0, 0]
      }
    )
    name_group[particle_gpb[gp].name] = particle_gpb[gp]



    particle_gpb[gp].addTo(particle_all)

    //particle_gpc粒子团模型生成(2级)
    particle_gpc[gp] = new Group(
      {
        name: model_name + `_gpc` + gp,
        origin: [0, 0, 0]
      }
    )
    name_group[particle_gpc[gp].name] = particle_gpc[gp]




    particle_gpc[gp].addTo(particle_gpb[gp])
    particle_gpb[gp].init()
    particle_gpc[gp].init()
    gp_i_particle_a = []
    gp_i_particle = []
    for (particle = 1; particle < parseFloat(particle_auther_num) + 1; particle++) {

      //console.log(particle);

      //gp_i_particle_a粒子模型生成(1级)
      gp_i_particle_a[particle] = new Group(
        {
          name: `gp` + gp + `_` + model_name + `a` + particle,
          origin: [0, 0, 0]
        }
      )
      name_group[gp_i_particle_a[particle].name] = gp_i_particle_a[particle]


      gp_i_particle_a[particle].addTo(particle_gpc[gp])
      //gp_i_particle粒子模型生成(2级)
      gp_i_particle[particle] = new Group(
        {
          name: `gp` + gp + `_` + model_name + particle,
          origin: [0, 0, 0]
        }
      )
      name_group[gp_i_particle[particle].name] = gp_i_particle[particle]


      gp_i_particle[particle].addTo(gp_i_particle_a[particle])
      gp_i_particle_a[particle].init()
      gp_i_particle[particle].init()
      //样本模型生成
      part_group = []
      part_group_gets = []
      if (boneGroups.length == 0) {
        part_cube = new Cube({
          origin: [0, 0, 0],
          name: model_name,
          from: [-1, -1, -1],
          to: [1, 1, 1],
          rotation: [0, 0, 0]
        });
        part_g = new Group({
          name: `ysmGlow${model_name}_${model_name}_${particle + (gp - 1) * particle_auther_num}`,
          origin: [0, 0, 0]
        });
        name_group[part_g.name] = part_g
        part_g.addTo(gp_i_particle[particle])
        part_g.init()
        part_cube.addTo(part_g)
        part_cube.init()
      } else {
        //console.log(boneGroups.length)
        part_group.push(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length])

        group_part = new Group({
          name: `ysmGlow${model_name}_${boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length].name}_${particle + (gp - 1) * particle_auther_num}`
        })
        name_group[group_part.name] = group_part
        group_part.addTo(gp_i_particle[particle])
        group_part.init()
        part_group_gets.push(group_part)
        for (i = 0; i < part_group.length; i++) {
          part_group[i].children.forEach(children => {
            if (children instanceof Group) {
              part_group.push(children)
              //console.log(children.name)

              group_part = new Group({
                name: `ysmGlow${model_name}_${children.name}_${particle + (gp - 1) * particle_auther_num}`,
                origin: children.origin,
                rotation: children.rotation
              })
              name_group[group_part.name] = group_part
              group_part.addTo(part_group_gets[i])
              group_part.init()
              part_group_gets.push(group_part)
            } else {
              part_cube = new Cube({
                origin: children.origin,
                name: `ysmGlow${model_name}_${children.name}_${particle + (gp - 1) * particle_auther_num}`,
                from: children.from,
                to: children.to,
                rotation: children.rotation,
                autouv: children.autouv,
                shade: children.shade,
                mirror_uv: children.mirror_uv,
                inflate: children.inflate,
                color: children.color,
                visibility: children.visibility,
                box_uv: children.box_uv,
                uv_offset: children.uv_offset,
                faces: children.faces,
              })
              part_cube.faces = children.faces
              //console.log(children)
              part_cube.addTo(part_group_gets[i])
              part_cube.init()
            }
          })

        }
      }
    }
  }
}
function createanim() {
  //清除重复动画
  AnimationItem.all.forEach(anion => {
    if (anion.name == animation_name) {
      Undo.initEdit({ animations: [anion] })
      anionremove = anion.remove()
      Undo.finishEdit('animadd')
    }
  });
  //console.log(`cs`);

  let part_animation = undefined;
  //获得样本粒子动画
  AnimationItem.all.forEach(animation => {
    if (animation.name == particle_animation_name) {
      part_animation = animation
    }
  })

  Group.all.forEach(group => {
    if (group.name == particle_gp_name_animation) {
      part_parent = group
    }
    if (group.name == particle_name_animation) {
      part_children = group
    }
  })


  //console.log(`cs`);
  const allGroups = Group.all;
  if (!allGroups || allGroups.length == 0) {
    //console.log(`未找到任何组`);
  }
  boneGroups = []
  boneGroup = allGroups.find(group => group.name === particle_name);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name1);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name2);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name3);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name4);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name5);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name6);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name7);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name8);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name9);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name10);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name11);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name12);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  //console.log(`cs`);
  //粒子动画
  let particle_animation;
  particle_animation = new Animation({
    name: animation_name,
    length: 0,
    loop: `loop`,
    snapping: 500,
    path: path + `/` + ysm['files']['player'][`animation`][`main`],
  })
  Undo.initEdit({ animations: [particle_animation] })

  particle_animation.add()
  Undo.finishEdit('animadd')

  particle_gp1_bones = ``
  for (gp = 1; gp <= particle_auther_gp_num; gp++) {
    particle_gp1_bones += `v.${model_name}_gp${gp}_scale_all=1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-v.${model_name}_gp${gp}_time+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(v.${model_name}_gp${gp}_disappear_speed*8*(-v.${model_name}_gp${gp}_disappear_time+v.${model_name}_gp${gp}_time-0.5/v.${model_name}_gp${gp}_disappear_speed))))-0.01);`
    particle_gp1_bones += `v.${model_name}_gp${gp}_time=query.anim_time-v.${model_name}_gp${gp}_time_have;`
  }
  particle_gp1_bones += `v.${model_name}_player_speed=math.sqrt(q.ground_speed*q.ground_speed+q.vertical_speed*q.vertical_speed);`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)

  particle_gp1_bones += `v.${model_name}_gp_num=math.max(v.${model_name}_get_gp_num+(${particle_no_auther_num})+(${particle_auther_gp_num}),0);`
  particle_gp1_bones += `v.${model_name}_num=math.max(v.${model_name}_get_num+${particle_auther_num},0);`
  particle_gp1_bones += `v.${model_name}_disappear_speed=math.max(v.${model_name}_get_disappear_speed+(${particle_auther_disappear_speed}),0)*(v.${model_name}_player_speed*(${particle_auther_speed_int})+1);`
  particle_gp1_bones += `v.${model_name}_disappear_time=math.max(v.${model_name}_get_disappear_time+(${particle_auther_disappear_time}),0)/(v.${model_name}_player_speed*(${particle_auther_speed_int})+1);`
  particle_gp1_bones += `v.${model_name}_T=5/v.${model_name}_disappear_speed/8+1.5/v.${model_name}_disappear_speed+v.${model_name}_disappear_time;`

  particle_gp1_bones += `t.${model_name}_time_have=v.${model_name}_time_have;`

  particle_gp1_bones += `t.${model_name}_show=v.${model_name}_show;`
  particle_gp1_bones += `t.${model_name}_time_have_T=v.${model_name}_time_have_T;`

  particle_gp1_bones += `v.${model_name}_show=(math.mod(t.${model_name}_time_have>query.anim_time?t.${model_name}_show:(t.${model_name}_show+1),v.${model_name}_gp_num));`
  particle_gp1_bones += `v.${model_name}_time_have_T=t.${model_name}_time_have>query.anim_time?t.${model_name}_time_have_T:q.anim_time;`

  particle_gp1_bones += `v.${model_name}_time_have=t.${model_name}_time_have>query.anim_time?t.${model_name}_time_have:((1+math.floor(query.anim_time/(v.${model_name}_T/v.${model_name}_gp_num)))*(v.${model_name}_T/v.${model_name}_gp_num));`

  //model_name + '_MOL'
  particle_molang = name_group[model_name + '_MOL']
  addnameanimate_scale_uniform(particle_animation, particle_molang, 0,
    particle_gp1_bones
  )
  //model_name + '_all_a'
  particle_all_a = name_group[model_name + '_all_a']
  addnameanimate_rotation(particle_animation, particle_all_a, 0, [0, `-q.body_y_rotation`, 0])

  addnameanimate_scale_uniform(particle_animation, particle_all_a, 0, 1)
  //model_name + '_all'
  particle_all = name_group[model_name + '_all']
  addnameanimate_position(particle_animation, particle_all, 0,
    [
      `-q.position(0)*16/0.7`,
      `-q.position(1)*16/0.7+(ctrl.sneak||ctrl.sneaking)*3`,
      `q.position(2)*16/0.7`])


  particle_gpb = []
  particle_gpc = []
  for (gp = 1; gp < parseFloat(particle_auther_gp_num) + 1; gp++) {

    //particle_gpb粒子团模型生成(1级)
    particle_gpb[gp] = name_group[model_name + `_gpb` + gp]

    //particle_gpb粒子团动画生成(1级)
    addnameanimate_rotation(particle_animation, particle_gpb[gp], 0,
      [0,
        `v.` + model_name + `_gp` + gp + `_rot`,
        0])
    addnameanimate_position(particle_animation, particle_gpb[gp], 0,

      [`(v.${model_name}_gp${gp}_x)*16/0.7`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
      `(v.${model_name}_gp${gp}_y)*16/0.7`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
      `-(v.${model_name}_gp${gp}_z)*16/0.7`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
      ])

    //particle_gpc粒子团模型生成(2级)
    particle_gpc[gp] = name_group[model_name + `_gpc` + gp]

    //particle_gpc粒子团动画生成(2级)
    if (part_animation != undefined && part_parent != undefined) {
      if (part_animation.getBoneAnimator(part_parent).rotation.length > 0) {
        addnameanimate_rotation(particle_animation, particle_gpc[gp], 0,
          [`${part_animation.getBoneAnimator(part_parent).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `v.${model_name}_gp${gp}_rotc+` + `(${part_animation.getBoneAnimator(part_parent).rotation[0].data_points[0].y})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `${part_animation.getBoneAnimator(part_parent).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
          ])
      } else {
        addnameanimate_rotation(particle_animation, particle_gpc[gp], 0,
          [0, `v.${model_name}_gp${gp}_rotc`, 0])

      }
      if (part_animation.getBoneAnimator(part_parent).position.length > 0) {
        addnameanimate_position(particle_animation, particle_gpc[gp], 0,
          [`v.${model_name}_gp${gp}_follow_x+` + `${part_animation.getBoneAnimator(part_parent).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `v.${model_name}_gp${gp}_follow_y+` + `${part_animation.getBoneAnimator(part_parent).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `v.${model_name}_gp${gp}_follow_z+` + `${part_animation.getBoneAnimator(part_parent).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
          ])
      } else {
        addnameanimate_position(particle_animation, particle_gpc[gp], 0,
          [`v.${model_name}_gp${gp}_follow_x`,
          `v.${model_name}_gp${gp}_follow_y`,
          `v.${model_name}_gp${gp}_follow_z`
          ])
      }
      if (part_animation.getBoneAnimator(part_parent).scale.length > 0)
        if (part_animation.getBoneAnimator(part_parent).scale[0].uniform) {
          addnameanimate_scale_uniform(particle_animation, particle_gpc[gp], 0,
            `${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          )
        } else {
          addnameanimate_scale(particle_animation, particle_gpc[gp], 0,
            [`${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
            ])
        }
    }

    gp_i_particle_a = []
    gp_i_particle = []
    for (particle = 1; particle < parseFloat(particle_auther_num) + 1; particle++) {

      //console.log(particle);

      //gp_i_particle_a粒子模型生成(1级)
      gp_i_particle_a[particle] = name_group[`gp` + gp + `_` + model_name + `a` + particle]

      //gp_i_particle_a粒子动画生成(1级)
      addnameanimate_rotation(particle_animation, gp_i_particle_a[particle], 0, [
        `(v.${model_name}${particle}_gp${gp}_def_x)`,
        `(v.${model_name}${particle}_gp${gp}_def_y)`,
        `(v.${model_name}${particle}_gp${gp}_def_z)`
      ])
      addnameanimate_position(particle_animation, gp_i_particle_a[particle], 0,
        [
          `v.${model_name}${particle}_gp${gp}_x`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
          `v.${model_name}${particle}_gp${gp}_y`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
          `v.${model_name}${particle}_gp${gp}_z`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
        ])

      //console.log(particle_animation)
      //gp_i_particle粒子模型生成(2级)
      gp_i_particle[particle] = name_group[`gp` + gp + `_` + model_name + particle]

      //gp_i_particle粒子动画生成(2级)
      if (part_animation != undefined && part_children != undefined) {
        if (part_animation.getBoneAnimator(part_children).rotation.length > 0)
          addnameanimate_rotation(particle_animation, gp_i_particle[particle], 0,
            [`${part_animation.getBoneAnimator(part_children).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).rotation[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
            ])
        if (part_animation.getBoneAnimator(part_children).position.length > 0)
          addnameanimate_position(particle_animation, gp_i_particle[particle], 0,
            [`${part_animation.getBoneAnimator(part_children).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
            ])
        if (part_animation.getBoneAnimator(part_children).scale.length > 0)
          if (part_animation.getBoneAnimator(part_children).scale[0].uniform) {
            addnameanimate_scale_uniform(particle_animation, gp_i_particle[particle], 0,
              `${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${gp_i_particle[particle].name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${gp_i_particle[particle].name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${gp_i_particle[particle].name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${gp_i_particle[particle].name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${gp_i_particle[particle].name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
            )
          } else {
            addnameanimate_scale(particle_animation, gp_i_particle[particle], 0,
              [`${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
              ])
          }
      }
      //样本模型生成
      part_group = []
      if (boneGroups.length == 0) {
        part_g = name_group[`ysmGlow${model_name}_${model_name}_${particle + (gp - 1) * particle_auther_num}`]
        addnameanimate_scale_uniform(particle_animation, part_g, 0,
          `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)`
        )
      } else {
        part_group.push(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length])

        part_group_get = name_group[`ysmGlow${model_name}_${boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length].name}_${particle + (gp - 1) * particle_auther_num}`]

        if (part_animation != undefined && boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length] != undefined) {
          if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation.length > 0)
            addnameanimate_rotation(particle_animation, part_group_get, 0,
              [`${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
              ])
          if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position.length > 0)
            addnameanimate_position(particle_animation, part_group_get, 0,
              [`${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
              ])
          if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale.length > 0) {
            if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].uniform) {
              addnameanimate_scale_uniform(particle_animation, part_group_get, 0,
                `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].x})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${part_group_get.name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${part_group_get.name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${part_group_get.name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${part_group_get.name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${part_group_get.name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
              )
            } else {
              addnameanimate_scale(particle_animation, part_group_get, 0,
                [`v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].x})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
                `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].y})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
                `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].z})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
                ])
            }
          } else {
            addnameanimate_scale_uniform(particle_animation, part_group_get, 0,
              `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)`,
            )

          }
        } else {
          addnameanimate_scale_uniform(particle_animation, part_group_get, 0,
            `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)`,
          )
        }
        for (i = 0; i < part_group.length; i++) {
          part_group[i].children.forEach(children => {
            if (children instanceof Group) {
              part_group.push(children)

              group_part = name_group[`ysmGlow${model_name}_${children.name}_${particle + (gp - 1) * particle_auther_num}`]
              if (part_animation != undefined && part_children != undefined) {
                if (part_animation.getBoneAnimator(children).rotation.length > 0)
                  addnameanimate_rotation(particle_animation, group_part, 0,
                    [`${part_animation.getBoneAnimator(children).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).rotation[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
                    ])
                if (part_animation.getBoneAnimator(children).position.length > 0)
                  addnameanimate_position(particle_animation, group_part, 0,
                    [`${part_animation.getBoneAnimator(children).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
                    ])
                if (part_animation.getBoneAnimator(children).scale.length > 0) {
                  if (part_animation.getBoneAnimator(children).scale[0].uniform) {
                    addnameanimate_scale_uniform(particle_animation, group_part, 0,
                      `${part_animation.getBoneAnimator(children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${group_part.name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${group_part.name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${group_part.name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${group_part.name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${group_part.name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
                    )
                  } else {
                    addnameanimate_scale(particle_animation, group_part, 0,
                      [`${part_animation.getBoneAnimator(children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                      `${part_animation.getBoneAnimator(children).scale[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                      `${part_animation.getBoneAnimator(children).scale[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
                      ])
                  }
                }
              }

            }
          })
        }
      }
    }
  }
}
function createanim_no_ctrl() {
  //清除重复动画
  AnimationItem.all.forEach(anion => {
    if (anion.name == animation_name) {
      Undo.initEdit({ animations: [anion] })
      anionremove = anion.remove()
    }
  });
  //console.log(`cs`);

  let part_animation = undefined;
  //获得样本粒子动画
  AnimationItem.all.forEach(animation => {
    if (animation.name == particle_animation_name) {
      part_animation = animation
    }
  })

  Group.all.forEach(group => {
    if (group.name == particle_gp_name_animation) {
      part_parent = group
    }
    if (group.name == particle_name_animation) {
      part_children = group
    }
  })


  //console.log(`cs`);
  const allGroups = Group.all;
  if (!allGroups || allGroups.length == 0) {
    //console.log(`未找到任何组`);
  }
  boneGroups = []
  boneGroup = allGroups.find(group => group.name === particle_name);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name1);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name2);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name3);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name4);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name5);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name6);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name7);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name8);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name9);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name10);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name11);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name12);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  //console.log(`cs`);

  //粒子动画
  let particle_animation;
  particle_animation = new Animation({
    name: animation_name,
    length: `${5 / parseFloat(particle_auther_disappear_speed) / 8 + 1.5 / parseFloat(particle_auther_disappear_speed) + parseFloat(particle_auther_disappear_time)} `,
    loop: `loop`,
    snapping: 500,
    path: path + `/` + ysm['files']['player'][`animation`][`main`],
  })
  Undo.initEdit({ animations: [particle_animation] })

  particle_animation.add()
  Undo.finishEdit('animadd')
  //指令事件
  particle_T = 5 / parseFloat(particle_auther_disappear_speed) / 8 + 1.5 / parseFloat(particle_auther_disappear_speed) + parseFloat(particle_auther_disappear_time)
  const effect = new EffectAnimator(particle_animation)
  for (gp = 1; gp <= particle_auther_gp_num; gp++) {

    particle_timeline = `v.${model_name}_gp${gp}_follow_x=ysm.bone_pivot_abs('${particle_follow}').x;\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    particle_timeline += `v.${model_name}_show=${gp - 1};\n`
    particle_timeline += `v.${model_name}_gp${gp}_follow_y=ysm.bone_pivot_abs('${particle_follow}').y;\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    particle_timeline += `v.${model_name}_gp${gp}_follow_z=ysm.bone_pivot_abs('${particle_follow}').z;\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    particle_timeline += `v.${model_name}_gp${gp}_disappear_speed = math.max(v.${model_name}_get_disappear_speed+ (${particle_auther_disappear_speed}),0);\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    particle_timeline += `v.${model_name}_gp${gp}_disappear_time = math.max(v.${model_name}_get_disappear_time+ (${particle_auther_disappear_time}),0);\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    particle_timeline += `v.${model_name}_gp${gp}_x = q.position(0);\n`
    particle_timeline += `v.${model_name}_gp${gp}_y = q.position(1);\n`
    particle_timeline += `v.${model_name}_gp${gp}_z = q.position(2);\n`
    particle_timeline += `v.${model_name}_gp${gp}_rot =q.body_y_rotation ;\n`
    particle_timeline += `v.${model_name}_gp${gp}_rotc = ${particle_auther_rot};\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)

    for (particle = 1; particle <= particle_auther_num; particle++) {
      particle_timeline += `v.${model_name}${particle}_gp${gp}_x = (${particle_auther_range_x});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      particle_timeline += `v.${model_name}${particle}_gp${gp}_z = (${particle_auther_range_z});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      particle_timeline += `v.${model_name}${particle}_gp${gp}_y = (${particle_auther_range_y});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      particle_timeline += `v.${model_name}${particle}_gp${gp}_scale_t =(${particle_show_condition})*(${particle_auther_scale});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      particle_timeline += `v.${model_name}${particle}_gp${gp}_def_x =(${particle_range_def_x});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      particle_timeline += `v.${model_name}${particle}_gp${gp}_def_y =(${particle_range_def_y});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      particle_timeline += `v.${model_name}${particle}_gp${gp}_def_z =(${particle_range_def_z});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      particle_timeline += `v.${model_name}${particle}_gp${gp}_random_num =(${particle_auther_random_num});\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    }
    particle_timeline += `v.${model_name}_gp${gp}_time_have = v.${model_name}_time_have_T;\n`

    addeffects = ``
    if (part_animation.animators['effects'] != undefined)
      for (i = 0; i < part_animation.animators['effects'].timeline.length; i++) {
        addeffects += part_animation.animators['effects'].timeline[i].data_points[0].script
        addeffects += `\n`
      }
    particle_timeline += addeffects
    //console.log(particle_T)
    effect.addKeyframe({
      channel: 'timeline',
      time: (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))
    }).set('script', particle_timeline)
    //console.log((particle_auther_gp_num))
    particle_animation.animators['effects'] = effect
  }

  particle_gp1_bones = ``
  for (gp = 1; gp <= particle_auther_gp_num; gp++) {
    particle_gp1_bones += `v.${model_name}_gp${gp}_time=query.anim_time+${particle_T}-${(gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))};`
    particle_gp1_bones += `v.${model_name}_gp${gp}_time=(v.${model_name}_gp${gp}_time>${particle_T}?(v.${model_name}_gp${gp}_time-${particle_T}):v.${model_name}_gp${gp}_time);`
    particle_gp1_bones += `v.${model_name}_gp${gp}_scale_all=1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-v.${model_name}_gp${gp}_time+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp((${particle_auther_disappear_speed})*8*(-(${particle_auther_disappear_time})+v.${model_name}_gp${gp}_time-0.5/v.${model_name}_gp${gp}_disappear_speed))))-0.01);`

  }

  particle_gp1_bones += `v.${model_name}_gp_num=math.max(v.${model_name}_get_gp_num+(${particle_no_auther_num})+(${particle_auther_gp_num}),0);`
  particle_gp1_bones += `v.${model_name}_num=math.max(v.${model_name}_get_num+${particle_auther_num},0);`

  //model_name + '_MOL'
  particle_molang = name_group[model_name + '_MOL']
  addnameanimate_scale_uniform(particle_animation, particle_molang, 0,
    particle_gp1_bones
  )
  //model_name + '_all_a'
  particle_all_a = name_group[model_name + '_all_a']
  addnameanimate_rotation(particle_animation, particle_all_a, 0, [0, `-q.body_y_rotation`, 0])

  addnameanimate_scale_uniform(particle_animation, particle_all_a, 0, 1)

  //model_name + '_all'
  particle_all = name_group[model_name + '_all']
  addnameanimate_position(particle_animation, particle_all, 0,
    [`-q.position(0)*16/0.7`,
      `-q.position(1)*16/0.7+(ctrl.sneak||ctrl.sneaking)*3`,
      `q.position(2)*16/0.7`])


  particle_gpb = []
  particle_gpc = []
  for (gp = 1; gp < parseFloat(particle_auther_gp_num) + 1; gp++) {

    //particle_gpb粒子团模型生成(1级)
    particle_gpb[gp] = name_group[model_name + `_gpb` + gp]

    //particle_gpb粒子团动画生成(1级)
    addnameanimate_rotation(particle_animation, particle_gpb[gp], 0,
      [0,
        `v.` + model_name + `_gp` + gp + `_rot`,
        0])
    addnameanimate_position(particle_animation, particle_gpb[gp], 0,

      [`(v.${model_name}_gp${gp}_x)*16/0.7`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
      `(v.${model_name}_gp${gp}_y)*16/0.7`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
      `-(v.${model_name}_gp${gp}_z)*16/0.7`.replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
      ])

    //particle_gpc粒子团模型生成(2级)
    particle_gpc[gp] = name_group[model_name + `_gpc` + gp]

    //particle_gpc粒子团动画生成(2级)
    if (part_animation != undefined && part_parent != undefined) {
      if (part_animation.getBoneAnimator(part_parent).rotation.length > 0) {
        addnameanimate_rotation(particle_animation, particle_gpc[gp], 0,
          [`${part_animation.getBoneAnimator(part_parent).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `v.${model_name}_gp${gp}_rotc+` + `${part_animation.getBoneAnimator(part_parent).rotation[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `${part_animation.getBoneAnimator(part_parent).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
          ])
      } else {
        addnameanimate_rotation(particle_animation, particle_gpc[gp], 0,
          [0, `v.${model_name}_gp${gp}_rotc`,
            0])
      }
      if (part_animation.getBoneAnimator(part_parent).position.length > 0) {
        addnameanimate_position(particle_animation, particle_gpc[gp], 0,
          [`v.${model_name}_gp${gp}_follow_x+` + `${part_animation.getBoneAnimator(part_parent).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `v.${model_name}_gp${gp}_follow_y+` + `${part_animation.getBoneAnimator(part_parent).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          `v.${model_name}_gp${gp}_follow_z+` + `${part_animation.getBoneAnimator(part_parent).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
          ])
      } else {
        addnameanimate_position(particle_animation, particle_gpc[gp], 0,
          [`v.${model_name}_gp${gp}_follow_x`,
          `v.${model_name}_gp${gp}_follow_y`,
          `v.${model_name}_gp${gp}_follow_z`
          ])
      }
      if (part_animation.getBoneAnimator(part_parent).scale.length > 0)
        if (part_animation.getBoneAnimator(part_parent).scale[0].uniform) {
          addnameanimate_scale_uniform(particle_animation, particle_gpc[gp], 0,
            `${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
          )
        } else {
          addnameanimate_scale(particle_animation, particle_gpc[gp], 0,
            [`${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).scale[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
            ])
        }
    }

    gp_i_particle_a = []
    gp_i_particle = []
    for (particle = 1; particle < parseFloat(particle_auther_num) + 1; particle++) {

      //console.log(particle);

      //gp_i_particle_a粒子模型生成(1级)
      gp_i_particle_a[particle] = name_group[`gp` + gp + `_` + model_name + `a` + particle]

      //gp_i_particle_a粒子动画生成(1级)
      addnameanimate_rotation(particle_animation, gp_i_particle_a[particle], 0, [
        `(v.${model_name}${particle}_gp${gp}_def_x)`,
        `(v.${model_name}${particle}_gp${gp}_def_y)`,
        `(v.${model_name}${particle}_gp${gp}_def_z)`
      ])
      addnameanimate_position(particle_animation, gp_i_particle_a[particle], 0,
        [
          `v.${model_name}${particle}_gp${gp}_x`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
          `v.${model_name}${particle}_gp${gp}_y`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
          `v.${model_name}${particle}_gp${gp}_z`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
        ])


      //gp_i_particle粒子模型生成(2级)
      gp_i_particle[particle] = name_group[`gp` + gp + `_` + model_name + particle]

      //gp_i_particle粒子动画生成(2级)
      if (part_animation != undefined && part_children != undefined) {
        if (part_animation.getBoneAnimator(part_children).rotation.length > 0)
          addnameanimate_rotation(particle_animation, gp_i_particle[particle], 0,
            [`${part_animation.getBoneAnimator(part_children).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).rotation[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
            ])
        if (part_animation.getBoneAnimator(part_children).position.length > 0)
          addnameanimate_position(particle_animation, gp_i_particle[particle], 0,
            [`${part_animation.getBoneAnimator(part_children).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
            `${part_animation.getBoneAnimator(part_children).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
            ])
        if (part_animation.getBoneAnimator(part_children).scale.length > 0)
          if (part_animation.getBoneAnimator(part_children).scale[0].uniform) {
            addnameanimate_scale_uniform(particle_animation, gp_i_particle[particle], 0,
              `${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${gp_i_particle[particle].name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${gp_i_particle[particle].name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${gp_i_particle[particle].name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${gp_i_particle[particle].name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${gp_i_particle[particle].name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
            )
          } else {
            addnameanimate_scale(particle_animation, gp_i_particle[particle], 0,
              [`${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).scale[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
              ])
          }
      }
      //样本模型生成
      part_group = []
      if (boneGroups.length == 0) {
        part_g = name_group[`ysmGlow${model_name}_${model_name}_${particle + (gp - 1) * particle_auther_num}`]
        addnameanimate_scale_uniform(particle_animation, part_g, 0,
          `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)`
        )
      } else {
        part_group.push(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length])

        part_group_get = name_group[`ysmGlow${model_name}_${boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length].name}_${particle + (gp - 1) * particle_auther_num}`]


        if (part_animation != undefined && boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length] != undefined) {
          if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation.length > 0)
            addnameanimate_rotation(particle_animation, part_group_get, 0,
              [`${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
              ])
          if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position.length > 0)
            addnameanimate_position(particle_animation, part_group_get, 0,
              [`${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
              ])
          if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale.length > 0) {
            if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].uniform) {
              addnameanimate_scale_uniform(particle_animation, part_group_get, 0,
                `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].x})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${part_group_get.name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${part_group_get.name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${part_group_get.name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${part_group_get.name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${part_group_get.name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
              )
            } else {
              addnameanimate_scale(particle_animation, part_group_get, 0,
                [`v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].x})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
                `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].y})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`),
                `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[0].data_points[0].z})`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
                ])
            }
          } else {
            addnameanimate_scale_uniform(particle_animation, part_group_get, 0,
              `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)`,
            )
          }
        } else {
          addnameanimate_scale_uniform(particle_animation, part_group_get, 0,
            `v.${model_name}${particle}_gp${gp}_scale_t*(v.${model_name}_num>${particle - 1}?1:0)*(v.${model_name}_gp${gp}_scale_all)`,
          )
        }
        for (i = 0; i < part_group.length; i++) {
          part_group[i].children.forEach(children => {
            if (children instanceof Group) {
              part_group.push(children)

              group_part = name_group[`ysmGlow${model_name}_${children.name}_${particle + (gp - 1) * particle_auther_num}`]
              if (part_animation != undefined && part_children != undefined) {
                if (part_animation.getBoneAnimator(children).rotation.length > 0)
                  addnameanimate_rotation(particle_animation, group_part, 0,
                    [`${part_animation.getBoneAnimator(children).rotation[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).rotation[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).rotation[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
                    ])
                if (part_animation.getBoneAnimator(children).position.length > 0)
                  addnameanimate_position(particle_animation, group_part, 0,
                    [`${part_animation.getBoneAnimator(children).position[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).position[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                    `${part_animation.getBoneAnimator(children).position[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
                    ])
                if (part_animation.getBoneAnimator(children).scale.length > 0) {
                  if (part_animation.getBoneAnimator(children).scale[0].uniform) {
                    addnameanimate_scale_uniform(particle_animation, group_part, 0,
                      `${part_animation.getBoneAnimator(children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${group_part.name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${group_part.name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${group_part.name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${group_part.name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${group_part.name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
                    )
                  } else {
                    addnameanimate_scale(particle_animation, group_part, 0,
                      [`${part_animation.getBoneAnimator(children).scale[0].data_points[0].x}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                      `${part_animation.getBoneAnimator(children).scale[0].data_points[0].y}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                      `${part_animation.getBoneAnimator(children).scale[0].data_points[0].z}`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
                      ])
                  }
                }
              }

            }
          })
        }
      }
    }
  }
}
function createanim_no_tiemline() {
  //清除重复动画
  AnimationItem.all.forEach(anion => {
    if (anion.name == animation_name) {
      Undo.initEdit({ animations: [anion] })
      anionremove = anion.remove()
    }
  });
  //console.log(`cs`);

  let part_animation = undefined;
  //获得样本粒子动画
  AnimationItem.all.forEach(animation => {
    if (animation.name == particle_animation_name) {
      part_animation = animation
    }
  })

  Group.all.forEach(group => {
    if (group.name == particle_gp_name_animation) {
      part_parent = group
    }
    if (group.name == particle_name_animation) {
      part_children = group
    }
  })


  //console.log(`cs`);
  const allGroups = Group.all;
  if (!allGroups || allGroups.length == 0) {
    //console.log(`未找到任何组`);
  }
  boneGroups = []
  boneGroup = allGroups.find(group => group.name === particle_name);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name1);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name2);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name3);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name4);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name5);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name6);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name7);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name8);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name9);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name10);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name11);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  boneGroup = allGroups.find(group => group.name === extra_particle_name12);
  if (!boneGroup) {


  } else {
    boneGroups.push(boneGroup)
  }
  //console.log(`cs`);

  //粒子动画
  let particle_animation;
  particle_animation = new Animation({
    name: animation_name,
    length: `${(parseInt(particle_run_num) + 1) * (5 / parseFloat(particle_auther_disappear_speed) / 8 + 1.5 / parseFloat(particle_auther_disappear_speed) + parseFloat(particle_auther_disappear_time))} `,
    loop: `once`,
    snapping: 500,
    path: path + `/` + ysm['files']['player'][`animation`][`main`],
  })
  Undo.initEdit({ animations: [particle_animation] })

  particle_animation.add()
  Undo.finishEdit('animadd')

  particle_T = 5 / parseFloat(particle_auther_disappear_speed) / 8 + 1.5 / parseFloat(particle_auther_disappear_speed) + parseFloat(particle_auther_disappear_time)




  for (run_num = 0; run_num < particle_run_num; run_num++) {
    //model_name + '_MOL'
    particle_molang = name_group[model_name + '_MOL']

    //model_name + '_all_a'
    particle_all_a = name_group[model_name + '_all_a']

    addnameanimate_scale_uniform(particle_animation, particle_all_a, 0, 1)

    //model_name + '_all'
    particle_all = name_group[model_name + '_all']
    particle_gpb = []
    particle_gpc = []
    for (gp = 1; gp < parseFloat(particle_auther_gp_num) + 1; gp++) {

      //particle_gpb粒子团模型生成(1级)
      particle_gpb[gp] = name_group[model_name + `_gpb` + gp]

      //particle_gpb粒子团动画生成(1级)


      //particle_gpc粒子团模型生成(2级)
      particle_gpc[gp] = name_group[model_name + `_gpc` + gp]

      //particle_gpc粒子团动画生成(2级)
      if (part_animation != undefined && part_parent != undefined) {
        for (i = 0; i < part_animation.getBoneAnimator(part_parent).rotation.length; i++)
          rotation = addnameanimate_rotation(particle_animation, particle_gpc[gp], part_animation.getBoneAnimator(part_parent).rotation[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
            [`${part_animation.getBoneAnimator(part_parent).rotation[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).rotation[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).rotation[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
            ])
        if (i != 0) {
          addnameanimate_rotation(particle_animation, particle_gpc[gp], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
            rotation)
        }
        for (i = 0; i < part_animation.getBoneAnimator(part_parent).position.length; i++)
          position = addnameanimate_position(particle_animation, particle_gpc[gp], part_animation.getBoneAnimator(part_parent).position[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
            [`${part_animation.getBoneAnimator(part_parent).position[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).position[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            `${part_animation.getBoneAnimator(part_parent).position[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
            ])
        if (i != 0) {
          addnameanimate_position(particle_animation, particle_gpc[gp], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
            position)
        }
        for (i = 0; i < part_animation.getBoneAnimator(part_parent).scale.length; i++)
          if (part_animation.getBoneAnimator(part_parent).scale[i].uniform) {
            scale = addnameanimate_scale_uniform(particle_animation, particle_gpc[gp], part_animation.getBoneAnimator(part_parent).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              `${part_animation.getBoneAnimator(part_parent).scale[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
            )
          } else {
            scale = addnameanimate_scale(particle_animation, particle_gpc[gp], part_animation.getBoneAnimator(part_parent).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              [`${part_animation.getBoneAnimator(part_parent).scale[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
              `${part_animation.getBoneAnimator(part_parent).scale[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
              `${part_animation.getBoneAnimator(part_parent).scale[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
              ])
          }
        if (i != 0) {
          if (part_animation.getBoneAnimator(part_parent).scale[i - 1].uniform) {
            addnameanimate_scale_uniform(particle_animation, particle_gpc[gp], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              scale)
          } else {
            addnameanimate_scale(particle_animation, particle_gpc[gp], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              scale)
          }
        }
      }

      gp_i_particle_a = []
      gp_i_particle = []
      for (particle = 1; particle < parseFloat(particle_auther_num) + 1; particle++) {

        //console.log(particle);

        //gp_i_particle_a粒子模型生成(1级)
        gp_i_particle_a[particle] = name_group[`gp` + gp + `_` + model_name + `a` + particle]

        //gp_i_particle_a粒子动画生成(1级)



        //gp_i_particle粒子模型生成(2级)
        gp_i_particle[particle] = name_group[`gp` + gp + `_` + model_name + particle]

        //gp_i_particle粒子动画生成(2级)
        if (part_animation != undefined && part_children != undefined) {
          for (i = 0; i < part_animation.getBoneAnimator(part_children).rotation.length; i++)
            rotation = addnameanimate_rotation(particle_animation, gp_i_particle[particle], part_animation.getBoneAnimator(part_children).rotation[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              [`${part_animation.getBoneAnimator(part_children).rotation[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).rotation[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).rotation[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`)
              ])
          if (i != 0) {
            addnameanimate_rotation(particle_animation, gp_i_particle[particle], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              rotation)
          }
          for (i = 0; i < part_animation.getBoneAnimator(part_children).position.length; i++)
            position = addnameanimate_position(particle_animation, gp_i_particle[particle], part_animation.getBoneAnimator(part_children).position[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              [`${part_animation.getBoneAnimator(part_children).position[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).position[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
              `${part_animation.getBoneAnimator(part_children).position[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`)
              ])
          if (i != 0) {
            addnameanimate_position(particle_animation, gp_i_particle[particle], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              position)
          }
          for (i = 0; i < part_animation.getBoneAnimator(part_children).scale.length; i++)
            if (part_animation.getBoneAnimator(part_children).scale[i].uniform) {
              scale = addnameanimate_scale_uniform(particle_animation, gp_i_particle[particle], part_animation.getBoneAnimator(part_children).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                `${part_animation.getBoneAnimator(part_children).scale[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${gp_i_particle[particle].name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${gp_i_particle[particle].name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${gp_i_particle[particle].name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${gp_i_particle[particle].name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${gp_i_particle[particle].name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
              )
            } else {
              scale = addnameanimate_scale(particle_animation, gp_i_particle[particle], part_animation.getBoneAnimator(part_children).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                [`${part_animation.getBoneAnimator(part_children).scale[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
                `${part_animation.getBoneAnimator(part_children).scale[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
                `${part_animation.getBoneAnimator(part_children).scale[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`)
                ])
            }
          if (i != 0) {
            if (part_animation.getBoneAnimator(part_children).scale[i - 1].uniform) {
              addnameanimate_scale_uniform(particle_animation, gp_i_particle[particle], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                scale)
            } else {
              addnameanimate_scale(particle_animation, gp_i_particle[particle], particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                scale)
            }
          }
        }


        //样本模型生成
        part_group = []
        if (boneGroups.length == 0) {
          part_g = name_group[`ysmGlow${model_name}_${model_name}_${particle + (gp - 1) * particle_auther_num}`]
          scale = addnameanimate_scale_uniform(particle_animation, part_g, run_num * particle_T,
            `(1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(${particle_auther_disappear_speed}*8*(-${particle_auther_disappear_time}+(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})-0.5/${particle_auther_disappear_speed}))))-0.01))`
          )
          addnameanimate_scale(particle_animation, part_group_get, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
            scale)
        } else {
          part_group.push(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length])

          part_group_get = name_group[`ysmGlow${model_name}_${boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length].name}_${particle + (gp - 1) * particle_auther_num}`]


          if (part_animation != undefined && boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length] != undefined) {
            for (i = 0; i < part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation.length; i++)
              rotation = addnameanimate_rotation(particle_animation, part_group_get, part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                [`${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.follow`, `v.follow_${part_group_get.name}_rot_x`),
                `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.follow`, `(v.follow_${part_group_get.name}_rot_y-q.body_y_rotation)`),
                `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).rotation[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.follow`, `v.follow_${part_group_get.name}_rot_z`)
                ])
            if (i != 0) {
              addnameanimate_rotation(particle_animation, part_group_get, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                rotation)
            }
            for (i = 0; i < part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position.length; i++)
              position = addnameanimate_position(particle_animation, part_group_get, part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                [`${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.follow`, `(v.follow_${part_group_get.name}_x-q.position(0))*16/0.7*math.cos(query.body_y_rotation)+(v.follow_${part_group_get.name}_z-q.position(2))*16/0.7*math.sin(query.body_y_rotation)`),
                `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.follow`, `(v.follow_${part_group_get.name}_y-q.position(1))*16/0.7`),
                `${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).position[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.follow`, `(v.follow_${part_group_get.name}_x-q.position(0))*16/0.7*math.sin(query.body_y_rotation)-(v.follow_${part_group_get.name}_z-q.position(2))*16/0.7*math.cos(query.body_y_rotation)`)
                ])
            if (i != 0) {
              addnameanimate_position(particle_animation, part_group_get, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                position)
            }
            for (i = 0; i < part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale.length; i++) {
              if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i].uniform) {
                scale = addnameanimate_scale_uniform(particle_animation, part_group_get, part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                  `(1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(${particle_auther_disappear_speed}*8*(-${particle_auther_disappear_time}+(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})-0.5/${particle_auther_disappear_speed}))))-0.01))` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i].data_points[0].x})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${part_group_get.name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${part_group_get.name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${part_group_get.name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${part_group_get.name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${part_group_get.name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
                )
              } else {
                scale = addnameanimate_scale(particle_animation, part_group_get, part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                  [`(1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(${particle_auther_disappear_speed}*8*(-${particle_auther_disappear_time}+(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})-0.5/${particle_auther_disappear_speed}))))-0.01))` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i].data_points[0].x})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
                  `(1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(${particle_auther_disappear_speed}*8*(-${particle_auther_disappear_time}+(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})-0.5/${particle_auther_disappear_speed}))))-0.01))` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i].data_points[0].y})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`),
                  `(1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(${particle_auther_disappear_speed}*8*(-${particle_auther_disappear_time}+(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})-0.5/${particle_auther_disappear_speed}))))-0.01))` + `*(${part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i].data_points[0].z})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `${Math.random()}`).replaceAll(`v.part_num`, `${particle}`)
                  ])
              }
            }
            if (i != 0) {
              if (part_animation.getBoneAnimator(boneGroups[(particle + (gp - 1) * particle_auther_num - 1) % boneGroups.length]).scale[i - 1].uniform) {
                addnameanimate_scale_uniform(particle_animation, part_group_get, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                  scale)
              } else {
                addnameanimate_scale(particle_animation, part_group_get, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                  scale)
                //console.log(i)
              }
            }
            if (i == 0) {
              scale = addnameanimate_scale_uniform(particle_animation, part_group_get, run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                `(1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(${particle_auther_disappear_speed}*8*(-${particle_auther_disappear_time}+(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})-0.5/${particle_auther_disappear_speed}))))-0.01))`,
              )
              addnameanimate_scale_uniform(particle_animation, part_group_get, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                scale)
            }
          } else {
            scale = addnameanimate_scale_uniform(particle_animation, part_group_get, run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              `(1*(1/(1+math.exp(${parseFloat(particle_auther_show_speed) + 1}*(-(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})+(${parseFloat(particle_auther_show_time)}))*20)))*math.max(0,1*(1/(1+math.exp(${particle_auther_disappear_speed}*8*(-${particle_auther_disappear_time}+(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})-0.5/${particle_auther_disappear_speed}))))-0.01))`,
            )
            addnameanimate_scale_uniform(particle_animation, part_group_get, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
              scale)
          }
          for (i = 0; i < part_group.length; i++) {
            part_group[i].children.forEach(children => {
              if (children instanceof Group) {
                part_group.push(children)

                group_part = name_group[`ysmGlow${model_name}_${children.name}_${particle + (gp - 1) * particle_auther_num}`]
                if (part_animation != undefined && part_children != undefined) {
                  for (i = 0; i < part_animation.getBoneAnimator(children).rotation.length; i++)
                    rotation = addnameanimate_rotation(particle_animation, group_part, part_animation.getBoneAnimator(children).rotation[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                      [`${part_animation.getBoneAnimator(children).rotation[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.follow`, `v.follow_${group_part.name}_rot_x`),
                      `${part_animation.getBoneAnimator(children).rotation[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.follow`, `(v.follow_${group_part.name}_rot_y-q.body_y_rotation)`),
                      `${part_animation.getBoneAnimator(children).rotation[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.follow`, `v.follow_${group_part.name}_rot_z`)
                      ])
                  if (i != 0) {
                    addnameanimate_rotation(particle_animation, group_part, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                      rotation)
                  }
                  for (i = 0; i < part_animation.getBoneAnimator(children).position.length; i++)
                    position = addnameanimate_position(particle_animation, group_part, part_animation.getBoneAnimator(children).position[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                      [`${part_animation.getBoneAnimator(children).position[i].data_points[0].x}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.follow`, `(v.follow_${group_part.name}_x-q.position(0))*16/0.7*math.cos(query.body_y_rotation)+(v.follow_${group_part.name}_z-q.position(2))*16/0.7*math.sin(query.body_y_rotation)`),
                      `${part_animation.getBoneAnimator(children).position[i].data_points[0].y}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.follow`, `(v.follow_${group_part.name}_y-q.position(1))*16/0.7`),
                      `${part_animation.getBoneAnimator(children).position[i].data_points[0].z}`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.follow`, `(v.follow_${group_part.name}_x-q.position(0))*16/0.7*math.sin(query.body_y_rotation)-(v.follow_${group_part.name}_z-q.position(2))*16/0.7*math.cos(query.body_y_rotation)`)
                      ])
                  if (i != 0) {
                    addnameanimate_position(particle_animation, group_part, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                      position)
                  }
                  for (i = 0; i < part_animation.getBoneAnimator(children).scale.length; i++) {
                    if (part_animation.getBoneAnimator(children).scale[i].uniform) {
                      scale = addnameanimate_scale_uniform(particle_animation, group_part, part_animation.getBoneAnimator(children).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                        `(${part_animation.getBoneAnimator(children).scale[i].data_points[0].x})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll('v.part_set_x', `(ysm.bone_pivot_abs('${group_part.name}').z*math.sin(q.body_y_rotation)+ysm.bone_pivot_abs('${group_part.name}').x*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_set_y`, `ysm.bone_pivot_abs('${group_part.name}').y*0.7/16`).replaceAll(`v.part_set_z`, `(ysm.bone_pivot_abs('${group_part.name}').x*math.sin(q.body_y_rotation)-ysm.bone_pivot_abs('${group_part.name}').z*math.cos(q.body_y_rotation))/16*0.7`).replaceAll(`v.part_scale`, `v.${model_name}${particle}_gp${gp}_scale_t*v.${model_name}_gp${gp}_scale_all`),
                      )
                    } else {
                      scale = addnameanimate_scale(particle_animation, group_part, part_animation.getBoneAnimator(children).scale[i].time * particle_T / (part_animation.length + 0.01) + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                        [`(${part_animation.getBoneAnimator(children).scale[i].data_points[0].x})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                        `(${part_animation.getBoneAnimator(children).scale[i].data_points[0].y})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`),
                        `(${part_animation.getBoneAnimator(children).scale[i].data_points[0].z})`.replaceAll(`q.anim_time`, `(query.anim_time-${run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num))})`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
                        ])
                    }
                  }
                  if (i != 0) {
                    if (part_animation.getBoneAnimator(children).scale[i - 1].uniform) {
                      addnameanimate_scale_uniform(particle_animation, group_part, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                        scale)
                    } else {
                      addnameanimate_scale(particle_animation, group_part, particle_T - 0.01 + run_num * particle_T + (gp - 1) * particle_T / (parseFloat(particle_auther_gp_num) + parseFloat(particle_no_auther_num)),
                        scale)
                    }
                  }
                }

              }
            })
          }
        }
      }
    }
  }
}
function createctrl() {
  AnimationController.all.forEach(anion => {
    if (anion.name == controller_name) {
      Undo.initEdit({ animation_controllers: [anion] })
      //console.log(anionremove)
      anionremove = anion.remove()
      Undo.finishEdit('animadd')
    }
  });
  const Animctrl = new AnimationController({
    name: controller_name,
    path: path + `/` + ysm['files']['player'][`animation_controllers`][0]
  });
  Undo.initEdit({ animation_controllers: [Animctrl] })
  Animctrl.add()
  Undo.finishEdit('animadd')
  Animctrl.initial_state = `gp1`
  ctrl_states = []
  for (gp = 1; gp <= particle_auther_gp_num; gp++) {
    ctrl_state = new AnimationControllerState(Animctrl, { name: `gp${gp}` })
    ctrl_state.on_entry = `v.${model_name}_gp${gp}_follow_x=ysm.bone_pivot_abs('${particle_follow}').x;`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_follow_y=ysm.bone_pivot_abs('${particle_follow}').y;`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_follow_z=ysm.bone_pivot_abs('${particle_follow}').z;`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_disappear_speed = math.max(v.${model_name}_get_disappear_speed+ (${particle_auther_disappear_speed}),0) * (v.${model_name}_player_speed*(${particle_auther_speed_int}) + 1);`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_disappear_time = math.max(v.${model_name}_get_disappear_time+ (${particle_auther_disappear_time}),0) / (v.${model_name}_player_speed*(${particle_auther_speed_int}) + 1);`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_x = q.position(0);`
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_y = q.position(1);`
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_z = q.position(2);`
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_rot =q.body_y_rotation ;`
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_rotc = ${particle_auther_rot};\n`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_time_range = math.random(0, v.${model_name}_T);`
    for (particle = 1; particle <= particle_auther_num; particle++) {
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_x = (${particle_auther_range_x});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_z = (${particle_auther_range_z});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_y = (${particle_auther_range_y});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_scale_t =(${particle_auther_scale});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_def_x =(${particle_range_def_x});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_def_y =(${particle_range_def_y});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_def_z =(${particle_range_def_z});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`)
      ctrl_state.on_entry += `v.${model_name}${particle}_gp${gp}_random_num =(${particle_auther_random_num});`.replaceAll(`q.anim_time`, `v.${model_name}_gp${gp}_time`).replaceAll(`v.time`, `v.${animation_name}_gp${gp}_disappear_time`).replaceAll(`v.speed`, `v.${animation_name}_gp${gp}_disappear_speed`).replaceAll(`v.random_num`, `v.${model_name}${particle}_gp${gp}_random_num`).replaceAll(`v.part_num`, `${particle}`).replaceAll(`v.random_group_num`, `${Math.random()}`).replaceAll(`v.gp_num`, `${gp}`)

    }
    ctrl_state.on_entry += `v.${model_name}_gp${gp}_time_have = v.${model_name}_time_have_T;`
    ctrl_states.push(ctrl_state)
  }
  for (i = 0; i < particle_auther_gp_num; i++) {
    condition = []
    for (j = 0; j < particle_auther_gp_num; j++) {
      if (i != j) {
        ctrl_states[i].addTransition(uuid = ctrl_states[j].uuid,)
        condition.push(`v.${model_name}_show == ${j}&&(${particle_show_condition})`)
      }
    }
    for (j = 0; j < parseFloat(particle_auther_gp_num) - 1; j++) {
      ctrl_states[i].transitions[j]['condition'] = condition[j]
    }

  }

}
function part_cunchu() {

  path = $('.dialog#tw1_frame input#folder').val();
  no_ctrl_timeline = $('.dialog#tw1_frame input#no_ctrl_timeline').is(`:checked`);
  no_ctrl = $('.dialog#tw1_frame input#no_ctrl').is(`:checked`);
  model_name = $('.dialog#tw1_frame input#model_name').val();
  animation_name = $('.dialog#tw1_frame input#animation_name').val();
  controller_name = $('.dialog#tw1_frame input#controller_name').val();
  particle_name = $('.dialog#tw1_frame input#particle_name').val();
  particle_run_num = $('.dialog#tw1_frame input#particle_run_num').val();
  particle_animation_name = $('.dialog#tw1_frame input#particle_animation_name').val();
  particle_gp_name_animation = $('.dialog#tw1_frame input#particle_gp_name_animation').val();
  particle_name_animation = $('.dialog#tw1_frame input#particle_name_animation').val();
  particle_follow = $('.dialog#tw1_frame input#particle_follow').val();
  particle_show_condition = $('.dialog#tw1_frame input#particle_show_condition').val();
  particle_auther_gp_num = $('.dialog#tw1_frame input#particle_auther_gp_num').val();
  particle_no_auther_num = $('.dialog#tw1_frame input#particle_no_auther_num').val();
  particle_auther_num = $('.dialog#tw1_frame input#particle_auther_num').val();
  particle_auther_rot = $('.dialog#tw1_frame input#particle_auther_rot').val();
  particle_auther_show_time = $('.dialog#tw1_frame input#particle_auther_show_time').val();
  particle_auther_show_speed = $('.dialog#tw1_frame input#particle_auther_show_speed').val();
  particle_auther_disappear_speed = $('.dialog#tw1_frame input#particle_auther_disappear_speed').val();
  particle_auther_disappear_time = $('.dialog#tw1_frame input#particle_auther_disappear_time').val();
  particle_auther_speed_int = $('.dialog#tw1_frame input#particle_auther_speed_int').val();
  particle_auther_scale = $('.dialog#tw1_frame input#particle_auther_scale').val();
  particle_auther_random_num = $('.dialog#tw1_frame input#particle_auther_random_num').val();
  particle_auther_range_x = $('.dialog#tw1_frame input#particle_auther_range_x').val();
  particle_auther_range_y = $('.dialog#tw1_frame input#particle_auther_range_y').val();
  particle_auther_range_z = $('.dialog#tw1_frame input#particle_auther_range_z').val();
  particle_range_def_x = $('.dialog#tw1_frame input#particle_range_def_x').val();
  particle_range_def_y = $('.dialog#tw1_frame input#particle_range_def_y').val();
  particle_range_def_z = $('.dialog#tw1_frame input#particle_range_def_z').val();
  extra_particle_name1 = $('.dialog#tw1_frame input#extra_particle_name1').val();
  extra_particle_name2 = $('.dialog#tw1_frame input#extra_particle_name2').val();
  extra_particle_name3 = $('.dialog#tw1_frame input#extra_particle_name3').val();
  extra_particle_name4 = $('.dialog#tw1_frame input#extra_particle_name4').val();
  extra_particle_name5 = $('.dialog#tw1_frame input#extra_particle_name5').val();
  extra_particle_name6 = $('.dialog#tw1_frame input#extra_particle_name6').val();
  extra_particle_name7 = $('.dialog#tw1_frame input#extra_particle_name7').val();
  extra_particle_name8 = $('.dialog#tw1_frame input#extra_particle_name8').val();
  extra_particle_name9 = $('.dialog#tw1_frame input#extra_particle_name9').val();
  extra_particle_name10 = $('.dialog#tw1_frame input#extra_particle_name10').val();
  extra_particle_name11 = $('.dialog#tw1_frame input#extra_particle_name11').val();
  extra_particle_name12 = $('.dialog#tw1_frame input#extra_particle_name12').val();


  localStorage.setItem(`path`, path);
  localStorage.setItem(`no_ctrl_timeline`, no_ctrl_timeline);
  localStorage.setItem(`no_ctrl`, no_ctrl);
  localStorage.setItem(`model_name`, model_name);
  localStorage.setItem(`animation_name`, animation_name);
  localStorage.setItem(`controller_name`, controller_name);
  localStorage.setItem(`particle_name`, particle_name);
  localStorage.setItem(`particle_run_num`, particle_run_num);
  localStorage.setItem(`particle_animation_name`, particle_animation_name);
  localStorage.setItem(`particle_gp_name_animation`, particle_gp_name_animation);
  localStorage.setItem(`particle_name_animation`, particle_name_animation);
  localStorage.setItem(`particle_follow`, particle_follow);
  localStorage.setItem(`particle_show_condition`, particle_show_condition);
  localStorage.setItem(`particle_auther_gp_num`, particle_auther_gp_num);
  localStorage.setItem(`particle_no_auther_num`, particle_no_auther_num);
  localStorage.setItem(`particle_auther_num`, particle_auther_num);
  localStorage.setItem(`particle_auther_rot`, particle_auther_rot);
  localStorage.setItem(`particle_auther_show_time`, particle_auther_show_time);
  localStorage.setItem(`particle_auther_show_speed`, particle_auther_show_speed);
  localStorage.setItem(`particle_auther_disappear_speed`, particle_auther_disappear_speed);
  localStorage.setItem(`particle_auther_disappear_time`, particle_auther_disappear_time);
  localStorage.setItem(`particle_auther_scale`, particle_auther_scale);
  localStorage.setItem(`particle_auther_speed_int`, particle_auther_speed_int);
  localStorage.setItem(`particle_auther_random_num`, particle_auther_random_num);
  localStorage.setItem(`particle_auther_range_x`, particle_auther_range_x);
  localStorage.setItem(`particle_auther_range_y`, particle_auther_range_y);
  localStorage.setItem(`particle_auther_range_z`, particle_auther_range_z);
  localStorage.setItem(`particle_range_def_x`, particle_range_def_x);
  localStorage.setItem(`particle_range_def_y`, particle_range_def_y);
  localStorage.setItem(`particle_range_def_z`, particle_range_def_z);
  localStorage.setItem(`extra_particle_name1`, extra_particle_name1);
  localStorage.setItem(`extra_particle_name2`, extra_particle_name2);
  localStorage.setItem(`extra_particle_name3`, extra_particle_name3);
  localStorage.setItem(`extra_particle_name4`, extra_particle_name4);
  localStorage.setItem(`extra_particle_name5`, extra_particle_name5);
  localStorage.setItem(`extra_particle_name6`, extra_particle_name6);
  localStorage.setItem(`extra_particle_name7`, extra_particle_name7);
  localStorage.setItem(`extra_particle_name8`, extra_particle_name8);
  localStorage.setItem(`extra_particle_name9`, extra_particle_name9);
  localStorage.setItem(`extra_particle_name10`, extra_particle_name10);
  localStorage.setItem(`extra_particle_name11`, extra_particle_name11);
  localStorage.setItem(`extra_particle_name12`, extra_particle_name12);
}

function anim_and_ctrl_reload(animation_name, controller_name) {
  let paths = [];
  let controller_paths = [];
  Animation.all.forEach(animation => {
    paths.safePush(animation.path);
  })
  AnimationController.all.forEach(controller => {
    controller_paths.safePush(controller.path);
  })
  paths.forEach(path => {
    Animator.exportAnimationFile(path);
  })
  controller_paths.forEach(path => {
    Animator.exportAnimationControllerFile(path);
  })
  Animation.all.forEach(
    animation => {
      Blockbench.read([animation.path], {}, ([file]) => {
        Undo.initEdit({ animations: [animation] })
        let anim_index = Animation.all.indexOf(animation);
        animation.remove(false, false);
        let [follow_new_animation] = Animator.loadFile(file, [animation.name]);
        Animation.all.remove(follow_new_animation);
        if (animation.name != animation_name) {
          Animation.all.splice(anim_index, 0, follow_new_animation);
        }
        Undo.finishEdit('Reload animation', { animations: [follow_new_animation] })
      })
    }
  )

  AnimationController.all.forEach(
    controller => {
      Blockbench.read([controller.path], {}, ([file]) => {
        Undo.initEdit({ animation_controllers: [controller] })
        let anim_index = AnimationController.all.indexOf(controller);
        controller.remove(false, false);
        let [follow_new_ac] = Animator.loadFile(file, [controller.name]);
        AnimationController.all.remove(follow_new_ac);
        if (controller.name != controller_name) {
          AnimationController.all.splice(anim_index, 0, follow_new_ac);
          follow_new_ac.select();
        }
        Undo.finishEdit('Reload animation', { animation_controllers: [follow_new_ac] });
      })
    }
  )
}
// 处理数据
function matrixMultiply(A, B) {
  // 确定矩阵的维度
  let m = A.length;
  let n = A[0].length;
  let p = B[0].length;

  // 检查矩阵是否可以相乘
  if (B.length !== n) {
    throw new Error('矩阵 A 的列数必须等于矩阵 B 的行数。');
  }

  // 初始化结果矩阵 C
  let C = new Array(m);
  for (let i = 0; i < m; i++) {
    C[i] = new Array(p).fill(0);
  }

  // 进行矩阵相乘
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < n; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return C;
}
function multiplyMatrixAndVector(matrix, vector) {
  const result = [];
  for (let i = 0; i < 3; i++) {
    let sum = 0;
    for (let j = 0; j < 3; j++) {
      sum += matrix[i][j] * vector[j];
    }
    result[i] = sum;
  }
  return result;
}
function transposeMatrix(matrix) {
  const result = [];
  for (let i = 0; i < 3; i++) {
    result[i] = [];
    for (let j = 0; j < 3; j++) {
      result[i][j] = matrix[j][i];
    }
  }
  return result;
}
//平均
function movingAverage3D(points, time_lines, windowSize = 5) {
  const smoothed = {};
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < time_lines.length; i++) {
    let sumX = 0, sumY = 0, sumZ = 0;
    let count = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < time_lines.length) {
        sumX += points[time_lines[index]].x;
        sumY += points[time_lines[index]].y;
        sumZ += points[time_lines[index]].z;
        count++;
      }
    }

    smoothed[time_lines[i]] = {
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count
    };
  }

  return smoothed;
}
function gaussianFilter3D(points, time_lines, windowSize = 5, sigma = 1.0) {
  // 生成高斯核
  function gaussianKernel(size, sigma) {
    const kernel = [];
    const half = Math.floor(size / 2);
    let sum = 0;

    for (let i = -half; i <= half; i++) {
      const value = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel.push(value);
      sum += value;
    }

    // 归一化
    return kernel.map(v => v / sum);
  }

  const kernel = gaussianKernel(windowSize, sigma);
  const half = Math.floor(windowSize / 2);
  const smoothed = [];

  for (let i = 0; i < time_lines.length; i++) {
    let sumX = 0, sumY = 0, sumZ = 0;

    for (let j = -half; j <= half; j++) {
      const index = i + j;
      if (index >= 0 && index < time_lines.length) {
        const weight = kernel[j + half];
        sumX += points[time_lines[index]].x * weight;
        sumY += points[time_lines[index]].y * weight;
        sumZ += points[time_lines[index]].z * weight;
      }
    }

    smoothed[time_lines[i]] = { x: sumX, y: sumY, z: sumZ };
  }

  return smoothed;
}


