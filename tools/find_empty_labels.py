from genericpath import isfile
import os
import json
import configparser
import re
import argparse


parser = argparse.ArgumentParser(description='statistic of labels')        
parser.add_argument('--scenes', type=str,default='.*', help="")
args = parser.parse_args()



scenes = os.listdir("./data")
scenes.sort()

for s in scenes:
    if re.fullmatch(args.scenes, s):
        
        files = os.listdir(os.path.join('data',s,'lidar'))
        files.sort()

        for file in files:
            frame = os.path.splitext(file)[0]
            jsonfile = os.path.join('data',s,'label', frame+".json")
            
            if os.path.exists(jsonfile):
                with open(jsonfile) as f:
                    label = json.load(f)
                    if 'objs' in label:
                        label = label['objs']
                    
                    if len(label) == 0:
                        print(s, frame, 'no boxes')
            else:
                print(s, frame, 'label file does not exist')