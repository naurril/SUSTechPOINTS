import laspy
import file_tools
import gen_traj
import argparse
import open3d as o3d
import numpy as np

import os
import sys
from pathlib import Path

'''
Converts a .las file to .pcd and then shifts it to local.
'''

# Global variables for file I/O
FILE = Path(__file__).resolve()
ROOT = FILE.parents[0]  # Root directory
ROOT2 = Path(__file__).parent.resolve()
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))
ROOT = Path(os.path.relpath(ROOT, Path.cwd()))

# Centers point cloud and applies colormap


def convert_pcd(las: laspy.LasData, filename: str) -> None:
    pcd = o3d.geometry.PointCloud()

    las_xyz = las.xyz

    pcd.points = o3d.utility.Vector3dVector(las_xyz)

    import matplotlib

    las_intensity = las.intensity

    # Normalize intensity values to [0, 1], then assign RGB values
    normalizer = matplotlib.colors.Normalize(
        np.min(las_intensity), np.max(las_intensity))
    las_rgb = matplotlib.cm.gray(normalizer(las_intensity))[:, :-1]
    # cmap(las_intensity) returns RGBA, cut alpha channel
    pcd.colors = o3d.utility.Vector3dVector(las_rgb)

    output_folder = os.path.join(ROOT2, "data/two/lidar")
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    print("Saving to file...")
    output_path = os.path.join(output_folder, f"{filename}_converted.pcd")

    o3d.io.write_point_cloud(output_path, pcd, print_progress=True)
    print(f"\nDone!\nFile was saved to {output_path}.")
    return


def write_pcd_to_lidar(las: laspy.LasData, filename: str, las_filename: str) -> None:
    pcd = o3d.geometry.PointCloud()
    las_xyz = las.xyz
    pcd.points = o3d.utility.Vector3dVector(las_xyz)
    import matplotlib

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

# Obtains raw las data that we will convert on


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
    print(las_filename, las_filename_cut)
    # Note: lowercase dimensions with laspy give the scaled value
    raw_las = laspy.read(las_filename)
    return raw_las, las_filename_cut


def convert_for_server(filename: str):
    las, las_filename_cut = open_las_file(filename)
    write_pcd_to_lidar(las, las_filename_cut, filename)
    return


def main():
    args = file_tools.parse_cmdline_args()
    las, las_filename_cut = open_las(args)

    convert_pcd(las, las_filename_cut)

    return


if __name__ == "__main__":
    main()
