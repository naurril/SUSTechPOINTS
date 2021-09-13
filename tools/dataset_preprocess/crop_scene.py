
import os
import sys
#
# all links are relative path.
#
#
# example
# ~/anaconda3/bin/python ~/code2/SUSTechPoints-be-dev/tools/dataset_preprocess/scene_crop.py  2021-07-07/2021-07-07-02-31-00_preprocessed/dataset_2hz calib  scene-000001  1625625063 20  "turn left T road"
#

dataset_root = "/home/lie/nas"


camera_list = ["front", "front_right", "front_left", "rear_left", "rear_right", "rear"]
aux_lidar_list = ["front","left","right","rear"]
slots = ["000", "500"]

def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)


def generate_unique_scene_id():
    scenes = os.listdir(os.path.join("suscape_scenes"))

    if len(scenes) == 0:
        return 0
    # scenes-000018, scenes-000018_10hz
    ids = map(lambda s: int((s.split("-")[1]).split("_")[0]), scenes)
    maxid = max(ids)    
    
    return maxid+1

# in dataset folder
def generate_dataset_links(src_data_folder, start_time, seconds):
    cwd = os.getcwd()

    prepare_dirs('camera')
    prepare_dirs('lidar')
    prepare_dirs('label')
    prepare_dirs('aux_lidar')
    prepare_dirs('radar')
    prepare_dirs('infrared_camera')
    prepare_dirs('ego_pose')

    # prepare_dirs(os.path.join(dataset_path, 'calib'))
    # prepare_dirs(os.path.join(dataset_path, 'calib/camera'))
    
    os.system("ln -s -f ../../calib ./")
    
    
    os.chdir("camera")

    for camera in camera_list:
        
        prepare_dirs(camera)
        os.chdir(camera)

        for second in range(int(start_time), int(start_time) + int(seconds)):
            for slot in slots:
                os.system("ln -s -f  ../../../../" + src_data_folder  + "/camera/" + camera + "/"+ str(second) + "." +  str(slot) + ".jpg  ./")
        os.chdir("..")
    
    os.chdir("../infrared_camera")

    for camera in camera_list:
        
        prepare_dirs(camera)
        os.chdir(camera)

        for second in range(int(start_time), int(start_time) + int(seconds)):
            for slot in slots:
                os.system("ln -s -f  ../../../../" + src_data_folder  + "/infrared_camera/" + camera + "/"+ str(second) + "." +  str(slot) + ".jpg  ./")
        os.chdir("..")
    


    os.chdir("..") #scene-xxx
    os.chdir("lidar")
    for second in range(int(start_time), int(start_time) + int(seconds)):
        for slot in slots:
            os.system("ln -s -f ../../../" + src_data_folder + "/lidar/" + str(second) + "." +  str(slot) +".pcd ./")
    

    os.chdir("../ego_pose")
    for second in range(int(start_time), int(start_time) + int(seconds)):
        for slot in slots:
            os.system("ln -s -f ../../../" + src_data_folder + "/ego_pose/" + str(second) + "." +  str(slot) +".json ./")
    

    os.chdir("../aux_lidar")

    for auxlidar in aux_lidar_list:
        
        prepare_dirs(auxlidar)
        os.chdir(auxlidar)

        for second in range(int(start_time), int(start_time) + int(seconds)):
            for slot in slots:
                os.system("ln -s -f  ../../../../" + src_data_folder  + "/aux_lidar/" + auxlidar + "/"+ str(second) + "." +  str(slot) + ".pcd  ./")
        os.chdir("..")

def read_scene_cfg(f):
    cfg = {}
    with open(f, 'r') as f:
        lines = f.readlines()
        
        for l in lines:
            l = l.strip()
            words =  l.split(":")
            if len(words) == 2:
                key = words[0].split('"')[1]
                value = words[1].split('"')[1]
                cfg[key]=value
    return cfg
    

def regen_context(scene_path):
        savecwd = os.getcwd()
        os.chdir(scene_path)

        if os.path.exists("./desc.json"):
                cfg = read_scene_cfg("./desc.json")

                #we are in scene folder!
                src_data_folder = cfg["folder"]

                generate_context_scene(src_data_folder, scene_path)
        else:
            print("desc.json doesn't exist!")
            print("execute this command in scene folder")

        os.chdir(savecwd)

def  regen_scene(scene_path):
        savecwd = os.getcwd()
        os.chdir(scene_path)

        os.system("rm -rf camera  infrared_camera lidar aux_lidar radar ego_pose")

        if os.path.exists("./desc.json"):
                cfg = read_scene_cfg("./desc.json")

                #we are in scene folder!
                src_data_folder = cfg["folder"]
                start_time = cfg["starttime"]
                seconds  =cfg["seconds"]


                generate_dataset_links(src_data_folder, start_time, seconds)
        else:
            print("desc.json doesn't exist!")
            print("execute this command in scene folder")

        os.chdir(savecwd)
        print("checking", scene_path)
        check_scene(scene_path)
        os.chdir(savecwd)

def checkfile(f):
    if not os.path.exists(f):
        print(f, "doesn't exit")
        return False
    if not os.path.isfile(f):
        print(f, "is not a file")
        return False


def checkdir(f):
    if not os.path.exists(f):
        print(f, "doesn't exit")
        return False
        
    if not os.path.isdir(f):
        print(f, "is not a directory")
        return False

# def rename_label(scene_path):
#     os.chdir(os.path.join(scene_path, "label"))
#     os.system("rename -E s/.json/00.json/ *")

def check_scene(scene_path):
    checkfile(scene_path + "/desc.json")
    cfg = read_scene_cfg(scene_path + "/desc.json")
    #print(cfg)
    src_data_folder = cfg["folder"]
    start_time = cfg["starttime"]
    seconds  =cfg["seconds"]


    checkdir(scene_path + "/" + "lidar")
    for second in range(int(start_time), int(start_time) + int(seconds)):
        for slot in slots:
            f = scene_path + "/" + "lidar/" + str(second) + "." +  str(slot) +".pcd"
            checkfile(f)

    checkdir(scene_path + "/" + "label")
    checkdir(scene_path + "/" + "calib")
    checkdir(scene_path + "/" + "camera")
    for c in camera_list:
        checkdir(scene_path + "/" + "camera/"+c)

        for second in range(int(start_time), int(start_time) + int(seconds)):
            for slot in slots:
                f = scene_path + "/" + "camera/" + c + "/"+ str(second) + "." +  str(slot) + ".jpg"
                checkfile(f)
    
    checkdir(scene_path + "/" + "infrared_camera")
    for c in camera_list:
        checkdir(scene_path + "/" + "infrared_camera/"+c)

        for second in range(int(start_time), int(start_time) + int(seconds)):
            for slot in slots:
                f = scene_path + "/" + "infrared_camera/" + c + "/"+ str(second) + "." +  str(slot) + ".jpg"
                checkfile(f)
    
    checkdir(scene_path + "/" + "aux_lidar")
    for c in aux_lidar_list:
        checkdir(scene_path + "/" + "aux_lidar/"+c)

        for second in range(int(start_time), int(start_time) + int(seconds)):
            for slot in slots:
                f = scene_path + "/" + "aux_lidar/" + c + "/"+ str(second) + "." +  str(slot) + ".pcd"
                checkfile(f)

def generate_context_scene(src_data_folder, scene_id):
    # create context 10hz scene.
    os.chdir(dataset_root)
    context_scene_path = "suscape_scenes/" + scene_id +"_10hz"
    prepare_dirs(context_scene_path)
    os.chdir(context_scene_path)

    context_src_folder = os.path.relpath("../../"+src_data_folder+"/../dataset_10hz")
    
    os.system("ln -s -f ../" + scene_id + "/label ./")
    os.system("ln -s -f  " + context_src_folder  + "/camera ./")
    os.system("ln -s -f  " + context_src_folder  + "/lidar ./")
    os.system("ln -s -f  " + context_src_folder  + "/calib ./")
    os.system("ln -s -f  " + context_src_folder  + "/ego_pose ./")


    # create context 2hz scene.
    os.chdir(dataset_root)
    context_scene_path = "suscape_scenes/" + scene_id +"_full_2hz"
    prepare_dirs(context_scene_path)
    os.chdir(context_scene_path)

    context_src_folder = os.path.relpath("../../"+src_data_folder+"/../dataset_2hz")
    
    os.system("ln -s -f ../" + scene_id + "/label ./")
    os.system("ln -s -f  " + context_src_folder  + "/camera ./")
    os.system("ln -s -f  " + context_src_folder  + "/lidar ./")
    os.system("ln -s -f  " + context_src_folder  + "/calib ./")
    os.system("ln -s -f  " + context_src_folder  + "/ego_pose ./")

def generate_dataset(src_data_folder, scene_id, start_time, seconds, desc):
    
    savecwd = os.getcwd()
    os.chdir(dataset_root)

    if scene_id == "-":
        id = generate_unique_scene_id()
        scene_id = "scene-{0:06d}".format(id)

    cwd = os.getcwd()
    print("generating", scene_id)
    print(start_time, seconds)
    print(desc)

    scene_path = "suscape_scenes/" + scene_id
    prepare_dirs(scene_path)
    os.chdir(scene_path)

    
    with open("./desc.json", "w") as f:
        f.writelines([
            '{\n',
            '"scene":"' + desc +'\",\n',
            '"folder":"' + src_data_folder +'\",\n',
            '"starttime":"' + str(start_time) +'\",\n',
            '"seconds":"' + str(seconds) +'\"\n',
            '}\n'
        ])

    generate_dataset_links(src_data_folder, start_time, seconds)

    # check scene.
    os.chdir(dataset_root)
    print("checking", scene_path)
    check_scene(scene_path)
    
    generate_context_scene(src_data_folder, scene_id)

    print("done.")

    os.chdir(savecwd)
    return id

# if scene_id == ""
#  a new scene id will be generated automatically.

if __name__ == "__main__":

    cmd = sys.argv[1]
    if cmd == "generate":
        if len(sys.argv) == 7:
            _, cmd, src_data_folder, scene_id, start_time, seconds, comments = sys.argv

            id = generate_dataset(src_data_folder, scene_id, start_time, seconds, comments )
        else:
            print("args: generate, src_data_folder, scene_id, start_time, seconds, comments")
    elif cmd == "regen":
        # try regenerate scene data
        # precondition: the desc.json exists

        scene_path = "./"
        if len(sys.argv) == 3:
            scene_path = sys.argv[2]
        
        regen_scene(scene_path)
    elif cmd == "regencontext":
        scene_path = "./"
        if len(sys.argv) == 3:
            scene_path = sys.argv[2]
        
        regen_context(scene_path)

    elif cmd == "regencontextall":
        root_path = "./"
        if len(sys.argv) == 3:
            root_path = sys.argv[2]
        
        scenes = os.listdir(root_path)
        scenes.sort()
        for s in scenes:
            if len(s.split("_")) == 1:  # dont' regen ... _10hz
                print("regenerating context", s)
                regen_context(root_path + "/" + s)

    elif cmd == "regenall":
        root_path = "./"
        if len(sys.argv) == 3:
            root_path = sys.argv[2]
        
        scenes = os.listdir(root_path)
        scenes.sort()
        for s in scenes:
            if len(s.split("_")) == 1:  # dont' regen ... _10hz
                print("regenerating", s)
                regen_scene(root_path + "/" + s)
    elif cmd == "check":
        scene_path = "./"
        if len(sys.argv) == 3:
            scene_path = sys.argv[2]
        
        print("checking", scene_path)
        check_scene(scene_path)
    elif cmd == "checkall":
        root_path = "./"
        if len(sys.argv) == 3:
            root_path = sys.argv[2]
        
        scenes = os.listdir(root_path)
        scenes.sort()
        for s in scenes:
            if len(s.split("_")) == 1:  # dont' check ... _10hz
                print("checking", s)
                check_scene(root_path + "/" + s)
    # elif cmd == "renamelabel":
    #     root_path = "./"
    #     if len(sys.argv) == 3:
    #         root_path = sys.argv[2]
        
    #     scenes = os.listdir(root_path)
    #     scenes.sort()
    #     for s in scenes:
    #         if len(s.split("_")) == 1:  # dont' check ... _10hz
    #             print("checking", s)
    #             rename_label(root_path + "/" + s)
    else:
        print("unknown commands: ", cmd)
        print("accept commands: generate, regen, check")