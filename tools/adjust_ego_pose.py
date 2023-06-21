import os
import re
import json
import open3d as o3d
from utils import remove_box, SuscapeScene
import numpy as np
import argparse
import copy

parser = argparse.ArgumentParser(description='adjust ego pose')
parser.add_argument('data', type=str, help="")
parser.add_argument('--lidar', type=str, default="", help="")
parser.add_argument('--scenes', type=str, default=".*", help="")
parser.add_argument('--output', type=str, default='./output', help="")

args = parser.parse_args()

def draw_registration_result(source, target, transformation):
    source_temp = copy.deepcopy(source)
    target_temp = copy.deepcopy(target)
    source_temp.paint_uniform_color([1, 0.706, 0])
    target_temp.paint_uniform_color([0, 0.651, 0.929])
    source_temp.transform(transformation)
    o3d.visualization.draw_geometries([source_temp, target_temp],
                                      zoom=0.4459,
                                      front=[0.9288, -0.2951, -0.2242],
                                      lookat=[1.6784, 2.0612, 1.4451],
                                      up=[-0.3402, -0.9189, -0.1996])

def register_2_point_clouds(source, target, trans_init):
    """register 2 point clouds using ICP """
    voxel_radius = [0.2, 0.1, 0.05]
    max_iter = [50, 30, 14]

    if trans_init is None:
        trans_init = np.identity(4)
    threshold = 0.1

    try:
        reg_p2p = o3d.pipelines.registration.registration_icp(
            source, target, threshold, trans_init,
            o3d.pipelines.registration.TransformationEstimationPointToPoint(),
            o3d.pipelines.registration.ICPConvergenceCriteria(max_iteration=2000))
        
        # draw_registration_result(source, target, reg_p2p.transformation)
        return reg_p2p.transformation
    except:
        raise
        print('icp failed, give up')
        return np.identity(4)

def remove_objects(pts, objs):
    
    # remove egocar head
    filter = (pts[:,1] > 4) | (pts[:,1] < -4)

    for obj in objs:
        filter = filter & remove_box(pts[:, :3], obj, 0, 1.1) 
    
    return pts[filter]


def combine_and_save_lidars(lidars, poses, file):
     
    map = []
    for i, lidar in enumerate(lidars):
         pts = np.matmul(np.concatenate([lidar[:, 0:3], np.ones([lidar.shape[0],1])], axis=1), poses[i].T)
         l = np.concatenate([pts[:, 0:3], lidar[:, 3:]], axis=1)
         map.append(l)
    
    map = np.concatenate(map, axis=0)
    map = map.astype(np.float32)

    color = (map[:, 4:7]*256.0).astype(np.uint8).astype(np.int32)

    color = (color[:,0] * 0x100  + color[:,1])*0x100 + color[:,2]
    color = color.astype(np.int32)

    size = map.shape[0]
    with open(file, 'wb') as f:
        header = f"""# .PCD v.7 - Point Cloud Data file format
VERSION .7
FIELDS x y z intensity rgb
SIZE 4 4 4 4 4
TYPE F F F F I
COUNT 1 1 1 1 1
WIDTH {size}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS {size}
DATA binary
"""
            
            
        f.write(header.encode('utf-8'))
        for i,d in enumerate(map[:, :4]): 
            f.write(d.tobytes())
            f.write(color[i].tobytes())
        

def proc_scene(scene):
    scene = SuscapeScene(args.data, scene, args.lidar)
    frames = scene.meta['frames']

    lidars = []
    poses = []

    lidar_pose = np.identity(4)
    poses.append(lidar_pose)

    lidar_pose_path = os.path.join(args.data, scene.name, 'lidar_pose')
    os.makedirs(lidar_pose_path, exist_ok=True)
    with open(os.path.join(lidar_pose_path, frames[0]+'.json'), 'w') as f:
                json.dump({
                    'lidarPose': lidar_pose.reshape(-1).tolist()
                    }, f, indent=4)

    frame = frames[0]
    lidar = scene.read_lidar(frame)
    objs = scene.get_boxes_by_frame(frame)
    lidar = remove_objects(lidar, objs)
    lidars.append(lidar)

    tgt = o3d.geometry.PointCloud()
    tgt.points = o3d.utility.Vector3dVector(lidar[:, 0:3])
    tgt_pose = scene.read_ego_pose(frame)


    lidar_to_ego = np.identity(4)
    lidar_to_ego[:3, :3]= o3d.geometry.get_rotation_matrix_from_zxy(( np.pi, 0, 0))
    lidar_to_ego[:3, 3] = (0, 0, 0.4)
    

    ego_t_to_utm = np.identity(4)
    ego_t_to_utm[:3, :3] = o3d.geometry.get_rotation_matrix_from_zxy((
        -float(tgt_pose['azimuth'])*np.pi/180, float(tgt_pose['pitch'])*np.pi/180, float(tgt_pose['roll'])*np.pi/180
    ))
    ego_t_to_utm[:3, 3] = (float(tgt_pose['x']), float(tgt_pose['y']), float(tgt_pose['z']))



    for i in range(1, len(frames)):

        next_frame = frames[i]
        next_lidar = scene.read_lidar(next_frame)

        objs = scene.get_boxes_by_frame(next_frame)
        next_lidar = remove_objects(next_lidar, objs)
        lidars.append(next_lidar)

        src = o3d.geometry.PointCloud()
        src.points = o3d.utility.Vector3dVector(next_lidar[:, 0:3])    
        src_pose = scene.read_ego_pose(next_frame)

        ego_s_to_utm = np.identity(4)
        ego_s_to_utm[:3, :3] = o3d.geometry.get_rotation_matrix_from_zxy((
            -float(src_pose['azimuth'])*np.pi/180, float(src_pose['pitch'])*np.pi/180, float(src_pose['roll'])*np.pi/180
        ))
        ego_s_to_utm[:3, 3] = (float(src_pose['x']), float(src_pose['y']), float(src_pose['z']))



        trans_init = np.matmul(ego_s_to_utm, lidar_to_ego)
        trans_init = np.matmul(np.linalg.inv(ego_t_to_utm), trans_init)
        trans_init = np.matmul(np.linalg.inv(lidar_to_ego), trans_init)

        trans = register_2_point_clouds(src, tgt, trans_init)
        # print(next_frame, trans)

        lidar_pose = np.matmul(lidar_pose, trans)
        poses.append(lidar_pose)

        with open(os.path.join(lidar_pose_path, next_frame+'.json'), 'w') as f:
                    json.dump({
                        'lidarPose': lidar_pose.reshape(-1).tolist()
                        }, f, indent=4)
                    

        ego_t_to_utm = ego_s_to_utm
        tgt_pose = src_pose
        tgt = src

    
    os.makedirs(os.path.join(args.data, scene.name, 'map'), exist_ok=True)
    combine_and_save_lidars(lidars, poses, os.path.join(args.data, scene.name, 'map', 'map.pcd'))




scenes = os.listdir(args.data)
scenes.sort()
for s in scenes:
    if re.fullmatch(args.scenes, s):
        print('processing', s)
        proc_scene(s)