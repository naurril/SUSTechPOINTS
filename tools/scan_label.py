from genericpath import isfile
import os
import json
import configparser
import re
import argparse


parser = argparse.ArgumentParser(description='start web server for sem-seg')        
parser.add_argument('--users', type=str,default='.*', help="")
args = parser.parse_args()

usercfg_file = 'conf/user.conf'
usercfg = configparser.ConfigParser()
usercfg.read(usercfg_file)

users = usercfg['users']

scenes = os.listdir("./data")
scenes.sort()

for user in users:
    if not re.fullmatch(args.users, user):
        continue
    
    for s in scenes:
        if re.fullmatch(usercfg[user]['scenes'], s):
            

            files = os.listdir(os.path.join('data',s,'lidar'))
            files.sort()

            obj_counter = 0
            json_counter = 0

            for file in files:
                frame = os.path.splitext(file)[0]
                jsonfile = os.path.join('data',s,'label', frame+".json")
                if os.path.isfile(jsonfile):
                    with open(jsonfile) as f:
                        label = json.load(f)
                        if 'objs' in label:
                            label = label['objs']
                        obj_counter += len(label)
                        json_counter += 1
            print(user, s, len(files),  json_counter, obj_counter)