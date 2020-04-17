
import os
import numpy as np
import cv2

rootdir = "./data/20200411-2hz"
camera = "front"
srcdir = "./image_temp"
lidardir = os.path.join(srcdir, "lidar")
cameradir = os.path.join(srcdir, "camera_colortype")
targetlidardir = os.path.join(srcdir, "lidar_cropped")


lidar_images = os.listdir(lidardir)
camera_images = os.listdir(cameradir)
lidar_images.sort()
camera_images.sort()

for lidarfile, imgfile, in zip(lidar_images, camera_images):
    lidar_img = cv2.imread(os.path.join(lidardir, lidarfile), 1)
    camera_img = cv2.imread(os.path.join(cameradir, imgfile), cv2.IMREAD_UNCHANGED)
    cropped_lidar = lidar_img[126:, 50:1600]
    cropped_camera = camera_img[400:1200,0:] #800 by 2048

    resized_camera = cv2.resize(cropped_camera, (922,360))

    cropped_lidar[0:360,0:922] = resized_camera
    cv2.imwrite(os.path.join(targetlidardir, lidarfile), cropped_lidar)
    

#ffmpeg -framerate 4 -i ./image_temp/lidar_cropped/%06d.png -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p  lidar_camera_2x.mp4