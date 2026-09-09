# -*- coding: utf-8 -*-
"""Cozy Mint — Blender 5.2.1 LTS / Scripting > Run Script.

現在の .blend 内の全オブジェクトを削除し、車1台と撮影用セットを作成。
ファイルの読書き・OS操作・外部通信・外部アドオンは使用しません。
座標: 前方 +X、車の左 +Y、上 +Z。単位はメートル。
"""
import bpy
import bmesh
from math import pi, sin, cos
from mathutils import Vector


# ---------- Empty scene ----------
if bpy.context.object and bpy.context.object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
car_collection = bpy.data.collections.new('Cozy_Car')
scene.collection.children.link(car_collection)
studio_collection = bpy.data.collections.new('Studio')
scene.collection.children.link(studio_collection)


def material(name, color, roughness=0.45, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat


mint = material('Paint_Soft_Mint', (0.29, 0.67, 0.53))
cream = material('Warm_Ivory', (0.94, 0.87, 0.68))
glass = material('Glass_Blue_Opaque', (0.045, 0.125, 0.18), 0.23)
rubber = material('Tire_Charcoal', (0.028, 0.039, 0.046), 0.82)
hubmat = material('Wheel_Ivory', (0.82, 0.86, 0.80), 0.40, 0.08)
lamp = material('Lamp_Honey_Cream', (1.0, 0.78, 0.37), 0.30)
red = material('Tail_Lamp_Coral', (0.77, 0.16, 0.12), 0.36)
trim = material('Trim_Deep_Mint', (0.13, 0.32, 0.27), 0.58)
ground_mat = material('Ground_Vanilla', (0.84, 0.80, 0.68), 0.85)

root = bpy.data.objects.new('Car_Root', None)
car_collection.objects.link(root)
root.empty_display_type = 'PLAIN_AXES'
root.empty_display_size = 0.35
root['forward_axis'] = '+X (Blender coordinates)'
root['wheel_spin_axis'] = 'Each Wheel_* local Y; radians'


def mesh_object(name, vertices, faces, mat, parent=root, studio=False):
    mesh = bpy.data.meshes.new(name + '_Mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    # 閉じたメッシュの面向きを統一。負スケールや反転法線を避ける。
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    (studio_collection if studio else car_collection).objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def apply_modifier(obj, mod):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def bevel(obj, width, segments=3):
    mod = obj.modifiers.new('Soft_Edges', 'BEVEL')
    mod.width = width
    mod.segments = segments
    apply_modifier(obj, mod)
    # 平面は平面のまま、ベベルだけを滑らかに見せる。
    for poly in obj.data.polygons:
        poly.use_smooth = True
    normal = obj.modifiers.new('Weighted_Normals', 'WEIGHTED_NORMAL')
    normal.keep_sharp = True
    normal.weight = 40
    apply_modifier(obj, normal)
    return obj


def box(name, location, size, mat, radius=0.05, parent=root):
    x, y, z = (v / 2 for v in size)
    verts = [(-x,-y,-z), (x,-y,-z), (x,y,-z), (-x,y,-z),
             (-x,-y,z), (x,-y,z), (x,y,z), (-x,y,z)]
    faces = [(0,3,2,1), (4,5,6,7), (0,1,5,4),
             (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    obj = mesh_object(name, verts, faces, mat, parent)
    obj.location = location
    if radius:
        bevel(obj, radius)
    return obj


def loft(name, rings, mat):
    n = len(rings[0])
    verts = [p for ring in rings for p in ring]
    faces = [tuple(reversed(range(n)))]
    for j in range(len(rings)-1):
        for i in range(n):
            faces.append((j*n+i, j*n+(i+1)%n,
                          (j+1)*n+(i+1)%n, (j+1)*n+i))
    faces.append(tuple((len(rings)-1)*n+i for i in range(n)))
    return mesh_object(name, verts, faces, mat)


# ---------- Sculpted body: varying width / height, real wheel openings ----------
rings = []
for x, half_width, top in [(-1.53,.62,.90), (-1.38,.76,1.02),
                          (-.80,.79,1.08), (.63,.79,1.06),
                          (1.30,.73,.96), (1.53,.61,.85)]:
    w = half_width
    rings.append([(x,-w*.86,.40), (x,-w,.53), (x,-w,top-.12),
                  (x,-w*.83,top), (x,w*.83,top), (x,w,top-.12),
                  (x,w,.53), (x,w*.86,.40)])
body = loft('Body', rings, mint)
for x in (-.94,.94):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.405, depth=2.2,
                                       location=(x,0,.37), rotation=(pi/2,0,0))
    cutter = bpy.context.object
    mod = body.modifiers.new('Wheel_Opening', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    apply_modifier(body, mod)
    bpy.data.objects.remove(cutter, do_unlink=True)
bevel(body, .045, 3)

# Cabin: broad lower shoulders, narrower roof, sloping windshield.
cab = mesh_object('Cabin_Frame',
    [(-1.19,-.66,.96), (.72,-.66,.96), (.72,.66,.96), (-1.19,.66,.96),
     (-.85,-.535,1.72), (.28,-.535,1.72), (.28,.535,1.72), (-.85,.535,1.72)],
    [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)], mint)
bevel(cab, .075, 3)
box('Roof', (-.285,0,1.731), (1.27,1.17,.145), cream, .068)


def panel(name, points, outward, mat):
    # 面に沿う薄い閉メッシュ。小さな角丸を実メッシュ化。
    normal = Vector(outward).normalized()
    verts = [tuple(Vector(p)+normal*d) for d in (0.009,0.023) for p in points]
    n = len(points)
    faces = [tuple(reversed(range(n))), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return bevel(mesh_object(name, verts, faces, mat), .006, 2)


def windshield_x(z):
    return .72 - (z-.96)*(.44/.76)


panel('Windshield', [(windshield_x(1.09),-.555,1.09),
                      (windshield_x(1.09),.555,1.09),
                      (windshield_x(1.61),.475,1.61),
                      (windshield_x(1.61),-.475,1.61)], (1,0,.58), glass)
panel('Rear_Window', [(-1.19+(z-.96)*(.34/.76),y,z)
                      for y,z in [(.55,1.10),(-.55,1.10),(-.46,1.60),(.46,1.60)]],
      (-1,0,.45), glass)
for side, sign in [('L',1),('R',-1)]:
    def side_points(xz):
        return [(x, sign*(.66-(z-.96)*(.125/.76)), z) for x,z in xz]
    panel('Side_Window_Front_'+side,
          side_points([(-.23,1.09),(.57,1.09),(.245,1.61),(-.23,1.61)]),
          (0,sign,.165),glass)
    panel('Side_Window_Rear_'+side,
          side_points([(-1.04,1.09),(-.32,1.09),(-.32,1.61),(-.805,1.61)]),
          (0,sign,.165),glass)
    box('Door_Handle_'+side, (-.29,sign*.791,.935), (.19,.035,.045), cream, .016)
    box('Mirror_'+side, (.49,sign*.762,1.16), (.18,.16,.115), mint, .048)

# Low, widely spaced lamps; no pupils, grille-mouth, or facial decoration.
for side, sign in [('L',1),('R',-1)]:
    obj = box('Headlight_'+side, (1.555,sign*.405,.765), (.095,.31,.15), lamp,.042)
    obj.rotation_euler[2] = -sign*.13
    obj = box('Taillight_'+side, (-1.545,sign*.48,.79), (.075,.18,.18), red,.038)
    obj.rotation_euler[2] = sign*.15
box('Bumper_Front', (1.49,0,.525), (.17,1.19,.135), cream,.056)
box('Bumper_Rear', (-1.49,0,.515), (.15,1.20,.13), cream,.05)
box('Sill_L', (0,.765,.435), (.98,.065,.085), trim,.027)
box('Sill_R', (0,-.765,.435), (.98,.065,.085), trim,.027)


# ---------- Wheels: geometry along local Y, origin at axle center ----------
def lathe_y(name, profile, mat, parent, location=(0,0,0), count=20):
    verts = [(r*cos(2*pi*i/count),y,r*sin(2*pi*i/count))
             for y,r in profile for i in range(count)]
    faces = []
    for j in range(len(profile)-1):
        for i in range(count):
            faces.append((j*count+i,j*count+(i+1)%count,
                          (j+1)*count+(i+1)%count,(j+1)*count+i))
    faces += [tuple(reversed(range(count))),
              tuple((len(profile)-1)*count+i for i in range(count))]
    obj = mesh_object(name, verts, faces, mat, parent)
    obj.location = location
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices)==4
    return obj


for code,x,sign in [('FL',.94,1),('FR',.94,-1),('RL',-.94,1),('RR',-.94,-1)]:
    wheel = lathe_y('Wheel_'+code,
        [(-.135,.275),(-.11,.328),(-.065,.35),(.065,.35),(.11,.328),(.135,.275)],
        rubber,root,(x,sign*.755,.35))
    wheel['spin_axis'] = 'LOCAL_Y'
    # 左右とも同一ローカル軸。ハブはホイールの子として一緒に回転。
    for face, direction in [('Outer',sign),('Inner',-sign)]:
        hub = lathe_y('Hub_'+code+'_'+face,
            [(-.015,.215),(.015,.235),(.04,.207)],hubmat,wheel,
            (0,direction*.124,0))
        if direction < 0:
            hub.rotation_euler[0] = pi
    cap = lathe_y('Hubcap_'+code,[(-.01,.092),(.012,.10),(.029,.085)],mint,wheel,
                  (0,sign*.165,0),16)
    if sign < 0:
        cap.rotation_euler[0] = pi


# ---------- Bright studio; excluded from Car_Root ----------
mesh_object('Ground', [(-100,-100,-.007),(100,-100,-.007),
                       (100,100,-.007),(-100,100,-.007)],
            [(0,1,2,3)], ground_mat, None, True)
world = bpy.data.worlds.new('Cozy_Daylight')
scene.world = world
world.use_nodes = True
world.node_tree.nodes.get('Background').inputs['Color'].default_value = (.78,.87,1,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .55


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


for name, location, energy, size in [
        ('Key_Softbox',(1.8,-3.5,6),650,4.5),
        ('Fill_Softbox',(1,4,3.5),380,4),
        ('Rim_Softbox',(-4,-1,4.5),500,3.5)]:
    data = bpy.data.lights.new(name,'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name,data)
    studio_collection.objects.link(obj)
    obj.location = location
    aim(obj,(0,0,.7))
data = bpy.data.cameras.new('Camera')
camera = bpy.data.objects.new('Camera',data)
studio_collection.objects.link(camera)
camera.location = (4.7,-6.4,3.9)
aim(camera,(0,0,.83))
data.type = 'ORTHO'
data.ortho_scale = 4.75
scene.camera = camera
engines = scene.render.bl_rna.properties['engine'].enum_items.keys()
scene.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in engines else 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1100
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.render.image_settings.file_format = 'PNG'

# 起動時からカメラ構図・マテリアル色が見える。F12で照明を含めて確認。
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.shading.type = 'MATERIAL'
            area.spaces.active.shading.use_scene_world = True
            area.spaces.active.shading.use_scene_lights = True
bpy.ops.object.select_all(action='DESELECT')
for obj in car_collection.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root

# シーン内のカスタムプロパティに実数を記録。外部への保存はしない。
meshes = [o for o in car_collection.objects if o.type == 'MESH']
for obj in meshes:
    obj.data.calc_loop_triangles()
root['mesh_objects'] = len(meshes)
root['polygon_count'] = sum(len(o.data.polygons) for o in meshes)
root['triangle_count'] = sum(len(o.data.loop_triangles) for o in meshes)

# ============================================================================
# 1. 作成したオブジェクト一覧
# Car_Root
#   Body, Cabin_Frame, Roof, Windshield, Rear_Window
#   Side_Window_Front_L/R, Side_Window_Rear_L/R
#   Door_Handle_L/R, Mirror_L/R, Headlight_L/R, Taillight_L/R
#   Bumper_Front/Rear, Sill_L/R
#   Wheel_FL, Wheel_FR, Wheel_RL, Wheel_RR
#     各輪の子: Hub_<FL/FR/RL/RR>_Outer, Hub_<...>_Inner, Hubcap_<...>
# Studio（車の親階層の外）: Ground, Camera,
#   Key_Softbox, Fill_Softbox, Rim_Softbox
# Boolean用の一時オブジェクトは処理中にシーンから除去済み。
#
# 2. おおよそのポリゴン数
# Blender 5.2.1 LTSで車37メッシュ、3,294面 / 7,004三角形（約7千）。
# 正確な完成後の値は Car_Root のカスタムプロパティ
# polygon_count（四角面等を含む面数）と triangle_count（三角化後）に記録。
# 地面は1面 / 2三角形。Subdivision・画像テクスチャは使用しない。
# ベベルは適用済み。モディファイアなしで最終形状をGLBに渡せる。
#
# 3. Three.js 用 GLB 書き出しの注意点
# 実行後は車全体のみが選択状態。File > Export > glTF 2.0 から
# GLB形式、Selected Objectsを有効にして手動で書き出す。
# 選択を変えた場合は Car_Root と全子孫を再選択（親だけでは車体を含まない）。
# Studioは選択しない。MaterialsとNormalsを有効にし、+Y Upは既定のまま。
# このスクリプトには書き出し・ファイル保存処理は含まない。
#
# Wheel_* はタイヤ自体の独立メッシュで、原点は車軸中心。
# ハブ等はその子なのでタイヤと一緒に回る。車の移動はCar_Rootに適用。
# Blenderでは wheel.rotation_euler.y += angle で回転できる。
# GLBの座標変換によりローカル軸表現も変わり得るのでThree.jsで固定の
# rotation.yを決め打ちしない。読み込み直後、同じ親のWheel_FL/FRから
# 車軸方向を計算し、各輪のローカル座標に変換した軸を一度キャッシュする:
#   axle = FL.position.clone().sub(FR.position).normalize();
#   axis = axle.clone().applyQuaternion(wheel.quaternion.clone().invert());
#   // frame loop: wheel.rotateOnAxis(axis, angleDelta);
# 全輪の親はCar_Root、scaleは1。実際の進行方向に合わせて回転の符号を選ぶ。
# タイヤ半径は0.35mなので回転角[rad] = 移動距離[m] / 0.35。
# 窓は不透明で、透過描画順の問題・内装・屈折処理を不要にしている。
# 各部はPrincipled BSDFの単純な色・粗さで表現。GLBはEeveeの照明、
# WorldやAgXの見え方を再現しないため、Three.js側でも柔らかい環境光、
# 色管理とトーンマッピングを設定する。影の解像度はスマホに合わせて抑える。
# ============================================================================
