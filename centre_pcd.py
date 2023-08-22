import numpy as np 
import open3d as o3d

# TO DO 
# prompt file selection and do it using that

filename = './data/road/lidar/trimmed2.pcd'
output_path = './data/road/lidar/trimmed2_centre.pcd'
pcd = o3d.io.read_point_cloud(filename)
out_arr = np.asarray(pcd.points)  
print(out_arr)

print(out_arr.shape)
centre_idx = out_arr.shape[0]//2
centre_row = out_arr[centre_idx]

a = np.array(centre_row)
a = np.tile(a, (out_arr.shape[0], 1))

points = out_arr - a

print(points)

new_pcd = o3d.geometry.PointCloud()
new_pcd.points = o3d.utility.Vector3dVector(points)
o3d.io.write_point_cloud(output_path, new_pcd, print_progress=True)    
