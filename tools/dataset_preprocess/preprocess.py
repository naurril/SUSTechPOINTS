
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
    
def process_one_infrared_camera(camera, calib_path, raw_data_path, output_path):
    calib_file = os.path.join(calib_path, 'infrared_camera', camera, 'ost.yaml')
    rectify_image.rectify_folder(calib_file, 
                                os.path.join(raw_data_path, 'infrared_camera', camera, 'image_color'),
                                os.path.join(output_path, 'intermediate', 'infrared_camera', camera, 'rectified'))

    align_frame_time.link_one_folder(os.path.join('../rectified'),
                                     os.path.join(output_path, 'intermediate', 'infrared_camera', camera, 'aligned'),
                                     camera_time_offset[camera],
                                     30
                                    )

def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)

def generate_dataset(extrinsic_calib_path, dataset_path, timeslots):

    
    prepare_dirs(dataset_path)
    prepare_dirs(os.path.join(dataset_path, 'camera'))
    prepare_dirs(os.path.join(dataset_path, 'lidar'))
    prepare_dirs(os.path.join(dataset_path, 'label'))


    #prepare_dirs(os.path.join(dataset_path, 'calib'))
    #prepare_dirs(os.path.join(dataset_path, 'calib/camera'))

    os.chdir(dataset_path)
    os.system("ln -s -f " + os.path.relpath(extrinsic_calib_path) + " ./")


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
            process_one_infrared_camera(camera, intrinsic_calib_path, raw_data_path, output_path)

        if os.path.exists(os.path.join(raw_data_path, 'pandar_points')):
            align_frame_time.link_one_folder(os.path.join(raw_data_path, 'pandar_points'),  #after 07.15, this topic path has hesai prefix.
                                            os.path.join(output_path, 'intermediate', 'lidar'),
                                            0)
        else:
            align_frame_time.link_one_folder(os.path.join(raw_data_path, 'hesai', 'pandar_points'),  #after 07.15, this topic path has hesai prefix.
                                            os.path.join(output_path, 'intermediate', 'lidar'),
                                            0)

    
    

if __name__ == "__main__":

    if len(sys.argv) == 8:
        _, intrinsic_calib_path, extrinsic_calib_path, raw_data_path, output_path, gen_dataset_only, dataset_name, timeslots = sys.argv

        if not (gen_dataset_only == 'gen-dataset-only'):
            process(intrinsic_calib_path, raw_data_path, output_path)

        generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )

    elif len(sys.argv) == 4:
        _, intrinsic_calib_path, extrinsic_calib_path, raw_data_root_path = sys.argv

        savecwd = os.getcwd()
        
        for f in os.listdir(raw_data_root_path):
            os.chdir(savecwd)
            print(f)

            raw_data_path = os.path.join(raw_data_root_path, f)
            if os.path.isdir(raw_data_path):
                if f.endswith("_preprocessed"):
                    continue

                output_path = os.path.join(raw_data_root_path, f + "_preprocessed")
                
                if os.path.exists(output_path):
                    continue

                gen_dataset_only = "no"
                

                if not (gen_dataset_only == 'gen-dataset-only'):
                    process(intrinsic_calib_path, raw_data_path, output_path)

                dataset_name = "dataset_2hz"
                timeslots = "0,5"
                generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )

                dataset_name = "dataset_10hz"
                timeslots = "0,1,2,3,4,5,6,7,8,9"
                generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )


    else:
        print("intrinsic_calib_path, extrinsic_calib_path, raw_data_path, output_path, gen_dataset_only, dataset_name, timeslots ")
        print("intrinsic_calib_path, extrinsic_calib_path, raw_data_path")
        exit()