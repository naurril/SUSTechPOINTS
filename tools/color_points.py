

import argparse
import os
import re
from PIL import Image
import pypcd.pypcd as pypcd
import numpy as np
from utils import proj_pts3d_to_img, SuscapeScene

parser = argparse.ArgumentParser(description='extract 3d object')        
parser.add_argument('data', type=str, help="")
parser.add_argument('--scenes', type=str, default=".*", help="")
parser.add_argument('--output', type=str, default='./output', help="")
parser.add_argument('--frames', type=str, default='.*', help="")
parser.add_argument('--camera_type', type=str, default='camera', help="")
parser.add_argument('--cameras', type=str, default='front,front_right,front_left,rear_left,rear_right', help="")

args = parser.parse_args()


def write_colored_pcd(data, color, file):

    size = data.shape[0]

    with open(file, 'w') as f:
        f.write(f"""# .PCD v.7 - Point Cloud Data file format
VERSION .7
FIELDS x y z intensity rgb
SIZE 4 4 4 4 4
TYPE F F F F I
COUNT 1 1 1 1 1
WIDTH {size}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS {size}
DATA ascii
""")
        for i,d in enumerate(data): 
            f.write(f'{d[0]} {d[1]} {d[2]} {d[3]} {color[i]}\n')     
      



    
def color_frame(sc, frame, file):

    data = sc.read_lidar(frame)
    pts = data[:,0:3]
    color = np.zeros((pts.shape[0]))
    color = color.astype(np.int32)

    for camera in ['rear', 'rear_left','rear_right', 'front_left', 'front_right', 'front']:
        (extrinsic,intrinsic) = sc.get_calib_for_frame(args.camera_type, camera, frame)
        
        img = Image.open(os.path.join(sc.scene_path, args.camera_type, camera, frame+sc.meta[args.camera_type][camera]['ext']))
        img = np.asarray(img)      
        imgpts, filter_in_frontview = proj_pts3d_to_img(pts, extrinsic, intrinsic)

        imgpts = imgpts.astype(np.int32)[:,0:2]

        height, width,_ = img.shape
        filter_inside_img = (imgpts[:,0] >= 0) & (imgpts[:,0] < width) & (imgpts[:,1] >= 0) & (imgpts[:,1] < height)
        filter_img = filter_in_frontview & filter_inside_img
        imgpts = imgpts[filter_img]
        pts_color = img[imgpts[:,1],imgpts[:,0],:]
        pts_color = pts_color.astype(np.int32)
        pts_color = (pts_color[:,0] * 0x100  + pts_color[:,1])*0x100 + pts_color[:,2]

        color[filter_img] = pts_color
    
    color = color.astype(np.int32)
    write_colored_pcd(data, color, file)


def proc_scene(scene_name):
    """process a scene"""
    sc = SuscapeScene(args.data, scene_name)

    for frame in sc.meta['frames']:
        color_frame(sc, frame, os.path.join(args.output, scene_name, 'lidar', frame+'.pcd'))
    



scenes = os.listdir(args.data)

for s in scenes:
    if re.fullmatch(args.scenes, s):
        print('processing', s)
        proc_scene(s)