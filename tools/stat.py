# this file computes statistics of the datasets

import os
import json

stat_scenes = [
    'sustechscapes-mini-dataset',
    '20200411-2hz',
    'ruby_ruby144_shizilukou_1200529160951'
]


def stat_scene(scene):
    

    stat = {}
    label_folder = os.path.join("./data", scene, "label")
    label_files  = os.listdir(label_folder)
    
    for file in label_files:
        if os.path.splitext(file)[1] != '.json':
            continue

        with open(os.path.join(label_folder, file)) as f:
            labels = json.load(f)
        
        for l in labels:
            #color = get_color(l["obj_id"])
            obj_type = l["obj_type"]
            if stat.get(obj_type):
                stat[obj_type] =  stat[obj_type] + 1
            else:
                stat[obj_type] = 1

    return stat

if __name__=="__main__":
    for s in stat_scenes:
        print("stat {}".format(s))
        stat = stat_scene(s)
        print(stat)