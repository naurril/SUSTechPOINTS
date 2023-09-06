import numpy as np
from nuscenes.nuscenes import NuScenes
from nuscenes.utils import splits
import os
import json
from pyquaternion import Quaternion

import argparse
parser = argparse.ArgumentParser(description='print dataset statistics by obj classes')        
parser.add_argument('src', type=str, help="")
parser.add_argument('dst', type=str, help="")
parser.add_argument('--ver', type=str, default='v1.0-trainval')
args = parser.parse_args()
    
output_dir = args.dst
nusc = NuScenes(version=args.ver, dataroot=args.src, verbose=True)

def get_available_scenes(nusc):
    available_scenes = []
    print('total scene num: {}'.format(len(nusc.scene)))
    for scene in nusc.scene:
        scene_token = scene['token']
        scene_rec = nusc.get('scene', scene_token)
        sample_rec = nusc.get('sample', scene_rec['first_sample_token'])
        sd_rec = nusc.get('sample_data', sample_rec['data']['LIDAR_TOP'])
        has_more_frames = True
        scene_not_exist = False
        while has_more_frames:
            lidar_path, boxes, _ = nusc.get_sample_data(sd_rec['token'])
            lidar_path = str(lidar_path)
            if os.getcwd() in lidar_path:
                # path from lyftdataset is absolute path
                lidar_path = lidar_path.split(f'{os.getcwd()}/')[-1]
                # relative path
            if not os.path.isfile(lidar_path):
                scene_not_exist = True
                break
            else:
                break
        if scene_not_exist:
            continue
        available_scenes.append(scene)
    print('exist scene num: {}'.format(len(available_scenes)))
    return available_scenes


def make_link(src, dst):
    if not os.path.exists(dst):
        os.symlink(src, dst, )

def build_transformation_matrix(info):
    t = Quaternion(info['rotation']).transformation_matrix
    t[:3, 3] = info['translation']
    return t
def build_censor_to_global_transformation_matrix(token):
    data = nusc.get('sample_data', token)
    cs = nusc.get('calibrated_sensor', data['calibrated_sensor_token'])
    ego_pose = nusc.get('ego_pose', data['ego_pose_token'])
    l2e = build_transformation_matrix(cs)
    e2g = build_transformation_matrix(ego_pose)
    return np.matmul(e2g, l2e)


def get_calib_lidar_camera(lidar_token, camera_token):
    l2g = build_censor_to_global_transformation_matrix(lidar_token)
    c2g = build_censor_to_global_transformation_matrix(camera_token)
    return np.matmul(np.linalg.inv(c2g), l2g)

def build_scene(scene):
    sample_token = scene['first_sample_token']
    frame_idx = 0
    os.makedirs(os.path.join(output_dir, scene['name'], 'lidar'), exist_ok=True)
    os.makedirs(os.path.join(output_dir, scene['name'], 'label'), exist_ok=True)
    os.makedirs(os.path.join(output_dir, scene['name'], 'lidar_pose'), exist_ok=True)
    os.makedirs(os.path.join(output_dir, scene['name'], 'calib', 'camera'), exist_ok=True)
    sample = nusc.get('sample', sample_token)
    cam_names = [key for key in sample['data'].keys() if 'CAM' in key]
    for cam in cam_names:
        os.makedirs(os.path.join(output_dir, scene['name'], 'camera', cam), exist_ok=True)
        os.makedirs(os.path.join(output_dir, scene['name'], 'calib', 'camera', cam), exist_ok=True)
    while sample_token:
        sample = nusc.get('sample', sample_token)
        sample_token = sample['next']
        #print(sample_token)
        lidar_token = sample['data']['LIDAR_TOP']
        lidar_data = nusc.get('sample_data', lidar_token)
        lidar_filepath, boxes, _ = nusc.get_sample_data(lidar_token)
        #print(lidar_filepath)
        #make_link(lidar_filepath, os.path.join(output_dir, scene['name'], 'lidar', f"{frame_idx:04d}.pcd.bin"))
        pts = np.fromfile(lidar_filepath, dtype=np.float32).reshape(-1, 5)
        pts[:,0:4].astype(np.float32).tofile(os.path.join(output_dir, scene['name'], 'lidar', f"{frame_idx:04d}.bin"))
        ann = {
            "scene": scene['name'],
            "frame": f"{frame_idx:04d}",
            "objs": list(map(lambda x: {
                "psr": {
                    "position": {
                        "x": x.center[0],
                        "y": x.center[1],
                        "z": x.center[2]
                    },
                    "scale": {
                        "x": x.wlh[1],
                        "y": x.wlh[0],
                        "z": x.wlh[2]
                    },
                    "rotation": {
                        "x": x.orientation.yaw_pitch_roll[2],
                        "y": x.orientation.yaw_pitch_roll[1],
                        "z": x.orientation.yaw_pitch_roll[0]
                    }
                },
                "obj_type": x.name,
                "obj_id": nusc.get('sample_annotation', x.token)['instance_token'],
            }, boxes))
        }
        with open(os.path.join(output_dir, scene['name'], 'label', f"{frame_idx:04d}.json"), 'w') as f:
            json.dump(ann, f)
        # get all camera names for this sample
        # cam_names = [key for key in sample['data'].keys() if 'CAM' in key]
        # print(cam_names)
        lidar_pose = build_censor_to_global_transformation_matrix(lidar_token)
        with open(os.path.join(output_dir, scene['name'], 'lidar_pose', f"{frame_idx:04d}.json"), 'w') as f:
            json.dump({
                "lidarPose": lidar_pose.reshape(-1).tolist()
            }, f)
        for cam in cam_names:
            cam_token = sample['data'][cam]
            cam_data = nusc.get('sample_data', cam_token)
            cam_filepath = cam_data['filename']
            print(cam_filepath)
            make_link(os.path.join(args.src, cam_filepath), os.path.join(output_dir, scene['name'], 'camera', cam, f"{frame_idx:04d}.jpg"))
            calib = {
                'lidar_to_camera': get_calib_lidar_camera(lidar_token, cam_token).reshape(-1).tolist(),
                'intrinsic': np.array(nusc.get('calibrated_sensor', cam_data['calibrated_sensor_token'])['camera_intrinsic']).reshape(-1).tolist()
            }
            with open(os.path.join(output_dir, scene['name'], 'calib', 'camera', cam, f"{frame_idx:04d}.json"), 'w') as f:
                json.dump(calib, f)
        frame_idx += 1




scenes = get_available_scenes(nusc)
for scene in scenes:
    print(scene['name'])
    build_scene(scene)
