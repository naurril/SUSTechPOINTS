

import os
import json
import argparse
import re


parser = argparse.ArgumentParser(description='start web server for SUSTech POINTS')        
parser.add_argument('data_folder', type=str, default='./data', help="")
parser.add_argument('--scenes', type=str, default='.*', help="")
parser.add_argument('--camera_types', type=str, default='aux_camera', help="")
parser.add_argument('--camera_names', type=str, default='front', help="")
parser.add_argument('--image_width', type=int, default=640, help="")
parser.add_argument('--image_height', type=int, default=480, help="")

args = parser.parse_args()




all_scenes = os.listdir(args.data_folder)
scenes = list(filter(lambda s: re.fullmatch(args.scenes, s), all_scenes))
scenes.sort()

#print(list(scenes))

obj_types = [
    'Car',            
    'Pedestrian',     
    'Van',            
    'Bus',            
    'Truck',                  
    'ScooterRider',   
    'Scooter',                
    'BicycleRider',   
    'Bicycle',        
    'Motorcycle',     
    'MotorcyleRider', 
    'PoliceCar',      
    'TourCar',        
    'RoadWorker',     
    'Child',          
    'BabyCart',       
    'Cart',           
    'Cone',           
    'FireHydrant',    
    'SaftyTriangle',  
    'PlatformCart',   
    'ConstructionCart',
    'RoadBarrel',     
    'TrafficBarrier', 
    'LongVehicle',            
    'BicycleGroup',   
    'ConcreteTruck',  
    'Tram',           
    'Excavator',      
    'Animal',         
    'TrashCan',       
    'ForkLift',       
    'Trimotorcycle',  
    'FreightTricycle',
    'Crane',          
    'RoadRoller',     
    'Bulldozer',      
    'DontCare',       
    'Misc',           
    'Unknown',        
    'Unknown1',       
    'Unknown2',       
    'Unknown3',       
    'Unknown4',       
    'Unknown5',       
]


obj_type_map = {}
for i,t in enumerate(obj_types):
    obj_type_map[t] = i

data_folder = args.data_folder
camera_types  = args.camera_types.split(",")
camera_names  = args.camera_names.split(",")
image_width = args.image_width
image_height = args.image_height


for s in scenes:
    print(s)
    for camera_type in camera_types:
        for camera in camera_names:
                

            label_folder = os.path.join(data_folder, s, 'label_fusion', camera_type, camera)
            if not os.path.exists(label_folder):
                continue

            yolo_folder = os.path.join(data_folder, s, 'label_fusion_yolo', camera_type, camera)
            if not os.path.exists(yolo_folder):
                os.makedirs(yolo_folder)
            

            files = os.listdir(label_folder)
            files.sort()

            for fname in files:
                frame = os.path.splitext(fname)[0]

                with open(os.path.join(label_folder, fname)) as f:
                    label = json.load(f)

                with open(os.path.join(yolo_folder, frame+".txt"), 'w') as f:
                    for o in label['objs']:
                        f.write('{} {} {} {} {}\n'.format(obj_type_map[o['obj_type']], 
                                                            (o['rect']['x1'] + o['rect']['x2'])/2/image_width, 
                                                            (o['rect']['y1'] + o['rect']['y2'])/2/image_height, 
                                                            (o['rect']['x2'] - o['rect']['x1'])/image_width, 
                                                            (o['rect']['y2'] - o['rect']['y1'])/image_height))


            
    
