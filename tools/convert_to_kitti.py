import os
import json
import argparse

parser = argparse.ArgumentParser(description='convert label to kitti format')
parser.add_argument('src', type=str,default='./data', help="source data folder")
parser.add_argument('tgt', type=str,default='./data_kitti', help="target folder")
parser.add_argument('--scenes', type=str,default='.*', help="")
parser.add_argument('--frames', type=str,default='.*', help="")

args = parser.parse_args()


scenes = os.listdir(args.src)

for s in scenes:
    labels = os.listdir(os.path.join(args.src, s, 'label'))
    for l in labels:
        with open(os.path.join(args.src, s, 'label', l))  as fin:
            label = json.load(fin)

        if 'objs' in label:
            label = label['objs']
        
        output_path = os.path.join(args.tgt, s, 'label_kitti')
        if not os.path.exists(output_path):
            os.makedirs(output_path)

        with open(os.path.join(output_path, os.path.splitext(l)[0]+".txt"), 'w') as fout:
            for obj in label:
                line = "{} 0 0 0 0 0 0 0 {} {} {} {} {} {} {}\n".format(
                    obj['obj_type'],
                    obj['psr']['scale']['z'], #h
                    obj['psr']['scale']['y'], #w
                    obj['psr']['scale']['x'], #l
                    -obj['psr']['position']['y'], #x
                    -obj['psr']['position']['z'], #y
                    obj['psr']['position']['x'] - 0.5*obj['psr']['scale']['z'],  #z
                    obj['psr']['rotation']['z'],  #rotation_y
                )

                fout.write(line)