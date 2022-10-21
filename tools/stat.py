# this file computes statistics of the datasets

from genericpath import isfile
import os
import json


stat = {}
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
                if stat.get(obj_type):
                    stat[obj_type] =  stat[obj_type] + 1
                else:
                    stat[obj_type] = 1

    return stat

if __name__=="__main__":
    for s in os.listdir("./"):
        if os.path.isdir(s):
            print("stat {}".format(s))
            stat = stat_scene(s)
    for x in stat:
        print(x, stat[x])