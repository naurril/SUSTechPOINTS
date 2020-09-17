import json
import os
import math


# this script translates labels from old version
# x-y rotation are switched, and x goes forward.
# ref commit ab0c8dff4e31839de02da8897c4a3df424becd09

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