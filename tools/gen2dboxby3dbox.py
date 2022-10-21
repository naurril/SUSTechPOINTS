





import os
import json
import numpy as np
import math
import pypcd.pypcd as pypcd
import argparse
import re


parser = argparse.ArgumentParser(description='start web server for SUSTech POINTS')        
parser.add_argument('data_folder', type=str, default='./data', help="")
parser.add_argument('--scenes', type=str, default='.*', help="")
parser.add_argument('--camera_types', type=str, default='aux_camera', help="")
parser.add_argument('--camera_names', type=str, default='front', help="")
parser.add_argument('--image_width', type=int, default=640, help="")
parser.add_argument('--image_height', type=int, default=480, help="")

args = parser.parse_args()



all_scenes = os.listdir(args.data_folder)
scenes = list(filter(lambda s: re.fullmatch(args.scenes, s), all_scenes))
scenes.sort()
#print(list(scenes))


data_folder = args.data_folder
camera_types  = args.camera_types.split(",")
camera_names  = args.camera_names.split(",")
image_width = args.image_width
image_height = args.image_height

def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)


def euler_angle_to_rotate_matrix(eu):
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
    trans_matrix = euler_angle_to_rotate_matrix(eu)

    center = np.array([box['psr']['position']['x'], box['psr']['position']['y'], box['psr']['position']['z']])
    box_pts = np.matmul((pts - center), (trans_matrix))

    filter =  (box_pts[:, 0] < box['psr']['scale']['x']/2) & (box_pts[:, 0] > - box['psr']['scale']['x']/2) & \
             (box_pts[:, 1] < box['psr']['scale']['y']/2) & (box_pts[:, 1] > - box['psr']['scale']['y']/2)

    topfilter =    filter & (box_pts[:, 2] < box['psr']['scale']['z']/2) & (box_pts[:, 2] >= - box['psr']['scale']['z']/2 + 0.3)

    groundfilter = filter & (box_pts[:, 2] < -box['psr']['scale']['z']/2+0.3) & (box_pts[:, 2] > - box['psr']['scale']['z']/2)
    
    
    return [pts[topfilter], pts[groundfilter]]



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


def gen_2dbox_for_frame_camera(scene, frame, camera_type, camera, extrinsic, intrinsic, objs):

    label2d_file = os.path.join(data_folder, scene, 'label_fusion', camera_type, camera, frame+".json")

    if os.path.exists(label2d_file):
        with open(label2d_file) as f:
            try:
                label = json.load(f)
                label['objs'] = list(filter(lambda x: not 'annotator' in x, label['objs']))

                if "version" in label and label['version'] == 1:
                    print("dont overwrite", scene, frame, camera_type, camera)
                    return 
            except :
                print(scene, frame, camera_type, camera, 'load json FAILED!')
                label = {
                    'cameraType': camera_type,
                    'cameraName': camera,
                    'scene': scene,
                    'frame': frame,
                    'objs': []
                }
            
    else:
        label = {
            'cameraType': camera_type,
            'cameraName': camera,
            'scene': scene,
            'frame': frame,
            'objs': []
        }

    for o in objs:

        label_index = None
        for idx,l in enumerate(label['objs']):
            if ('obj_id' in l) and l['obj_id'] == o['box3d']['obj_id']:
                label_index = idx
                continue
        
        if label_index is not None:
            continue

        img_pts_top = proj_pts3d_to_img(o['pts'][0], extrinsic, intrinsic, image_width, image_height)
        img_pts_ground = proj_pts3d_to_img(o['pts'][1], extrinsic, intrinsic, image_width, image_height)

        if img_pts_top.shape[0]>3:
            p1 = np.min(img_pts_top, axis=0)
            p2 = np.max(img_pts_top, axis=0)

            if img_pts_ground.shape[0] > 3:
                q1 = np.min(img_pts_ground, axis=0)
                q2 = np.max(img_pts_ground, axis=0)

            
            obj = {
                "annotator": "3dbox",                        
                "obj_id": o['box3d']['obj_id'],
                "obj_type": o['box3d']['obj_type'],
                "rect": {
                    "x1": p1[0],
                    "y1": p1[1],
                    "x2": p2[0],
                    "y2": q2[1] if img_pts_ground.shape[0]>3 else p2[1] #p2[1]
                }
            }
            
            if 'obj_attr' in o['box3d']:
                obj['obj_attr'] = o['box3d']['obj_attr']
            
            label['objs'].append(obj)

    
    with open(label2d_file, 'w') as f:
        json.dump(label,f,indent=2)

def gen_2dbox_for_frame(scene, frame, calib):

    print(frame)

    # load 3d boxes
    label_3d_file = os.path.join(data_folder, scene, 'label', frame+".json")
    if not os.path.exists(label_3d_file):
        print("label3d for", frame, 'does not exist')
        return


    # load lidar points
    lidar_file = os.path.join(data_folder, scene, 'lidar', frame+".pcd")
    pc = pypcd.PointCloud.from_path(lidar_file)
    
    pts =  np.stack([pc.pc_data['x'], 
                    pc.pc_data['y'], 
                    pc.pc_data['z']],
                    axis=-1)
    pts = pts[(pts[:,0]!=0) | (pts[:,1]!=0) | (pts[:,2]!=0)]
    print(pts.shape)



    with open(label_3d_file) as f:
        try:
            label_3d = json.load(f)
        except:
            print("error load", label_3d_file)
            return

    boxes = label_3d
    if 'objs' in boxes:
        boxes = boxes['objs']
    

    print(len(boxes), 'boxes')

    
    objs = list(map(lambda b: {'pts':crop_pts(pts, b), 'box3d': b}, boxes))
    # for box in boxes:
    #     obj_pts = crop_pts(pts,box)
        
        # dump pts to file.
        # obj_pts = np.concatenate([obj_pts, np.zeros([obj_pts.shape[0],1])], axis=1)
        # obj_pts = obj_pts.astype(np.float32)
        # print(obj_pts.shape)
        # obj_pts.tofile("./data/temp/lidar/{}.bin".format(frame+"-"+box['obj_type']+'-'+box['obj_id']))


    for camera_type in camera_types:
        for camera in camera_names:
            # check for local calibration file
            local_calib_file = os.path.join(data_folder, scene, 'calib', camera_type, camera, frame+".json")
            if os.path.exists(local_calib_file):
                with open (local_calib_file) as f:
                    local_calib = json.load(f)
                    (extrinsic, intrinsic) = get_calib(calib[camera_type][camera], local_calib)
            else:
                (extrinsic,intrinsic) =  (calib[camera_type][camera]['extrinsic'], calib[camera_type][camera]['intrinsic'])

            gen_2dbox_for_frame_camera(scene, frame, camera_type, camera, extrinsic, intrinsic, objs)
            


            
            
def get_calib(static_calib, local_calib):
    trans = np.array(local_calib['lidar_transform']).reshape((4,4))
    extrinsic = np.matmul(static_calib['extrinsic'], trans)
    return (extrinsic,static_calib['intrinsic'])

def gen_2dbox_for_one_scene(scene):
    print(scene)
    
    for camera_type in camera_types:
        for camera in camera_names:
            prepare_dirs(os.path.join(data_folder, scene, 'label_fusion', camera_type, camera))


    calibs = {}
    for camera_type in camera_types:
        
        calibs[camera_type] = {}
        
        for camera in camera_names:
            calib_path = os.path.join(data_folder, scene, 'calib', camera_type, camera+".json")
            with open(calib_path, 'r') as f:
                calib = json.load(f)
            
            extrinsic_matrix  = np.reshape(np.array(calib['extrinsic']), [4,4])
            intrinsic_matrix  = np.reshape(np.array(calib['intrinsic']), [3,3])

            
            calibs[camera_type][camera] = {
                'extrinsic': extrinsic_matrix,
                'intrinsic': intrinsic_matrix
            }



    lidar_frames = os.listdir(os.path.join(data_folder, scene, 'lidar'))
    frames = map(lambda s: os.path.splitext(s)[0], lidar_frames)
    frames = list(frames)
    frames.sort()
    for frame in frames:
        gen_2dbox_for_frame(scene, frame, calibs)


for s in scenes:
    gen_2dbox_for_one_scene(s)
