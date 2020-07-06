# -*- coding:utf-8 -*-

'''
Date:2020.07.03
author: tim
describe: this script is used for transform the other label format(some giver dataset) to the format of ourselves
'''

import os
import json

labelothersPath = "/home/liu/work/dataset/RS_datasets_test" # your original label file path

othersFolderNameList = os.listdir(labelothersPath)

for name in othersFolderNameList:

    labelothersNameList = os.listdir(os.path.join(labelothersPath,name,"label"))
    for labelFileName in labelothersNameList:
        labelInfoNew = []
        labelTransedPath = os.path.join(labelothersPath,name,"label_transed")
        if not os.path.exists(labelTransedPath):
            os.makedirs(labelTransedPath)
        with open(os.path.join(labelothersPath,name,"label",labelFileName),'r',encoding='utf8') as fp:
           # labelInfo = {'labels':[
           # {"centers":{'x':float,"y":float,"z":float},# for ours position
           #  "size":{'x':float,'y':float,'z'：float}, # for ours scale
           #  "rotation":{"pitch":float,"roll":float,"yaw":float}, # for ours rotation
           #  "tracker_id" : int  # for ours obj_id
           #  "type": str # for ours obj_type
           # }]}
            labelInfo = json.load(fp)
            infoList = labelInfo["labels"]
           # transform the label format to ours
            for info in infoList:
                infoNew = {}
                centers = info["center"]
                size = info["size"]
                rotation = {}
                rotation["x"] = info["rotation"]["pitch"]
                rotation["y"] = info["rotation"]["roll"]
                rotation["z"] = info["rotation"]["yaw"]
                trackerId = info["tracker_id"]
                type = info["type"]
                infoNew["psr"] = {"position": centers,"scale":size,"rotation":rotation}
                infoNew["obj_type"] = type
                infoNew["obj_id"] = str(trackerId)
                labelInfoNew.append(infoNew)
        # write the new info into the new json file
        with open (os.path.join(labelTransedPath,labelFileName),"a+") as f :
            json.dump(labelInfoNew,f)
