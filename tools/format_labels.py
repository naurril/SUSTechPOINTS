
import os
import json
import argparse

def format_scene(root, scene, backup_dir=None):
    s = os.path.join(root, scene)
    print('forattming', s)
    frames = os.listdir(os.path.join(s, 'lidar'))
    frames = [os.path.splitext(f)[0] for f in frames]
    frames.sort()

    files = os.listdir(os.path.join(s, 'label'))
    files.sort()
    for f in files:
        if not os.path.splitext(f)[0] in frames:
            print(s, f, 'extra label file')

            os.makedirs(os.path.join(backup_dir, scene, 'label'), exist_ok=True)
            os.system("mv {} {}".format(os.path.join(s, 'label', f), os.path.join(backup_dir, scene, 'label', f)))
            
            #os.rename(os.path.join(s, 'label', f), os.path.join(backup_dir, s, 'label', f))
            continue

        with open(os.path.join(s, 'label', f)) as fin:
            label = json.load(fin)

        if not 'objs' in label:
            print(s, 'labe', f, 'lable format is too old')
            with open(os.path.join(s, 'label', f), 'w') as fout:
                json.dump({'objs': label}, fout, indent=4)


if __name__ == "__main__":

    import argparse
    import re

    parser = argparse.ArgumentParser(description='check labels')        
    parser.add_argument('--data', type=str,default='./data', help="")
    parser.add_argument('--scenes', type=str,default='.*', help="")
    parser.add_argument('--backup_dir', type=str,default='./backup', help="")
    args = parser.parse_args()

    scenes = os.listdir(args.data)
    scenes.sort()

    for s in scenes:
        if not re.fullmatch(args.scenes, s):
            continue
        format_scene(args.data, s, backup_dir=args.backup_dir)