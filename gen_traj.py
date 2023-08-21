import numpy as np
import laspy
import argparse
import sys
import os
from pathlib import Path
import tkinter as tk
from tkinter import Tk
from tkinter import filedialog
from time import perf_counter

import matplotlib.pyplot as plt
import open3d as o3d

from file_tools import LasPointCloud

"""
Trajectory generation
Eric Cheng
2023-03-24
Generates a trajectory from a given point cloud, with Python
for OS compatibility. Values should be nearly identical, with
a worst case 10^-3 percent error 

Based on the code by Waridh Wongwandanee, JM and ZP.

I added .csv output if gen_traj.py is directly 
called from the command line for Vista input.
"""

# Global variables for file I/O
FILE = Path(__file__).resolve()
ROOT = FILE.parents[0]  # Root directory
ROOT2 = Path(__file__).parent.resolve()
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))
ROOT = Path(os.path.relpath(ROOT, Path.cwd()))


class TrajectoryConfig:
    """
    Necessary settings for generating a trajectory. Create a TrajectoryConfig
    object if you are using the trajectory generator from a different file.
    """

    def __init__(self, floor_box_edge, point_density, observer_height):
        self.floor_box_edge = floor_box_edge
        self.point_density = point_density
        self.observer_height = observer_height

    def getFloorBoxEdge(self):
        return self.floor_box_edge

    def getPointDensity(self):
        return self.point_density
    
    def getObserverHeight(self):
        return self.observer_height

    pass


class RoadPath(LasPointCloud):
    """
    Container class for the road path (points directly below the scanner)
    Inherited from LasPointCloud with some fields cut down since we don't
    need them.
    """

    def __init__(self, x, y, z, gps_time, point_source_ID):
        self.x = x
        self.y = y
        self.z = z
        self.gps_time = gps_time
        self.point_source_ID = point_source_ID

        return

    pass


# Converted from camera_path_magic.m
def generate_trajectory(verbose, las_obj, traj):
    """
    Generates all of the full frames for the vehicle, with each
    consisting of the following:
    road points, forward vector, leftward vector, upward vector

    Arguments:

    verbose (bool): Setting to print extra information to the command line.

    las_obj (LasPointCloud): Container class for the fields of the .las file.
    Cuts down on unused fields in the trajectory generation process.

    traj (TrajectoryConfig): Container class for the trajectory parameters
    with the following properties:
     - floor_box_edge (size of the floor used for fitting the up-direction)
     - point_density  (points per meter)

    Returns:
    road_points (np.ndarray): XYZ coordinates for each section of the road,
    as defined in the trajectory configuration's point density.
    For example, if the point density is 1 point per meter, then 200 road points
    will represent 200 instances of the vehicle on the road section, 1 meter spaced
    apart.

    forwards (np.ndarray): Unit vectors in the forward direction for their respective
    road points.

    leftwards (np.ndarray): Unit vectors in the leftward direction for their respective
    road points.

    upwards (np.ndarray): Unit vectors in the upward direction for their respective
    road points.
    """

    print("Generating trajectory and headings...")

    if verbose:
        tStart = perf_counter()

    ### Preprocess; convert our data from the container class to an array
    # Filter out the points that have a scan angle rank of zero, these
    # will be the points that are below the vehicle taht make our path.
    below_idxs = np.where(las_obj.getScanAngleRank() == 0)

    raw_road_path = RoadPath(
        las_obj.getX()[below_idxs],
        las_obj.getY()[below_idxs],
        las_obj.getZ()[below_idxs],
        las_obj.getGPSTime()[below_idxs],
        las_obj.getPointSourceID()[below_idxs],
    )

    # The vehicle may have several scanners, so we split the data according to them.
    scanners = np.unique(raw_road_path.getPointSourceID())
    num_scanners = scanners.size

    # Split the data according to scanner (separate by unique point_source_ID)
    split_raw_road_path = dict()

    for scanner_id in scanners:
        scanner_idxs = np.where(raw_road_path.getPointSourceID() == scanner_id)
        # Convert the split road path from RoadPath container class to matrix
        # form for simplicity
        # Each row of the split road path is of the form [x, y, z, gps_time]
        temp_road_path = np.vstack(
            (
                raw_road_path.getX()[scanner_idxs],
                raw_road_path.getY()[scanner_idxs],
                raw_road_path.getZ()[scanner_idxs],
                raw_road_path.getGPSTime()[scanner_idxs],
            )
        )

        # Sort each road path scanner by ascending GPS time
        temp_road_path = np.transpose(temp_road_path)
        temp_road_path = temp_road_path[temp_road_path[:, 3].argsort()]

        # Finally save the split road path
        split_raw_road_path[scanner_id] = temp_road_path


    def check_remove_outliers(
            window: np.array, 
            mean: np.float32, 
            sdev: np.float32, 
            window_base_index: int, 
            window_size: int, 
            raw_road_path: np.ndarray
            ) -> np.ndarray or None:
        
        """Helper function to remove the outliers from a window of z-coordinates.
        Outliers from the window are recursively removed until the window does not
        contain outliers.

        Args: 
            window (np.array): Our window of the given points.
            mean (np.float32): The rolling mean of the last known 'good' window with outliers removed.
            sdev (np.float32): The standard deviation of the window.
            window_base_index (int): The location of the window's first index relative to the whole road path.
            window_size (int): Size of the window used to calculate the moving average.
            raw_road_path (np.ndarray): Our raw road path, with the outliers within our window removed.
        """
        
        outlier_indices = ((window - mean) > traj.getObserverHeight()).nonzero()[0]

        # There are no outliers in this window, we can slide the window forward by one in the main program
        if outlier_indices.shape[0] == 0:
            return raw_road_path
        
        # Remove outlier road points
        raw_road_path = np.delete(raw_road_path, outlier_indices+window_base_index, axis=0)

        
        # Now that we have removed the outlier values, we need to fill our window with values
        # while retaining order until there are no outliers in the window, using recursion
        return check_remove_outliers(
                                     window=raw_road_path[:,2][window_base_index:window_base_index+window_size], 
                                     mean=mean, 
                                     sdev=sdev, 
                                     window_base_index=window_base_index, 
                                     window_size=window_size, 
                                     raw_road_path=raw_road_path
                                     )
        

    ## Correct overhead interference
    # Given our raw road path as points that are of 0 scan angle rank,
    # we will slide a window of 5 points based on the z-coordinates of the road path, and check
    # if any of the points within the window are outliers.

    # Here, we will define outliers to be any raw road path point that is observer_height or more meters 
    # above the mean of the past window. This is under the assumption that the initial road path has good
    # data (i.e. there is no overhead interference at the start of the road section).

    filtered_raw_road_path = split_raw_road_path
    filter_window_size = 5

    for scanner_id in scanners:

        # Get initial window, mean, and stdev
        i = 0
        window = split_raw_road_path[scanner_id][:,2][0:filter_window_size]
        mean = np.average(window)
        sdev = np.std(window)
      
        # Slide our window through the road path
        while i+filter_window_size < filtered_raw_road_path[scanner_id].shape[0]:

            # Check and recursively remove outliers from our window
            filtered_raw_road_path[scanner_id] = check_remove_outliers(
                window=window, 
                mean=mean,
                sdev=sdev, 
                window_base_index=i, 
                window_size=filter_window_size, 
                raw_road_path=filtered_raw_road_path[scanner_id]
            )

            # Obtain moving window, average, and mean from the processed window
            window = filtered_raw_road_path[scanner_id][:,2][i:i+filter_window_size]
            mean = np.average(window)
            sdev = np.std(window)            

            i+=1 # Slide our window forward by one

            pass

        pass


    ### Create a smooth path (road points) which has a notion of distance
    # Obtain the scanner id and times with the highest sensor sample rate
    # (highest point count)
    id_max = max(filtered_raw_road_path, key=lambda k: filtered_raw_road_path.get(k).shape[0])
    resample_times = filtered_raw_road_path[id_max][:, 3]
    num_resample_points = filtered_raw_road_path[id_max].shape[0]

    # Start smoothing our points for each scanner, and add road points together
    # We will vectorize the computation of our smoothed points
    road_points = np.zeros((num_resample_points, 3), dtype=float)

    for scanner_id in scanners:
        raw_times = filtered_raw_road_path[scanner_id][:, 3]
        points = filtered_raw_road_path[scanner_id][:, 0:3]

        # Resample and smooth our points
        road_points += smoothing(
            raw_times, points, resample_times, smoothing_window=0.5
        )

    # Since we added the points together, we will divide to make an average.
    road_points = road_points / num_scanners

    # Obtain cumulative distance from the start
    # distances is the cumulative sum of the distance from pt_(i+1) to pt_i, vectorized
    # I manually appended a zero since np.diff doesn't seem to care about that value.
    distances = np.append(
        [0], np.cumsum(np.linalg.norm(np.diff(road_points, n=1, axis=0), axis=1))
    )

    # Obtain total distance and points from smoothed road path
    total_distance = distances[-1]
    points = np.arange(0, total_distance, traj.getPointDensity())
    total_points = points.shape[0]

    # Resample the points by using the distances that we got to the
    # distances that we need to be at, with linear interpolation
    vals_unique, index_unique = np.unique(distances, return_index=True)

    # Given the points (vals_unique, xyz), where the two are vectors, interpolate the xyz for
    # our given value of points (determined from meters per point)
    # We interpolate by x, then y & z because numpy somehow does not allow vectorization for this.
    interpolated_road_points = np.interp(
        points, vals_unique, road_points[index_unique, :][:, 0]
    )
    for i in range(2):
        buffer = np.interp(points, vals_unique, road_points[index_unique, :][:, i + 1])
        interpolated_road_points = np.vstack((interpolated_road_points, buffer))

    # Transpose after vstack for proper numpy array indexing by [row, col]
    road_points = np.transpose(interpolated_road_points)

    if verbose:
        print(" - Road points complete.")

    ### Find the forward vector
    # Five meters in each direction
    window_index_size = np.ceil(5 / traj.getPointDensity())

    # Complicated vectorized code...
    # Explanation (from legacy code): For ever point p, it considers a region of window_index_size
    # in either direction, and then it computes the least squares slope over x, y, z for each
    # of these points.
    #
    # This leaves us with x'(d), y'(d), and z'(d) for every point, which is in essence, the heading.
    # Part of the reason why this is complicated is because it does some special things for
    # points that are on the edge of the window. The other reason why this is complicated
    # is because of the fact that it explicitly solves the least squares problem in a clever
    # way in order to reduce computational time.

    # Obtain indices to deal with points that are on the edge
    all_indexes = np.transpose(np.arange(0, total_points, 1)) + 1
    left_error = np.maximum(0, 1 - (all_indexes - window_index_size))
    # Too far left
    right_error = np.maximum(0, (all_indexes + window_index_size - total_points))
    # Too far right

    shifts = all_indexes + left_error - right_error
    initials = shifts - window_index_size

    points_per = int(2 * window_index_size) + 1

    # Broadcasting since numpy doesn't automatically broadcast values when adding arrays of unequal dimensions...
    rebroadcasted_initials = np.broadcast_to(
        np.reshape(initials, (total_points, 1)), (total_points, points_per)
    )
    rebroadcasted_error = np.broadcast_to(
        np.reshape(np.arange(-1, points_per - 1), (1, points_per)),
        (total_points, points_per),
    )

    indexes_to_compare = np.transpose(rebroadcasted_initials + rebroadcasted_error)

    # Now get some sections
    # Replacement for MATLAB indexing matrixes with matrixes
    section_indices = np.ndarray.flatten(indexes_to_compare, order="F").astype(int)

    # Note on sections: For each road point, there will be a respective section in all x,y,z directions
    # in a region window_index_size in either direction of the origin (odd section size)
    sections = np.reshape(
        road_points[section_indices, :], (points_per, total_points, 3), order="F"
    )
    # MATLAB equivalent: permute(sections, [1, 3, 2])
    # Now each of our sections are given by window_index_size 3D .las points, for each road point
    sections = np.transpose(sections, (0, 2, 1))

    # Multidimensional dot products
    temp_dot_product = np.broadcast_to(
        np.reshape(np.arange(1, points_per + 1), (points_per, 1)), (points_per, 3)
    )
    D = np.multiply(sections, temp_dot_product[:, :, np.newaxis])

    # sum across column for each submatrix of D
    D = np.sum(np.transpose(D), axis=2)
    # sum across column for each submatrix of S
    S = np.sum(np.transpose(sections), axis=2)

    # Least squares slope times a fixed constant, magic!
    slopes = D - S * ((points_per + 1) / 2)
    forwards = np.divide(
        slopes, np.reshape(np.linalg.norm(slopes, axis=1), (total_points, 1))
    )

    if verbose:
        print(" - Forward vectors complete.")

    # Explanation of the forward vector (from the legacy code):
    # Check all of the observer points 5 meters ahead, and behind you.
    # Find the line of best fit through those 3D points.
    # The direction of this line is your forward vectors.
    # Note that this has problems with extremely tight curvature with
    # radii < 3 or so meters, since this is only a first order approximation.

    ### Find the upwards vector
    # Since I imported the .las as an object, I will have to unpack them into a matrix.
    xyz = np.transpose(np.vstack((las_obj.getX(), las_obj.getY(), las_obj.getZ())))
    xyz = xyz[xyz[:, 0].argsort(kind="stable")]
    # sortrows() in MATLAB uses stable sort

    upwards = np.zeros(road_points.shape)
    # Initialize output

    for i, pos_i in enumerate(road_points):
        pos_min = pos_i - traj.getFloorBoxEdge() / 2
        pos_max = pos_i + traj.getFloorBoxEdge() / 2

        # Get nearby points within the size of the floor used for
        # fitting the up-direction, in the X direction
        lowerindex = row_lower_bound(xyz, pos_min[0], 0)
        upperindex = row_upper_bound(xyz, pos_max[0], 0)
        nearby_points = xyz[lowerindex:upperindex, :]

        # Get nearby points within the size of the floor used for
        # fitting the up-direction, in the Y direction
        nearby_points = nearby_points[(nearby_points[:, 1] >= pos_min[1]), :]
        nearby_points = nearby_points[(nearby_points[:, 1] <= pos_max[1]), :]

        # Get nearby points within the size of the floor used for
        # fitting the up-direction, in the Z direction
        nearby_points = nearby_points[(nearby_points[:, 2] >= pos_min[2]), :]
        # -999 to account for slope in terrain?
        nearby_points = nearby_points[(nearby_points[:, 2] <= pos_max[2]), :]

        if nearby_points.shape[0] > 10:
            # Obtain a plane that fits best to nearby_points at each road point,
            # at a point pt, with orthonormal basis basis_to_plane, should there
            # a sufficient number of points.

            normalvec, basis_to_plane, pt = affine_fit(nearby_points)
            upwards[i, :] = np.ndarray.flatten(normalvec)

            # 25 degree tilt, sanity check.
            if (abs(upwards[i, 2]) / np.linalg.norm(upwards[i, :])) < 0.9:
                print("bad angles at road point {}".format(i))
                upwards[i, :] = np.asarray([0, 0, 1])

        else:
            # If we don't have enough points to fit to, then we
            # take the upward vector at that point to be just <0, 0, 1>.
            # This should be unlikely though.
            print("Not enough points at road point {}".format(i))
            upwards[i, :] = np.asarray([0, 0, 1])

    # Some planes from affine_fit may have a downward pointing normal, which still counts.
    upwards = np.multiply(
        upwards,
        np.broadcast_to(
            np.reshape(np.sign(upwards[:, 2]), (total_points, 1)), (total_points, 3)
        ),
    )
    if verbose:
        print(" - Upward vectors complete.")

    ### Find the leftward vector (literally just leftwards cross forwards)
    leftwards = np.cross(upwards, forwards, 1)
    if verbose:
        print(" - Leftward vectors complete.")
        
    # Correct the z-component of the forward vector    
    useCorrectedZ = True
    if useCorrectedZ:
        forwards[:, 2] = (
            -(upwards[:, 0] * forwards[:, 0] + upwards[:, 1] * forwards[:, 1])
            / upwards[:, 2]
        )

        magnitude = (
            forwards[:, 0] ** 2 + forwards[:, 1] ** 2 + forwards[:, 2] ** 2
        ) ** (1 / 2)

        forwards[:, 2] /= magnitude

    if verbose:
        tStop = perf_counter()

        # All done!
        print("Trajectory generation complete.")
        print("Generation took %.2fs." % (tStop - tStart))

    return road_points, forwards, leftwards, upwards


# Converted from magic_smooth() in camera_path_magic.m
def smoothing(raw_times, points, resample_times, smoothing_window):
    """
    Resamples the given points of a unique scanner
    and smooths to the raw times.
    Inputs:
    raw_times (np.ndarray): Times of the split raw road path.
    points (np.ndarray): All of the points for each sensor with
                         each row given in [x,y,z] to smooth a path from.
    resample_times (np.ndarray): The new times that you would like the
                                 samples to be at.
    smoothing_window (float): Size of the window to use in smoothing.

    Returns:
    output (np.ndarray): The smoothed interpolants.
    """
    # In brief, this function tries to fit a parabola centered on some points:
    # points = A*t^2 + B*t + C
    # Then we solve for the C constants.
    #
    # For speed, here we solve the least squares problem using Cramer's rule.
    # Since points is an array where the columns are independent variables, we
    # are solving multiple at once to speed things up.

    # Same implementation as magic_smooth() in camera_path_magic.
    # Initialize the output
    output = np.zeros(
        (resample_times.shape[0], points.shape[1]), dtype=float, order="C"
    )

    val_array = np.hstack((np.transpose([raw_times]), points))
    val_array = val_array[val_array[:, 0].argsort()]

    index_start = 0
    index_end = 3

    for i, t_resample in enumerate(resample_times):
        t_0 = t_resample

        # Move up index_end (keep it from going off the end)
        while (index_end < val_array.shape[0] - 1) and (
            val_array[index_end][0] < t_0 + smoothing_window
        ):
            index_end += 1

        # Move up index_start (make sure there are at least 3 points)
        while (index_start < index_end - 3) and (
            val_array[index_start][0] < t_0 - smoothing_window
        ):
            index_start += 1

        n = index_end - index_start + 1
        # may need to add one because MATLAB indexes from 1...
        t_vec = val_array[index_start : index_end + 1, 0] - t_0
        t_vec2 = np.multiply(t_vec, t_vec)
        r_vec = val_array[index_start : index_end + 1, 1 : val_array.shape[0]]

        st = np.sum(t_vec)
        st2 = np.sum(t_vec2)
        st3 = np.matmul(np.transpose(np.matrix(t_vec2)).getH(), t_vec)
        st4 = np.matmul(np.transpose(np.matrix(t_vec2)).getH(), t_vec2)

        # Obtain raw numeric value to avoid dimension mismatch
        st3 = st3.A1.item()
        st4 = st4.A1.item()

        sr = np.sum(r_vec, axis=0)
        srt = np.matmul(np.transpose(np.matrix(t_vec).getH()), r_vec)
        srt2 = np.matmul(np.transpose(np.matrix(t_vec2).getH()), r_vec)

        # Obtain np.array to avoid dimension mismatch
        srt = srt.A1
        srt2 = srt2.A1

        # Apply Cramer's rule to explicitly solve for C in a least squares
        # solution to a quadratic: A*t^2 + B*t + C

        det_denom = (
            st4 * st2 * n
            + st3 * st * st2
            + st2 * st3 * st
            - st2 * st2 * st2
            - st3 * st3 * n
            - st4 * st * st
        )

        det_num = (
            np.multiply(np.multiply(st4, st2), sr)
            + np.multiply(np.multiply(st3, srt), st2)
            + np.multiply(np.multiply(srt2, st3), st)
            - np.multiply(np.multiply(srt2, st2), st2)
            - np.multiply(np.multiply(st3, st3), sr)
            - np.multiply(np.multiply(st4, srt), st)
        )

        output[i, :] = np.divide(det_num, det_denom)

    return output


# Converted from affine_fit.m
def affine_fit(X):
    """
    Computes the plane that fits best (least square of the normal distance
    to the plane) a set of sample points.
    Modified from Adrien Leygue's affine_fit.m from 2013 since NumPy prints a
    weird eigenvector order compared to MATLAB's.

    Arguments:
    X (np.ndarray): N by 3 array where each line is a sample point.

    Returns:
    n (np.ndarray): Our unit vector normal to the respective plane.
    v (np.ndarray): 3x2 array where the columns form an orthonormal basis of the plane.
    p (np.ndarray): Our point belonging to the plane.
    """

    # Get our point from the corresponding plane
    p = np.mean(X, axis=0)
    R = X - p
    # The samples are reduced

    # Computation of the principal directions of the sample cloud X
    d, v = np.linalg.eig(np.matmul(np.transpose(R), R))

    # Numpy is stupid here, where the order of the eigenvectors
    # can be mixed up sometimes. We will take the eigenvector that has
    # the greatest absolute value in the z-direction. The sign will be
    # corrected later such that all vectors will point upward.
    colmax = np.where(abs(v[2, :]) == np.max(abs(v[2, :])))

    n = v[:, colmax]
    v = v[:, 1 : v.shape[1]]
    # Columns of v form an orthonormal basis of the plane

    return n, v, p


# Binary search to find the index for the row lower bound.
def row_lower_bound(total_matrix, value, column):
    left = 0
    right = total_matrix.shape[0] + 1

    while left < right - 1:
        n = np.ceil((left + right) / 2).astype(int)

        if total_matrix[n, column] >= value:
            right = n
        else:
            left = n

    if left < total_matrix.shape[0]:
        row_index = right
    else:
        row_index = None

    return row_index


# Binary search to find the index for the row upper bound.
def row_upper_bound(total_matrix, value, column):
    left = 0
    right = total_matrix.shape[0] + 1

    while left < right - 1:
        n = np.floor((left + right) / 2).astype(int)

        try:
            queryval = total_matrix[n, column]
        except IndexError:
            queryval = total_matrix[n-1, column]
        
        if queryval <= value:
            left = n
        else:
            right = n

    if right > 1:
        row_index = left + 1
    else:
        row_index = None

    return row_index


##################################################################################
# The above code is if you want to generate a trajectory output and automatically
# use it for data rate and atomic norm calculations from data_rate_analysis_v2.py,
# or from another program.
#
# This section is if you want to generate a trajectory and have a .csv output.


def open_las(verbose, args):
    """
    Opens a .las file when prompted to do so. Can force a predetermined filename
    (default called as None for manual input)

    Arguments:
    verbose (bool): Setting to print extra information to the command line.

    predetermined_filename (string): The predetermined file name of the point cloud.
    User can be manually prompted to enter the point cloud, or it can be set to some
    point cloud via command line for automation. See main() for command line syntax.
    """
    if args.input == None:
        # Manually obtain file via UI
        Tk().withdraw()
        las_filename = tk.filedialog.askopenfilename(
            filetypes=[(".las files", "*.las"), ("All files", "*")],
            initialdir="inputs/",
            title="Please select the main point cloud",
        )

        print("You have chosen to open the point cloud: \n%s" % (las_filename))

    else:
        las_filename = args.input

    if verbose:
        # Read .las file and save fields as numpy array to new object.
        tStart = perf_counter()

    # Obtain the las file name itself rather than the path for csv output
    las_filename_cut = os.path.basename(las_filename)

    # Note: lowercase dimensions with laspy give the scaled value
    raw_las = laspy.read(las_filename)
    las = LasPointCloud(
        raw_las.x,
        raw_las.y,
        raw_las.z,
        raw_las.gps_time,
        raw_las.scan_angle_rank,
        raw_las.point_source_id,
        las_filename_cut,
    )

    if verbose:
        tStop = perf_counter()
        print("Loading took %.2fs." % (tStop - tStart))

    return las


def config_trajectory(verbose, args, promptuser):
    """
    Configures trajectory parameters of the road.
    Usually isn't changed, but I made an option to generate the
    trajectory with user prompt if needed.
    """

    if len(sys.argv) == 1 and promptuser:
        # Manually enter
        floor_box_edge = np.float32(
            input("Enter the size of the floor used for fitting the up-direction: ")
        )
        point_density = np.float32(
            input(
                "Enter the point density (meters per point)...\nNOTE: Performance will be proportional to 1/point_density^2: "
            )
        )
        traj = TrajectoryConfig(floor_box_edge, point_density)
    else:
        if verbose:
            print(
                "Using predefined trajectory values:\n - floor_box_edge={}\n - point_density={}".format(
                    args.floor_box_edge, args.point_density
                )
            )

        traj = TrajectoryConfig(args.floor_box_edge, args.point_density, args.observer_height)

    return traj


def csv_output(verbose, pointsvectors, observer_height, lasname, outpath):
    """
    Writes .csv output from the calculated trajectory.
    Arguments:

    verbose (bool): Setting to print extra information to the command line.

    pointsvectors (np.ndarray): Array that contains the
                                following arrays, in order:
     - road_points
     - forwards
     - leftwards
     - upwards

    observer_height (float): Approximate height of the sensor
    from the ground.

    outpath (string): The path to the output folder. Should be
    "trajectories/<RUN_NUMBER>". Can also be forcibly defined
    to some other path other than the root path, if needed.
    """

    print("Writing trajectories and points to .csv output...")

    if verbose:
        tStart = perf_counter()

    # Create folder for our respective trajectory to be stored in
    # If you want the .csv output to be elsewhere, you can define it as needed
    if outpath == None:
        # Trajectories will be saved in folder trajectories/<RUN_NUMBER>/*.csv
        outpath = ROOT2 / "examples/Trajectory"

        # New output directory, create directory and gitignore
        outfolder_name = os.path.splitext(lasname)[0]
        # Road section name here is passed from shell script

        outpath = outpath / outfolder_name
        if not os.path.exists(outpath):
            os.makedirs(outpath)

    # Compute our observer points from our road points (in the perspective of the vehicle)
    road_points = pointsvectors[0]
    upwards = pointsvectors[3]
    observer_points = road_points + observer_height * upwards

    csv_names = [
        "observer_points.csv",
        "road_points.csv",
        "forwards.csv",
        "leftwards.csv",
        "upwards.csv",
    ]

    # Here I will plan to loop through each data of the trajectory,
    # and then save each vector a .csv file with 15 decimal points.
    for i, csv in enumerate(csv_names):
        csv_outpath = outpath / csv

        # Write observer points first since it was calculated from pointsvectors.
        if i == 0:
            np.savetxt(csv_outpath, observer_points, fmt="%.15f", delimiter=",")
            continue

        np.savetxt(csv_outpath, pointsvectors[i - 1], fmt="%.15f", delimiter=",")

    if verbose:
        tStop = perf_counter()
        print("Writing took %.2fs." % (tStop - tStart))

    print(
        "Trajectory vectors for {} points have been successfully written to {}.\n".format(
            pointsvectors[0].shape[0], outpath / "*.csv"
        )
    )

    return


def parse_cmdline_args():
    """
    Allows for command line argumetns to be passed if needed.
    """
    parser = argparse.ArgumentParser()

    parser.add_argument("--input", type=str, default=None, help="Path to .las file")
    parser.add_argument(
        "--floor_box_edge",
        type=float,
        default=2.0,
        help="Size of the floor used for fitting the up-direction",
    )
    parser.add_argument(
        "--point_density",
        type=float,
        default=1.0,
        help="Point density in meters per point",
    )
    parser.add_argument(
        "--observer_height",
        type=float,
        default=1.2,
        help="Height of the observer (in meters)",
    )

    args = parser.parse_args()

    return args


def main(verbose):
    """
    Driver function for creating the trajectory from the standalone program.
    """

    # Get command line arguments. Syntax is as shown:
    #  --input (str): Path to the .las file.
    #  --floor_box_edge (float): Size of the floor used for fitting the up-direction (default 2.0)
    #  --point_density (float): Meters per point of the road section (default 1.0)
    #  --observer_height (float): Height of the observer (default 1.2)
    args = parse_cmdline_args()

    # Open .las file as a LasPointCloud object
    if len(sys.argv) == 1:
        # Prompt user to select relevant files.
        las = open_las(verbose, args)
    else:
        # Command-line select relevant files (for bash scripts?)
        las = open_las(verbose, args)

    # We usually shouldn't have to prompt the user to input the trajectory details.
    traj = config_trajectory(verbose, args, promptuser=False)

    road_points, forwards, leftwards, upwards = generate_trajectory(verbose, las, traj)
    pointsvectors = np.asarray([road_points, forwards, leftwards, upwards])
    csv_output(
        verbose, pointsvectors, args.observer_height, las.getLasFileName(), outpath=None
    )

    return


if __name__ == "__main__":
    main(verbose=True)
