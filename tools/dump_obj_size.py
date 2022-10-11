import os
import json


root_dir = "/home/lie/nas/suscape_scenes"
scenes = os.listdir(root_dir)
scenes.sort()
for scene in scenes[800:]:
    lidars = os.listdir(os.path.join(root_dir, scene, 'lidar'))
    lidars.sort()
    for lidar in lidars:
        frame = os.path.splitext(lidar)[0]
        if os.path.exists(os.path.join(root_dir,scene,'label',frame+".json")):
            #print(scene, frame)
            with open(os.path.join(root_dir,scene,'label',frame+".json")) as f:
                label = json.load(f)
                if 'objs' in label:
                    label = label['objs']

                for obj in label:
                    print(scene, frame,  obj['obj_type'], obj['psr']['scale']['x'], obj['psr']['scale']['y'], obj['psr']['scale']['z'], )