
### Install

0. clone the project
   ```
   git clone https://github.com/naurril/SUSTechPOINTS
   ```
1. Install packages
     ```
     pip install -r requirement.txt
     ```
2. Download model

     download pretrained model file [deep_annotation_inference.h5](https://github.com/naurril/SUSTechPOINTS/releases/download/0.1/deep_annotation_inference.h5), put it into `./algos/models`
     ```
     wget https://github.com/naurril/SUSTechPOINTS/releases/download/0.1/deep_annotation_inference.h5  -P algos/models
     ```

### Start
Run the following command in shell, then go to http://127.0.0.1:8081
```
python main.py
```

## Object type configuration

Default object configuration is in [obj_cfg.js](src/public/js/../../../public/js/obj_cfg.js)

Adjust the contents to customize.

## Data preparation

````
   +- data
       +- scene1
          +- lidar
               +- 0000.pcd
               +- 0001.pcd
          +- camera
               +- front
                    +- 0000.jpg
                    +- 0001.jpg
               +- left
                    +- ...
          +- aux_lidar
               +- front
                    +- 0000.pcd
                    +- 0001.pcd
          +- radar
               +- front_points
                    +- 0000.pcd
                    +- 0001.pcd
               +- front_tracks
                    +- ...
          +- calib
               +- camera
                    +- front.json
                    +- left.json
               +- radar
                    +- front_points.json
                    +- front_tracks.json
          +- label
               +- 0000.json
               +- 0001.json
       +- scene2

````

label is the directory to save the annotation result.

calib is the calibration matrix from point cloud to image. it's optional, but if provided, the box is projected on the image so as to assist the annotation.

check examples in `./data/example`