#include <iostream>
#include <fstream>
#include <string>
#include <stdlib.h>     /* atoi */


#include <filesystem>

#include <pcl/io/pcd_io.h>
#include <pcl/io/ply_io.h>
#include <pcl/point_cloud.h>
#include <pcl/console/parse.h>
#include <pcl/common/transforms.h>

#include <opencv2/core.hpp>
//#include <opencv/highgui.h>
#include <opencv2/opencv.hpp>
#include <opencv2/core/eigen.hpp>
#include <json/json.h>

pcl::PointCloud<pcl::PointXYZ> transformLidar2CameraCord(pcl::PointCloud<pcl::PointXYZ> pc, float x, float y, float z, float rot_x, float rot_y, float rot_z)
{
  Eigen::Affine3f transf = pcl::getTransformation(x, y, z, rot_x, rot_y, rot_z);
  pcl::PointCloud<pcl::PointXYZ> new_cloud;
  pcl::transformPointCloud(pc, new_cloud, transf);
  return new_cloud;
}


cv::Scalar dist_to_color(int z){
  z = z-5;

  if (z<0)
     z=0;

  if (z>40)
   z = 40;

  int color = int(z/40.0*255);

  int r,g,b;
  b = uchar(255 - color); 
  r = color < 128 ? uchar(color * 2) : uchar((255 - color) * 2); 
  g = uchar(color); 


  return cv::Scalar(r,g,b);
}




void draw_points(cv::Mat &image,pcl::PointCloud<pcl::PointXYZ> pointcloud,Eigen::Matrix3d camera_intrinsics_eigen)
{
  for (pcl::PointCloud<pcl::PointXYZ>::iterator pt = pointcloud.points.begin(); pt < pointcloud.points.end(); pt++)
  {
    Eigen::Vector3d p1(pt->x, pt->y, pt->z);
    Eigen::Vector3d px = camera_intrinsics_eigen * p1;
    px = px / px[2];
    if (pt->z > 0 && px[0] >= 0 && px[0] < image.cols && px[1] >= 0 && px[1] < image.rows)
    {
      cv::Point center = cv::Point(px[0], px[1]);
      cv::circle(image, center, 0, dist_to_color(pt->z), 1); //thickness is 1
    }
  }
}


int read_calib_matrices(std::string file,  Eigen::Matrix4d& extrinsic,  Eigen::Matrix3d& intrinsic)
{
  std::ifstream ifs(file);

  Json::Value root;
  Json::CharReaderBuilder builder;
  builder["collectComments"] = true;
  JSONCPP_STRING errs;
  if (!parseFromStream(builder, ifs, &root, &errs)) {
    std::cout << errs << std::endl;
    return EXIT_FAILURE;
  }
  
  

  //std::cout << root["extrinsic"] << std::endl;
  
  std::vector<double> ext_m;
  std::vector<double> int_m;

  for (int i = 0; i<16; ++i){
    extrinsic(i/4, i%4) = root["extrinsic"][i].asDouble();
  }

  //std::cout << extrinsic << std::endl;


  //std::cout << root["intrinsic"] << std::endl;
  for (int i = 0; i<9; ++i){
    intrinsic(i/3, i%3) = root["intrinsic"][i].asDouble();
  }
  //std::cout << intrinsic << std::endl;;

  ifs.close();
  return 0;
}

int fuse_one_file(std::string lidar_file, std::string image_file,  Eigen::Matrix4d cam_to_lid_transform, Eigen::Matrix3d camera_intrinsics, std::string output_file)
{
    pcl::PointCloud<pcl::PointXYZ> lidar_data, pos_transform;

    pcl::io::loadPCDFile(lidar_file, lidar_data);
    cv::Mat image = cv::imread(image_file);    
    
    pcl::transformPointCloud(lidar_data, pos_transform, cam_to_lid_transform);

    cv::Mat image_tmp;
    image.copyTo(image_tmp);
    draw_points(image_tmp,pos_transform,camera_intrinsics);

    std::cout << "saving " << output_file << std::endl;
    cv::imwrite(output_file, image_tmp);
}

int main(int argc, char **argv)
{

  std::filesystem::file_status p = std::filesystem::status(argv[1]);
  if (std::filesystem::is_directory(p))
  {
    std::cout << "fuse a scene: " << argv[1] << std::endl;

    const std::filesystem::path scene_folder{argv[1]};

    std::vector<std::string> frames;
    auto lidar_files = std::filesystem::directory_iterator{scene_folder/"lidar"};
    std::transform(std::filesystem::begin(lidar_files), std::filesystem::end(lidar_files), std::back_inserter(frames), [](std::filesystem::directory_entry f){return f.path().stem();});
    for (auto const & e: frames)
    {
      std::cout<<e<<std::endl;
    }

    auto camera_folder = std::filesystem::directory_iterator{scene_folder/"camera"};
    std::vector<std::string> cameras;
    std::transform(std::filesystem::begin(camera_folder), std::filesystem::end(camera_folder), std::back_inserter(cameras), [](std::filesystem::directory_entry f){return f.path().filename();});
    
    for (auto const & c: cameras)
    {
      std::cout<<c<<std::endl;

      const std::filesystem::path target_folder{argv[2]};
      std::filesystem::create_directories(target_folder/"camera"/c);

      std::string extrinsic_file{scene_folder/"calib"/"camera"/(c+".json")};
      Eigen::Matrix4d  cam_to_lid_transform ;
      Eigen::Matrix3d  camera_intrinsics;

      read_calib_matrices(extrinsic_file, cam_to_lid_transform, camera_intrinsics);
      

      for (auto const & f: frames)
      {
        fuse_one_file(scene_folder/"lidar"/(f+".pcd"), 
                      scene_folder/"camera"/c/(f+".jpg"), 
                      cam_to_lid_transform, 
                      camera_intrinsics, 
                      target_folder/"camera"/c/(f+".png"));
      }

    }
  }
  else
  {
    // fuse a single file
    std::string extrinsic_file = argv[3]; //"../data/calibrated/extrinsic_lidar2camera_original.yaml";
    Eigen::Matrix4d  cam_to_lid_transform ;
    Eigen::Matrix3d  camera_intrinsics;

    read_calib_matrices(extrinsic_file, cam_to_lid_transform, camera_intrinsics);
    fuse_one_file(argv[1], argv[2], cam_to_lid_transform, camera_intrinsics, argv[4]);   

  }
 
  
  return 0;
}
