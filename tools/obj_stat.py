# this file computes statistics of the datasets

from genericpath import isfile
import os
import json
import numpy as np

import argparse
parser = argparse.ArgumentParser(description='print dataset statistics by obj classes')        
parser.add_argument('data', type=str,default='./data', help="")
parser.add_argument('--use_classmap', type=bool,default=False, help="")
args = parser.parse_args()


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

obj_stat = {}
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

            if args.use_classmap:
              obj_type = classMap[obj_type] if obj_type in classMap else obj_type

            s = np.array([[l['psr']['scale']['x'], 
                           l['psr']['scale']['y'], 
                           l['psr']['scale']['z'],
                           l['psr']['position']['z']]])

            if obj_type in obj_stat:
                obj_stat[obj_type]['size'] = np.concatenate([obj_stat[obj_type]['size'], s], axis=0)
            else:
                obj_stat[obj_type] = {
                    'size': s,
                }
            
            obj_track = scene+"-"+l['obj_id']
            if obj_track in track_stat:
                track_stat[obj_track] += 1
            else:
                track_stat[obj_track] = 1

    

if __name__=="__main__":


    
    for s in os.listdir(args.data):
        sp = os.path.join(args.data, s) 
        if os.path.isdir(sp):
            print(f"scan {sp}")
            stat_scene(sp)

    
    # save stat into a pickle file
    import pickle
    with open('stat.pkl', 'wb') as f:
        pickle.dump(obj_stat, f)
    with open('track_stat.pkl', 'wb') as f:
        pickle.dump(track_stat, f)
    
    # cal mean and std
    stat = {}
    for k in obj_stat:
        stat[k] = {
            'size_mean': np.mean(obj_stat[k]['size'], axis=0).tolist(),
            'size_std': np.std(obj_stat[k]['size'], axis=0).tolist(),
            'count': obj_stat[k]['size'].shape[0],
        }

    # save mean and std into a json file
    with open('stat.json', 'w') as f:
        json.dump(stat, f, indent=4)