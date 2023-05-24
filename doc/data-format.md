## Coordinate system

### LiDAR coordinate system
 This tool uses right-hand coordinate system and assumes the z-axis goes upward (opposite direction of gravity). the z-axes is used in many heuristic algorithms (ground detecting, yaw-angle detection...).

### 3D box Label

**Position**

the position is the center point of the box, represented in LiDAR coordinate system. 

**Rotation**

For rotation we use Euler angle representation (XYZ order, default of THREE.js library). The yaw angle (rotation around z axis, the heading direction of target object) of 0 degree is parallel to the +x axis of the LiDAR system and it's counter-clockwise if viewed from above.

Our tool supports pitch and roll angles, they are rotations around x/y axies of the box's local coordinate system, in which the x-axis goes forward, and the y-axis goes left-hand, the z-axis goes upward.

For general introduction of coordinate system and yaw angle used in common datasets, please check [MMDetection3D's doc](https://mmdetection3d.readthedocs.io/en/latest/tutorials/coord_sys_tutorial.html?highlight=axes)


**Dimenstion** 

The dimention is represented in the local coordinate system of the box.

## Calibrations

### LiDAR to camera
### Radar to LiDAR
### GPS/IMU(EgoCar Pose) to LiDAR
when the scene is continuous you  may want to render it on earth-coordinate-system, making it look like the ego-car is running on road ( rather than the road is moving with egocar fixed ). 