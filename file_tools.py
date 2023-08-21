import numpy as np
import pandas as pd
import argparse
import tkinter as tk
import tkinter.filedialog
import open3d as o3d
import laspy
import sys
import os
from tkinter import Tk
from pathlib import Path
from tqdm import tqdm


"""
Tools for obtaining pregenerated input files
(trajectory, .las data, path to Vista scenes)

parse_cmdline_args() should be called before any of the
other methods.
"""

# TODO For visualize_scene.py, sensorpoints.py, vistalocal_to_global.py,
# use this instead of manually coding everything for each file...

# Global variables for file I/O
FILE = Path(__file__).resolve()
ROOT = FILE.parents[0]  # Root directory
ROOT2 = Path(__file__).parent.resolve()
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))
ROOT = Path(os.path.relpath(ROOT, Path.cwd()))


class Trajectory:
    """Container class for the trajectory"""

    def __init__(
        self,
        observer_points: np.ndarray,
        road_points: np.ndarray,
        forwards: np.ndarray,
        leftwards: np.ndarray,
        upwards: np.ndarray,
    ) -> None:
        self.__observer_points = observer_points
        self.__road_points = road_points
        self.__forwards = forwards
        self.__leftwards = leftwards
        self.__upwards = upwards

        pass

    # Getters
    def getObserverPoints(self) -> np.ndarray:
        return self.__observer_points

    def getRoadPoints(self) -> np.ndarray:
        return self.__road_points

    def getForwards(self) -> np.ndarray:
        return self.__forwards

    def getLeftwards(self) -> np.ndarray:
        return self.__leftwards

    def getUpwards(self) -> np.ndarray:
        return self.__upwards

    def getNumPoints(self) -> np.int32:
        return self.__road_points.shape[0]

    # Setters (just in case if we want to work with future trajectories)
    def setObserverPoints(self, observer_points: np.ndarray) -> None:
        self.__observer_points = observer_points

    def setRoadPoints(self, road_points: np.ndarray) -> None:
        self.__road_points = road_points

    def setForwards(self, forwards: np.ndarray) -> None:
        self.__forwards = forwards

    def setLeftwards(self, leftwards: np.ndarray) -> None:
        self.__leftwards = leftwards

    def setUpwards(self, upwards: np.ndarray) -> None:
        self.__upwards = upwards


class LasPointCloud:
    """
    Container class for the .las file. Cuts down on unused fields from the
    raw .las file itself.
    """

    def __init__(
        self,
        x: np.ndarray,
        y: np.ndarray,
        z: np.ndarray,
        gps_time: np.ndarray,
        scan_angle_rank: np.ndarray,
        point_source_ID: np.ndarray,
        intensity: np.ndarray,
        lasfilename: str,
    ):
        self.x = x
        self.y = y
        self.z = z
        self.gps_time = gps_time
        self.scan_angle_rank = scan_angle_rank
        self.point_source_ID = point_source_ID
        self.intensity = intensity
        self.lasfilename = lasfilename

    pass

    # Getters
    def getX(self) -> np.ndarray:
        return self.x

    def getY(self) -> np.ndarray:
        return self.y

    def getZ(self) -> np.ndarray:
        return self.z

    def getGPSTime(self) -> np.ndarray:
        return self.gps_time

    def getScanAngleRank(self) -> np.ndarray:
        return self.scan_angle_rank

    def getPointSourceID(self) -> np.ndarray:
        return self.point_source_ID

    def getIntensity(self) -> np.ndarray:
        return self.intensity

    def getLasFileName(self) -> str:
        return self.lasfilename

    # Setters (just in case if we want to work with future .las clouds, but these probably shouldn't be used)
    def setX(self, x: np.ndarray) -> None:
        self.x = x

    def setY(self, y: np.ndarray) -> None:
        self.y = y

    def setZ(self, z: np.ndarray) -> None:
        self.z = z

    def setGPSTime(self, gps_time: np.ndarray) -> None:
        self.gps_time = gps_time

    def setScanAngleRank(self, scan_angle_rank: np.ndarray) -> None:
        self.scan_angle_rank = scan_angle_rank

    def setPointSourceID(self, point_source_id: np.ndarray) -> None:
        self.point_source_ID = point_source_id

    def setIntensity(self, intensity: np.ndarray) -> None:
        self.intensity = intensity

    def setLasFileName(self, lasfilename: str) -> None:
        self.lasfilename = lasfilename

    pass


class SensorConfig:
    """
    Container class for the sensor configuration.
    """

    def __init__(
        self,
        numberSensors: int,
        horizAngRes: np.float32,
        verticAngRes: np.float32,
        e_low: np.float32,
        e_high: np.float32,
        a_low: np.float32,
        a_high: np.float32,
        r_low: np.float32,
        r_high: np.float32,
    ):
        self.__numberSensors = numberSensors
        self.__horizAngRes = horizAngRes
        self.__verticAngRes = verticAngRes
        self.__e_low = e_low
        self.__e_high = e_high
        self.__a_low = a_low
        self.__a_high = a_high
        self.__r_low = r_low
        self.__r_high = r_high

    pass

    sensor_config_filename = None

    # We shouldn't need setters, let alone getters since we are
    # creating only one container object, but I did it just in case.
    def getNumberSensors(self) -> int:
        return self.__numberSensors

    def getHorizAngRes(self) -> np.float32:
        return self.__horizAngRes

    def getVerticAngRes(self) -> np.float32:
        return self.__verticAngRes

    def getELow(self) -> np.float32:
        return self.__e_low

    def getEHigh(self) -> np.float32:
        return self.__e_high

    def getALow(self) -> np.float32:
        return self.__a_low

    def getAHigh(self) -> np.float32:
        return self.__a_high

    def getRLow(self) -> np.float32:
        return self.__r_low

    def getRHigh(self) -> np.float32:
        return self.__r_high

    # Setters
    def setNumberSensors(self, numberSensors: int) -> None:
        self.__numberSensors = numberSensors

    def setHorizAngRes(self, horizAngRes: np.float32) -> None:
        self.__horizAngRes = horizAngRes

    def setVerticAngRes(self, verticAngRes: np.float32) -> None:
        self.__verticAngRes = verticAngRes

    def setELow(self, e_low: np.float32) -> None:
        self.__e_low = e_low

    def setEHigh(self, e_high: np.float32) -> None:
        self.__e_high = e_high

    def setALow(self, a_low: np.float32) -> None:
        self.__a_low = a_low

    def setAHigh(self, a_high: np.float32) -> None:
        self.__a_high = a_high

    def setRLow(self, r_low: np.float32) -> None:
        self.__r_low = r_low

    def setRHigh(self, r_high: np.float32) -> None:
        self.__r_high = r_high


class VistaSceneOpener:
    """
    Method class to read Vista scenes into memory.
    In order for Open3D point clouds to be parallelized with, we need to call
    it through this method class, and convert to tensor.
    """

    # Opens one specified point cloud as an ndarray, parallelized
    def open_scene(self, path2scenes: str, frame: int, res: np.float32) -> np.ndarray:
        """Reads a specified Vista scene from a path into memory.
        This is called in the parallelized loop in obtain_scenes().

        Args:
            path2scenes (str): The path to the folder containing the scenes.
            frame (int): The frame of the particular scene.
            res (np.float32): The resolution of the sensor at which the scene was recorded.
            This should be given in the filename, where scene names are guaranteed to be
            "output_<FRAME>_<RES>.txt".

        Returns:
            pcd (np.ndarray): Our point cloud, in ndarray format.
        """

        scene_name = f"output_{frame}_{res:.2f}.txt"
        path_to_scene = os.path.join(path2scenes, scene_name)

        # Skip our header, and read only XYZ coordinates
        df = pd.read_csv(path_to_scene, skiprows=0, usecols=[0, 1, 2])
        xyz = df.to_numpy() / 1000

        return xyz

    # Opens one specified point cloud as an Open3D tensor, parallelized
    def open_scene_o3d(
        self, path2scenes: str, frame: int, res: np.float32
    ) -> o3d.t.geometry.PointCloud:
        """Reads a specified Vista scene from a path into memory.
        This is called in the parallelized loop in obtain_scenes().

        NOTE: In order to visualize our point clouds using Open3D's Visualizer
        class, we need to call the .to_legacy() method to convert it back to
        a visualizable format.

        Args:
            path2scenes (str): The path to the folder containing the scenes.
            frame (int): The frame of the particular scene.
            res (np.float32): The resolution of the sensor at which the scene was recorded.
            This should be given in the filename, where scene names are guaranteed to be
            "output_<FRAME>_<RES>.txt".

        Returns:
            pcd (o3d.t.geometry.PointCloud): Our point cloud, in tensor format.
        """

        scene_name = f"output_{frame}_{res:.2f}.txt"
        path_to_scene = os.path.join(path2scenes, scene_name)

        # Skip our header, and read only XYZ coordinates
        df = pd.read_csv(path_to_scene, skiprows=0, usecols=[0, 1, 2])
        xyz = df.to_numpy() / 1000

        # Create Open3D point cloud object with tensor values.
        # For parallelization, outputs must be able to be serialized because Python sucks.
        pcd = o3d.t.geometry.PointCloud(o3d.core.Device("CPU:0"))
        pcd.point.positions = o3d.core.Tensor(
            xyz, o3d.core.float32, o3d.core.Device("CPU:0")
        )

        return pcd


# Parse our command line arguments
def parse_cmdline_args() -> argparse.Namespace:
    # use argparse to parse arguments from the command line
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--config", type=str, default=None, help="Path to sensor config file"
    )
    parser.add_argument(
        "--trajectory", type=str, default=None, help="Path to trajectory folder"
    )
    parser.add_argument(
        "--observer_height", type=float, default=1.8, help="Height of the observer in m"
    )
    parser.add_argument(
        "--scenes", type=str, default=None, help="Path to the Vista output folder"
    )
    parser.add_argument(
        "--numScenes", type=int, default=1, help="Number of Vista output folders"
    )
    parser.add_argument("--input", type=str, default=None, help="Path to the .las file")

    return parser.parse_args()


# Obtain the trajectory
def obtain_trajectory_details(args: argparse.Namespace) -> Trajectory:
    """Obtains a pregenerated trajectory and reads each of them into
    a container class.

    Args:
        args (argparse.Namespace): Parsed command-line arguments.

    Returns:
        Trajectory: Container class for our imported trajectory data.
    """

    # Get trajectory folder path
    try:
        arg_trajectory = args.trajectory
    except AttributeError:
        arg_trajectory = None

    if arg_trajectory == None:
        # Manually open trajectory folder
        Tk().withdraw()
        trajectory_folderpath = tk.filedialog.askdirectory(
            initialdir=ROOT2, title="Please select the trajectory folder"
        )
        print(
            f"You have chosen to open the trajectory folder:\n{trajectory_folderpath}"
        )

    else:
        # Use trajectory folder from defined command line argument
        trajectory_folderpath = args.trajectory
        print(
            f"You have chosen to use the pregenerated trajectory folder:\n{trajectory_folderpath}"
        )

    # Read the filenames of the trajectories into a list
    trajectory_files = [
        path
        for path in os.listdir(trajectory_folderpath)
        if os.path.isfile(os.path.join(trajectory_folderpath, path))
    ]

    # Sanity check
    # if len(trajectory_files) != 5:
    #  raise(RuntimeError(f"Trajectory folder is missing files!\nExpected count: 5 (got {len(trajectory_files)})!"))
    assert (
        len(trajectory_files) == 5
    ), f"Trajectory folder is missing files!\nExpected count: 5 (got {len(trajectory_files)})!"

    # Read each of the csv files as numpy arrays
    trajectory_data = dict()

    for csv in trajectory_files:
        csv_noext = os.path.splitext(csv)[0]
        path_to_csv = os.path.join(trajectory_folderpath, csv)
        data = np.genfromtxt(path_to_csv, delimiter=",")
        trajectory_data[csv_noext] = data

    observer_points = trajectory_data["observer_points"]
    road_points = trajectory_data["road_points"]
    forwards = trajectory_data["forwards"]
    leftwards = trajectory_data["leftwards"]
    upwards = trajectory_data["upwards"]

    # Another sanity check
    assert (
        observer_points.shape
        == road_points.shape
        == forwards.shape
        == leftwards.shape
        == upwards.shape
    ), f"Bad trajectory files! One or more trajectories are missing points!"

    # Correct the z-component of our forward vector FIXME This is broken, fix later...
    useCorrectedZ = False
    if useCorrectedZ:
        print(f"Using the corrected z-compoment of the forward vector!")
        forwards[:, 2] = (
            -(upwards[:, 0] * forwards[:, 0] + upwards[:, 1] * forwards[:, 1])
            / upwards[:, 2]
        )

        magnitude = (
            forwards[:, 0] ** 2 + forwards[:, 1] ** 2 + forwards[:, 2] ** 2
        ) ** (1 / 2)

        forwards[:, 2] /= magnitude

    # Finally store the trajectory values into our object
    trajectory = Trajectory(
        observer_points=observer_points,
        road_points=road_points,
        forwards=forwards,
        leftwards=leftwards,
        upwards=upwards,
    )

    print(
        f"{road_points.shape[0]} trajectory points have been loaded for the corresponding trajectory folder {os.path.basename(trajectory_folderpath)}"
    )

    return trajectory


# Obtain the path to our scenes
def obtain_scene_path(args: argparse.Namespace) -> str:
    """Obtains the path to the folder containing all of the outputs
    to the Vista simulator.

    Args:
        args (argparse.Namespace): Parsed command-line arguments.

    Returns:
        scenes_folderpath (str): Path to the folder containing the Vista outputs.
    """
    try:
        arg_scene = args.scenes
    except AttributeError:
        arg_scene = None

    # Get trajectory folder path
    if arg_scene == None:
        # Manually open trajectory folder
        Tk().withdraw()
        scenes_folderpath = tk.filedialog.askdirectory(
            initialdir=ROOT2, title="Please select the Vista output folder"
        )
        print(
            f"\nYou have chosen to open the folder to the scenes:\n{scenes_folderpath}"
        )

    else:
        # Use trajectory folder from defined command line argument
        scenes_folderpath = args.scenes
        print(
            f"\nYou have chosen to use the predefined path to the scenes:\n{scenes_folderpath}"
        )

    num_scenes = len(
        [
            name
            for name in os.listdir(scenes_folderpath)
            if os.path.isfile(os.path.join(scenes_folderpath, name))
        ]
    )
    print(f"{num_scenes} scenes were found for the corresponding road section folder.")

    return scenes_folderpath

# Obtain the path to our scenes
def obtain_multiple_scene_path(args: argparse.Namespace) -> str:
    """Obtains the path to the folder containing all of the outputs
    to the Vista simulator.

    Args:
        args (argparse.Namespace): Parsed command-line arguments.

    Returns:
        scenes_folderpath (str): Path to the folder containing the Vista outputs.
    """
    try:
        arg_scene = args.scenes
    except AttributeError:
        arg_scene = None
        
    try:
        arg_numScenes = args.numScenes
    except AttributeError:
        arg_numScenes = 1

    scenes_folderpath = []
    
    # Get trajectory folder path
    if arg_scene == None:
        # Manually open trajectory folder
        for i in range(arg_numScenes):
            Tk().withdraw()
            #print(type(tk.filedialog.askdirectory(
            #    initialdir=ROOT2, title="Please select the Vista output folder"
            #)))
            scenes_folderpath.append(tk.filedialog.askdirectory(
                initialdir=ROOT2, title="Please select the Vista output folder"
            ))
            print(
                f"\nFor file {i}, you have chosen to open the folder to the scenes:\n{scenes_folderpath[-1]}"
            )

    else:
        # Use trajectory folder from defined command line argument
        scenes_folderpath.append(args.scenes)
        print(
            f"\nYou have chosen to use the predefined path to the scenes:\n{scenes_folderpath}"
        )
    
    print("")
    for i in range(arg_numScenes):
        num_scenes = len(
            [
                name
                for name in os.listdir(scenes_folderpath[i])
                if os.path.isfile(os.path.join(scenes_folderpath[i], name))
            ]
        )
        print(f"{num_scenes} scenes were found for folder {i}.")

    return scenes_folderpath

# Obtain the path to the sensor config
def obtain_sensor_path(args: argparse.Namespace) -> str:
    """Opens the sensor configuration file from command-line argument or
    through UI.

    Args:
        args (argparse.Namespace): Contains the command-line arguments.

    Returns:
        sensorcon_filepath (str): Path to the sensor configuration
    """
    try:
        arg_config = args.config
    except AttributeError:
        arg_config = None

    # read the sensor config file and save the params
    if arg_config == None:
        # Manually get sensor configuration file
        Tk().withdraw()
        sensorcon_filepath = tk.filedialog.askopenfilename(
            filetypes=[(".json files", "*.json"), ("All files", "*")],
            initialdir=os.path.join(ROOT2, "sensors/"),
            title="Please select the sensor configuration file",
        )
        print(f"\nYou have chosen to open the sensor file:\n{sensorcon_filepath}")

    else:
        sensorcon_filepath = args.config
        print(f"\nUsing predefined sensor file: {os.path.basename(sensorcon_filepath)}")

    return sensorcon_filepath


# Read our scenes into memory
def obtain_scenes(path2scenes: str, mode: str) -> list:
    """Reads Vista scenes into memory, either of the form
    np.ndarray or o3d.t.geometry.PointCloud.

    Args:
        path2scenes (str): The path to our Vista scenes.
        mode (str): The mode that we are going to choose:
         - 'numpy': Read all scenes into np.ndarray.
         - 'o3d': Used for visualization, after converting
           back to o3d.geometry.PointCloud using the
           .to_legacy() method.

    Returns:
        pcds (list): The list of all the Vista scenes read into memory.
    """
    import glob

    path2scenes_ext = os.path.join(path2scenes, "*.txt")

    # Get list of filenames within our scenes list
    # Filenames are guaranteed to be of the format "output_FRAME_RES.txt"
    filenames = [os.path.basename(abs_path) for abs_path in glob.glob(path2scenes_ext)]

    # Obtain sensor resolution
    res = np.float32(float(os.path.splitext((filenames[0].split("_")[-1]))[0]))

    # For offsetting frame indexing in case if we are working with padded output
    # Output should usually be padded anyways
    offset = int(min(filenames, key=lambda x: int((x.split("_"))[1])).split("_")[1])

    # Read each of the scenes into memory in parallel
    import joblib
    from joblib import Parallel, delayed

    cores = min((joblib.cpu_count() - 1), len(filenames))

    # Create our opener object (for inputs/outputs to be serializable)
    # Scenes will be read into memory either as np.ndarray OR o3d.t.geometry.PointCloud
    # (see VistaSceneOpener's methods)
    opener = VistaSceneOpener()

    # Define the arguments that will be ran upon in parallel
    args = [(path2scenes, frame + offset, res) for frame in range(len(filenames))]

    # Select the mode at which we will read our point clouds
    if mode == "numpy":
        method = opener.open_scene
    elif mode == "o3d":
        method = opener.open_scene_o3d
    else:
        raise (NameError("Invalid mode!"))

    pcds = Parallel(
        n_jobs=cores, backend="loky"
    )(  # Switched to loky backend to maybe suppress errors?
        delayed(method)(arg_path2scenes, arg_frame, arg_res)
        for arg_path2scenes, arg_frame, arg_res in tqdm(
            args,
            total=len(filenames),
            desc=f"Reading scenes to memory in parallel, using {cores} processes",
        )
    )

    print(f"\n{len(pcds)} scenes were read to memory.")

    return pcds

# Read the sensor configuration into memory
def open_sensor_config_file(args: argparse.Namespace) -> SensorConfig:
    """Opens the sensor configuration file from command-line argument or
    through UI.

    Args:
        args (argparse.Namespace): Contains the command-line arguments.

    Returns:
        cfg (SensorConfig): Container class containing the sensor configuration
        parameters.
    """
    try:
        arg_config = args.config
    except AttributeError:
        arg_config = None

    import json

    # read the sensor config file and save the params
    if arg_config == None:
        # Manually get sensor configuration file
        Tk().withdraw()
        sensorcon_filepath = tk.filedialog.askopenfilename(
            filetypes=[(".json files", "*.json"), ("All files", "*")],
            initialdir=os.path.join(ROOT2, "sensors/"),
            title="Please select the sensor configuration file",
        )
        print(f"\nYou have chosen to open the sensor file:\n{sensorcon_filepath}")

    else:
        sensorcon_filepath = args.config
        print(f"\nUsing predefined sensor file: {os.path.basename(sensorcon_filepath)}")

    # tStart = perf_counter()

    with open(sensorcon_filepath, "r") as f:
        data = f.read()

    sensor_cfg_dict = json.loads(data)

    # Create container object
    cfg = SensorConfig(
        sensor_cfg_dict["numberSensors"],
        sensor_cfg_dict["horizAngRes"],
        sensor_cfg_dict["verticAngRes"],
        sensor_cfg_dict["e_low"],
        sensor_cfg_dict["e_high"],
        sensor_cfg_dict["a_low"],
        sensor_cfg_dict["a_high"],
        sensor_cfg_dict["r_low"],
        sensor_cfg_dict["r_high"],
    )

    cfg.sensor_config_filename = os.path.basename(sensorcon_filepath)

    # tStop = perf_counter()

    # print(f"Loading took {(tStop-tStart):.2f}s.")

    return cfg

# Open our .las point cloud into memory
def open_las(args: argparse.Namespace) -> LasPointCloud:
    """
    Opens a .las file when prompted to do so. Can force a predetermined filename
    (default called as None for manual input)

    Arguments:
    verbose (bool): Setting to print extra information to the command line.

    predetermined_filename (string): The predetermined file name of the point cloud.
    User can be manually prompted to enter the point cloud, or it can be set to some
    point cloud via command line for automation. See main() for command line syntax.
    """
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
        raw_las.intensity,
        las_filename_cut,
    )

    return las
