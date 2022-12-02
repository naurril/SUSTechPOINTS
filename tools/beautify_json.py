import os
import json
import argparse

parser = argparse.ArgumentParser(description='beautify json')        
parser.add_argument('--folder', type=str,default='./', help="")
parser.add_argument('--dst', type=str,default='./', help="")
args = parser.parse_args()



files = os.listdir(args.folder)
files.sort()

for jf in files:
    if os.path.splitext(jf)[1] != '.json':
        continue

    with open(os.path.join(args.folder, jf)) as f:
        d =json.load(f)
    
    with open(os.path.join(args.dst, jf), 'w') as f:
        json.dump(d, f, indent=2)