import json
import os


# this script translate Robosense ruby dataset to Sustechscapes format

root_dir = "./data/ruby_ruby144_shizilukou_1200529160951/label_rs"
tgt_dir = "./data/ruby_ruby144_shizilukou_1200529160951/label"

for f in os.listdir(root_dir):
    fpath = os.path.join(root_dir, f)
    print(fpath)
    tofpath = os.path.join(tgt_dir, f)
    if os.path.splitext(f)[1] == ".json":
        with open(fpath, "r") as fin:
            objs = json.load(fin)
        
        to_objs= [x for x in 
        map(lambda o:{
                "psr": {
                    "position": o["center"],
                    "scale": o["size"],
                    "rotation": {
                        "x": o["rotation"]["pitch"],
                        "y": o["rotation"]["roll"],
                        "z": o["rotation"]["yaw"]
                    }
                },
                "obj_type": o["type"],
                "obj_id": o["tracker_id"]
            }, objs["labels"])]

        #print(objs)
        with open(tofpath, "w") as fout:
            json.dump(to_objs, fout)