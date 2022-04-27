
import json
import os
import sys
import numpy as np

class LabelChecker:
    def __init__(self, path):
        self.path = path
        self.load_frame_ids()
        self.load_labels()

        self.def_labels = [
        "Car","Pedestrian","Van","Bus","Truck","ScooterRider","Scooter","BicycleRider","Bicycle","Motorcycle","MotorcyleRider","PoliceCar","TourCar","RoadWorker","Child",
        "BabyCart","Cart","Cone","FireHydrant","SaftyTriangle","PlatformCart","ConstructionCart","RoadBarrel","TrafficBarrier","LongVehicle","BicycleGroup","ConcreteTruck",
        "Tram","Excavator","Animal","TrashCan","ForkLift","Trimotorcycle","FreightTricycle,","Crane","RoadRoller","Bulldozer","DontCare","Misc","Unknown","Unknown1","Unknown2",
        "Unknown3","Unknown4","Unknown5",
        ]

        self.messages = []
    
    def clear_messages(self):
        self.messages = []
    def show_messages(self):
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
        self.frame_ids = ids

    def load_labels(self):
        label_folder = os.path.join(self.path, 'label')
        files = os.listdir(label_folder)
        labels = {}
        obj_ids = {}

        files.sort()
        print(files)
        for f in files:
            with open(os.path.join(label_folder, f),'r') as fp:
                l = json.load(fp)
                #print(l)
                frame_id = os.path.splitext(f)[0]
                labels[frame_id] = l

                for o in l:
                    obj_id = o['obj_id']
                    if frame_id:
                        if obj_ids.get(obj_id):
                            obj_ids[obj_id].append([frame_id,o])
                        else:
                            obj_ids[obj_id] = [[frame_id,o]]

        self.labels = labels
        self.obj_ids = obj_ids

    #templates
    def check_one_label(self, func):
        for f in self.labels:
            for o in self.labels[f]:
                func(f, o)

    def check_one_frame(self, func):
        for f in self.labels:
            func(f, self.labels[f])

    def check_one_obj(self, func):
        for id in self.obj_ids:
            func(id, self.obj_ids[id])



    def check_obj_type(self, frame_id, o):
        if not o["obj_type"] in self.def_labels:
            self.push_message(frame_id, o["obj_id"], "object type {} not recognizable".format(o["obj_type"]))
    
    def check_obj_id(self, frame_id, o):
        if not o["obj_id"]:
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


    def check_obj_size(self, obj_id, label_list):

        #print("object", obj_id, len(label_list), "instances")

        if label_list[0][1]['obj_type'] == 'Pedestrian':
            return
            
        mean = {}
        for axis in ['x','y','z']:
            vs = list(map(lambda l: float(l[1]["psr"]["scale"][axis]), label_list))
            mean[axis] = np.array(vs).mean()
        
        for l in label_list:
            frame_id = l[0]
            label = l[1]

            for axis in ['x','y','z']:
                ratio = label["psr"]["scale"][axis] / mean[axis]
                if ratio < 0.95:
                    self.push_message(frame_id, obj_id, "dimension {} too small: {}, mean {}".format(axis, label["psr"]["scale"][axis], mean[axis]))
                    #return
                elif ratio > 1.05:
                    self.push_message(frame_id, obj_id, "dimension {} too large: {}, mean {}".format(axis, label["psr"]["scale"][axis], mean[axis]))
                    #return

    def check_obj_direction(self, obj_id, label_list):

        for i in range(1, len(label_list)):
            l = label_list[i]
            pl = label_list[i-1]
            frame_id = l[0]
            label = l[1]
            plabel = pl[1]

            
            for axis in ['x','y','z']:
                rotation_delta = label['psr']['rotation'][axis] -  plabel['psr']['rotation'][axis]
                pi = 3.141592543
                if rotation_delta > pi:
                    rotation_delta =  2*pi - rotation_delta
                elif rotation_delta < -pi:
                    rotation_delta =  2*pi + rotation_delta

                if rotation_delta > 30/180*pi or rotation_delta < - 30/180*pi:
                    self.push_message(frame_id, obj_id, "rotation {} delta too large".format(axis))
                    #return

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

        self.check_one_obj(lambda id, o: self.check_obj_size(id ,o))
        self.check_one_obj(lambda id, o: self.check_obj_direction(id ,o))
        self.check_one_obj(lambda id, o: self.check_obj_type_consistency(id ,o))

if __name__ == "__main__":
    ck = LabelChecker(sys.argv[1])
    ck.check()
    ck.show_messages()
    

    