import os
import json
import argparse
import re
import sys

parser = argparse.ArgumentParser(description='check fusion labels')        
parser.add_argument('--data', type=str,default='./data', help="")
parser.add_argument('--scenes', type=str,default='.*', help="")
args = parser.parse_args()




def load_3d_labels(s, f):
    with open(os.path.join(s, 'label', f+".json")) as fin:
        return json.load(fin)


def proc_frame(s, f):

    labels_3d = load_3d_labels(s, f)



def proc_scene(scene):
    for f in frames:
        frame = os.path.splitext(f)[0]
        proc_frame(scene, frame)



def read_scene_meta(scene):
    meta = {}

    frames = os.listdir(os.path.join(scene, 'lidar'))
    frames = [*map(lambda f: os.path.splitext(f)[0], frames)]
    frames.sort()
    meta['frames'] = frames

    meta['camera'] = {}
    meta['camera']['camera'] = os.listdir(os.path.join(scene, 'camera'))
    meta['camera']['aux_camera'] = os.listdir(os.path.join(scene, 'aux_camera'))

    meta['calib'] = {}
    for camera_type in meta['camera']:
        meta['calib'][camera_type] = {}
        for camera in meta['camera'][camera_type]:
            with open(os.path.join(scene, 'calib', camera_type, camera+".json")) as f:
                meta['calib'][camera_type][camera] = json.load(f)

    return meta

if __name__ == "__main__":
    data = args.data

    scenes = os.listdir(data)
    scenes.sort()

    for s in scenes:
        if not re.fullmatch(args.scenes, s):
            continue
        
        scene_path = os.path.join(data, s)
        if not os.path.isdir(scene_path):
            continue
        print()
        print(s)
        meta = read_scene_meta(os.path.join(data, s))
        json.dump(meta, sys.stdout, indent=2)
        #proc_scene(os.path.join(data, s))

