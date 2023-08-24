import laspy
import argparse
import open3d as o3d
import numpy as np

import os, sys
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

# Centers point cloud and applies colormap
def convert_pcd(las: laspy.LasData, output_folder: str, filename: str) -> None:
    print("\nConverting point cloud...")
    pcd = o3d.geometry.PointCloud()
    
    las_xyz = las.xyz
    
    pcd.points = o3d.utility.Vector3dVector(las_xyz)
    print("Points loaded.")
    
    import matplotlib
    
    las_intensity = las.intensity
    
    # Normalize intensity values to [0, 1], then assign RGB values
    # The intensity of our .las files is usually from 0 to 65535 
    normalizer = matplotlib.colors.Normalize(np.min(las_intensity), np.max(las_intensity))
    las_rgb = matplotlib.cm.gray(normalizer(las_intensity))[:,:-1]
    pcd.colors = o3d.utility.Vector3dVector(las_rgb) # cmap(las_intensity) returns RGBA, cut alpha channel
    print("Intensity colors loaded.")

    print("Saving to file...")
    output_path = os.path.join(output_folder, f"{filename}_converted.pcd")    
    
    o3d.io.write_point_cloud(output_path, pcd, print_progress=True)    
    print(f"\nDone!\nFile was saved to {output_path}.")
    return

# Obtains raw las data that we will convert on
def open_las(args: argparse.Namespace):
    
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

    # Note: lowercase dimensions with laspy give the scaled value
    raw_las = laspy.read(las_filename)

    return raw_las, las_filename_cut

# Get the output folder
def obtain_output_folder(args: argparse.Namespace) -> str:
    
    try:
        arg_output = args.output
    except AttributeError:
        arg_output = None
    
    if arg_output == None:
        # Obtain the folder for output manually
        Tk().withdraw()
        output_folder = tk.filedialog.askdirectory(
            initialdir=os.path.join(ROOT2, "data"), title="Please select the output LiDAR folder (where the .pcd files are)"
        )
        output_folder = output_folder + '/'
    else:
        output_folder = f"{ROOT2.as_posix()}/{args.output}"
    
    # Check for any errors in the path
    # Output folder must be two subfolders from the root directory 
    # and the last folder should be named 'lidar'
    # I could probably autogenerate a proper folder but there's not too much of a point
    file_depth = len(output_folder.split('/')[:-1]) - len(ROOT2.as_posix().split('/'))
    
    if not (file_depth == 3 and output_folder.split('/')[-2] == 'lidar'):
        raise RuntimeError(f"Incorrect output folder! Make sure that the output folder selected is data/<YOUR_OUTPUT_FOLDER>/lidar!")

    print(f"The converted point cloud will be written to {output_folder}")

    return output_folder

# Get command line arguments
def parse_cmdline_args():
    parser = argparse.ArgumentParser()
    
    parser.add_argument(
        "--input", type=str, default=None, help="Path to the .las file"
    )

    parser.add_argument(
        "--output", type=str, default=None, help="Path to the output folder"
    )

    return parser.parse_args()

def main():
    args = parse_cmdline_args()
    las, las_filename_cut = open_las(args)
    output_folder = obtain_output_folder(args)
    
    convert_pcd(las, output_folder, las_filename_cut)
  
    return

if __name__ == "__main__":
    main()