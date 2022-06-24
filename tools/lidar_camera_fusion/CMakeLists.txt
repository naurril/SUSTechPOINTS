cmake_minimum_required(VERSION 2.8 FATAL_ERROR)
project(MY_GRAND_PROJECT)

find_package(PCL 1.9 REQUIRED)
find_package(OpenCV REQUIRED )
find_package(jsoncpp REQUIRED)

include_directories(${PCL_INCLUDE_DIRS})
include_directories(${OpenCV_INCLUDE_DIRS})
include_directories(${jsoncpp_INCLUDE_DIRS})

link_directories(${PCL_LIBRARY_DIRS})

add_definitions(${PCL_DEFINITIONS})
add_definitions(-std=c++17)

add_executable(fuse_lidar_camera fuse_lidar_camera.cpp)

target_link_libraries( fuse_lidar_camera ${OpenCV_LIBS} ${PCL_LIBRARIES} jsoncpp_lib)
