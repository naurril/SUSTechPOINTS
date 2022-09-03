import os
import json

def combine_dict(data, update, overwrite):
          for k in update:
            if k in data and type(data[k])==dict and type(update[k])== dict:
              data[k] = combine_dict(data[k], update[k], overwrite)
            elif k in data:
              if overwrite:
                data[k] = update[k]
            else:
              data[k] = update[k]
          return data

def write_tag(scene, frame, data, overwrite):
        meta_path = os.path.join("data", scene, "meta")
        if not os.path.exists(meta_path):
          os.mkdir(meta_path)
        
        file = "./data/"+scene +"/meta/"+frame+".json"
        if not os.path.exists(file):
          meta = {}
        else:
          with open(file) as f:
            #try:
              meta = json.load(f)            
            #except:
            #  meta = {}

        print(meta)
        meta = combine_dict(meta, data, overwrite)        

        print(meta)
        with open(file, 'w') as f:
          json.dump(meta, f, indent=2)

