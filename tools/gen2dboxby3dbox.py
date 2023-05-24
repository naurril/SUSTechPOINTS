





import os
import json
import numpy as np
import pypcd.pypcd as pypcd
import argparse
import re
from utils import proj_pts3d_to_img, read_scene_meta, get_calib_for_frame, gen_2dbox_for_obj_pts, crop_pts, gen_2dbox_for_obj_corners

parser = argparse.ArgumentParser(description='generate 2d boxes by 3d boxes')        
parser.add_argument('data_folder', type=str, default='./data', help="")
parser.add_argument('--scenes', type=str, default='.*', help="")
parser.add_argument('--frames', type=str, default='.*', help="")
parser.add_argument('--camera_types', type=str, default='aux_camera', help="")
parser.add_argument('--camera_names', type=str, default='front', help="")
parser.add_argument('--force_overwrite', type=str, default='no', help="")

parser.add_argument('--mkdirs', type=str, default='no', help="")

args = parser.parse_args()



all_scenes = os.listdir(args.data_folder)
scenes = list(filter(lambda s: re.fullmatch(args.scenes, s), all_scenes))
scenes.sort()
#print(list(scenes))


data_folder = args.data_folder
camera_types  = args.camera_types.split(",")
camera_names  = args.camera_names.split(",")

def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)


def gen_2dbox_for_frame_camera(scene, meta, frame, camera_type, camera, extrinsic, intrinsic, objs):

    #print(camera_type, camera)

    kept_objs = []
    annotated_objs = []
    label = {}

    label2d_file = os.path.join(data_folder, scene, 'label_fusion', camera_type, camera, frame+".json")
    

    if os.path.exists(label2d_file):
        with open(label2d_file) as f:
            try:
                label = json.load(f)
                kept_objs = list(filter(lambda x: (not 'annotator' in x ) or (x['annotator'] != '3dbox' and x['annotator'] != 'corners'), label['objs']))
                annotated_objs = label['objs']                
                # if "version" in label and label['version'] == 1 and args.force_overwrite == 'no':
                #     print("dont overwrite", scene, frame, camera_type, camera)
                #     return 
            except :
                print(scene, frame, camera_type, camera, 'load json FAILED!')
                label = {
                    'cameraType': camera_type,
                    'cameraName': camera,
                    'scene': scene,
                    'frame': frame,
                    'objs': []
                }
            
    else:
        label = {
            'cameraType': camera_type,
            'cameraName': camera,
            'scene': scene,
            'frame': frame,
            'objs': []
        }

    #print(len(label['objs']), 'manual boxes')
    for o in objs:

        # if the obj exists, dont' generate again.
        found_in_kept_objs = None
        for l in kept_objs:
            if ('obj_id' in l) and str(l['obj_id']) == str(o['box3d']['obj_id']):
                found_in_kept_objs = l
                break
        # manually anotated 2d-rectange.dont overwrite.
        if found_in_kept_objs is not None:
            continue
        
        anno_type = '3dbox'
        for l in annotated_objs:
            if ('obj_id' in l) and str(l['obj_id']) == str(o['box3d']['obj_id']):
                if 'annotator' in l:
                    anno_type = l['annotator']
                break

        if anno_type != '3dbox' and anno_type != 'corners':
            print("unknonwn anno type", anno_type)
            continue

        if anno_type == '3dbox':
            rect = gen_2dbox_for_obj_pts(o['pts'], extrinsic, intrinsic, meta[camera_type][camera]['width'], meta[camera_type][camera]['height'])
        else:
            rect = gen_2dbox_for_obj_corners(o['box3d'], extrinsic, intrinsic, meta[camera_type][camera]['width'], meta[camera_type][camera]['height'])

        if rect:
            obj = {
                "annotator": anno_type,                        
                "obj_id": o['box3d']['obj_id'],
                "obj_type": o['box3d']['obj_type'],                
                "rect": rect,
            }
            
            if 'obj_attr' in o['box3d']:
                obj['obj_attr'] = o['box3d']['obj_attr']
            
            kept_objs.append(obj)

    
    label['objs'] = kept_objs
    with open(label2d_file, 'w') as f:
        json.dump(label,f,indent=2)

def proc_frame(scene, meta, frame):

    #print(frame)

    # load 3d boxes
    label_3d_file = os.path.join(data_folder, scene, 'label', frame+".json")
    if not os.path.exists(label_3d_file):
        print("label3d for", frame, 'does not exist')
        return

    # load lidar points
    lidar_file = os.path.join(data_folder, scene, 'lidar', frame+".pcd")
    pc = pypcd.PointCloud.from_path(lidar_file)
    
    pts =  np.stack([pc.pc_data['x'], 
                    pc.pc_data['y'], 
                    pc.pc_data['z']],
                    axis=-1)
    pts = pts[(pts[:,0]!=0) | (pts[:,1]!=0) | (pts[:,2]!=0)]
    #print(pts.shape)

    with open(label_3d_file) as f:
        try:
            label_3d = json.load(f)
        except:
            print("error loading", label_3d_file)
            return

    boxes = label_3d
    if 'objs' in boxes:
        boxes = boxes['objs']
    
    #print(len(boxes), 'boxes')
    
    objs = list(map(lambda b: {'pts':crop_pts(pts, b), 'box3d': b}, boxes))

    for camera_type in camera_types:
        for camera in camera_names:
            (extrinsic,intrinsic) = get_calib_for_frame(scene, meta, camera_type, camera, frame)
            gen_2dbox_for_frame_camera(scene, meta, frame, camera_type, camera, extrinsic, intrinsic, objs)
            




def gen_2dbox_for_one_scene(scene):
    print(scene)

    if args.mkdirs == 'yes': 
        for camera_type in camera_types:
            for camera in camera_names:
                prepare_dirs(os.path.join(data_folder, scene, 'label_fusion', camera_type, camera))

    meta = read_scene_meta(os.path.join(data_folder, scene))
   
    for frame in meta['frames']:
        if re.fullmatch(args.frames, frame):
            proc_frame(scene, meta, frame)


for s in scenes:
    gen_2dbox_for_one_scene(s)
