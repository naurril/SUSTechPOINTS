

import argparse
import os
import re
from PIL import Image
import pypcd.pypcd as pypcd
import numpy as np
from utils import proj_pts3d_to_img, SuscapeScene
#import open3d as o3d

parser = argparse.ArgumentParser(description='extract 3d object')        
parser.add_argument('data', type=str, help="")
parser.add_argument('--lidar', type=str, help="")
parser.add_argument('--scenes', type=str, default=".*", help="")
parser.add_argument('--output', type=str, default='./output', help="")
parser.add_argument('--frames', type=str, default='.*', help="")
parser.add_argument('--camera_type', type=str, default='camera', help="")
parser.add_argument('--cameras', type=str, default='rear,rear_left,rear_right,front_left,front_right,front', help="") # order matters
parser.add_argument('--output_format', type=str, default='pcd', choices=['pcd', 'bin'], help="")
parser.add_argument('--camera_channels', type=int, default=3, help="")
parser.set_defaults(overwrite=True)
parser.add_argument('--overwrite', action='store_true')
parser.add_argument('--no-overwrite', dest='overwrite', action='store_false')
parser.add_argument('--masks', type=str, default='.*', help="")

args = parser.parse_args()



camera_masks = {}
def prepare_camera_masks():
    for f in os.listdir(args.masks):
        if not f.endswith('.png'):
            continue
        m = os.path.splitext(f)[0]
        if not m:
            continue
        mask = np.array(Image.open(os.path.join(args.masks, f)))
        mask = (mask ==0 ).astype(np.uint8)
        mask = np.expand_dims(mask, axis=2)
        camera_masks[m] = mask

if args.masks != '':
    prepare_camera_masks()

def write_bin(data, color, file):
    
    data = data.astype(np.float32)
    color = (color/256.0).astype(np.float32)

    d = np.concatenate((data, color), axis=1).astype(np.float32)
    d.tofile(file)

def write_colored_pcd(data, color, file):

    if args.camera_channels == 1:
        color = (color[:,0] * 0x100  + (255-color[:,0]))*0x100 + color[:,0]
    else:
        color = (color[:,0] * 0x100  + color[:,1])*0x100 + color[:,2]

    data = data[:,0:4] # x,y,z,intensity
    data = data.astype(np.float32)
    color = color.astype(np.int32)

    size = data.shape[0]

    with open(file, 'wb') as f:
        header = f"""# .PCD v.7 - Point Cloud Data file format
VERSION .7
FIELDS x y z intensity rgb
SIZE 4 4 4 4 4
TYPE F F F F I
COUNT 1 1 1 1 1
WIDTH {size}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS {size}
DATA binary
"""
        
        # regular_array = d.view(np.ndarray)
        # regular_array.tofile(f)
        f.write(header.encode('utf-8'))
        for i,d in enumerate(data): 
            f.write(d.tobytes())
            f.write(color[i].tobytes())
      


def prepare_dir(dir):
    if not os.path.exists(dir):
        os.makedirs(dir)

    
def color_frame(sc, frame, file):

    data = sc.read_lidar(frame)
    pts = data[:,0:3]
    color = np.zeros((pts.shape[0], args.camera_channels))
    color = color.astype(np.int32)

    if not args.camera_type == '':
        for camera in args.cameras.split(','):
            (extrinsic,intrinsic) = sc.get_calib_for_frame(args.camera_type, camera, frame)
            
            img_path = os.path.join(sc.scene_path, args.camera_type, camera, frame+sc.meta[args.camera_type][camera]['ext'])
            if os.path.exists(img_path):
                img = Image.open(img_path)
                img = np.asarray(img)      
                if camera_masks[camera] is not None:
                    img = img * camera_masks[camera]
                imgpts, filter_in_frontview = proj_pts3d_to_img(pts, extrinsic, intrinsic)

                imgpts = imgpts[:,0:2]

                height, width,_ = img.shape
                filter_inside_img = (imgpts[:,0] >= 0) & (imgpts[:,0] < width) & (imgpts[:,1] >= 0) & (imgpts[:,1] < height)
                filter_img = filter_in_frontview & filter_inside_img
                imgpts = imgpts[filter_img]

                imgpts = np.floor(imgpts).astype(np.int64)
                pts_color = img[imgpts[:,1],imgpts[:,0],:]


                pts_color = pts_color[:, 0:args.camera_channels]
                #pts_color = (pts_color[:,0] * 0x100  + pts_color[:,1])*0x100 + pts_color[:,2]

                color[filter_img] = pts_color
    
    #color = color.astype(np.float32)

    if args.output_format == 'pcd':
        write_colored_pcd(data, color, file)
    elif args.output_format == 'bin':
        write_bin(data, color, file)


def proc_scene(scene_name):
    """process a scene"""
    sc = SuscapeScene(args.data, scene_name, lidar=args.lidar)

    prepare_dir(os.path.join(args.output, scene_name, 'lidar'))

    for frame in sc.meta['frames']:
        if re.fullmatch(args.frames, frame):
            file = os.path.join(args.output, scene_name, 'lidar', frame+'.' + args.output_format)
            if not os.path.exists(file) or args.overwrite:
                color_frame(sc, frame, file)
    

scenes = os.listdir(args.data)
scenes.sort()
for s in scenes:
    if re.fullmatch(args.scenes, s):
        print('processing', s)
        proc_scene(s)