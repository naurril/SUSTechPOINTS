
import os
import json
import re

#this_dir = os.path.dirname(os.path.abspath(__file__))
#root_dir = os.path.join(this_dir, "data")



def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)


class Dataset:
    def __init__(self, cfg) -> None:
        print(cfg)
        self.camera_dir = cfg['camera']
        self.lidar_dir = cfg['lidar']
        self.aux_camera_dir = cfg['aux_camera']
        self.label_dir = cfg['label']
        self.calib_dir = cfg['calib']
        self.desc_dir = cfg['desc']
        self.meta_dir = cfg['meta']
        self.radar_dir = cfg['radar']
        self.aux_lidar_dir = cfg['aux_lidar']
        self.label_fusion_dir = cfg['label_fusion']

        pass


    def get_all_scene_desc(self, scene_pattern):
        
        scenes = self.get_scene_names()
        
        descs = {}

        for n in scenes:
            if re.fullmatch(scene_pattern, n):
                try:
                    descs[n] = self.get_scene_desc(n)
                except:
                    print('failed reading scene:', n)
                    raise
        return descs

    def get_scene_names(self):
        scenes = os.listdir(self.lidar_dir)
        # scenes = filter(lambda s: not os.path.exists(os.path.join(root_dir, s, "disable")), scenes)
        scenes = list(scenes)
        scenes.sort()
        return scenes

    def get_meta_stat(self, s):
        scene_dir = os.path.join(self.meta_dir, s)
        stat = {}
        if os.path.exists(os.path.join(scene_dir, 'meta')):
            files = os.listdir(os.path.join(scene_dir, 'meta'))
            for f in files:

                if not os.path.exists(os.path.join(scene_dir, 'meta', f)):
                    continue
                
                with open(os.path.join(scene_dir, 'meta', f)) as f:
                    meta = json.load(f)

                    for k in meta:
                        if k == 'frame' or k == 'scene':
                            continue
                        
                        if type(meta[k])==list or type(meta[k])==dict or not meta[k]:
                            continue

                        if not k in stat:
                            stat[k] = {}
                        
                        if not meta[k] in  stat[k]:
                            stat[k][meta[k]] = 0
                        stat[k][meta[k]] += 1
        
        return stat

    def get_all_objs(self, s):
      label_folder = os.path.join(self.label_dir, s, "label")
      if not os.path.isdir(label_folder):
        return []
        
      files = os.listdir(label_folder)

      files = filter(lambda x: x.split(".")[-1]=="json", files)


      def file_2_objs(f):
          if  not os.path.exists(f):
            return []
          with open(f) as fd:
              ann = json.load(fd)
              if 'objs' in ann:
                boxes = ann['objs']
              else:
                boxes = ann
              objs = [x for x in map(lambda b: {"category":b["obj_type"], "id": b["obj_id"]}, boxes)]
              return objs

      boxes = map(lambda f: file_2_objs(os.path.join(self.label_dir, s, "label", f)), files)

      # the following map makes the category-id pairs unique in scene
      all_objs={}
      for x in boxes:
          for o in x:
              
              k = str(o["category"])+"-"+str(o["id"])

              if all_objs.get(k):
                all_objs[k]['count']= all_objs[k]['count']+1
              else:
                all_objs[k]= {
                  "category": o["category"],
                  "id": o["id"],
                  "count": 1
                }

      return [x for x in  all_objs.values()]



    def get_frames_by_objtype(self, s, objtype, objattr):

        objtypes = objtype.split(",") if objtype else []
        label_folder = os.path.join(self.label_dir, s, "label")
        if not os.path.isdir(label_folder):
            return []
            
        files = os.listdir(label_folder)      
        files.sort()
        files = filter(lambda x: x.split(".")[-1]=="json", files)

        print('query', objtypes, objattr)

        def contain_objs(f):
            if  not os.path.exists(f):
                return False
            with open(f) as fd:
                try:
                    ann = json.load(fd)
                    if 'objs' in ann:
                        boxes = ann['objs']
                    else:
                        boxes = ann

                    for b in boxes:
                        if objtypes and not b['obj_type'] in objtypes:
                            continue
                        
                        if objattr and (not 'obj_attr' in b  or not objattr in b['obj_attr']):
                            continue
                    
                        return True
                except:
                    print(f, 'load failed')
                    return False

            return False

        files = filter(lambda f: contain_objs(os.path.join(self.label_dir, s, "label", f)), files)
        frames = map(lambda x: os.path.splitext(x)[0], files)

        return list(frames)
    
    
    def get_scene_desc(self, s):
        scene_dir = os.path.join(self.desc_dir, s)
        desc = {}
        if os.path.exists(os.path.join(scene_dir, "desc.json")):
            with open(os.path.join(scene_dir, "desc.json")) as f:
                desc = json.load(f)
        
        if os.path.exists(os.path.join(self.lidar_dir, s, 'lidar')):
            desc['frames'] = len(os.listdir(os.path.join(self.lidar_dir, s, 'lidar')))
        # else:
        #     desc['frames'] = len(os.listdir(os.path.join(self.camera_dir, s, 'image')))

        #desc['label_files'] = len(os.listdir(os.path.join(scene_dir, 'label')))
        #desc['meta'] = get_meta_stat(s)

        return desc
        

    def get_one_scene(self, s):
        scene = {
            "scene": s,
            "frames": []
        }

        frames = os.listdir(os.path.join(self.lidar_dir, s, "lidar"))
        
        #print(s, frames)
        frames.sort()

        scene["lidar_ext"]="pcd"
        for f in frames:
            #if os.path.isfile("./data/"+s+"/lidar/"+f):
            filename, fileext = os.path.splitext(f)
            scene["frames"].append(filename)
            scene["lidar_ext"] = fileext

        # point_transform_matrix=[]

        # if os.path.isfile(os.path.join(scene_dir, "point_transform.txt")):
        #     with open(os.path.join(scene_dir, "point_transform.txt"))  as f:
        #         point_transform_matrix=f.read()
        #         point_transform_matrix = point_transform_matrix.split(",")

        
        if os.path.exists(os.path.join(self.desc_dir, s, "desc.json")):
            with open(os.path.join(self.desc_dir, s, "desc.json")) as f:
                desc = json.load(f)
                scene["desc"] = desc

        # calib will be read when frame is loaded. since each frame may have different calib.
        # read default calib for whole scene.
        calib = {}
        if os.path.exists(os.path.join(self.calib_dir, s, "calib")):
            sensor_types = os.listdir(os.path.join(self.calib_dir, s, 'calib'))        
            for sensor_type in sensor_types:
                calib[sensor_type] = {}
                if os.path.exists(os.path.join(self.calib_dir, s, "calib",sensor_type)):
                    calibs = os.listdir(os.path.join(self.calib_dir, s, "calib", sensor_type))
                    for c in calibs:
                        calib_file = os.path.join(self.calib_dir, s, "calib", sensor_type, c)
                        calib_name, ext = os.path.splitext(c)
                        if os.path.isfile(calib_file) and ext==".json": #ignore directories.
                            #print(calib_file)
                            try:
                                with open(calib_file)  as f:
                                    cal = json.load(f)
                                    calib[sensor_type][calib_name] = cal
                            except: 
                                print('reading calib failed: ', f)
                                assert False, f

            
                # if os.path.exists(os.path.join(self.calib_dir, s, "calib", "radar")):
                #     calibs = os.listdir(os.path.join(self.calib_dir, s, "calib", "radar"))
                #     for c in calibs:
                #         calib_file = os.path.join(self.calib_dir, s, "calib", "radar", c)
                #         calib_name, _ = os.path.splitext(c)
                #         if os.path.isfile(calib_file) and ext==".json":
                #             #print(calib_file)
                #             with open(calib_file)  as f:
                #                 cal = json.load(f)
                #                 calib_radar[calib_name] = cal
                # if os.path.exists(os.path.join(self.calib_dir, s, "calib", "aux_lidar")):
                #     calibs = os.listdir(os.path.join(self.calib_dir, s, "calib", "aux_lidar"))
                #     for c in calibs:
                #         calib_file = os.path.join(self.calib_dir, s, "calib", "aux_lidar", c)
                #         calib_name, _ = os.path.splitext(c)
                #         if os.path.isfile(calib_file):
                #             #print(calib_file)
                #             with open(calib_file)  as f:
                #                 cal = json.load(f)
                #                 calib_aux_lidar[calib_name] = cal

        scene["calib"] = calib


        # camera names
        camera = []
        camera_ext = ""
        cam_path = os.path.join(self.camera_dir, s, "camera")
        if os.path.exists(cam_path):
            cams = os.listdir(cam_path)
            for c in cams:
                cam_file = os.path.join(self.camera_dir, s, "camera", c)
                if os.path.isdir(cam_file):
                    camera.append(c)

                    if camera_ext == "":
                        #detect camera file ext
                        files = os.listdir(cam_file)
                        if len(files)>=2:
                            _,camera_ext = os.path.splitext(files[0])

        camera.sort()
        if camera_ext == "":
            camera_ext = ".jpg"
        scene["camera_ext"] = camera_ext
        scene["camera"] = camera


        aux_camera = []
        aux_camera_ext = ""
        aux_cam_path = os.path.join(self.aux_camera_dir, s, "aux_camera")
        if os.path.exists(aux_cam_path):
            cams = os.listdir(aux_cam_path)
            for c in cams:
                cam_file = os.path.join(aux_cam_path, c)
                if os.path.isdir(cam_file):
                    aux_camera.append(c)

                    if aux_camera_ext == "":
                        #detect camera file ext
                        files = os.listdir(cam_file)
                        if len(files)>=2:
                            _,aux_camera_ext = os.path.splitext(files[0])

        aux_camera.sort()
        if aux_camera_ext == "":
            aux_camera_ext = ".jpg"
        scene["aux_camera_ext"] = aux_camera_ext
        scene["aux_camera"] = aux_camera


        # radar names
        radar = []
        radar_ext = ""
        radar_path = os.path.join(self.radar_dir, s, "radar")
        if os.path.exists(radar_path):
            radars = os.listdir(radar_path)
            for r in radars:
                radar_file = os.path.join(self.radar_dir, s, "radar", r)
                if os.path.isdir(radar_file):
                    radar.append(r)
                    if radar_ext == "":
                        #detect camera file ext
                        files = os.listdir(radar_file)
                        if len(files)>=2:
                            _,radar_ext = os.path.splitext(files[0])

        if radar_ext == "":
            radar_ext = ".pcd"
        scene["radar_ext"] = radar_ext
        scene["radar"] = radar

        # aux lidar names
        aux_lidar = []
        aux_lidar_ext = ""
        aux_lidar_path = os.path.join(self.aux_lidar_dir, s, "aux_lidar")
        if os.path.exists(aux_lidar_path):
            lidars = os.listdir(aux_lidar_path)
            for r in lidars:
                lidar_file = os.path.join(self.aux_lidar_dir, s, "aux_lidar", r)
                if os.path.isdir(lidar_file):
                    aux_lidar.append(r)
                    if radar_ext == "":
                        #detect camera file ext
                        files = os.listdir(radar_file)
                        if len(files)>=2:
                            _,aux_lidar_ext = os.path.splitext(files[0])

        if aux_lidar_ext == "":
            aux_lidar_ext = ".pcd"
        scene["aux_lidar_ext"] = aux_lidar_ext
        scene["aux_lidar"] = aux_lidar


        scene["boxtype"] = "psr"

        # # ego_pose
        # ego_pose= {}
        # ego_pose_path = os.path.join(scene_dir, "ego_pose")
        # if os.path.exists(ego_pose_path):
        #     poses = os.listdir(ego_pose_path)
        #     for p in poses:
        #         p_file = os.path.join(ego_pose_path, p)
        #         with open(p_file)  as f:
        #                 pose = json.load(f)
        #                 ego_pose[os.path.splitext(p)[0]] = pose
        

        return scene


    def read_annotations(self, scene, frame):
        "read 3d boxes"
        if not os.path.exists(os.path.join(self.label_dir, scene, 'label')):
            return []
        
        filename = os.path.join(self.label_dir, scene, "label", frame+".json")   # backward compatible
        
        if os.path.exists(filename):
            if (os.path.isfile(filename)):
                with open(filename,"r") as f:
                    ann=json.load(f)
                    #print(ann)          
                    return ann
        return {'objs': []}


    def read_image_annotations(self, scene, frame, camera_type, camera_name):
        filename = os.path.join(self.label_fusion_dir, scene, "label_fusion", camera_type, camera_name, frame+".json")   # backward compatible
        if os.path.exists(filename):
            if (os.path.isfile(filename)):
                with open(filename,"r") as f:
                    ann=json.load(f)
                    #print(ann)          
                    return ann
        return {'objs': []}


    def read_all_image_annotations(self, scene, frame, cameras, aux_cameras):
        ann = {
            "camera": {},
            "aux_camera": {}
        }
        for c in cameras.split(','):
            filename = os.path.join(self.label_fusion_dir, scene, "label_fusion", 'camera', c, frame+".json")   # backward compatible
            if os.path.exists(filename):
                if (os.path.isfile(filename)):
                    with open(filename,"r") as f:
                        ann['camera'][c] = json.load(f)


        for c in aux_cameras.split(','):
            filename = os.path.join(self.label_fusion_dir, scene, "label_fusion", 'aux_camera', c, frame+".json")   # backward compatible
            if os.path.exists(filename):
                if (os.path.isfile(filename)):
                    with open(filename,"r") as f:
                        ann['aux_camera'][c] = json.load(f)

        return ann

    def read_ego_pose(self, scene, frame):
        filename = os.path.join(self.ego_pose_dir, scene, "ego_pose", frame+".json")
        if (os.path.isfile(filename)):
            with open(filename,"r") as f:
                p=json.load(f)
                return p
        else:
            return None
        
    def read_calib(self, scene, frame):

        calib = {}

        if not os.path.exists(os.path.join(self.calib_dir, scene, "calib")):
            return calib

        calib_folder = os.path.join(self.calib_dir, scene, "calib")
        sensor_types = os.listdir(calib_folder)
        
        for sensor_type in sensor_types:
            this_type_calib = {}
            sensors = os.listdir(os.path.join(calib_folder, sensor_type))
            for sensor in sensors:
                sensor_file = os.path.join(calib_folder, sensor_type, sensor, frame+".json")
                if os.path.exists(sensor_file) and os.path.isfile(sensor_file):
                    with open(sensor_file, "r") as f:
                        p=json.load(f)
                        this_type_calib[sensor] = p
            if this_type_calib:
                calib[sensor_type] = this_type_calib

        return calib

    def save_annotations(self, scene, frame, anno):
        folder = os.path.join(self.label_dir, scene, "label")
        prepare_dirs(folder)
        filename = os.path.join(folder, frame+".json")
        with open(filename, 'w') as outfile:
                json.dump(anno, outfile, indent=2, sort_keys=True)


    def save_iamge_annotation(self, scene, frame, camera_type, camera_name, anno):
        folder = os.path.join(self.label_fusion_dir, scene, "label_fusion", camera_type, camera_name)
        prepare_dirs(folder)
        filename = os.path.join(folder, frame+".json")
        print(filename)
        with open(filename, 'w') as outfile:
                json.dump(anno, outfile, indent=2, sort_keys=True)