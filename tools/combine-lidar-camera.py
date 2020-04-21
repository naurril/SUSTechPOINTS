
import os
import numpy as np
import cv2

srcdir = "./image_temp"
lidardir = os.path.join(srcdir, "lidar_2radars_screenshots")
cameradir = os.path.join(srcdir, "camera_2radars")
targetlidardir = os.path.join(srcdir, "lidar_2radars_cropped")


lidar_images = os.listdir(lidardir)
camera_images = os.listdir(cameradir)
lidar_images.sort()
camera_images.sort()

for i, (lidarfile, imgfile), in enumerate(zip(lidar_images, camera_images)):
    lidar_img = cv2.imread(os.path.join(lidardir, lidarfile), 1)
    camera_img = cv2.imread(os.path.join(cameradir, imgfile), cv2.IMREAD_UNCHANGED)
    cropped_lidar = lidar_img[126:, 50:1600]
    cropped_camera = camera_img[600:1200,0:] #800 by 2048

    resized_camera = cv2.resize(cropped_camera, (922,270))

    cropped_lidar[0:270,0:922] = resized_camera

    if cropped_lidar.shape[0]%2!=0:
        cropped_lidar = cropped_lidar[:-1, :]
    
    #cv2.imwrite(os.path.join(targetlidardir, lidarfile), cropped_lidar)
    cv2.imwrite(os.path.join(targetlidardir, "{0:06d}.png".format(i)), cropped_lidar)
    

#ffmpeg -framerate 4 -i ./image_temp/lidar_2radars_cropped/%06d.png -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p  lidar_camera_2radar_2x.mp4