
import os
import sys
import align_frame_time
import rectify_image



def link_one_folder(src_folder, dst_folder, timestamp_offset_ms):
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)

    os.chdir(dst_folder)
    files = os.listdir(src_folder)
    files.sort()
    for file in files:

        sec,nsec,ext = file.split(".")

        msec = (int(nsec)//1000000 + 20 + timestamp_offset_ms)//100
        sec = int(sec) + msec//10
        msec = msec % 10
        #print(file, sec, msec)   # 20ms jitter
        os.system("ln -s "+src_folder + "/" + file + " " + dst_folder +"/" + str(sec) +"." + str(msec) + "."+ext)




camera_list = ['front', 'front_left', 'front_right', 'rear', 'rear_left', 'rear_right']

camera_time_offset = {
    'front': -50, 
    'front_left': -33,
    'front_right': -67,
    'rear': 0,
    'rear_left': -17,
    'rear_right': -83
}

def process_one_camera(camera, calib_path, raw_data_path, output_path):
    calib_file = os.path.join(calib_path, 'camera', camera, 'ost.yaml')
    rectify_image.rectify_folder(calib_file, 
                                os.path.join(raw_data_path, 'cameras', camera, 'image_color/compressed'),
                                os.path.join(output_path, 'intermediate', 'camera', camera, 'rectified'))

    align_frame_time.link_one_folder(os.path.join('../rectified'),
                                     os.path.join(output_path, 'intermediate', 'camera', camera, 'aligned'),
                                     camera_time_offset[camera]
                                    )
    
    

def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)

def generate_dataset(extrinsic_calib_path, dataset_path, timeslots):

    
    prepare_dirs(dataset_path)
    prepare_dirs(os.path.join(dataset_path, 'camera'))
    prepare_dirs(os.path.join(dataset_path, 'lidar'))
    prepare_dirs(os.path.join(dataset_path, 'label'))
    prepare_dirs(os.path.join(dataset_path, 'calib'))
    prepare_dirs(os.path.join(dataset_path, 'calib/camera'))

    os.chdir(os.path.join(dataset_path, "calib", "camera"))
    os.system("ln -s -f " + extrinsic_calib_path + "/camera/* ./")


    for camera in camera_list:
        prepare_dirs(os.path.join(dataset_path, "camera",  camera))
        os.chdir(os.path.join(dataset_path, "camera", camera))

        for slot in timeslots:
            os.system("ln -s -f  ../../../intermediate/camera/" + camera + "/aligned/*."+slot+".jpg  ./")
        
    os.chdir(os.path.join(dataset_path, "lidar"))

    for slot in timeslots:
        os.system("ln -s -f ../../intermediate/lidar/*."+slot+".pcd ./")
    
    
    
def process(intrinsic_calib_path, raw_data_path, output_path):
          
        for camera in camera_list:
            process_one_camera(camera, intrinsic_calib_path, raw_data_path, output_path)

        align_frame_time.link_one_folder(os.path.join(raw_data_path, 'pandar_points'),
                                        os.path.join(output_path, 'intermediate', 'lidar'),
                                        0)

    
    

if __name__ == "__main__":

    if len(sys.argv) != 8:
        print("intrinsic_calib_path, extrinsic_calib_path, raw_data_path, output_path, gen_dataset_only, dataset_name, timeslots ")
        exit()

    _, intrinsic_calib_path, extrinsic_calib_path, raw_data_path, output_path, gen_dataset_only, dataset_name, timeslots = sys.argv

    if not (gen_dataset_only == 'gen-dataset-only'):
        process(intrinsic_calib_path, raw_data_path, output_path)

    generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )