

import os
import json
import argparse
import re


parser = argparse.ArgumentParser(description='start web server for SUSTech POINTS')        
parser.add_argument('src_folder', type=str, default='./data', help="")
parser.add_argument('dst_folder', type=str, default='./ir_dataset', help="")
parser.add_argument('--scenes', type=str, default='.*', help="")
parser.add_argument('--camera_types', type=str, default='aux_camera', help="")
parser.add_argument('--camera_names', type=str, default='front', help="")
parser.add_argument('--prefix_camera_name', type=str, default='yes', help="")

args = parser.parse_args()

all_scenes = os.listdir(args.src_folder)
scenes = list(filter(lambda s: re.fullmatch(args.scenes, s), all_scenes))
scenes.sort()


src_folder = args.src_folder
dst_folder = args.dst_folder
camera_types  = args.camera_types.split(",")
camera_names  = args.camera_names.split(",")


if not os.path.exists(os.path.join(dst_folder, 'labels')):
    os.makedirs(os.path.join(dst_folder, 'labels'))
if not os.path.exists(os.path.join(dst_folder, 'images')):
    os.makedirs(os.path.join(dst_folder, 'images'))


saved_cwd = os.getcwd()
for scene in scenes:
    for camera_type in camera_types:
        for camera in camera_names:
            yolo_folder = os.path.abspath(os.path.join(src_folder, scene, 'label_fusion_yolo', camera_type, camera))
            if not os.path.exists(yolo_folder):
                continue
            

            files = os.listdir(yolo_folder)
            files.sort()

            for fname in files:
                frame = os.path.splitext(fname)[0]

                image_file = os.path.abspath(os.path.join(src_folder, scene, camera_type, camera, frame+".jpg"))
                if not os.path.exists(image_file):
                    continue

                os.chdir(os.path.join(dst_folder, 'images'))
                image_file_relpath = os.path.relpath(image_file)
                os.system('ln -s -f {} {}'.format(image_file_relpath, camera_type+'_'+camera+'_'+frame+".jpg"))

                os.chdir(saved_cwd)

                os.chdir(os.path.join(dst_folder, 'labels'))
                label_file_relpath = os.path.relpath(os.path.join(yolo_folder, fname))
                label_ext = os.path.splitext(fname)[1]
                os.system('ln -s -f {} {}'.format(label_file_relpath, camera_type+'_'+camera+'_'+fname))

                os.chdir(saved_cwd)


               

            
    
