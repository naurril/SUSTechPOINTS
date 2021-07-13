
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
slots = [0, 5]

def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)


def generate_unique_scene_id():
    scenes = os.listdir(os.path.join("suscape_scenes"))

    if len(scenes) == 0:
        return 0

    ids = map(lambda s: int(s.split("-")[1]), scenes)
    maxid = max(ids)    
    
    return maxid+1

def generate_dataset(src_data_folder,extrinsic_calib_path, scene_id, start_time, seconds, desc):
    
    savecwd = os.getcwd()
    os.chdir(dataset_root)

    if scene_id == "-":
        id = generate_unique_scene_id()
        scene_id = "scene-{0:06d}".format(id)

    cwd = os.getcwd()
    print("generating", scene_id)
    print(start_time, seconds)
    print(desc)

    dataset_path = "suscape_scenes/" + scene_id
    prepare_dirs(dataset_path)
    os.chdir(dataset_path)

    
    with open("./desc.json", "w") as f:
        f.writelines([
            '{\n',
            '"scene":"' + desc +'\",\n',
            '"folder":"' + src_data_folder +'\",\n',
            '"starttime":"' + str(start_time) +'\",\n',
            '"seconds":"' + str(seconds) +'\"\n',
            '}\n'
        ])

    prepare_dirs('camera')
    prepare_dirs('lidar')
    prepare_dirs('label')
    # prepare_dirs(os.path.join(dataset_path, 'calib'))
    # prepare_dirs(os.path.join(dataset_path, 'calib/camera'))
    
    os.system("ln -s -f ../../"+extrinsic_calib_path+" ./")
    os.chdir(cwd)
    
    for camera in camera_list:
        
        prepare_dirs(os.path.join(dataset_path, "camera",  camera))
        os.chdir(os.path.join(dataset_path, "camera", camera))

        for second in range(int(start_time), int(start_time) + int(seconds)):
            for slot in slots:
                os.system("ln -s -f  ../../../../" + src_data_folder  + "/camera/" + camera + "/"+ str(second) + "." +  str(slot) + ".*  ./")
        os.chdir(cwd)
    
    
    os.chdir(os.path.join(dataset_path, "lidar"))

    for second in range(int(start_time), int(start_time) + int(seconds)):
        for slot in slots:
            os.system("ln -s -f ../../../" + src_data_folder + "/lidar/" + str(second) + "." +  str(slot) +".pcd ./")
    os.chdir(cwd)

    os.chdir(savecwd)

    print("done.")
    return id

# if scene_id == ""
#  a new scene id will be generated automatically.

if __name__ == "__main__":
    _, src_data_folder, extrinsic_calib_path, scene_id, start_time, seconds, comments = sys.argv

    id = generate_dataset(src_data_folder, extrinsic_calib_path, scene_id, start_time, seconds, comments )
    

