#include <iostream>
#include <string>

#include <pcl/point_types.h>
#include <pcl/io/pcd_io.h>
#include <pcl/point_types.h>
#include <pcl/registration/icp.h>
#include <json/json.h>
#include <Eigen/Dense>
#include <math.h>

using namespace Eigen;


struct PointXYZIT {
    float x;
    float y;
    float z;
    float intensity;
    double timestamp;
    std::uint16_t ring;                      ///< laser ring number
    EIGEN_MAKE_ALIGNED_OPERATOR_NEW // make sure our new allocators are aligned
} EIGEN_ALIGN16;


POINT_CLOUD_REGISTER_POINT_STRUCT(PointXYZIT,
                                  (float, x, x)(float, y, y)(float, z, z)
                                  (float, intensity, intensity)(double, timestamp, timestamp)(std::uint16_t, ring, ring))



typedef PointXYZIT PointT;
typedef pcl::PointCloud<PointT> PointCloudT;


// pcd_restore  pcdfile timestamp dx dy dz droll dpitch dyaw order
// note deltas are in lidar coordinate system at specified timestamp
int main (int argc, char* argv[])
{

  if (argc !=11 )
  {
    std::cerr << "pcd_restore pcdfile outputfile timestamp dx dy dz droll dpitch dyaw order" << std::endl;
    return 0;
  }

  PointCloudT::Ptr cloud (new PointCloudT);
  
  //load pcd
  if (pcl::io::loadPCDFile<PointXYZIT> (argv[1], *cloud) == -1) //* load the file
  {
    PCL_ERROR ("Couldn't read the .pcd file \n");
    return (-1);
  }
  

  double timestamp = std::atof(argv[3]);
  
  double dx = std::atof(argv[4]);
  double dy = std::atof(argv[5]);
  double dz = std::atof(argv[6]);

  double drx = std::atof(argv[7]);
  double dry = std::atof(argv[8]);
  double drz = std::atof(argv[9]);

  char* order = argv[9];

  //std::cout<< "timestamp " << timestamp <<std::endl;


  Vector3f cloud_delta (dx, dy, dz);
  Vector3f cloud_rotation_delta(drx, dry, drz);

  for (pcl::PointCloud<PointT>::iterator p = cloud->points.begin(); p != cloud->points.end(); ++p)
  {
    if (p->x !=0 || p->y != 0 || p->z !=0) //filter nan data
    {
      Vector3f point_rotation_delta = cloud_rotation_delta *  (p->timestamp - timestamp)/0.1;
      
      Matrix3f m;
      m = AngleAxisf(point_rotation_delta[1], Vector3f::UnitY())
          * AngleAxisf(point_rotation_delta[0], Vector3f::UnitX())
          * AngleAxisf(point_rotation_delta[2], Vector3f::UnitZ());
      Vector3f point (p->x, p->y, p->z);
      

      Matrix3f trans = m; //.transpose();

      Vector3f point_rotated = trans * point;

      Vector3f point_delta = cloud_delta * (p->timestamp - timestamp)/0.1;    
      p->x = point_rotated[0] + point_delta[0];
      p->y = point_rotated[1] + point_delta[1];
      p->z = point_rotated[2] + point_delta[2];
    }    
  }

  
  pcl::io::savePCDFileBinary(argv[2], *cloud);

}