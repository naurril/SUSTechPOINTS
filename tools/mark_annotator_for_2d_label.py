





import os
import json
import numpy as np
import math
import pypcd.pypcd as pypcd
import argparse
import re
from utils import proj_pts3d_to_img, read_scene_meta, get_calib_for_frame, box3d_to_corners, crop_pts, gen_2dbox_for_obj_pts, box_distance, crop_box_pts





parser = argparse.ArgumentParser(description='generate 2d boxes by 3d boxes')        
parser.add_argument('data_folder', type=str, default='./data', help="")
parser.add_argument('--scenes', type=str, default='.*', help="")
parser.add_argument('--frames', type=str, default='.*', help="")
parser.add_argument('--camera_types', type=str, default='aux_camera', help="")
parser.add_argument('--camera_names', type=str, default='front', help="")
parser.add_argument('--save', type=str, default='no', help="")
parser.add_argument('--verbose', type=str, default='no', help="")
args = parser.parse_args()


all_scenes = os.listdir(args.data_folder)
scenes = list(filter(lambda s: re.fullmatch(args.scenes, s), all_scenes))
scenes.sort()
#print(list(scenes))


data_folder = args.data_folder
camera_types  = args.camera_types.split(",")
camera_names  = args.camera_names.split(",")




# import tensorflow as tf
# RESAMPLE_NUM = 10

# model_file = "./algos/models/deep_annotation_inference.h5"

# rotation_model = tf.keras.models.load_model(model_file)
# rotation_model.summary()

# NUM_POINT=512

# def sample_one_obj(points, num):
#     if points.shape[0] < NUM_POINT:
#         return np.concatenate([points, np.zeros((NUM_POINT-points.shape[0], 3), dtype=np.float32)], axis=0)
#     else:
#         idx = np.arange(points.shape[0])
#         np.random.shuffle(idx)
#         return points[idx[0:num]]

# def predict_yaw(points):
#     points = np.array(points).reshape((-1,3))
#     input_data = np.stack([x for x in map(lambda x: sample_one_obj(points, NUM_POINT), range(RESAMPLE_NUM))], axis=0)
#     pred_val = rotation_model.predict(input_data)
#     pred_cls = np.argmax(pred_val, axis=-1)
#     #print(pred_cls)
    
#     ret = (pred_cls[0]*3+1.5)*np.pi/180.
#     return ret



def prepare_dirs(path):
    if not os.path.exists(path):
            os.makedirs(path)

def area(r):
    return (r['x2'] - r['x1']) * (r['y2'] - r['y1'])

def intersect(a,b):
    x1 = max(a['x1'], b['x1'])
    y1 = max(a['y1'], b['y1'])

    x2 = min(a['x2'], b['x2'])
    y2 = min(a['y2'], b['y2'])

    return {
        'x1': x1,
        'x2': x2,
        'y1': y1,
        'y2': y2
    }

def iou(a,b):
    i = intersect(a, b)

    if i['x2'] < i['x1'] or i['y2'] < i['y1']:
        return 0
    else:
        return area(i)/(area(a)+area(b) - area(i))

def same_rect(a,b):
    
    for k in ['x1','x2','y1','y2']:
        if a[k] - b[k] > 2 or a[k] - b[k] < -2:
            return False
    return True
def load_points(scene, frame):
    # load lidar points
    lidar_file = os.path.join(scene, 'lidar', frame+".pcd")
    pc = pypcd.PointCloud.from_path(lidar_file)
    
    pts =  np.stack([pc.pc_data['x'], 
                    pc.pc_data['y'], 
                    pc.pc_data['z']],
                axis=-1)
    pts = pts[(pts[:,0]!=0) | (pts[:,1]!=0) | (pts[:,2]!=0)]

    return pts


def object_plane_visible_ratio(box, points, axies, ground_level):
    """
    axies: [0,2], or [1, 2]
    """
    
    scale = np.array([box['psr']['scale']['x'], box['psr']['scale']['y'], box['psr']['scale']['z']])
    grid_num = np.array([10, 10, 6])
    points = points[:, axies]
    scale = scale[axies]
    grid_num = grid_num[axies]


    grid = scale/grid_num
    # print(box)
    # print('grid', grid)
    
    pts = (points / grid) + grid_num/2
    #pts = pts[0:3, :]
    #print(pts[0:3,:])
    ind = pts.astype(int)
    #print(ind)

    ind[ind >= grid_num] -= 1

    #print(ind)
    occupation = np.zeros(grid_num)

    occupation[ind[:,0], ind[:,1]] = 1
    #print(box['obj_id'], axies, occupation)


    # only check center part, since some object has extremities.

    center_occupation= occupation[2:8, 1:5]

    return np.sum(center_occupation) / (center_occupation.shape[0] * center_occupation.shape[1])


def object_occluded(body, ground, ground_level, box):
    """
    if for any plane the points occupy 2/3 parts of it, 
    it's considered not occluded.
    """   
    dim_occlusion_ratio = 0.7
    area_occlusion_ratio  = 0.4

    min_pts  = np.min(body, axis=0)
    max_pts  = np.max(body, axis=0)

    # 0.2 for annotation error: box may be larger than object.
    x_visible_ratio = (max_pts[0] - min_pts[0] + 0.2) / box['psr']['scale']['x']
    y_visible_ratio = (max_pts[1] - min_pts[1] + 0.2) / box['psr']['scale']['y']
    z_visible_ratio = (max_pts[2] - min_pts[2] + 0.2 + ground_level) / box['psr']['scale']['z']

    xz_area_visible_ratio = object_plane_visible_ratio(box, body, [0, 2], ground_level)
    yz_area_visible_ratio = object_plane_visible_ratio(box, body, [1, 2], ground_level)


    view_angle = box['psr']['rotation']['z'] - math.atan2(box['psr']['position']['y'], box['psr']['position']['x'])
    view_angle %= math.pi *2  # [0, 2pi)
    if view_angle> math.pi:
        view_angle -= math.pi

    #[0 , pi]
    if view_angle > math.pi/2:
        view_angle = math.pi - view_angle



    if args.verbose == 'yes':
        print(box['obj_id'], view_angle*180/math.pi, x_visible_ratio, y_visible_ratio, z_visible_ratio, xz_area_visible_ratio, yz_area_visible_ratio)

    #[0, pi/2]
    if view_angle > 15/180*math.pi:
        #x is ok
        if x_visible_ratio <  dim_occlusion_ratio:
            return True
        if xz_area_visible_ratio < area_occlusion_ratio:
            return True
        
        
    if view_angle < 75/180*math.pi:
        #y is ok
        if y_visible_ratio < dim_occlusion_ratio:
            return True
        if yz_area_visible_ratio < area_occlusion_ratio:
            return True
        
    if z_visible_ratio < dim_occlusion_ratio:
        return True

    return False



def proc_frame_camera(scene, meta, frame, camera_type, camera, extrinsic, intrinsic, objs):

    #print(camera_type, camera)

    pts = None

    label2d_file = os.path.join(scene, 'label_fusion', camera_type, camera, frame+".json")

    if os.path.exists(label2d_file):
        with open(label2d_file) as f:
            label = json.load(f)
    else:
        print("label doesn't exist", frame)
        return

    #print(label)
    for o in label['objs']:


        # if not 'annotator' in  o:
        #     continue

        # if o['annotator'] != '3dbox':
        #     continue
        
        if not 'obj_id' in o:
            continue

        box3d = None
        for i in objs:
             if i['obj_id'] == o['obj_id']:
                box3d = i
                break
        
        if not box3d:
            print('obj not found in 3d labels', o['obj_id'])
            continue
        # #print(o['obj_id'])
        # corners = box3d_to_corners(box3d)
        # #print(corners)
        # corners_img = proj_pts3d_to_img(corners, extrinsic, intrinsic, meta[camera_type][camera]['width'], meta[camera_type][camera]['height']) 
        # #print(corners_img)

        #if corners_img.shape[0] < 8:
        if False:
            #o['inside_corners'] = corners_img.shape[0]
            #print(frame, o['obj_id'], 'object stretch out camera')

            if pts is None:
                pts = load_points(scene, frame)
            
            box3d_pts = crop_pts(pts, box3d)
            box2d = gen_2dbox_for_obj_pts(box3d_pts, extrinsic, intrinsic, meta[camera_type][camera]['width'], meta[camera_type][camera]['height'])

            if box2d is not None:
                iou_score = iou(box2d, o['rect'])
                if iou_score < 0.5:
                    print(frame, o['obj_id'], iou_score) #, box2d, o['rect'])
                    o['annotator'] = '3dbox'
                    o['rect'] = box2d
            else:
                print(frame, o['obj_id'], 'gen 2dbox failed.')

        if False:
            if o['rect']['x2'] - o['rect']['x1'] < meta[camera_type][camera]['width'] * 0.005:
                print(frame, o['obj_id'], 'rect too small')
            if o['rect']['y2'] - o['rect']['y1'] < meta[camera_type][camera]['width'] * 0.005:
                print(frame, o['obj_id'], 'rect too small')


        

        # if corners_img.shape[0] == 0:
        #     print("rect points all out of image", o['obj_id'])
        #     continue        
        
        # corners_img = corners_img[:, 0:2]
        # p1 = np.min(corners_img, axis=0)
        # p2 = np.max(corners_img, axis=0)

        # rect = {
        #         "x1": p1[0],
        #         "y1": p1[1],
        #         "x2": p2[0],
        #         "y2": p2[1]
        #     }

        # if same_rect(o['rect'], rect):
        #     print('rect generated by 3d corners', o['obj_id'])
        #     o['annotator'] = '3dbox_corners'
        # else:
        #     #print('rect annotated by human', o['obj_id'])
        #     if 'annotator' in o:
        #         o.pop('annotator')

        
    #print(label)
    if args.save == 'yes':
        with open(label2d_file, 'w') as f:
            json.dump(label,f,indent=2)
        
def proc_frame_3dbox(scene, meta, frame, boxes):

    pts = None
    modified = False

    id_map = {}
    for box in boxes:
        # if pts is None:
        #     pts = load_points(scene, frame)


        if not 'obj_id' in box:
            print(frame, box['obj_type'], 'id absent')
        elif box['obj_id'] == '':
            print(frame, box['obj_type'], 'id absent')
            
        else:
            if not box['obj_id'] in id_map:
                id_map[box['obj_id']] = 1
            else:
                id_map[box['obj_id']] += 1

        # [body, ground, ground_level] = crop_box_pts(pts, box)
        # obj_attr = '' if not 'obj_attr' in box else box['obj_attr']

        if False:
            # empty box?
            if body.shape[0] < 10:
                print(frame, box['obj_id'], 'empty', body.shape, ground.shape)
                box['empty'] = True
                modified = True
                continue

        if False:
            # occluded object?
            distance = box_distance(box)

           

            if distance < box['psr']['scale']['z']/2*80:
                occluded = object_occluded(body, ground, ground_level, box)
                #print(box['obj_id'], occluded, obj_attr)

                if occluded and not 'occluded' in obj_attr:
                    box['obj_attr'] = 'occluded' + ((',' + obj_attr) if obj_attr else '')
                    print(frame, box['obj_id'], box['obj_attr'])
                    modified = True
                # if occluded and (not 'obj_attr' in box  or  not 'occluded' in  box['obj_attr']):
                #     print(frame, box['obj_id'], round(distance,2), 'occluded', 'att', box['obj_attr'] if 'obj_attr' in box else '')
                # elif not occluded and 'obj_attr' in box and 'occluded' in  box['obj_attr']:
                #     print(frame, box['obj_id'], round(distance,2), 'not occluded', 'att', box['obj_attr'] if 'obj_attr' in box else '')

        if False:
            # rotation incorrect?
            if box['obj_type'] == 'Car' and ( not 'occluded' in obj_attr):
                ret = predict_yaw(body)
                if abs(ret - math.pi) < 0.1:
                    print(frame, box['obj_id'], ret)


    for id in id_map:
        if id_map[id] > 1:
            print(frame, id,  'duplicate id', id_map[id])

    return modified

def proc_frame(scene, meta, frame):

    #print(frame)

    # load 3d boxes
    label_3d_file = os.path.join(scene, 'label', frame+".json")
    if not os.path.exists(label_3d_file):
        print("label3d for", frame, 'does not exist')
        return

    with open(label_3d_file) as f:
        try:
            label_3d = json.load(f)
        except:
            print("error loading", label_3d_file)
            return

    modified = False
    boxes = label_3d
    #print(boxes)
    if 'objs' in boxes:
        boxes = boxes['objs']
    else:
        modified = True
        label_3d = {
            'frame': frame,
            'objs': boxes,
        }
        
    
    modified_box = proc_frame_3dbox(scene, meta, frame, boxes)
    modified = modified or modified_box

    # remove empty boxes.
    label_3d['objs'] = list(filter(lambda x: not 'empty' in x, boxes))

    if args.save == 'yes' and modified:
        with open(label_3d_file, 'w') as f:
            json.dump(label_3d, f, indent=2)

    # for camera_type in camera_types:
    #     for camera in camera_names:
    #         (extrinsic,intrinsic) = get_calib_for_frame(scene, meta, camera_type, camera, frame)
    #         proc_frame_camera(scene, meta, frame, camera_type, camera, extrinsic, intrinsic, boxes)
            




def proc_scene(scene):
    print(scene)
    scene_path = os.path.join(data_folder, scene)
    meta = read_scene_meta(scene_path)
    
    for frame in meta['frames']:
        if re.fullmatch(args.frames, frame):
            proc_frame(scene_path, meta, frame)


for s in scenes:
    proc_scene(s)
