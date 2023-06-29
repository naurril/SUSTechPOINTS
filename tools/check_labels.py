

#
# check labels for consecutive frames.
#

import json
import os
import numpy as np
import math

def euler_angle_to_rotate_matrix3x3(eu):  # ZYX order.
    theta = eu
    #Calculate rotation about x axis
    R_x = np.array([
        [1,       0,              0],
        [0,       math.cos(theta[0]),   -math.sin(theta[0])],
        [0,       math.sin(theta[0]),   math.cos(theta[0])]
    ])

    #Calculate rotation about y axis
    R_y = np.array([
        [math.cos(theta[1]),      0,      math.sin(theta[1])],
        [0,                       1,      0],
        [-math.sin(theta[1]),     0,      math.cos(theta[1])]
    ])

    #Calculate rotation about z axis
    R_z = np.array([
        [math.cos(theta[2]),    -math.sin(theta[2]),      0],
        [math.sin(theta[2]),    math.cos(theta[2]),       0],
        [0,               0,                  1]])

    R = np.matmul(R_x, np.matmul(R_y, R_z))
    return R

def euler_angle_to_rotate_matrix(eu, t):  # ZYX order.
    m =  np.eye(4)
    m[:3, :3] = euler_angle_to_rotate_matrix3x3(eu)
    m[:3, 3] = t
    return m


def rotation_angles(R) :
    sy = math.sqrt(R[0,0] * R[0,0] +  R[1,0] * R[1,0])
 
    singular = sy < 1e-6
 
    if  not singular :
        x = math.atan2(R[2,1] , R[2,2])
        y = math.atan2(-R[2,0], sy)
        z = math.atan2(R[1,0], R[0,0])
    else :
        x = math.atan2(-R[1,2], R[1,1])
        y = math.atan2(-R[2,0], sy)
        z = 0
 
    return [x, y, z]

class LabelChecker:
    # path: scene path
    def __init__(self, path, objid='', cfg=None):
        print('label checking', path, objid)
        self.path = path
        self.objid = objid
        self.cfg = cfg
        self.load_frame_ids()
        self.load_labels()
        self.load_lidar_poses()

        self.def_labels = [
        "Car","Pedestrian","Van","Bus","Truck","ScooterRider","Scooter","BicycleRider","Bicycle","Motorcycle","MotorcycleRider","PoliceCar","TourCar","RoadWorker","Child",
        "BabyCart","Cart","Cone","FireHydrant","SaftyTriangle","PlatformCart","ConstructionCart","RoadBarrel","TrafficBarrier","LongVehicle","BicycleGroup","ConcreteTruck",
        "Tram","Excavator","Animal","TrashCan","ForkLift","Trimotorcycle","FreightTricycle","Crane","RoadRoller","Bulldozer","DontCare","Misc","Unknown","Unknown1","Unknown2",
        "Unknown3","Unknown4","Unknown5",
        ]

        self.static_classes = [
            "Scooter", "Bicycle","Motorcycle",
        "Cone","FireHydrant","SaftyTriangle","ConstructionCart","RoadBarrel","TrafficBarrier","BicycleGroup",
        "TrashCan","RoadRoller","Bulldozer","DontCare","Misc","Unknown","Unknown1","Unknown2",
        "Unknown3","Unknown4","Unknown5",
        ]

        self.max_rotation_delta = {'x': 10*np.pi/180, 'y': 10*np.pi/180, 'z': 30*np.pi/180}
        self.max_position_delta_static = {'x': 0.3, 'y': 0.3, 'z':0.3}
        self.max_position_delta_dynamic = {'x': 1, 'y': 0.5, 'z':0.3} # percentage

        self.messages = []

        self.prepare_cfg()

    def is_static(self, obj):
        return obj['obj_type'] in self.static_classes or ('obj_attr' in obj and 'static' in obj['obj_attr'])
    
    def prepare_cfg(self):
        # if self.cfg is string, read as a json file

        # check if self.cfg is a string
        if isinstance(self.cfg, str):
            if os.path.exists(self.cfg):
                with open(self.cfg, 'r') as f:
                    self.cfg = json.load(f)
    
    
    def clear_messages(self):
        self.messages = []
    def show_messages(self):
        print(len(self.messages), 'messages')
        for m in self.messages:
            print(m["frame_id"], m["obj_id"], m["desc"])

    def push_message(self, frame, obj_id, desc):
        self.messages.append({
            "frame_id": frame,
            "obj_id": obj_id,
            "desc": desc
        })
    
    def load_frame_ids(self):
        lidar_files = os.listdir(os.path.join(self.path, 'lidar'))
        ids = list(map(lambda f: os.path.splitext(f)[0], lidar_files))
        ids.sort()
        self.frame_ids = ids

    def load_lidar_poses(self):
        pose_folder = os.path.join(self.path, 'lidar_pose')
        files = os.listdir(pose_folder)
        poses = {}

        files.sort()
        #print(files)

        for i,id in enumerate(self.frame_ids):
            f = id+".json"
            #print(f)

            if os.path.exists(os.path.join(pose_folder, f)):
                with open(os.path.join(pose_folder, f),'r') as fp:
                    p = json.load(fp)
                    poses[id] = p
        
        self.lidar_poses = poses
    def load_labels(self):
        label_folder = os.path.join(self.path, 'label')
        files = os.listdir(label_folder)
        labels = {}
        objs = {}

        files.sort()
        #print(files)


        for i,id in enumerate(self.frame_ids):
            f = id+".json"
            #print(f)

            if os.path.exists(os.path.join(label_folder, f)):
                with open(os.path.join(label_folder, f),'r') as fp:
                    l = json.load(fp)

                    if 'objs' in l:
                        l = l['objs']
                    #print(l)
                    frame_id = os.path.splitext(f)[0]
                    labels[frame_id] = l

                    for o in l:
                        obj_id = o['obj_id']

                        if self.objid != '' and obj_id != self.objid:
                            continue

                        if frame_id:
                            if objs.get(obj_id):
                                objs[obj_id].append([frame_id,o,i])
                            else:
                                objs[obj_id] = [[frame_id,o,i]]

        self.labels = labels
        self.objs = objs

    #templates
    def check_one_label(self, func):
        for f in self.labels:
            for o in self.labels[f]:
                func(f, o)

    def check_one_frame(self, func):
        for f in self.labels:
            func(f, self.labels[f])

    def check_one_obj(self, func):
        for id in self.objs:
            func(id, self.objs[id])



    def check_obj_type(self, frame_id, o):
        if not o["obj_type"] in self.def_labels or o["obj_type"] == '':
            self.push_message(frame_id, o["obj_id"], "object type {} not recognizable".format(o["obj_type"]))
    
    def check_obj_id(self, frame_id, o):
        if not o["obj_id"] or o["obj_id"] == '':
            self.push_message(frame_id, "", "object {} id absent".format(o["obj_type"]))

    def check_frame_duplicate_id(self, frame_id, objs):
        obj_id_cnt = {}
        for o in objs:
            if obj_id_cnt.get(o["obj_id"]):
                obj_id_cnt[o["obj_id"]] += 1
            else:
                obj_id_cnt[o["obj_id"]] = 1
        
        for id in obj_id_cnt:
            if obj_id_cnt[id] > 1:
                self.push_message(frame_id, id, "duplicate object id")               

    def check_obj_size_positivity(self, frame_id, objs):
        for o in objs:
            for axis in ['x', 'y', 'z']:
              if o['psr']['scale'][axis] <= 0:
                self.push_message(frame_id, o['obj_id'], f"object size {axis} {o['psr']['scale'][axis]} < 0") 

    def check_obj_size(self, obj_id, label_list):

        #print("object", obj_id, len(label_list), "instances")

        # overall size reasonable?
        # intra-instances consistency
        mean = {}
        for axis in ['x','y','z']:
            vs = list(map(lambda l: float(l[1]["psr"]["scale"][axis]), label_list))
            mean[axis] = np.array(vs).mean()


        if self.cfg:
            objtype = label_list[0][1]['obj_type']
            if objtype in self.cfg:
                size_mean = self.cfg[label_list[0][1]['obj_type']]['size_mean']
                size_std = self.cfg[label_list[0][1]['obj_type']]['size_std']

                for i,axis in enumerate(['x','y','z']):
                    if mean[axis] > size_mean[i] + 3 * size_std[i] or mean[axis] < size_mean[i] - 3 * size_std[i]:
                        self.push_message(label_list[0][0], obj_id, "dimension {} too large: {}, mean {}, std {}".format(axis, label_list[0][1]["psr"]["scale"][axis], size_mean[i], size_std[i]))
            else:
                print("no cfg for", objtype)


        if label_list[0][1]['obj_type'] == 'Pedestrian' or label_list[0][1]['obj_type'] == 'Child':
            return
            

        
        for l in label_list:
            frame_id = l[0]
            label = l[1]

            for axis in ['x','y','z']:
                ratio = label["psr"]["scale"][axis] / mean[axis]
                if ratio < 0.9:
                    self.push_message(frame_id, obj_id, "dimension {} too small: {}, mean {}".format(axis, label["psr"]["scale"][axis], mean[axis]))
                    #return
                elif ratio > 1.1:
                    self.push_message(frame_id, obj_id, "dimension {} too large: {}, mean {}".format(axis, label["psr"]["scale"][axis], mean[axis]))
                    #return

        
    

    def local_to_world_pose(self, rotation, position, frame_id):
        pose_local = euler_angle_to_rotate_matrix([rotation['x'], rotation['y'], rotation['z']],
                                             [position['x'], position['y'], position['z']])
        pose_lidar = np.array(self.lidar_poses[frame_id]["lidarPose"]).reshape([-1, 4]).astype(np.float32)

        pose_world = np.matmul(pose_lidar, pose_local)
        
        return pose_world

    def check_obj_pose(self, obj_id, label_list):

        if len(label_list) < 2:
            return
        
        # print('checking ', obj_id)
        world_poses = list(map(lambda l: self.local_to_world_pose(l[1]['psr']['rotation'], l[1]['psr']['position'], l[0]), label_list))

        relative_poses = list(map(lambda x: np.matmul(np.linalg.inv(world_poses[x-1]), world_poses[x]), range(1, len(label_list))))
        relative_poses = [np.eye(4)] + relative_poses

        expected_positions = list(map(lambda x: (world_poses[x-1][:3, 3]*(label_list[x+1][2]-label_list[x][2]) + world_poses[x+1][:3, 3]*(label_list[x][2]-label_list[x-1][2])) / (label_list[x+1][2]-label_list[x-1][2]), 
                                                 range(1, len(label_list)-1)))
        expected_positions = [world_poses[0][:3, 3]] + expected_positions + [world_poses[-1][:3, 3]]

        expected_relative_positions = list(map(lambda x: np.matmul(world_poses[x][:3,:3].T, expected_positions[x]-world_poses[x][:3, 3]), range(0, len(label_list))))


        def is_relative_yaw_valid(prev, next):
            return np.linalg.norm(world_poses[next][:2,3] - world_poses[prev][:2,3]) > label_list[0][1]['psr']['scale']['x'] * 0.5 * (next-prev) /2
        
        def calc_relative_yaw(prev, next, curr):
            ret = np.arctan2(world_poses[next][1,3] - world_poses[prev][1,3], world_poses[next][0,3] - world_poses[prev][0,3]) - rotation_angles(world_poses[curr][:3,:3])[2]

            if ret > np.pi:
                ret -=  2 * np.pi
            elif ret < -np.pi:
                ret += 2 * np.pi
            return ret
        # calc angles by world position, convert it into local coord system.
        expected_relative_yaw = list(map(lambda x: calc_relative_yaw(x-1, x+1, x), range(1, len(label_list)-1)))
        expected_relative_yaw = [calc_relative_yaw(0, 1, 0)] + expected_relative_yaw + [calc_relative_yaw(len(label_list)-2, len(label_list)-1, len(label_list)-1)]
        
        expected_relative_yaw_valid = list(map(lambda x: is_relative_yaw_valid(x-1,x+1), range(1, len(label_list)-1)))
        expected_relative_yaw_valid = [is_relative_yaw_valid(0,1)] + expected_relative_yaw_valid + [is_relative_yaw_valid(len(label_list)-2, len(label_list)-1)]
    
        #print(expected_relative_yaw)
        #print(list(map(lambda x: rotation_angles(relative_poses[x][:3,:3])[2], range(1, len(label_list)-1))))
        # print(expected_relative_positions)
        # if obj_id == '35':
        #     print(obj_id, list(map(lambda x: x['z']*180/np.pi, world_angles)))
        #     print(obj_id, list(map(lambda x: x[1]['psr']['rotation']['z']*180/np.pi, label_list)))

        #print("check obj direction", obj_id)
        for i in range(1, len(label_list)):
            l = label_list[i]
            pl = label_list[i-1]
            frame_id = l[0]

            if l[2] - pl[2] > 3:  #missing frames
                continue

            # relative pose of current frame to previous frame
            pose_relative = relative_poses[i]

            angles_relative = rotation_angles(pose_relative[:3, :3])
            position_relative = pose_relative[:3, 3]

            #print("check obj direction", obj_id, frame_id)            
            for ai, axis in enumerate(['x','y','z']):
                rotation_delta = angles_relative[ai]
                
                if rotation_delta > np.pi:
                    rotation_delta =  2*np.pi - rotation_delta
                elif rotation_delta < -np.pi:
                    rotation_delta =  2*np.pi + rotation_delta

                if rotation_delta > self.max_rotation_delta[axis] or rotation_delta < - self.max_rotation_delta[axis]:
                    self.push_message(frame_id, obj_id, "rotation {} delta too large: {}".format(axis, rotation_delta * 180/np.pi))
                    #return
                
                if axis == 'z' and expected_relative_yaw_valid[i] and np.abs(expected_relative_yaw[i]) > self.max_rotation_delta['z']:
                    self.push_message(frame_id, obj_id, "yaw diff to expecte {} too large: {}".format(axis, expected_relative_yaw[i] * 180/np.pi))
                    #return

                position_delta = expected_relative_positions[i][ai]
                # distance = np.linalg.norm(position_relative)
                # distance = 1 if distance<1 else distance
                

                if self.is_static(l[1]) and np.abs(position_delta) > self.max_position_delta_static[axis]:
                    self.push_message(frame_id, obj_id, "position {} delta too large: {}".format(axis, position_delta))
                elif np.abs(position_delta) > self.max_position_delta_dynamic[axis]:
                    self.push_message(frame_id, obj_id, "position {} delta too large: {}".format(axis, position_delta))

    def check_obj_type_consistency(self, obj_id, label_list):
        for i in range(1, len(label_list)):
            
            l = label_list[i]
            pl = label_list[i-1]
            frame_id = l[0]
            label = l[1]
            plabel = pl[1]

            if label['obj_type'] != plabel['obj_type']:
                self.push_message(frame_id, obj_id, "different object types: {}, previous {}".format(label['obj_type'], plabel['obj_type']))
                #return
        pass
    def check(self):
        self.clear_messages()

        self.check_one_label(lambda f,o: self.check_obj_type(f, o))
        self.check_one_label(lambda f,o: self.check_obj_id(f, o))

        self.check_one_frame(lambda f,o: self.check_frame_duplicate_id(f,o))
        self.check_one_frame(lambda f,o: self.check_obj_size_positivity(f,o))

        self.check_one_obj(lambda id, o: self.check_obj_size(id ,o))
        self.check_one_obj(lambda id, o: self.check_obj_pose(id ,o))
        self.check_one_obj(lambda id, o: self.check_obj_type_consistency(id ,o))

if __name__ == "__main__":

    import argparse
    import re

    parser = argparse.ArgumentParser(description='check labels')        
    parser.add_argument('--data', type=str,default='./data', help="")
    parser.add_argument('--scenes', type=str,default='.*', help="")
    parser.add_argument('--cfg', type=str, default='./stat.json', help="")

    args = parser.parse_args()

    args.cfg = os.path.abspath(args.cfg)
    data = args.data

    scenes = os.listdir(data)
    scenes.sort()

    for s in scenes:
        if not re.fullmatch(args.scenes, s):
            continue
        
        scene_path = os.path.join(data, s)
        if not os.path.isdir(scene_path):
            continue

        print(f'checking {s}...')
        ck = LabelChecker(scene_path, '', args.cfg)
        ck.check()
        ck.show_messages()
        

    