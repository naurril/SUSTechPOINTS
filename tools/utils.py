import numpy as np
import os
from PIL import Image
import json
import math

def read_scene_meta(scene):
    'read scene metadata give scene path'
    meta = {}

    frames = os.listdir(os.path.join(scene, 'lidar'))
    frames = [*map(lambda f: os.path.splitext(f)[0], frames)]
    frames.sort()
    meta['frames'] = frames

    for camera_type in ['camera', 'aux_camera']:
        if os.path.exists(os.path.join(scene, camera_type)):
            meta[camera_type] = {}
            for c in os.listdir(os.path.join(scene, camera_type)):
                any_file = os.listdir(os.path.join(scene, camera_type, c))[0]
                img = Image.open(os.path.join(scene, camera_type, c, any_file))
                meta[camera_type][c] = {
                    'width': img.width,
                    'height': img.height,
                    'ext': os.path.splitext(any_file)[1]
                }

    meta['calib'] = {}
    for camera_type in ['camera',  'aux_camera']:        
        for camera in meta[camera_type]:
            meta['calib'][camera_type] = {}
            for camera in meta[camera_type]:
                with open(os.path.join(scene, 'calib', camera_type, camera+".json")) as f:
                    meta['calib'][camera_type][camera] = json.load(f)
                    meta['calib'][camera_type][camera]['extrinsic'] = np.reshape(np.array(meta['calib'][camera_type][camera]['extrinsic']), [4,4])
                    meta['calib'][camera_type][camera]['intrinsic'] = np.reshape(np.array(meta['calib'][camera_type][camera]['intrinsic']), [3,3])

    return meta

def euler_angle_to_rotate_matrix(eu, t):  # ZYX order.
    theta = eu
    #Calculate rotation about x axis
    R_x = np.array([
        [1,       0,              0],
        [0,       math.cos(theta[0]),   -math.sin(theta[0])],
        [0,       math.sin(theta[0]),   math.cos(theta[0])]
    ])

    #Calculate rotation about y axis
    R_y = np.array([
        [math.cos(theta[1]),      0,      math.sin(theta[1])],
        [0,                       1,      0],
        [-math.sin(theta[1]),     0,      math.cos(theta[1])]
    ])

    #Calculate rotation about z axis
    R_z = np.array([
        [math.cos(theta[2]),    -math.sin(theta[2]),      0],
        [math.sin(theta[2]),    math.cos(theta[2]),       0],
        [0,               0,                  1]])

    R = np.matmul(R_x, np.matmul(R_y, R_z))

    t = t.reshape([-1,1])
    R = np.concatenate([R,t], axis=-1)
    R = np.concatenate([R, np.array([0,0,0,1]).reshape([1,-1])], axis=0)
    return R


#  euler_angle_to_rotate_matrix(np.array([0, np.pi/3, np.pi/2]), np.array([1,2,3]))
def psr_to_xyz(p,s,r):
    trans_matrix = euler_angle_to_rotate_matrix(r, p)

    x=s[0]/2
    y=s[1]/2
    z=s[2]/2
    

    local_coord = np.array([
        x, y, -z, 1,   x, -y, -z, 1,  #front-left-bottom, front-right-bottom
        x, -y, z, 1,   x, y, z, 1,    #front-right-top,   front-left-top

        -x, y, -z, 1,   -x, -y, -z, 1,#rear-left-bottom, rear-right-bottom
        -x, -y, z, 1,   -x, y, z, 1,  #rear-right-top,   rear-left-top
        
        #middle plane
        #0, y, -z, 1,   0, -y, -z, 1,  #rear-left-bottom, rear-right-bottom
        #0, -y, z, 1,   0, y, z, 1,    #rear-right-top,   rear-left-top
        ]).reshape((-1,4))

    world_coord = np.matmul(trans_matrix, np.transpose(local_coord))
    
    return np.transpose(world_coord[0:3,:])

def box_to_nparray(box):
    return np.array([
        [box["position"]["x"], box["position"]["y"], box["position"]["z"]],
        [box["scale"]["x"], box["scale"]["y"], box["scale"]["z"]],
        [box["rotation"]["x"], box["rotation"]["y"], box["rotation"]["z"]],
    ])


def box3d_to_corners(b):
    box = box_to_nparray(b["psr"])    
    box3d = psr_to_xyz(box[0], box[1], box[2])
    return box3d


def proj_pts3d_to_img(pts, extrinsic_matrix, intrinsic_matrix, width, height):

    #print(pts.shape, extrinsic_matrix.shape)
    
    pts = np.concatenate([pts, np.ones([pts.shape[0],1])], axis=1)
    imgpos = np.matmul(pts, np.transpose(extrinsic_matrix))

    # rect matrix shall be applied here, for kitti

    imgpos3 = imgpos[:, :3]
    
    imgpos3 = imgpos3[imgpos3[:,2] > 0]        

    # if imgpos3.shape[0] < 1:
    #     return None

    imgpos2 = np.matmul(imgpos3, np.transpose(intrinsic_matrix))

    imgfinal = imgpos2/imgpos2[:,2:3]

    
    filter = (imgfinal[:,0] >= 0) & (imgfinal[:,0] < width) & (imgfinal[:,1] >= 0) & (imgfinal[:,1] < height)

    ret  = imgfinal[filter]
    #print(ret.shape)
    return ret

def combine_calib(static_calib, local_calib):
    trans = np.array(local_calib['lidar_transform']).reshape((4,4))
    extrinsic = np.matmul(static_calib['extrinsic'], trans)
    return (extrinsic,static_calib['intrinsic'])


def get_calib_for_frame(scene_path, meta, camera_type, camera, frame):
    local_calib_file = os.path.join(scene_path, 'calib', camera_type, camera, frame+".json")
    if os.path.exists(local_calib_file):
        with open (local_calib_file) as f:
            local_calib = json.load(f)
            (extrinsic, intrinsic) = combine_calib(meta['calib'][camera_type][camera], local_calib)
            return (extrinsic, intrinsic)
    else:
        (extrinsic,intrinsic) =  (meta['calib'][camera_type][camera]['extrinsic'], meta['calib'][camera_type][camera]['intrinsic'])
        return (extrinsic, intrinsic)
        

def euler_angle_to_rotate_matrix_3x3(eu):
    theta = eu
    #Calculate rotation about x axis
    R_x = np.array([
        [1,       0,              0],
        [0,       math.cos(theta[0]),   -math.sin(theta[0])],
        [0,       math.sin(theta[0]),   math.cos(theta[0])]
    ])

    #Calculate rotation about y axis
    R_y = np.array([
        [math.cos(theta[1]),      0,      math.sin(theta[1])],
        [0,                       1,      0],
        [-math.sin(theta[1]),     0,      math.cos(theta[1])]
    ])

    #Calculate rotation about z axis
    R_z = np.array([
        [math.cos(theta[2]),    -math.sin(theta[2]),      0],
        [math.sin(theta[2]),    math.cos(theta[2]),       0],
        [0,               0,                  1]])

    R = np.matmul(R_x, np.matmul(R_y, R_z))
    return R



def crop_pts(pts, box):
    eu = [box['psr']['rotation']['x'], box['psr']['rotation']['y'], box['psr']['rotation']['z']]
    trans_matrix = euler_angle_to_rotate_matrix_3x3(eu)

    center = np.array([box['psr']['position']['x'], box['psr']['position']['y'], box['psr']['position']['z']])
    box_pts = np.matmul((pts - center), (trans_matrix))

    filter =  (box_pts[:, 0] < box['psr']['scale']['x']/2) & (box_pts[:, 0] > - box['psr']['scale']['x']/2) & \
             (box_pts[:, 1] < box['psr']['scale']['y']/2) & (box_pts[:, 1] > - box['psr']['scale']['y']/2)

    topfilter =    filter & (box_pts[:, 2] < box['psr']['scale']['z']/2) & (box_pts[:, 2] >= - box['psr']['scale']['z']/2 + 0.3)

    groundfilter = filter & (box_pts[:, 2] < -box['psr']['scale']['z']/2+0.3) & (box_pts[:, 2] > - box['psr']['scale']['z']/2)
    
    
    return [pts[topfilter], pts[groundfilter]]

def gen_2dbox_for_obj_pts(box3d_pts, extrinsic, intrinsic, width, height):
    img_pts_top = proj_pts3d_to_img(box3d_pts[0], extrinsic, intrinsic, width, height)
    img_pts_ground = proj_pts3d_to_img(box3d_pts[1], extrinsic, intrinsic, width, height)

    if img_pts_top.shape[0]>3:
        p1 = np.min(img_pts_top, axis=0)
        p2 = np.max(img_pts_top, axis=0)

        if img_pts_ground.shape[0] > 1:
            q1 = np.min(img_pts_ground, axis=0)
            q2 = np.max(img_pts_ground, axis=0)

        return {
                "x1": p1[0],
                "y1": p1[1],
                "x2": p2[0],
                "y2": q2[1] if img_pts_ground.shape[0]>1 else p2[1] #p2[1]
            }
    return None


def gen_2dbox_for_obj_corners(box3d, extrinsic, intrinsic, width, height):

    corners = box3d_to_corners(box3d)
    corners_img = proj_pts3d_to_img(corners, extrinsic, intrinsic,width, height) 
    if corners_img.shape[0] == 0:
        print("rect points all out of image", o['obj_id'])
        return None
        
    corners_img = corners_img[:, 0:2]
    p1 = np.min(corners_img, axis=0)
    p2 = np.max(corners_img, axis=0)

    rect = {
            "x1": p1[0],
            "y1": p1[1],
            "x2": p2[0],
            "y2": p2[1]
        }

    return rect