import numpy as np
import os
from PIL import Image
import json
import math
import pypcd.pypcd as pypcd

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




def read_all_obj_ids(scene):
    stat = {}

    label_folder = os.path.join(scene, "label")
    lidar_files  = os.listdir(os.path.join(scene, 'lidar'))
    
    for file in lidar_files:
        
        file = os.path.splitext(file)[0] + '.json'
        
        if not os.path.exists(os.path.join(label_folder, file)):
            continue

        with open(os.path.join(label_folder, file)) as f:
            labels = json.load(f)

            if "objs" in labels:
                objs = labels['objs']
            else:
                objs = labels

        for l in objs:
            #color = get_color(l["obj_id"])
            obj_id = l["obj_id"]
            
            if not obj_id in objs:
                stat[obj_id] = l['obj_type']
            

    return [(i, stat[i]) for i in stat.keys()]



class SuscapeScene:
    def __init__(self, data_root, name):
        self.name = name
        self.data_root = data_root
        self.scene_path = os.path.join(data_root, name)
        self.meta = read_scene_meta(self.scene_path)
        self.labels = None
    
    def load_labels(self):
        label_folder = os.path.join(self.scene_path, "label")
        
        self.labels = {}
        for frame in self.meta['frames']:
            
            file = frame + '.json'
            
            if not os.path.exists(os.path.join(label_folder, file)):
                self.labels[frame] = []
                continue

            with open(os.path.join(label_folder, file)) as f:
                labels = json.load(f)

                if "objs" in labels:
                    objs = labels['objs']
                else:
                    objs = labels
                
                self.labels[frame] = objs
        
    def get_boxes_by_frame(self, frame):
        if not self.labels:
            self.load_labels()
        
        return self.labels[frame]
    
    def _find_obj_by_id(self, boxes, id):
            for b in boxes:
                if b['obj_id']==id:
                    return b
            return None
    
    def get_boxes_of_obj(self, id):
        

        ret = {}
        for frame, boxes in self.labels.items():
            b = self._find_obj_by_id(boxes, id)
            if b:
                ret[frame] = b
        return ret
    
    def find_box_in_frame(self, frame, id):
        return self._find_obj_by_id(self.labels[frame], id)
    

    def get_calib_for_frame(self, camera_type, camera, frame):
        
        def combine_calib(static_calib, local_calib):
            trans = np.array(local_calib['lidar_transform']).reshape((4,4))
            extrinsic = np.matmul(static_calib['extrinsic'], trans)
            return (extrinsic,static_calib['intrinsic'])
        

        static_calib = self.meta['calib'][camera_type][camera]

        local_calib_file = os.path.join(self.scene_path, 'calib', camera_type, camera, frame+".json")
        if os.path.exists(local_calib_file):
            with open (local_calib_file) as f:
                local_calib = json.load(f)
                (extrinsic, intrinsic) = combine_calib(static_calib, local_calib)
                return (extrinsic, intrinsic)
        else:
            (extrinsic,intrinsic) =  (static_calib['extrinsic'], static_calib['intrinsic'])
            return (extrinsic, intrinsic)
        

    def list_objs(self):
        ret = {}

        if not self.labels:
            self.load_labels()

        for _, (frame, objs) in enumerate(self.labels.items()):
            for l in objs:
                #color = get_color(l["obj_id"])
                obj_id = l["obj_id"]
                
                if not obj_id in objs:
                    ret[obj_id] = l['obj_type']
        return [(i, ret[i]) for i in ret.keys()]


    def read_lidar(self, frame):
        # load lidar points
        lidar_file = os.path.join(self.scene_path, 'lidar', frame+".pcd")
        pc = pypcd.PointCloud.from_path(lidar_file)
        
        pts =  np.stack([pc.pc_data['x'], 
                        pc.pc_data['y'], 
                        pc.pc_data['z'],
                        pc.pc_data['intensity']],
                        axis=-1)
        pts = pts[(pts[:,0]!=0) | (pts[:,1]!=0) | (pts[:,2]!=0)]
        return pts


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



def box_position(box):
    return np.array(
        [box["position"]["x"], box["position"]["y"], box["position"]["z"]])

def box3d_to_corners(b):
    box = box_to_nparray(b["psr"])    
    box3d = psr_to_xyz(box[0], box[1], box[2])
    return box3d


def proj_pts3d_to_img(pts, extrinsic_matrix, intrinsic_matrix, width=None, height=None):

    #print(pts.shape, extrinsic_matrix.shape)
    
    pts = np.concatenate([pts, np.ones([pts.shape[0],1])], axis=1)
    imgpos = np.matmul(pts, np.transpose(extrinsic_matrix))

    # rect matrix shall be applied here, for kitti

    imgpos3 = imgpos[:, :3]
    
    
    #imgpos3 = imgpos3[filter_in_front]        

    # if imgpos3.shape[0] < 1:
    #     return None

    imgpos2 = np.matmul(imgpos3, np.transpose(intrinsic_matrix))

    imgfinal = imgpos2/imgpos2[:,2:3]

    filter_in_frontview = imgpos3[:,2] > 0
    

    if width and height:
        filter_in_image = (imgfinal[:,0] >= 0) & (imgfinal[:,0] < width) & (imgfinal[:,1] >= 0) & (imgfinal[:,1] < height)
        return imgfinal[filter_in_frontview & filter_in_image]
    else:
        return imgfinal, filter_in_frontview


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
        
def choose_best_camera_for_obj(obj, scene_path, meta, camera_type, cameras, frame):
    obj_pos = np.array([box_position(obj['psr'])])

    dists =[]
    filters = []
    for camera in cameras:
        extrinsic, intrinsic = get_calib_for_frame(scene_path, meta, camera_type, camera, frame)
        p, filter_in_frontview = proj_pts3d_to_img(obj_pos, extrinsic, intrinsic)
        w = meta[camera_type][camera]['width']
        h = meta[camera_type][camera]['height']
        
        if np.any(filter_in_frontview):
            dis_squared = (p[0][0]-w/2) * (p[0][0]-w/2) + (p[0][1]-h/2)*(p[0][1]-h/2)
        else:
            dis_squared = (w*w+h*h) * 10

        dists.append(dis_squared)        
        filters.append(filter_in_frontview[0])
    
    best_idx = np.argmin(dists)

    if filters[best_idx]:
        return cameras[best_idx]
    else:
        return None
    
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


def crop_box_pts(pts, box, ground_level=0.3):
    """ return points in box coordinate system"""
    eu = [box['psr']['rotation']['x'], box['psr']['rotation']['y'], box['psr']['rotation']['z']]
    trans_matrix = euler_angle_to_rotate_matrix_3x3(eu)

    center = np.array([box['psr']['position']['x'], box['psr']['position']['y'], box['psr']['position']['z']])
    box_pts = np.matmul((pts - center), (trans_matrix))

   
    if box['psr']['scale']['z'] < 2:
        ground_level = box['psr']['scale']['z'] * 0.15

    filter =  (box_pts[:, 0] < box['psr']['scale']['x']/2) & (box_pts[:, 0] > - box['psr']['scale']['x']/2) & \
             (box_pts[:, 1] < box['psr']['scale']['y']/2) & (box_pts[:, 1] > - box['psr']['scale']['y']/2)

    topfilter =    filter & (box_pts[:, 2] < box['psr']['scale']['z']/2) & (box_pts[:, 2] >= - box['psr']['scale']['z']/2 + ground_level)

    groundfilter = filter & (box_pts[:, 2] < -box['psr']['scale']['z']/2+ground_level) & (box_pts[:, 2] > - box['psr']['scale']['z']/2)
    
    
    return [box_pts[topfilter], box_pts[groundfilter], ground_level]



def crop_pts(pts, box):
    """ return points in lidar coordinate system"""
    eu = [box['psr']['rotation']['x'], box['psr']['rotation']['y'], box['psr']['rotation']['z']]
    trans_matrix = euler_angle_to_rotate_matrix_3x3(eu)

    center = np.array([box['psr']['position']['x'], box['psr']['position']['y'], box['psr']['position']['z']])
    box_pts = np.matmul((pts - center), (trans_matrix))

    ground_level = 0.3
    if box['psr']['scale']['z'] < 2:
        ground_level = box['psr']['scale']['z'] * 0.15


    filter =  (box_pts[:, 0] < box['psr']['scale']['x']/2) & (box_pts[:, 0] > - box['psr']['scale']['x']/2) & \
             (box_pts[:, 1] < box['psr']['scale']['y']/2) & (box_pts[:, 1] > - box['psr']['scale']['y']/2)

    topfilter =    filter & (box_pts[:, 2] < box['psr']['scale']['z']/2) & (box_pts[:, 2] >= - box['psr']['scale']['z']/2 + ground_level)

    groundfilter = filter & (box_pts[:, 2] < -box['psr']['scale']['z']/2+ground_level) & (box_pts[:, 2] > - box['psr']['scale']['z']/2)
    
    
    return [pts[topfilter], pts[groundfilter], topfilter, groundfilter]


def color_obj_by_image(pts, box, image, extrinsic, intrinsic, ground_level=0):
    eu = [box['psr']['rotation']['x'], box['psr']['rotation']['y'], box['psr']['rotation']['z']]
    trans_matrix = euler_angle_to_rotate_matrix_3x3(eu)

    center = np.array([box['psr']['position']['x'], box['psr']['position']['y'], box['psr']['position']['z']])
    box_pts = np.matmul((pts - center), (trans_matrix))
    filter_3d =  (box_pts[:, 0] < box['psr']['scale']['x']/2) & (box_pts[:, 0] > - box['psr']['scale']['x']/2) & \
             (box_pts[:, 1] < box['psr']['scale']['y']/2) & (box_pts[:, 1] > - box['psr']['scale']['y']/2) & \
             (box_pts[:, 2] < box['psr']['scale']['z']/2) & (box_pts[:, 2] > - box['psr']['scale']['z']/2 + ground_level)
    
    target_pts = pts[filter_3d]

    imgpts, filter_in_frontview = proj_pts3d_to_img(target_pts, extrinsic, intrinsic)
    imgpts = imgpts.astype(np.int)[:,0:2]

    height, width,_ = image.shape
    filter_inside_img = (imgpts[:,0] >= 0) & (imgpts[:,0] < width) & (imgpts[:,1] >= 0) & (imgpts[:,1] < height)
    filter_img = filter_in_frontview & filter_inside_img
    imgpts = imgpts[filter_img]
    pts_color = image[imgpts[:,1],imgpts[:,0],:]

    return box_pts[filter_3d][filter_img], pts_color, np.all(filter_img)

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

def box_distance(box):
    p = box['psr']['position']
    return math.sqrt((p['x']*p['x'] + p['y']*p['y']))