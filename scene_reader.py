
import os
import json

this_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.join(this_dir, "data")

def get_all_scenes():
    all_scenes = get_scene_names()
    print(all_scenes)
    return list(map(get_one_scene, all_scenes))

def get_all_scene_desc():
    names = get_scene_names()
    descs = {}
    for n in names:
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

    calib = {}
    calib_camera={}
    calib_radar={}
    calib_aux_lidar = {}
    if os.path.exists(os.path.join(scene_dir, "calib")):
        if os.path.exists(os.path.join(scene_dir, "calib","camera")):
            calibs = os.listdir(os.path.join(scene_dir, "calib", "camera"))
            for c in calibs:
                calib_file = os.path.join(scene_dir, "calib", "camera", c)
                calib_name, ext = os.path.splitext(c)
                if os.path.isfile(calib_file) and ext==".json":
                    #print(calib_file)
                    with open(calib_file)  as f:
                        cal = json.load(f)
                        calib_camera[calib_name] = cal

    
        if os.path.exists(os.path.join(scene_dir, "calib", "radar")):
            calibs = os.listdir(os.path.join(scene_dir, "calib", "radar"))
            for c in calibs:
                calib_file = os.path.join(scene_dir, "calib", "radar", c)
                calib_name, _ = os.path.splitext(c)
                if os.path.isfile(calib_file):
                    #print(calib_file)
                    with open(calib_file)  as f:
                        cal = json.load(f)
                        calib_radar[calib_name] = cal
        if os.path.exists(os.path.join(scene_dir, "calib", "aux_lidar")):
            calibs = os.listdir(os.path.join(scene_dir, "calib", "aux_lidar"))
            for c in calibs:
                calib_file = os.path.join(scene_dir, "calib", "aux_lidar", c)
                calib_name, _ = os.path.splitext(c)
                if os.path.isfile(calib_file):
                    #print(calib_file)
                    with open(calib_file)  as f:
                        cal = json.load(f)
                        calib_aux_lidar[calib_name] = cal

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

    if camera_ext == "":
        camera_ext = ".jpg"
    scene["camera_ext"] = camera_ext


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


    if  True: #not os.path.isdir(os.path.join(scene_dir, "bbox.xyz")):
        scene["boxtype"] = "psr"
        # if point_transform_matrix:
        #     scene["point_transform_matrix"] = point_transform_matrix
        if camera:
            scene["camera"] = camera
        if radar:
            scene["radar"] = radar
        if aux_lidar:
            scene["aux_lidar"] = aux_lidar
        if calib_camera:
            calib["camera"] = calib_camera
        if calib_radar:
            calib["radar"] = calib_radar
        if calib_aux_lidar:
            calib["aux_lidar"] = calib_aux_lidar
        # if ego_pose:
        #     scene["ego_pose"] = ego_pose
            
    # else:
    #     scene["boxtype"] = "xyz"
    #     if point_transform_matrix:
    #         scene["point_transform_matrix"] = point_transform_matrix
    #     if camera:
    #         scene["camera"] = camera
    #     if radar:
    #         scene["radar"] = radar
    #     if calib_camera:
    #         calib["camera"] = calib_camera
    #     if calib_radar:
    #         calib["radar"] = calib_radar
    #     if calib_aux_lidar:
    #         calib["aux_lidar"] = calib_aux_lidar

    scene["calib"] = calib


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

def save_annotations(scene, frame, anno):
    filename = os.path.join(root_dir, scene, "label", frame+".json")
    with open(filename, 'w') as outfile:
            json.dump(anno, outfile)

if __name__ == "__main__":
    print(get_all_scenes())