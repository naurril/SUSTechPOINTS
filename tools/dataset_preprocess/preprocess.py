
import os
import sys
from pyproj import Proj #wgs84->utm transformation

from progress.bar import Bar

import align_frame_time
import rectify_image
import pcd_restore
import json
import numpy as np

enable_lidar_restore = False

camera_list = [
  'front', 'front_left', 'front_right','rear',
  'rear_left', 'rear_right']

aux_lidar_list=['front','rear','left','right']
camera_time_offset = {
    'rear': 0,
    'rear_left': -17,
    'front': -50, 
    'front_left': -33,
    'front_right': -67,
    'rear_right': -83,
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


# if use restored lidar point clouds,
# we compensate motion effect for calibration.

def generate_dataset(extrinsic_calib_path, dataset_path, timeslots, lidar_type="restored"):
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

    if lidar_type == 'restored':
        for camera in camera_list:
            prepare_dirs(os.path.join(dataset_path, "calib", "camera", camera))
            os.chdir(os.path.join(dataset_path, "calib", "camera", camera))
            for slot in timeslots:
                os.system("ln -s -f  ../../../../intermediate/calib_motion_compensated/camera/" + camera + "/*" + slot+".json  ./")
    else:
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
        os.system("ln -s -f ../../intermediate/lidar/" + lidar_type +"/*."+slot+".pcd ./")
    
    os.chdir(os.path.join(dataset_path, "ego_pose"))

    for slot in timeslots:
        os.system("ln -s -f ../../intermediate/ego_pose/aligned/*."+slot+".json ./")
    
    for al in aux_lidar_list:
        
        dir = os.path.join(dataset_path, "aux_lidar", al)
        prepare_dirs(dir)
        os.chdir(dir)

        for slot in timeslots:
            os.system("ln -s -f  ../../../intermediate/aux_lidar/" + al + "/*."+slot+".pcd  ./")


def generate_dataset_lidar_destorted(extrinsic_calib_path, dataset_path, timeslots):

    
    prepare_dirs(dataset_path)
    prepare_dirs(os.path.join(dataset_path, 'lidar'))
    prepare_dirs(os.path.join(dataset_path, 'label'))
    prepare_dirs(os.path.join(dataset_path, 'ego_pose'))

    os.chdir(dataset_path)
    

    os.chdir(os.path.join(dataset_path, "lidar"))

    for slot in timeslots:
        os.system("ln -s -f ../../intermediate/lidar/aligned/*."+slot+".pcd ./")
    
    os.chdir(os.path.join(dataset_path, "ego_pose"))

    for slot in timeslots:
        os.system("ln -s -f ../../intermediate/ego_pose/aligned/*."+slot+".json ./")
    
    
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
        
        
        
def timestamp_add(ts, delta_ms):
    [s,ms] = ts.split(".")
    s = int(s)
    ms = int(ms)
    new_ms = ms+delta_ms    
    new_s = s + (new_ms // 1000)
    new_ms %= 1000
    return str(new_s)+"." + "{:03d}".format(new_ms)

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
            timestamp = os.path.splitext(f)[0]
            nexttimestamp = timestamp_add(timestamp, 100)

            pose1file = os.path.join(pose_folder, timestamp+".json")
            pose2file = os.path.join(pose_folder, nexttimestamp+".json")

            if os.path.exists(pose1file) and os.path.exists(pose2file):
                dst_file = os.path.join(dst_folder, f)
                #if not os.path.exists(dst_file):
                pcd_restore.pcd_restore(os.path.join(src_folder, f), \
                                       os.path.join(dst_folder, f), \
                                       os.path.join(pose_folder, timestamp+".json"), \
                                       os.path.join(pose_folder, nexttimestamp+".json"), \
                                       timestamp)                                        
                # else:
                #     print("output file exists")
            else:
                print("pose file does not exist", timestamp, nexttimestamp)
    

def calib_motion_compensate(output_path, extrinsic_calib_path):
    dst_folder = os.path.join(output_path, "intermediate", "calib_motion_compensated")
    if not os.path.exists(dst_folder):
        os.makedirs(dst_folder)

    src_folder = os.path.join(output_path, "intermediate", "lidar", "aligned")


    static_calib = {}
    for camera in camera_list:
        prepare_dirs(os.path.join(output_path, "intermediate", "calib_motion_compensated", "camera",  camera))

        with open(os.path.join(extrinsic_calib_path,'camera',camera+".json")) as f:
            static_calib[camera] = json.load(f)

    files = os.listdir(src_folder)
    files.sort()

    pose_folder = os.path.join(output_path, "intermediate", "ego_pose", "aligned")

    camera_in_order = ['rear','rear_left','front_left','front', 'front_right','rear_right']

    with Bar('compensating motion for calib', max=len(files)) as bar:
        for f in files:
            bar.next()
            timestamp = os.path.splitext(f)[0]
            nexttimestamp = timestamp_add(timestamp, 100)

            pose1file = os.path.join(pose_folder, timestamp+".json")
            pose2file = os.path.join(pose_folder, nexttimestamp+".json")

            if os.path.exists(pose1file) and os.path.exists(pose2file):

                with open(pose1file) as f:
                    pose1 = json.load(f)
                with open(pose2file) as f:
                    pose2  = json.load(f)

                translate = [float(pose2['x'])-float(pose1['x']), 
                             float(pose2['y'])-float(pose1['y']), 
                             float(pose1['z'])-float(pose2['z'])]  # lidar start -> lidar end            
                rotation = [float(pose2['pitch'])- float(pose1['pitch']), 
                            float(pose2['roll']) - float(pose1['roll']), 
                            float(pose2['azimuth'])  - float(pose1['azimuth'])] #lidar start -> lidar end

                translate_step = np.array(translate)/6
                rotation_step = np.array(rotation)/6

                for i in range(6):
                    lidar_0_to_lidar_c = pcd_restore.euler_angle_to_rotate_matrix(rotation_step*i,translate_step*i)
                    extrinsic = np.matmul(lidar_0_to_lidar_c, np.reshape(np.array(static_calib[camera_in_order[i]]['extrinsic']),(4,4)))

                    calib = {
                        'extrinsic': np.reshape(extrinsic,(-1)).tolist(),
                        'intrinsic': static_calib[camera_in_order[i]]['intrinsic']
                    }

                    #print(calib)
                    with open(os.path.join(output_path,"intermediate", "calib_motion_compensated",'camera',camera_in_order[i], timestamp+".json"), 'w') as f:
                        json.dump(calib, f, indent=2, sort_keys=True)
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
        
        if True:# func=='all':
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
                    if  func == "pcd_restore" or (func =="all" and enable_lidar_restore):
                        lidar_pcd_restore(output_path)
                    
                    if func == "calib_motion_compensate" or (func =="all" and enable_lidar_restore):
                        calib_motion_compensate(output_path, extrinsic_calib_path)

                    if func == "generate_dataset"  or func=="all":
                        dataset_name = "dataset_2hz"
                        timeslots = "000,500"
                        generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(","), 'restored')

                        dataset_name = "dataset_10hz"
                        timeslots = "?00" #"000,100,200,300,400,500,600,700,800,900"
                        generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(","), 'restored')

                    if func == "generate_dataset_original_lidar" or func== 'all':
                        dataset_name = "dataset_2hz_original_lidar"
                        timeslots = "000,500"
                        generate_dataset(extrinsic_calib_path,  os.path.join(output_path, dataset_name), timeslots.split(","), 'aligned' )

        else: 
            if  func == "pcd_restore":
                output_path = os.path.join(raw_data_root_path + "_preprocessed")
                lidar_pcd_restore(output_path)


    else:
        print("func intrinsic_calib_path, extrinsic_calib_path, raw_data_path")
        exit()