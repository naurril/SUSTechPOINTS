
import os
import json
import numpy as np
import math
import cv2

rootdir = "./data/20200411-0-600"
camera = "front"
targetdir = "./image_temp"
linewidth = 2

imgfolder  = os.path.join(rootdir, "image", camera)
lidarfolder = os.path.join(rootdir, "pcd")
labelfolder = os.path.join(rootdir, "label")
images = os.listdir(imgfolder)
frames = os.listdir(lidarfolder)
frames.sort()
image_ext = os.path.splitext(images[0])[1]


with open(os.path.join(rootdir,"calib", camera+".json")) as f:
    calib = json.load(f)

extrinsic = np.array(calib["extrinsic"])
intrinsic = np.array(calib["intrinsic"])
extrinsic_matrix  = np.reshape(extrinsic, [4,4])
intrinsic_matrix  = np.reshape(intrinsic, [3,3])


colorlist=[
#(255,0,0),
(0, 255,0),
(0,0,255),
(0,255,255),
(255,255,0),
(255,0, 255),
(255,0, 255),

(0, 128,0),
(0,0,125),
(0,125,125),
(125,255,0),
(125,0, 255),
(125,0, 255),
]

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

def euler_angle_to_rotate_matrix(eu, t):
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

def box_to_2d_points(box):
    "box is a ndarray"
    box3d = psr_to_xyz(box[0], box[1], box[2])
    
    imgpos = np.matmul(extrinsic_matrix, box3d)

    # rect matrix shall be applied here, for kitti

    imgpos3 = imgpos[:3,:]
    
    if np.any(imgpos3[2] < 0):
        return None

    imgpos2 = np.matmul(intrinsic_matrix, imgpos3)

    imgfinal = imgpos2[0:2,:]/imgpos2[2:,:]
    return imgfinal



for i,f in enumerate(frames):
    #f = frames[0]
    frameid = os.path.splitext(f)[0]
    imgfile = frameid+image_ext
    labelfile = frameid+".json"
    with open(os.path.join(labelfolder, labelfile)) as f:
        labels  = json.load(f)

    imgfile_path = os.path.join(rootdir, "image", camera, imgfile)
    img = cv2.imread(imgfile_path, cv2.IMREAD_UNCHANGED)
    #cv2.imshow("img", imgcanvas)

    #alpha
    # if img.shape[2]<4:
    #     img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    
    #alpha_channel = np.ones(img.shape[0:2], dtype=img.dtype) * 255
    #alpha_channel = np.expand_dims(alpha_channel, -1)
    #imgcanvas = np.concatenate([img, alpha_channel], axis=2)
    imgcanvas = np.zeros(img.shape, dtype=img.dtype)
    imgcanvas_headplane = np.zeros(img.shape, dtype=img.dtype)
    for l in labels:
        color = get_color(l["obj_id"])
        box_array = box_to_nparray(l["psr"])
        points_in_image = box_to_2d_points(box_array)
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

    final_img = img
    final_img[imgcanvas!=0] = 0.3 * final_img[imgcanvas!=0]
    final_img = final_img + imgcanvas*0.7

    final_img[imgcanvas_headplane!=0] = 0.7 * final_img[imgcanvas_headplane!=0]
    final_img = final_img + imgcanvas_headplane*0.3

    cv2.imwrite(os.path.join(targetdir, "{0:06d}.jpg".format(i)), final_img)
    print("{0:s} written".format(str(i)))

# ffmpeg -framerate 4 -i ./image_temp/%06d.jpg -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p  front_camera_2x.mp4