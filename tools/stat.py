# this file computes statistics of the datasets

from genericpath import isfile
import os
import json


obj_type_stat = {}
track_stat = {}
def stat_scene(scene):
    
    label_folder = os.path.join("./", scene, "label")
    label_files  = os.listdir(label_folder)
    
    for file in label_files:
        if os.path.splitext(file)[1] != '.json':
            continue

        objs = []
        
        if not os.path.exists(os.path.join(label_folder, file)):
            continue

        with open(os.path.join(label_folder, file)) as f:
            labels = json.load(f)

            if "objs" in labels:
                objs = labels['objs']
            else:
                objs = labels

            
        for l in objs:
            #color = get_color(l["obj_id"])
            obj_type = l["obj_type"]
            if obj_type in obj_type_stat:
                obj_type_stat[obj_type] += 1
            else:
                obj_type_stat[obj_type] = 1
            
            obj_track = scene+"-"+l['obj_id']
            if obj_track in track_stat:
                track_stat[obj_track] += 1
            else:
                track_stat[obj_track] = 1

    return obj_type_stat

if __name__=="__main__":
    for s in os.listdir("./"):
        if os.path.isdir(s):
            print("scan {}".format(s))
            obj_type_stat = stat_scene(s)
    for x in obj_type_stat:
        print(x, obj_type_stat[x])

    for x in track_stat:
        print(x, track_stat[x])