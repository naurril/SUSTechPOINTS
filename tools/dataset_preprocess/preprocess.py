
import os
import sys
from pyproj import Proj #wgs84->utm transformation

from progress.bar import Bar

import align_frame_time
import rectify_image
import pcd_restore

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
    prepare_dirs(os.path.join(dataset_path, 'ego_pose'))


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
    
    os.chdir(os.path.join(dataset_path, "ego_pose"))

    for slot in timeslots:
        os.system("ln -s -f ../../intermediate/ego_pose/aligned/*."+slot+".json ./")
    
    for al in aux_lidar_list:
        
        dir = os.path.join(dataset_path, "aux_lidar", al)
        prepare_dirs(dir)
        os.chdir(dir)

        for slot in timeslots:
            os.system("ln -s -f  ../../../intermediate/aux_lidar/" + al + "/*."+slot+".pcd  ./")



    
def generate_pose(raw_data_path, output_path):
    dst_folder = os.path.join(output_path, "intermediate", "ego_pose", "filtered")
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)

    src_folder = os.path.join(raw_data_path, "gps_imu", "insinfo")

    files = os.listdir(src_folder)
    files.sort()


    wgs84_utm50_proj = Proj(proj='utm',zone=50,ellps='WGS84', preserve_units=False)

    with Bar('filtering pose', max=len(files)) as bar:
        for f in files:
            bar.next()
            with open(os.path.join(src_folder, f)) as fin:
                line = fin.readlines()[0]
                timestamp, content = line.split(' ')
                header, payload = content.split(';')
                #print(timestamp, header, payload)
                ins_status, pos_type, lat, lng, height, _, north_vel, east_vel, up_vel, roll, pitch, azimuth, \
                _,_,_,_,_,_,_,_,_,_,_ = payload.split(',')
                #print(ins_status, pos_type, lat, lng, height, north_vel, east_vel, up_vel, roll, pitch, azimuth)

                x,y = wgs84_utm50_proj(float(lng), float(lat))

                with open(os.path.join(dst_folder, os.path.splitext(f)[0]+".json"), "w") as fout:
                    fout.writelines([
                        '{\n',
                        '"ins_status":"' + ins_status +'\",\n',
                        '"pos_type":"' + pos_type +'\",\n',
                        '"lat":"' + lat +'\",\n',
                        '"lng":"' + lng +'\",\n',
                        '"height":"' + height +'\",\n',
                        '"north_vel":"' + north_vel +'\",\n',
                        '"east_vel":"' + east_vel +'\",\n',
                        '"up_vel":"' + up_vel +'\",\n',
                        '"roll":"' + roll +'\",\n',
                        '"pitch":"' + pitch +'\",\n',
                        '"azimuth":"' + azimuth +'\",\n',
                        '"x":"' + str(x) +'\",\n',
                        '"y":"' + str(y) +'\",\n',
                        '"z":"' + height +'\"\n',
                        '}\n'
                    ])
                


    
def rectify_cameras(intrinsic_calib_path, raw_data_path, output_path):
          
        for camera in camera_list:
            rectify_one_camera(camera, intrinsic_calib_path, raw_data_path, output_path)
            rectify_one_infrared_camera(camera, intrinsic_calib_path, raw_data_path, output_path)

def align(raw_data_path, output_path):
        print(output_path)
        # ego pose
        align_frame_time.link_one_folder(os.path.join('../filtered'),
                                     os.path.join(output_path, 'intermediate', 'ego_pose', "aligned"),
                                     0,
                                     20, 
                                     9,
                                     50) #period


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
                                            os.path.join(output_path, 'intermediate', 'lidar/aligned'),
                                            0, 30, 0)
        else:
            align_frame_time.link_one_folder(os.path.join(raw_data_path, 'hesai', 'pandar_packets'),  #after 07.15, this topic path has hesai prefix.
                                            os.path.join(output_path, 'intermediate', 'lidar/aligned'),
                                            0, 30, 0)

        for al in aux_lidar_list:
            align_frame_time.link_one_folder(os.path.join(raw_data_path, 'rsbp_'+al+'/rslidar_points'),
                                     os.path.join(output_path, 'intermediate', 'aux_lidar',al),
                                     0,
                                     30, 100)
        
        
        
def format_timestamp(ts):
    s = "{:0.03f}".format(ts)
    # if s[2]=='0':
    #     s = s[0:2]
    #     if s[1]=='0':
    #         s = s[0:1]
    return s


def lidar_pcd_restore(output_path):
    dst_folder = os.path.join(output_path, "intermediate", "lidar", "restored")
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)

    src_folder = os.path.join(output_path, "intermediate", "lidar", "aligned")

    files = os.listdir(src_folder)
    files.sort()

    pose_folder = os.path.join(output_path, "intermediate", "ego_pose", "aligned")

    with Bar('restoring lidar', max=len(files)) as bar:
        for f in files:
            bar.next()
            timestamp = float(os.path.splitext(f)[0])
            nexttimestamp = timestamp+0.1

            pose1file = os.path.join(pose_folder, format_timestamp(timestamp)+".json")
            pose2file = os.path.join(pose_folder, format_timestamp(nexttimestamp)+".json")

            if os.path.exists(pose1file) and os.path.exists(pose2file):
                dst_file = os.path.join(dst_folder, f)
                if not os.path.exists(dst_file):
                    pcd_restore.pcd_restore(os.path.join(src_folder, f), \
                                       os.path.join(dst_folder, f), \
                                       os.path.join(pose_folder, format_timestamp(timestamp)+".json"), \
                                       os.path.join(pose_folder, format_timestamp(nexttimestamp)+".json"), \
                                       timestamp)                                        
                # else:
                #     print("output file exists")
            else:
                print("pose file does not exist", timestamp, nexttimestamp)
    
    
#path should be abs path.
#
if __name__ == "__main__":

    if len(sys.argv) >= 5:
        _, func, intrinsic_calib_path, extrinsic_calib_path, raw_data_root_path = sys.argv[0:5]

        raw_data_root_path = os.path.abspath(raw_data_root_path)
        extrinsic_calib_path = os.path.abspath(extrinsic_calib_path)
        intrinsic_calib_path = os.path.abspath(intrinsic_calib_path)

        savecwd = os.getcwd()


        if len(sys.argv) >=6:
            subfolders = [sys.argv[5]]
        else:
            subfolders = os.listdir(raw_data_root_path)
            subfolders.sort()
        
        for f in subfolders:
            os.chdir(savecwd)
            print(f)

            raw_data_path = os.path.join(raw_data_root_path, f)
            if os.path.isdir(raw_data_path):
                if f.endswith("_preprocessed"):
                    continue
                if f.endswith("bagfile"):
                    continue

                output_path = os.path.join(raw_data_root_path, f + "_preprocessed")
                
                if os.path.exists(output_path) and func=='all':
                    continue


                if func == "rectify" or func=="all":
                    rectify_cameras(intrinsic_calib_path, raw_data_path, output_path)

                if func == "pose" or func=="all":
                    generate_pose(raw_data_path, output_path)

                if func == "align" or func=="all":
                    align(raw_data_path, output_path)

                # restore shoulb be after aligned
                if  func == "pcd_restore" or func =="all":
                    lidar_pcd_restore(output_path)
                

                if func == "generate_dataset"  or func=="all":
                    dataset_name = "dataset_2hz"
                    timeslots = "000,500"
                    generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )

                    dataset_name = "dataset_10hz"
                    timeslots = "000,100,200,300,400,500,600,700,800,900"
                    generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(",") )


    else:
        print("func intrinsic_calib_path, extrinsic_calib_path, raw_data_path")
        exit()