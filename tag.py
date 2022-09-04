import os
import json
import re
import argparse


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

def del_dict(data, update):
          for k in update:
            if k in data and type(data[k])==dict and type(update[k])== dict:
              data[k] = del_dict(data[k], update[k])
            elif k in data:
              del data[k]
          return data

def write_json(file, data):
    with open(file, 'w') as f:
          json.dump(data, f, indent=2, sort_keys=True)


def show_tag(rootdir, scene, frame):
    file = os.path.join(rootdir, scene, 'meta', frame+".json")
    with open(file) as f:            
            print(scene, frame, json.load(f))

def del_tag(rootdir, scene, frame, update):
    file = os.path.join(rootdir, scene, 'meta', frame+".json")
    with open(file) as f:            
        meta = json.load(f)
    
    data = json.loads(update)
    updated = del_dict(meta, data)
    print(scene, frame, updated)
    write_json(file, updated)


def add_tag(rootdir, scene, frame, update):
    file = os.path.join(rootdir, scene, 'meta', frame+".json")
    with open(file) as f:            
        meta = json.load(f)
    
    data = json.loads(update)
    updated = combine_dict(meta, data, False)
    print(scene, frame, updated)

    write_json(file, updated)

def update_tag(rootdir, scene, frame, update):
    file = os.path.join(rootdir, scene, 'meta', frame+".json")
    with open(file) as f:            
        meta = json.load(f)
    
    data = json.loads(update)
    updated = combine_dict(meta, data, True)
    print(scene, frame, updated)
    write_json(file, updated)


if __name__=="__main__":
    parser = argparse.ArgumentParser(description='manage tags')
    parser.add_argument('data_dir', type=str, default='./', help="")
    parser.add_argument('scenes', type=str, default='.*', help="")
    parser.add_argument('op', type=str, choices=['show','del', 'add', 'update'], default='', help="")
    parser.add_argument('--frames',    type=str, default='.*', help="")
    parser.add_argument('--arguments', type=str, default='', help="")
    args = parser.parse_args()
    
    print(args)

    scenes = os.listdir(args.data_dir)
    scenes.sort()

    for s in scenes:
        if not re.fullmatch(args.scenes, s):
            continue

        meta_folder = os.path.join(args.data_dir, s, 'meta')
        if not os.path.exists(meta_folder):
            continue

        files = os.listdir(meta_folder)
        for file in files:
                frame = os.path.splitext(file)[0]
                if not re.fullmatch(args.frames, frame):
                    continue

                if args.op == 'show':
                    show_tag(args.data_dir, s, frame)
                elif args.op == 'del':
                    del_tag(args.data_dir, s, frame, args.arguments)
                elif args.op == 'add':
                    add_tag(args.data_dir, s, frame, args.arguments)
                elif args.op == 'update':
                    update_tag(args.data_dir, s, frame, args.arguments)
    