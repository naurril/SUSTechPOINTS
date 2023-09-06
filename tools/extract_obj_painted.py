

import argparse
import os
import re
from PIL import Image
import pypcd.pypcd as pypcd
import numpy as np
import json
import open3d as o3d
from utils import color_obj_by_image, choose_best_camera_for_obj, box_position, SuscapeScene

parser = argparse.ArgumentParser(description='extract 3d object')        
parser.add_argument('data', type=str, help="")
parser.add_argument('--scenes', type=str, default=".*", help="")
parser.add_argument('--objids', type=str, default=".*", help="")
parser.add_argument('--output', type=str, default='./output', help="")
parser.add_argument('--frames', type=str, default='.*', help="")
parser.add_argument('--camera_type', type=str, default='camera', help="")
parser.add_argument('--cameras', type=str, default='front,front_right,front_left,rear_left,rear_right', help="")
parser.add_argument('--range', type=float, default=20, help="")
parser.add_argument('--ground_level', type=float, default=0, help="")

parser.set_defaults(mirror=False)
parser.add_argument('--mirror', action='store_true')
parser.add_argument('--no-mirror', dest='mirror', action='store_false')

parser.set_defaults(saveall=False)
parser.add_argument('--saveall', action='store_true')
parser.add_argument('--no-saveall', dest='saveall', action='store_false')

parser.set_defaults(register=True)
parser.add_argument('--register', action='store_true')
parser.add_argument('--no-register', dest='register', action='store_false')

args = parser.parse_args()


def write_color_pcd(pts, color, file):

    size = pts.shape[0]
    color = color.astype(np.int32)
    c = (color[:,0] * 0x100  + color[:,1])*0x100 + color[:,2]
    with open(file, 'w') as f:
        f.write(f"""# .PCD v.7 - Point Cloud Data file format
VERSION .7
FIELDS x y z rgb
SIZE 4 4 4 4
TYPE F F F I
COUNT 1 1 1 1
WIDTH {size}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS {size}
DATA ascii
""")
        for i,p in enumerate(pts): 
            f.write(f'{p[0]} {p[1]} {p[2]} {c[i]}\n')     
      

def obj_distance(obj):
    p = box_position(obj['psr'])
    return np.sqrt(np.sum(p*p))




def read_label(scene, frame):
    label_3d_file = os.path.join(scene, 'label', frame+".json")
    if not os.path.exists(label_3d_file):
        print("label3d for", frame, 'does not exist')
        return []

    with open(label_3d_file) as f:
        try:
            label_3d = json.load(f)
        except:
            print("error loading", label_3d_file)
            raise

    boxes = label_3d
    if 'objs' in boxes:
        boxes = boxes['objs']
    
    return boxes


def find_obj_by_id(boxes, id):
    for b in boxes:
        if b['obj_id']==id:
            return b
    return None



def proc_frame(sc, frame, id, output_path=None):
    
    boxes = sc.get_boxes_by_frame(frame)

    b = find_obj_by_id(boxes, id)
    if not b:
        return None,None
    
    dist = int(obj_distance(b))
    if dist > args.range:
        #print('box too far away')
        return None,None

    camera = choose_best_camera_for_obj(b, sc.scene_path, sc.meta, args.camera_type, args.cameras.split(','), frame)

    #print(f'best camera: {camera}')

    (extrinsic,intrinsic) = sc.get_calib_for_frame(args.camera_type, camera, frame)
    
    img = Image.open(os.path.join(sc.scene_path, args.camera_type, camera, frame+sc.meta[args.camera_type][camera]['ext']))
    img = np.asarray(img)

    pts = sc.read_lidar(frame)[:, 0:3]
    pts,color,whole = color_obj_by_image(pts, b, img, extrinsic, intrinsic, args.ground_level)

    #print(f'points number in image: {pts.shape[0]}, whole {whole}')

    if pts.shape[0]  and whole:

        if output_path:
            
            if not os.path.exists(output_path):
                os.makedirs(output_path)

            file = f"{id}-{frame}-{camera}-{dist}.pcd"
            write_color_pcd(pts, color, os.path.join(output_path, file))
            print(f'write {file}, {pts.shape[0]} points')


        return pts,color

    return None,None

def register_2_point_clouds(source, target):
    """register 2 point clouds using ICP-color """
    voxel_radius = [0.2, 0.1, 0.05]
    max_iter = [50, 30, 14]
    current_transformation = np.identity(4)

    try:
        for scale in range(3):
            iter = max_iter[scale]
            radius = voxel_radius[scale]
            # print([iter, radius, scale])

            # print("3-1. Downsample with a voxel size %.2f" % radius)
            source_down = source.voxel_down_sample(radius)
            target_down = target.voxel_down_sample(radius)

            # print("3-2. Estimate normal.")
            source_down.estimate_normals(
                o3d.geometry.KDTreeSearchParamHybrid(radius=radius * 2, max_nn=30))
            target_down.estimate_normals(
                o3d.geometry.KDTreeSearchParamHybrid(radius=radius * 2, max_nn=30))

            # print("3-3. Applying colored point cloud registration")
            result_icp = o3d.pipelines.registration.registration_colored_icp(
                source_down, target_down, radius, current_transformation,
                o3d.pipelines.registration.TransformationEstimationForColoredICP(),
                o3d.pipelines.registration.ICPConvergenceCriteria(relative_fitness=1e-6,
                                                                relative_rmse=1e-6,
                                                                max_iteration=iter))
            current_transformation = result_icp.transformation
        
        # print(result_icp)
        return current_transformation
    except:
        print('icp failed, give up')
        return np.identity(4)

def register_point_clouds(allpts, allcolors):
    """register all point clouds to the first one"""
    pcs=[]
    for p,c in zip(allpts, allcolors):
        pc = o3d.geometry.PointCloud()
        pc.points = o3d.utility.Vector3dVector(p)
        pc.colors = o3d.utility.Vector3dVector(c/256)

        pcs.append(pc)

    # o3d.visualization.draw_geometries(pcs)

    target = pcs[0]

    for pc in pcs:
        if not pc == target:
            trans = register_2_point_clouds(pc, target)
            pc.transform(trans)

    # o3d.visualization.draw_geometries(pcs)

    return pcs


def combine_and_save(all_pts, all_color, file):
    """combine all points and color and save to file"""
    pts = np.concatenate(all_pts, axis=0)
    color = np.concatenate(all_color, axis=0)
    # mirror the object
    if args.mirror:
        mirrored_pts = pts * np.array([1, -1, 1])
        pts = np.concatenate([pts, mirrored_pts], axis=0)
        color = np.concatenate([color, color], axis=0)

    write_color_pcd(pts, color, file)
    print(f'write {file}, {pts.shape[0]} points')
    

def proc_scene(scene_name):
    """process a scene"""
    sc = SuscapeScene(args.data, scene_name)

    
    all_objids = sc.list_objs()

    output_path = os.path.join(args.output, scene_name, 'lidar')
    if not os.path.exists(output_path):
        os.makedirs(output_path)

    for id,objtype in all_objids:
        if not re.fullmatch(args.objids, str(id)):
            continue

        candidate_frames = sc.meta['frames']
        candidate_frames = list(filter(lambda f: re.fullmatch(args.frames, f), candidate_frames))

        candidate_boxes = {}
        for frame in candidate_frames:                
            box = sc.find_box_in_frame(frame, id)
            if box is None:
                continue
            if obj_distance(box) > args.range:
                continue
            candidate_boxes[frame] = box
        

        all_pts=[]
        all_color=[]

        for frame in candidate_boxes.keys():
                pts,color = proc_frame(sc, frame, id, output_path if args.saveall else None)
                if pts is not None:
                    all_pts.append(pts)
                    all_color.append(color)
                
        if len(all_pts) > 0:
            combine_and_save(all_pts, all_color, os.path.join(output_path, f"{id}-{objtype}_cmb.pcd"))

            registered = register_point_clouds(all_pts, all_color)
            all_pts = list(map(lambda p: np.asarray(p.points), registered))
            all_color = list(map(lambda p: (np.asarray(p.colors)*256).astype(np.int8), registered))

            combine_and_save(all_pts, all_color, os.path.join(output_path, f"{id}-{objtype}_reg.pcd"))

scenes = os.listdir(args.data)

for s in scenes:
    if re.fullmatch(args.scenes, s):
        print('processing', s)
        proc_scene(s)