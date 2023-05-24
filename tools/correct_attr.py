

#
# check labels for consecutive frames.
#

import json
import os
import sys
import argparse
import re

parser = argparse.ArgumentParser(description='check fusion labels')        
parser.add_argument('--data', type=str,default='./data', help="")
parser.add_argument('--scenes', type=str,default='.*', help="")
parser.add_argument('--frames', type=str,default='.*', help="")
parser.add_argument('--save', type=str,default='no', help="")
args = parser.parse_args()

scenes = os.listdir(args.data)
scenes.sort()


def correct_attr(attr):
    if '1 passenger' in attr or '2 passengers' in attr or '3 passengers' in attr:
        attr = attr.split(',')
        corrected = list(filter(lambda a: not 'passenger' in a, attr))

        ret = 'passengers'
        for a in corrected:
            ret += ',' + a
        return ret
    return attr

for s in scenes:
    if not re.fullmatch(args.scenes, s):
        continue

    print(s)

    files = os.listdir(os.path.join(args.data, s, 'label'))
    files.sort()

    for f in files:
        if not re.fullmatch(args.frames, f):
            continue

        modified = False
        with open(os.path.join(args.data, s, 'label', f)) as fin:
            label = json.load(fin)
            for o in (label['objs']):
                if o['obj_type'] == 'Unknown1':
                        o['obj_type'] = 'Unknown'
                        modified = True

        if modified:
            print('saving', f) #, label)
            if args.save == 'yes':
                with open(os.path.join(args.data, s, 'label', f), 'w') as fin:
                    json.dump(label, fin, indent=2)

