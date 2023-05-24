

import argparse
import os
import re
from PIL import Image
import pypcd.pypcd as pypcd
import numpy as np
import json
from utils import color_obj_by_image, read_scene_meta, get_calib_for_frame

parser = argparse.ArgumentParser(description='extract 3d object')        
parser.add_argument('data', type=str, help="")
parser.add_argument('scene', type=str, help="")
parser.add_argument('objid', type=str, help="")
parser.add_argument('--output', type=str, default='./', help="")
parser.add_argument('--frames', type=str, default='.*', help="")
parser.add_argument('--camera_type', type=str, default='camera', help="")
parser.add_argument('--camera', type=str, default='front', help="")


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
TYPE F F F F
COUNT 1 1 1 1
WIDTH {size}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS {size}
DATA ascii
""")
        for i,p in enumerate(pts): 
            f.write(f'{p[0]} {p[1]} {p[2]} {c[i]}\n')     
      
def proc_frame(scene, meta, frame):
    label_3d_file = os.path.join(args.data, scene, 'label', frame+".json")
    if not os.path.exists(label_3d_file):
        print("label3d for", frame, 'does not exist')
        return

    # load lidar points
    lidar_file = os.path.join(args.data, scene, 'lidar', frame+".pcd")
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
            raise

    boxes = label_3d
    if 'objs' in boxes:
        boxes = boxes['objs']

    for b in boxes:
        if b['obj_id']==args.objid:
            # found it!
            # load image
            (extrinsic,intrinsic) = get_calib_for_frame(scene, meta, args.camera_type, args.camera, frame)
            
            img = Image.open(os.path.join(args.data, scene, args.camera_type, args.camera, frame+meta[args.camera_type][args.camera]['ext']))
            img = np.asarray(img)
            pts,color = color_obj_by_image(pts, b, img, extrinsic, intrinsic)

            write_color_pcd(pts, color, 'output.pcd')
            print(pts.shape, color.shape)

meta = read_scene_meta(os.path.join(args.data, args.scene))
for frame in meta['frames']:
    if re.fullmatch(args.frames, frame):
        proc_frame(args.scene, meta, frame)