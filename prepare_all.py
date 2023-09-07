import os
import prepare_pcd
import json
this_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.join(this_dir, "data")

data_dirs = os.listdir(root_dir)

for folder in data_dirs:
    print(f"Checking {folder}...")
    scene_dir = os.path.join(root_dir, folder)
    try:
        las_files = os.listdir(os.path.join(scene_dir, "las_files"))
        print(f"Some .las files found.")
        for file in las_files:
            filename_cut, ext = os.path.splitext(os.path.basename(file))
            if ext != '.las':
                continue
            
            print(f"Converting .data/{folder}/{filename_cut}.las ...")
            file_path = os.path.join(scene_dir, "las_files", file)
            pcd_name = os.path.join(scene_dir, "lidar", f'{filename_cut}_converted.pcd')
            
            if not os.path.isfile(pcd_name):
                prepare_pcd.convert_for_server(file_path)
                json_name = os.path.join(scene_dir, "label", f'{filename_cut}_converted.json')
                with open(json_name,'w') as f:
                    json.dump([], f)
            print(f"Done converting .data/{folder}/{filename_cut}.las \n")

    except FileNotFoundError:
        print(f"No .las files found in this folder.\n")
        continue
    print(f"Done converting for {folder}\n")