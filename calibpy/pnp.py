import cv2
import numpy as np
import json

# Dependencies Ubuntu1804
# sudo apt install libsm6 libxrender1
# pip3 install opencv-python --user

# Parameters:
#   json_name:  name of output json file
#   camera_mat: 3x3 Camera Matrix
#   dist_coeff: distortion coefficients
#   lidar_points: Nx3 1-channel 3D points
#   image_points: Nx2 1-channel 2D points
# Return value:
#   T: 4x4 SE(3) transform matrix
def lidar_camera_calib(json_name, camera_mat, dist_coeff, lidar_points, image_points):
    retval, rvec, tvec, inliers = cv2.solvePnPRansac(lidar_points, image_points, camera_mat, dist_coeff, iterationsCount=5000, reprojectionError=8.0)
    print("-----")
    rot_mat, jac = cv2.Rodrigues(rvec)
    print(rot_mat)
    print("-----")
    print(tvec)
    print("-----")
    rt = np.hstack((rot_mat, tvec))
    T = np.vstack((rt, [[0,0,0,1]]))
    print (T)
    calib_json = {
        "extrinsic": T.flatten().tolist(),
        "intrinsic": camera_mat.flatten().tolist()
    }
    json_object = json.dumps(calib_json, indent = 4) 
    # Writing to sample.json 
    with open(json_name, "w") as outfile: 
        outfile.write(json_object) 
    return T


### TEST

if __name__ == "__main__":
    fs = cv2.FileStorage("front_config.yaml", cv2.FILE_STORAGE_READ)
    camera_mat = fs.getNode("CameraMat").mat()
    dist_coeff = fs.getNode("DistCoeff").mat()
    image_points = fs.getNode("CameraPoints").mat()
    print(image_points)
    lidar_points = fs.getNode("LidarPoints").mat()
    print(lidar_points)
    lidar_camera_calib("front.json", camera_mat, dist_coeff, lidar_points, image_points)
    pass        
