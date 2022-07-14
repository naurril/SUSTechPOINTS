
import os
import json

this_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.join(this_dir, "data")

def get_all_scenes():
    all_scenes = get_scene_names()
    print(all_scenes)
    return list(map(get_one_scene, all_scenes))

def get_all_scene_desc(scenes):
    if len(scenes) == 0:
        scenes = get_scene_names()
    descs = {}
    for n in scenes:
        descs[n] = get_scene_desc(n)
    return descs

def get_scene_names():
      scenes = os.listdir(root_dir)
      scenes = filter(lambda s: not os.path.exists(os.path.join(root_dir, s, "disable")), scenes)
      scenes = list(scenes)
      scenes.sort()
      return scenes

def get_scene_desc(s):
    scene_dir = os.path.join(root_dir, s)
    if os.path.exists(os.path.join(scene_dir, "desc.json")):
        with open(os.path.join(scene_dir, "desc.json")) as f:
            desc = json.load(f)
            return desc
    return None

def get_one_scene(s):
    scene = {
        "scene": s,
        "frames": []
    }

    scene_dir = os.path.join(root_dir, s)

    frames = os.listdir(os.path.join(scene_dir, "lidar"))
    
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

    
    if os.path.exists(os.path.join(scene_dir, "desc.json")):
        with open(os.path.join(scene_dir, "desc.json")) as f:
            desc = json.load(f)
            scene["desc"] = desc

    # calib will be read when frame is loaded. since each frame may have different calib.
    # read default calib for whole scene.
    calib = {}
    if os.path.exists(os.path.join(scene_dir, "calib")):
        sensor_types = os.listdir(os.path.join(scene_dir, 'calib'))        
        for sensor_type in sensor_types:
            calib[sensor_type] = {}
            if os.path.exists(os.path.join(scene_dir, "calib",sensor_type)):
                calibs = os.listdir(os.path.join(scene_dir, "calib", sensor_type))
                for c in calibs:
                    calib_file = os.path.join(scene_dir, "calib", sensor_type, c)
                    calib_name, ext = os.path.splitext(c)
                    if os.path.isfile(calib_file) and ext==".json": #ignore directories.
                        #print(calib_file)
                        with open(calib_file)  as f:
                            cal = json.load(f)
                            calib[sensor_type][calib_name] = cal

        
            # if os.path.exists(os.path.join(scene_dir, "calib", "radar")):
            #     calibs = os.listdir(os.path.join(scene_dir, "calib", "radar"))
            #     for c in calibs:
            #         calib_file = os.path.join(scene_dir, "calib", "radar", c)
            #         calib_name, _ = os.path.splitext(c)
            #         if os.path.isfile(calib_file) and ext==".json":
            #             #print(calib_file)
            #             with open(calib_file)  as f:
            #                 cal = json.load(f)
            #                 calib_radar[calib_name] = cal
            # if os.path.exists(os.path.join(scene_dir, "calib", "aux_lidar")):
            #     calibs = os.listdir(os.path.join(scene_dir, "calib", "aux_lidar"))
            #     for c in calibs:
            #         calib_file = os.path.join(scene_dir, "calib", "aux_lidar", c)
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
    cam_path = os.path.join(scene_dir, "camera")
    if os.path.exists(cam_path):
        cams = os.listdir(cam_path)
        for c in cams:
            cam_file = os.path.join(scene_dir, "camera", c)
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
    aux_cam_path = os.path.join(scene_dir, "aux_camera")
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
    radar_path = os.path.join(scene_dir, "radar")
    if os.path.exists(radar_path):
        radars = os.listdir(radar_path)
        for r in radars:
            radar_file = os.path.join(scene_dir, "radar", r)
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
    aux_lidar_path = os.path.join(scene_dir, "aux_lidar")
    if os.path.exists(aux_lidar_path):
        lidars = os.listdir(aux_lidar_path)
        for r in lidars:
            lidar_file = os.path.join(scene_dir, "aux_lidar", r)
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


def read_annotations(scene, frame):
    filename = os.path.join(root_dir, scene, "label", frame+".json")
    if (os.path.isfile(filename)):
      with open(filename,"r") as f:
        ann=json.load(f)
        #print(ann)          
        return ann
    else:
      return []

def read_ego_pose(scene, frame):
    filename = os.path.join(root_dir, scene, "ego_pose", frame+".json")
    if (os.path.isfile(filename)):
      with open(filename,"r") as f:
        p=json.load(f)
        return p
    else:
      return None
def read_calib(scene, frame):

    calib = {}

    if not os.path.exists(os.path.join(root_dir, scene, "calib")):
        return calib

    calib_folder = os.path.join(root_dir, scene, "calib")
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

def save_annotations(scene, frame, anno):
    filename = os.path.join(root_dir, scene, "label", frame+".json")
    with open(filename, 'w') as outfile:
            json.dump(anno, outfile)

if __name__ == "__main__":
    print(get_all_scenes())