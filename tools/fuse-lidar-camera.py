
import os
import sys


def fuse_scene(fuse_cpp_exe, scene_folder, target_folder):
    lidar_files = os.listdir(os.path.join(scene_folder, 'lidar'))
    lidar_files.sort()

    frames = list(map(lambda f: os.path.splitext(f)[0], lidar_files))
    print('frames:', frames)

    #read camera names
    cameras = os.listdir(os.path.join(scene_folder, 'camera'))
    one_image = os.listdir(os.path.join(scene_folder, 'camera', cameras[0]))[0]
    image_ext = os.path.splitext(one_image)[1]
    print('image file ext:', image_ext)
    for c in cameras:
        output_folder = os.path.join(target_folder, 'camera', c)
        if not os.path.exists(output_folder):
                os.makedirs(output_folder)
        
        for f in frames:
            lidar = os.path.join(scene_folder, 'lidar', f+".pcd")
            image = os.path.join(scene_folder, 'camera', c, f+image_ext)
            calib = os.path.join(scene_folder, 'calib', 'camera', c+".json")
            output = os.path.join(output_folder, f+image_ext)
            cmd = "{} {} {} {} {}".format(fuse_cpp_exe, lidar, image, calib, output)
            print(cmd)
            os.system(cmd)


if __name__ == "__main__":
    exe = sys.argv[1]
    scene_folder = sys.argv[2]
    target_folder = sys.argv[3]

    fuse_scene(exe, scene_folder, target_folder)
