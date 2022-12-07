import os
import json
import argparse
import re
import sys
from PIL import Image, ImageDraw


parser = argparse.ArgumentParser(description='check fusion labels')        
parser.add_argument('--data', type=str,default='./data', help="")
parser.add_argument('--scenes', type=str,default='.*', help="")
parser.add_argument('--frames', type=str,default='.*', help="")
parser.add_argument('--camera_types', type=str,default='camera|aux_camera', help="")
parser.add_argument('--cameras', type=str,default='front', help="")
parser.add_argument('--img_ext', type=str,default='.jpg', help="")

args = parser.parse_args()


class FusionLabelChecker:
    def __init__(self, path, check_frames=".*"):
        self.path = path
        self.check_frames = check_frames
        self.meta = self.read_scene_meta(path)
        self.messages = []
        
    def clear_messages(self):
        self.messages = []
    def show_messages(self):
        print(len(self.messages), 'messages')
        for m in self.messages:
            print(m["frame_id"], m["obj_id"], m['camera_type'], m['camera'], m["desc"])

    def push_message(self, frame, obj_id, obj_type, camera_type, camera, desc):
        self.messages.append({
            "frame_id": frame,
            "obj_id": obj_id,
            "obj_type": obj_type,
            "camera_type": camera_type,
            "camera": camera,
            "desc": desc
        })
            
    def read_scene_meta(self, scene):
        meta = {}

        frames = os.listdir(os.path.join(scene, 'lidar'))
        frames = [*map(lambda f: os.path.splitext(f)[0], frames)]
        frames.sort()
        meta['frames'] = frames

        for camera_type in ['camera', 'aux_camera']:
            if os.path.exists(os.path.join(scene, camera_type)):
                meta[camera_type] = {}
                for c in os.listdir(os.path.join(scene, camera_type)):
                    any_file = os.listdir(os.path.join(scene, camera_type, c))[0]
                    img = Image.open(os.path.join(scene, camera_type, c, any_file))
                    meta[camera_type][c] = {
                        'width': img.width,
                        'height': img.height,
                        'ext': os.path.splitext(any_file)[1]
                    }

        meta['calib'] = {}
        for camera_type in ['camera',  'aux_camera']:        
            for camera in meta[camera_type]:
                meta['calib'][camera_type] = {}
                for camera in meta[camera_type]:
                    with open(os.path.join(scene, 'calib', camera_type, camera+".json")) as f:
                        meta['calib'][camera_type][camera] = json.load(f)

        return meta

    def load_3d_labels(self, f):
        with open(os.path.join(self.path, 'label', f+".json")) as fin:
            return json.load(fin)


    def proc_one_camera(self, f, camera_type, camera):
        #print(s,f,camera_type, camera)
        #img = Image.open(os.path.join(self.path, camera_type, camera, f+args.img_ext))
        #print(img.width, img.height)

        img = self.meta[camera_type][camera]

        label_file = os.path.join(self.path, 'label_fusion', camera_type, camera, f+".json")
        if not os.path.exists(label_file):
            return

        with open(label_file) as fin:
            try:
                label = json.load(fin)
            except:
                print("load json failed", label_file)

        
        
        #check_labels

        #print(label)
        # 'objs': [{'annotator': '3dbox', 'obj_id': '6', 'obj_type': 'Car', 'rect': {'x1': 1920.9597430793783, 'y1': 839.354555465397, 'x2': 2047.9797637833412, 'y2': 1089.209268081789}}]}
        for o in label['objs']:
            if o['rect']['x1'] < 0 or o['rect']['y1'] < 0 or o['rect']['x2'] > img['width'] or o['rect']['y2'] > img['height']:
                self.push_message(f, o['obj_id'], o['obj_type'], camera_type, camera,  'rect exceeds img dimension')

    def proc_frame(self, f):

        #labels_3d = self.load_3d_labels(f)
        #print(labels_3)
        print('checking 2d labels', f)

        for c in self.meta['camera']:
            self.proc_one_camera(f, 'camera', c)

        for c in self.meta['aux_camera']:
            self.proc_one_camera(f, 'aux_camera', c)


    def proc_scene(self):
        for f in self.meta['frames']:
            if re.fullmatch(self.check_frames, f):
                self.proc_frame(f)

    def check(self):
        self.proc_scene()
    
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
        

        checker = FusionLabelChecker(os.path.join(data, s), args.frames)
        
        checker.proc_scene()
        checker.show_messages()
