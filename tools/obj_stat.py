# this file computes statistics of the datasets

from genericpath import isfile
import os
import json
import numpy as np


classMap = {
        'Motorcycle': 'Scooter',
        'MotorcyleRider': 'ScooterRider',
        'RoadWorker': 'Pedestrian',
        'LongVehicle': 'Truck',
        'ConcreteTruck': 'Truck',
        'Child': 'Pedestrian',
        'Crane': 'Truck',
        'ForkLift': 'Truck',
        'Bulldozer': 'Truck', 
        'Excavator': 'Truck',
    }

stat = {}
track_stat = {}
def stat_scene(scene):
    
    label_folder = os.path.join(scene, "label")
    lidar_files  = os.listdir(os.path.join(scene, 'lidar'))
    
    for file in lidar_files:
        
        file = os.path.splitext(file)[0] + '.json'
        

        objs = []
        
        if not os.path.exists(os.path.join(label_folder, file)):
            continue

        with open(os.path.join(label_folder, file)) as f:
            labels = json.load(f)

            if "objs" in labels:
                objs = labels['objs']
            else:
                objs = labels

            
        for l in objs:
            #color = get_color(l["obj_id"])
            obj_type = l["obj_type"]
            obj_type = classMap[obj_type] if obj_type in classMap else obj_type

            s = np.array([l['psr']['scale']['x'], l['psr']['scale']['y'], l['psr']['scale']['z'],l['psr']['position']['z']])

            if obj_type in stat:
                stat[obj_type]['size'] = (stat[obj_type]['size'] * stat[obj_type]['num'] + s)/(stat[obj_type]['num']+1)
                stat[obj_type]['num'] += 1
            else:
                stat[obj_type] = {
                    'num': 1,
                    'size': s,
                }
            
            obj_track = scene+"-"+l['obj_id']
            if obj_track in track_stat:
                track_stat[obj_track] += 1
            else:
                track_stat[obj_track] = 1

    return stat

if __name__=="__main__":
    import argparse
    parser = argparse.ArgumentParser(description='print dataset statistics by obj classes')        
    parser.add_argument('data', type=str,default='./data', help="")
    args = parser.parse_args()

    
    for s in os.listdir(args.data):
        sp = os.path.join(args.data, s) 
        if os.path.isdir(sp):
            print(f"scan {sp}")
            stat_scene(sp)

    for x in stat:
        print(x, stat[x])

    # for x in track_stat:
    #     print(x, track_stat[x])