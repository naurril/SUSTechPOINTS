
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

def generate_dataset(calib_path, raw_path, dataset_path):

    
    prepare_dirs(dataset_path)
    prepare_dirs(os.path.join(dataset_path, 'camera'))
    prepare_dirs(os.path.join(dataset_path, 'lidar'))
    prepare_dirs(os.path.join(dataset_path, 'label'))
    prepare_dirs(os.path.join(dataset_path, 'calib'))
    prepare_dirs(os.path.join(dataset_path, 'calib/camera'))

    for camera in camera_list:
        os.chdir(os.path.join(dataset_path, "/camera/", camera))
        prepare_dirs(os.path.join(dataset_path, "camera",  camera))
        os.system("ln -s ../../../intermediate/camera/" + camera + "/aligned/*.5.jpg  ./)
        os.system("ln -s ../../../intermediate/camera/" + camera + "/aligned/*.0.jpg  ./")
        
    os.chdir(os.path.join(dataset_path, "/lidar"))
    os.system("ln -s ../../intermediate/lidar/*.0.pcd ./")
    os.system("ln -s ../../intermediate/lidar/*.5.pcd ./")
    
    
def process(calib_path, raw_data_path, output_path):
    
    
    for camera in camera_list:
        process_one_camera(camera, calib_path, raw_data_path, output_path)

    align_frame_time.link_one_folder(os.path.join(raw_data_path, 'pandar_points'),
                                     os.path.join(output_path, 'intermediate', 'lidar'),
                                     0)

    generate_dataset(calib_path, os.path.join(output_path, 'intermediate'), os.path.join(output_path, "dataset"))
    



    

if __name__ == "__main__":
    _, calib_path, raw_data_path, output_path = sys.argv

    process(calib_path, raw_data_path, output_path)