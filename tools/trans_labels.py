import json
import os
import math

root_dir = "./data/example/label"

for f in os.listdir(root_dir):
    fpath = os.path.join(root_dir, f)
    if os.path.splitext(f)[1] == ".json":
        with open(fpath, "r") as fin:
            objs = json.load(fin)
        for o in objs:
            o["psr"]["rotation"]["z"] = math.pi/2 + o["psr"]["rotation"]["z"]
            o["psr"]["scale"]["y"], o["psr"]["scale"]["x"] = o["psr"]["scale"]["x"],o["psr"]["scale"]["y"]
        print(fpath)
        #print(objs)
        with open(fpath, "w") as fout:
            json.dump(objs, fout)