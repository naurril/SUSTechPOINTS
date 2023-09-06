
import os
import json
import numpy as np
import math
import cv2
import pypcd.pypcd as pypcd
import argparse
import re

parser = argparse.ArgumentParser(description='')        
parser.add_argument('data', type=str, default='./data', help="")
parser.add_argument('scene', type=str, default='', help="")
parser.add_argument('camera_type', type=str, default='', help="")
parser.add_argument('camera', type=str, default='', help="")
parser.add_argument('output_folder', type=str, default='', help="")
parser.add_argument('--line_width', type=int, default=1, help="")
parser.add_argument('--radar', type=str, choices=['yes','no'],default='no', help="")
parser.add_argument('--obj_type_filter', type=str, default='.*')
parser.add_argument('--frames', type=str, default='.*')
parser.add_argument('--overwrite', type=str,  choices=['yes','no'], default='no')

args = parser.parse_args()


###############################
# config 

rootdir = os.path.join(args.data, args.scene)
camera_type = args.camera_type
camera = args.camera
linewidth = args.line_width  #box line width
obj_type_filter = args.obj_type_filter

targetdir = args.output_folder
frame_filter = args.frames


target_folder =os.path.join(targetdir, args.scene, camera_type, camera)
if not os.path.exists(target_folder):
    os.makedirs(target_folder)

radar_name_list = ["front_tracks", "front_points"]
radar_point_size = 8


############################################################################################3
# implementation
imgfolder  = os.path.join(rootdir, camera_type, camera)
lidarfolder = os.path.join(rootdir, "lidar")
labelfolder = os.path.join(rootdir, "label")
radarfolder = os.path.join(rootdir, "radar")

images = os.listdir(imgfolder)
frames = os.listdir(lidarfolder)
frames.sort()
image_ext = os.path.splitext(images[0])[1]


with open(os.path.join(rootdir,"calib",camera_type, camera+".json")) as f:
    calib = json.load(f)

extrinsic = np.array(calib["extrinsic"])
intrinsic = np.array(calib["intrinsic"])
extrinsic_matrix  = np.reshape(extrinsic, [4,4])
intrinsic_matrix  = np.reshape(intrinsic, [3,3])






#     Car:            {color: '#00ff00',  size:[4.5, 1.8, 1.5]},
#     Van:            {color: '#00ff00',  size:[4.5, 1.8, 1.5]},
#     Bus:            {color: '#ffff00',  size:[13, 3, 3.5]},
#     Pedestrian:     {color: '#ff0000',  size:[0.4, 0.5, 1.7]},
#     Rider:          {color: '#ff8800',  size:[1.6, 0.6, 1.6]},
#     Cyclist:        {color: '#ff8800',  size:[1.6, 0.6, 1.6]},
#     Bicycle:        {color: '#88ff00',  size:[1.6, 0.6, 1.2]},
#     BicycleGroup:   {color: '#88ff00',  size:[1.6, 0.6, 1.2]},
#     Motor:          {color: '#aaaa00',  size:[1.6, 0.6, 1.2]},
#     Truck:          {color: '#00ffff',  size:[10., 2.8, 3]},
#     Tram:           {color: '#00ffff',  size:[10., 2.8, 3]},
#     Animal:         {color: '#00aaff',  size:[1.6, 0.6, 1.2]},
#     Misc:           {color: '#008888',  size:[4.5, 1.8, 1.5]},
#     Unknown:        {color: '#008888',  size:[4.5, 1.8, 1.5]},





obj_color_map = {
    "Car":            (0  ,255,0  ),#'#00ff00',
    "Van":            (0  ,255,0  ),#'#00ff00',
    "Bus":            (0  ,255,255),#'#ffff00', 
    "Pedestrian":     (0  ,0  ,255),#'#ff0000',
    "Rider":          (0  ,136,255),#'#ff8800',
    "Cyclist":        (0  ,136,255),#'#ff8800',
    "Bicycle":        (0  ,255,136),#'#88ff00',
    "BicycleGroup":   (0  ,255,136),#'#88ff00',
    "Motor":          (0  ,176,176),#'#aaaa00',
    "Truck":          (255,255,0  ),#'#00ffff',
    "Tram":           (255,255,0  ),#'#00ffff',
    "Animal":         (255,176,0  ),#'#00aaff',
    "Misc":           (136,136,0  ),#'#008888',
    "Unknown":        (136,136,0  ),#'#008888',
}


colorlist=[
(255,0,0),
(0, 255,0),
(0,0,255),
(0,255,255),
(255,255,0),
(255,0, 255),

(128,0, 255),
(255,0, 128),

(0, 128, 255),
(0, 255, 128),

(128,255,0),
(255,128,0),
]
def get_obj_color(obj_type):
    return obj_color_map[obj_type]
    
colormap = {}
def get_color(obj_id):
    color = colormap.get(obj_id)
    if color is not None:
        return color
    else:
        ci = np.random.randint(0,len(colorlist))
        color = colorlist[ci]
        colormap[obj_id] = color
        return color

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
    
    return world_coord

box = np.array([[1,2,3], [10,4,5], [0,0,0]])
# psr_to_xyz(box[0], box[1], box[2])

def box_to_nparray(box):
    return np.array([
        [box["position"]["x"], box["position"]["y"], box["position"]["z"]],
        [box["scale"]["x"], box["scale"]["y"], box["scale"]["z"]],
        [box["rotation"]["x"], box["rotation"]["y"], box["rotation"]["z"]],
    ])
    #box_to_nparray({"rotation":{"x":0, "y":np.pi/3, "z":np.pi/2}, "position":{"x":1,"y":2,"z":3}, "scale":{"x":10,"y":2,"z":5}})

def proj_pts3d_to_img(pts):

    imgpos = np.matmul(extrinsic_matrix, pts)

    # rect matrix shall be applied here, for kitti

    imgpos3 = imgpos[:3,:]
    
    if np.any(imgpos3[2] < 0):
        return None

    imgpos2 = np.matmul(intrinsic_matrix, imgpos3)

    imgfinal = imgpos2[0:2,:]/imgpos2[2:,:]
    return imgfinal
    
def boxTo2dPoints(box):
    "box is a ndarray"
    box3d = psr_to_xyz(box[0], box[1], box[2])
    return proj_pts3d_to_img(box3d)
    


print('frames', frame_filter)

for f in frames:
    #f = frames[20]

    

    
    frameid = os.path.splitext(f)[0]
    imgfile = frameid+image_ext
    labelfile = frameid+".json"
    
    if not re.fullmatch(frame_filter, frameid):
        continue

    print(frameid)

    label = []
    json_file = os.path.join(labelfolder, labelfile)
    if os.path.exists(json_file):
        with open(json_file) as tempfile:
            label  = json.load(tempfile)
    else:
        print("label doen't exists")

    
    imgfile_path = os.path.join(rootdir, camera_type, camera, imgfile)
    if not os.path.exists(imgfile_path):
        print("image file doesnt exist", imgfile_path)
        continue
    img = cv2.imread(imgfile_path, cv2.IMREAD_UNCHANGED)


    img = img*1.3


    # draw boxes

    #cv2.imshow("img", imgcanvas)

    #alpha
    # if img.shape[2]<4:
    #     img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    
    #alpha_channel = np.ones(img.shape[0:2], dtype=img.dtype) * 255
    #alpha_channel = np.expand_dims(alpha_channel, -1)
    #imgcanvas = np.concatenate([img, alpha_channel], axis=2)
    imgcanvas = np.zeros(img.shape, dtype=img.dtype)
    imgcanvas_headplane = np.zeros(img.shape, dtype=img.dtype)
    color_index = 0
    for l in label['objs']:
        #color = get_color(l["obj_id"])
        obj_type = l['obj_type']
        if not re.fullmatch(args.obj_type_filter, obj_type):
            continue

        #color = get_obj_color(l["obj_type"])

        color = colorlist[color_index]
        color_index = (color_index+1) % len(colorlist)
        
        box_array = box_to_nparray(l["psr"])
        points_in_image = boxTo2dPoints(box_array)
        if points_in_image is not None:
            points_in_image = points_in_image.T
            pts = np.int32(points_in_image)
            cv2.line(imgcanvas,tuple(pts[0]),tuple(pts[1]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[1]),tuple(pts[2]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[2]),tuple(pts[3]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[3]),tuple(pts[0]),color,linewidth)

            cv2.fillPoly(imgcanvas_headplane, [pts[0:4].reshape((-1,1,2))],color)
            cv2.line(imgcanvas,tuple(pts[4]),tuple(pts[5]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[5]),tuple(pts[6]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[6]),tuple(pts[7]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[7]),tuple(pts[4]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[0]),tuple(pts[4]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[1]),tuple(pts[5]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[2]),tuple(pts[6]),color,linewidth)
            cv2.line(imgcanvas,tuple(pts[3]),tuple(pts[7]),color,linewidth)

            cv2.putText(imgcanvas, l['obj_id'], tuple(pts[3]), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

    final_img = img
    final_img[imgcanvas!=0] = 0.2 * final_img[imgcanvas!=0]
    final_img = final_img + imgcanvas*0.8

    final_img[imgcanvas_headplane!=0] = 0.8 * final_img[imgcanvas_headplane!=0]
    final_img = final_img + imgcanvas_headplane*0.2


    # draw radar points

    if args.radar == 'yes':
        imgcanvas_radar = np.zeros(img.shape, dtype=img.dtype)
        for radar_name in radar_name_list:
            radar_calib_file = os.path.join(rootdir, "calib", "radar", radar_name+".json")
            with open(radar_calib_file) as tempf:
                radar_calib = json.load(tempf)

            c = radar_calib["color"]
            color = [c[2]*255, c[1]*255, c[0]*255]

            #color = np.int8(np.array(color)*255)
            print(color)
            radar_file = os.path.join(radarfolder, radar_name, f)


            if os.path.exists(radar_file):
                pc = pypcd.PointCloud.from_path(radar_file)
                position =  np.stack([pc.pc_data['x'], pc.pc_data['y'], pc.pc_data['z']])
                position = np.concatenate([position, np.ones((1,position.shape[1]))])
                #print(position)

                #
                trans = euler_angle_to_rotate_matrix(np.array(radar_calib["rotation"]), np.array(radar_calib["translation"]))
                translated_position = np.matmul(trans, position)
                #translated_position = translated_position[0:3,:]

                img_pts = np.int32(proj_pts3d_to_img(translated_position))

                for p in img_pts.T:
                    cv2.circle(imgcanvas_radar, tuple(p), radar_point_size, color, radar_point_size+2)

                #combine
                final_img[imgcanvas_radar!=0] = 0.1 * final_img[imgcanvas_radar!=0]
                final_img = final_img + imgcanvas_radar*0.9
    






    #cv2.imwrite(os.path.join(targetdir, "{0:s}.jpg".format(frameid)), final_img)

    

    target_file = os.path.join(target_folder, "{0:s}.jpg".format(frameid))
    if os.path.exists(target_file) and args.overwrite == 'no':
        print('file exists', target_file)
        continue
    else:
        ret = cv2.imwrite(target_file, final_img)
        if not ret:
            print("save file failed:", target_file)
    #print("{0:s} written".format(frameid))



# ffmpeg -framerate 4 -i ./image_temp/%06d.jpg -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p  -vf "crop=2048:800:0:400"  front_camera_2x.mp4

# ffmpeg -framerate 4 -i ./image_temp/lidar/%06d.png -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p  -vf "crop=1870:954:50:126"  lidar_2x.mp4

