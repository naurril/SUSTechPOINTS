import laspy
import argparse
import open3d as o3d
import numpy as np
import matplotlib
import gen_traj
import file_tools

import os
import sys
from pathlib import Path

import tkinter as tk
from tkinter import Tk
from tkinter import filedialog

'''
Converts a .las file to .pcd for the annotation tool, though temporary.
'''

# Global variables for file I/O
FILE = Path(__file__).resolve()
ROOT = FILE.parents[0]  # Root directory
ROOT2 = Path(__file__).parent.resolve()
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))
ROOT = Path(os.path.relpath(ROOT, Path.cwd()))
GLOBAL = False
# Centers point cloud and applies colormap


def convert_pcd(las: laspy.LasData, filename: str) -> None:

    # LiDAR data on a road should not have any RGB colors
    # KITTI data should not have an intensity field attached to it
    is_road = False

    # Determine type of input file
    try:
        _ = las.red
        _ = las.green
        _ = las.blue
    except AttributeError:
        if not np.all(las.intensity) == 0:
            is_road = True
    
    
    pcd = o3d.geometry.PointCloud()
    # Assign points
    las_xyz = las.xyz
    if not GLOBAL:
        # road_pts = get_trajectory(las) # doesn't work on a custom cut small road
        las_xyz -= las_xyz[las_xyz.shape[0] // 2, :] # Center point cloud
    pcd.points = o3d.utility.Vector3dVector(las_xyz)

    # Assign colors depending on the input file
    if not is_road:
        # Transfer RGB values from the already colored point cloud
        las_rgb = np.vstack((las.red, las.green, las.blue)).T / 65535 # Normalize to [0, 1]
        pcd.colors = o3d.utility.Vector3dVector(las_rgb)
    else:
        # Apply a gray colormap onto the road itself
        las_intensity = las.intensity
        
        # Normalize intensity values to [0, 1], then assign RGB values
        normalizer = matplotlib.colors.Normalize(
            np.min(las_intensity), np.max(las_intensity))
        las_rgb = matplotlib.cm.gray(normalizer(las_intensity))[:, :-1]
        # cmap(las_intensity) returns RGBA, cut alpha channel
        pcd.colors = o3d.utility.Vector3dVector(las_rgb)

    # Write the file
    output_folder = os.path.join(ROOT2, "data/two/lidar")
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    print("Saving to file...")
    output_path = os.path.join(output_folder, f"{filename}_converted.pcd")

    o3d.io.write_point_cloud(output_path, pcd, print_progress=True)
    print(f"\nDone!\nFile was saved to {output_path}.")
    return


def write_pcd_to_lidar(las: laspy.LasData, filename: str, las_filename: str) -> None:
    # LiDAR data on a road should not have any RGB colors
    # KITTI data should not have an intensity field attached to it
    is_road = False

    # Determine type of input file
    try:
        _ = las.red
        _ = las.green
        _ = las.blue
    except AttributeError:
        if not np.all(las.intensity) == 0:
            is_road = True
    
    pcd = o3d.geometry.PointCloud()
    las_xyz = las.xyz
    if not GLOBAL:
        # road_pts = get_trajectory(las) # doesn't work on a custom cut small road
        las_xyz -= las_xyz[las_xyz.shape[0] // 2, :] # Center point cloud
    print("Getting points for the .pcd file")
    pcd.points = o3d.utility.Vector3dVector(las_xyz)
    import matplotlib

    las_intensity = las.intensity

    # Assign colors depending on the input file
    if not is_road:
        # Transfer RGB values from the already colored point cloud
        las_rgb = np.vstack((las.red, las.green, las.blue)).T / 65535 # Normalize to [0, 1]
        pcd.colors = o3d.utility.Vector3dVector(las_rgb)
    else:
        # Apply a gray colormap onto the road itself
        las_intensity = las.intensity
        
        # Normalize intensity values to [0, 1], then assign RGB values
        normalizer = matplotlib.colors.Normalize(
            np.min(las_intensity), np.max(las_intensity))
        las_rgb = matplotlib.cm.gray(normalizer(las_intensity))[:, :-1]
        # cmap(las_intensity) returns RGBA, cut alpha channel
        pcd.colors = o3d.utility.Vector3dVector(las_rgb)

    las_files_dir = Path(las_filename).parent.absolute()
    lidar_dir = os.path.join(Path(las_files_dir).parent.absolute(), 'lidar')

    if not os.path.exists(lidar_dir):
        os.makedirs(lidar_dir)

    print("Saving to file...")
    output_path = os.path.join(lidar_dir, f"{filename}_converted.pcd")

    o3d.io.write_point_cloud(output_path, pcd, print_progress=True)
    print(f"\nDone!\nFile was saved to {output_path}.")
    return


def open_las(args: argparse.Namespace):

    import tkinter as tk
    from tkinter import Tk

    try:
        arg_input = args.input
    except AttributeError:
        arg_input = None

    if arg_input == None:
        # Manually obtain file via UI
        Tk().withdraw()
        las_filename = tk.filedialog.askopenfilename(
            filetypes=[(".las files", "*.las"), ("All files", "*")],
            initialdir=ROOT2,
            title="Please select the main point cloud",
        )

        print(f"You have chosen to open the point cloud:\n{las_filename}")

    else:
        las_filename = args.input

    # Obtain the las file name itself rather than the path for csv output
    las_filename_cut = os.path.splitext(os.path.basename(las_filename))[0]
    print(las_filename, las_filename_cut)
    # Note: lowercase dimensions with laspy give the scaled value
    raw_las = laspy.read(las_filename)

    return raw_las, las_filename_cut

# Obtains raw las data that we will convert on


def open_las_file(filename: str):
    las_filename = filename
    # Obtain the las file name itself rather than the path for csv output
    las_filename_cut = os.path.splitext(os.path.basename(las_filename))[0]
    print(f"{las_filename} opened")
    # Note: lowercase dimensions with laspy give the scaled value
    raw_las = laspy.read(las_filename)
    return raw_las, las_filename_cut


def convert_for_server(filename: str):
    las, las_filename_cut = open_las_file(filename)
    write_pcd_to_lidar(las, las_filename_cut, filename)
    return

# We need to get the road point that represents the center of the original point cloud
def get_trajectory(las: laspy.LasData) -> np.ndarray:
    traj_config = gen_traj.TrajectoryConfig(floor_box_edge=2.0, point_density=1.0, observer_height=1.8)
    las_obj = file_tools.LasPointCloud(
        las.x,
        las.y,
        las.z,
        las.gps_time,
        las.scan_angle_rank,
        las.point_source_id,
        las.intensity,
        None,
    )
    
    road_points, _, _, _ = gen_traj.generate_trajectory(
        verbose=False, 
        las_obj=las_obj,
        traj=traj_config
        )
    
    print("Trajectory generation complete.")
    
    return road_points

def main():
    args = parse_cmdline_args()
    las, las_filename_cut = open_las(args)

    convert_pcd(las, las_filename_cut)

    return


if __name__ == "__main__":
    main()
