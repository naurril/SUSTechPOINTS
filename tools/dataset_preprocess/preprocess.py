
import os
import sys
import align_frame_time
import rectify_image


camera_list = ['front', 'front_left', 'front_right', 'rear', 'rear_left', 'rear_right']

aux_lidar_list=['front','rear','left','right']
camera_time_offset = {
    'front': -50, 
    'front_left': -33,
    'front_right': -67,
    'rear': 0,
    'rear_left': -17,
    'rear_right': -83
}


def rectify_one_camera(camera, calib_path, raw_data_path, output_path):
    calib_file = os.path.join(calib_path, 'camera', camera, 'ost.yaml')
    rectify_image.rectify_folder(calib_file, 
                                os.path.join(raw_data_path, 'cameras', camera, 'image_color/compressed'),
                                os.path.join(output_path, 'intermediate', 'camera', camera, 'rectified'))
def rectify_one_infrared_camera(camera, calib_path, raw_data_path, output_path):
    calib_file = os.path.join(calib_path, 'infrared_camera', camera, 'ost.yaml')
    rectify_image.rectify_folder(calib_file, 
                                os.path.join(raw_data_path, 'infrared_camera', camera, 'image_color'),
                                os.path.join(output_path, 'intermediate', 'infrared_camera', camera, 'rectified'))

def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)

def generate_dataset(extrinsic_calib_path, dataset_path, timeslots):

    
    prepare_dirs(dataset_path)
    prepare_dirs(os.path.join(dataset_path, 'camera'))
    prepare_dirs(os.path.join(dataset_path, 'lidar'))
    prepare_dirs(os.path.join(dataset_path, 'aux_lidar'))
    prepare_dirs(os.path.join(dataset_path, 'radar'))
    prepare_dirs(os.path.join(dataset_path, 'infrared_camera'))

    prepare_dirs(os.path.join(dataset_path, 'label'))


    #prepare_dirs(os.path.join(dataset_path, 'calib'))
    #prepare_dirs(os.path.join(dataset_path, 'calib/camera'))

    os.chdir(dataset_path)
    os.system("ln -s -f " + os.path.relpath(extrinsic_calib_path) + " ./calib")


    for camera in camera_list:
        prepare_dirs(os.path.join(dataset_path, "camera",  camera))
        os.chdir(os.path.join(dataset_path, "camera", camera))

        for slot in timeslots:
            os.system("ln -s -f  ../../../intermediate/camera/" + camera + "/aligned/*."+slot+".jpg  ./")
    
    for camera in camera_list:
        prepare_dirs(os.path.join(dataset_path, "infrared_camera",  camera))
        os.chdir(os.path.join(dataset_path, "infrared_camera", camera))

        for slot in timeslots:
            os.system("ln -s -f  ../../../intermediate/infrared_camera/" + camera + "/aligned/*."+slot+".jpg  ./")
        
    os.chdir(os.path.join(dataset_path, "lidar"))

    for slot in timeslots:
        os.system("ln -s -f ../../intermediate/lidar/*."+slot+".pcd ./")
    
    for al in aux_lidar_list:
        
        dir = os.path.join(dataset_path, "aux_lidar", al)
        prepare_dirs(dir)
        os.chdir(dir)

        for slot in timeslots:
            os.system("ln -s -f  ../../../intermediate/aux_lidar/" + al + "/*."+slot+".pcd  ./")


    
    
    
def rectify_cameras(intrinsic_calib_path, raw_data_path, output_path):
          
        for camera in camera_list:
            rectify_one_camera(camera, intrinsic_calib_path, raw_data_path, output_path)
            rectify_one_infrared_camera(camera, intrinsic_calib_path, raw_data_path, output_path)

def align(raw_data_path, output_path):

        for camera in camera_list:            
            align_frame_time.link_one_folder(os.path.join('../rectified'),
                                     os.path.join(output_path, 'intermediate', 'camera', camera, 'aligned'),
                                     camera_time_offset[camera]
                                    )
            
            align_frame_time.link_one_folder(os.path.join('../rectified'),
                                     os.path.join(output_path, 'intermediate', 'infrared_camera', camera, 'aligned'),
                                     camera_time_offset[camera],
                                     30, 0)

        if os.path.exists(os.path.join(raw_data_path, 'pandar_points')):
            align_frame_time.link_one_folder(os.path.join(raw_data_path, 'pandar_points'),  #after 07.15, this topic path has hesai prefix.
                                            os.path.join(output_path, 'intermediate', 'lidar'),
                                            0, 30, 0)
        else:
            align_frame_time.link_one_folder(os.path.join(raw_data_path, 'hesai', 'pandar_packets'),  #after 07.15, this topic path has hesai prefix.
                                            os.path.join(output_path, 'intermediate', 'lidar'),
                                            0, 30, 0)

        for al in aux_lidar_list:
            align_frame_time.link_one_folder(os.path.join(raw_data_path, 'rsbp_'+al+'/rslidar_points'),
                                     os.path.join(output_path, 'intermediate', 'aux_lidar',al),
                                     0,
                                     30, 100)


    
    
#path should be abs path.
#
if __name__ == "__main__":

    if len(sys.argv) == 5:
        _, func, intrinsic_calib_path, extrinsic_calib_path, raw_data_root_path = sys.argv

        raw_data_root_path = os.path.abspath(raw_data_root_path)
        extrinsic_calib_path = os.path.abspath(extrinsic_calib_path)
        intrinsic_calib_path = os.path.abspath(intrinsic_calib_path)

        savecwd = os.getcwd()
        
        for f in os.listdir(raw_data_root_path):
            os.chdir(savecwd)
            print(f)

            raw_data_path = os.path.join(raw_data_root_path, f)
            if os.path.isdir(raw_data_path):
                if f.endswith("_preprocessed"):
                    continue

                output_path = os.path.join(raw_data_root_path, f + "_preprocessed")
                
                if os.path.exists(output_path) and func=='all':
                    continue


                if func == "rectify" or func=="all":
                    rectify_cameras(intrinsic_calib_path, raw_data_path, output_path)

                if func == "align" or func=="all":
                    align(raw_data_path, output_path)

                if func == "generate_dataset"  or func=="all":
                    dataset_name = "dataset_2hz"
                    timeslots = "0,5"
                    generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )

                    dataset_name = "dataset_10hz"
                    timeslots = "0,1,2,3,4,5,6,7,8,9"
                    generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )


    else:
        print("func intrinsic_calib_path, extrinsic_calib_path, raw_data_path")
        exit()