


import * as THREE from 'three';

function Calib(data, editor){
    this.data = data;
    this.editor = editor;

    
    this.show_calibration = function(){
        this.editor.infoBox.show("calib-" + this.targetCamera,
            JSON.stringify(this.lastExtrinsicMatrix, null,"<br>"));
    }
    
   
    this.calib_box = null;
    
    this.idealLidarToCamMatrix = function(angle, height, horizontal_distance) {
        let cam_to_box_m = new THREE.Matrix4();
        cam_to_box_m.set(
            0,  0, 1, 0,
            -1, 0, 0, 0,
            0, -1, 0, 0,
            0,  0, 0, 1
        );

        let box_to_lidar_m = new THREE.Matrix4();
        box_to_lidar_m.makeRotationFromEuler(new THREE.Euler( 0, 0, angle, 'XYZ' ));

        let z = height;
        let x = horizontal_distance * Math.cos(angle);
        let y = horizontal_distance * Math.sin(angle);

        box_to_lidar_m.setPosition(x,y,z);

        let cam_to_lidar = new THREE.Matrix4().multiplyMatrices(box_to_lidar_m, cam_to_box_m);
        let lidar_to_cam = new THREE.Matrix4().copy(cam_to_lidar).invert();

        return lidar_to_cam;
    }
    
    // show a manipulating box
    this.start_calibration = function(){
        var scene_meta = this.data.meta[data.world.frameInfo.scene];
    
        let targetName = this.editor.imageContextManager.images[0].name;
        this.targetCamera = targetName;

        var calib = scene_meta.calib.camera[targetName]
        var extrinsic = calib.extrinsic.map(function(x){return x*1.0;});



        let lidar_to_cam_m = new THREE.Matrix4().set(...extrinsic);
         let cam_to_lidar_m = new THREE.Matrix4().copy(lidar_to_cam_m).invert();

        let cam_to_box_m = new THREE.Matrix4().set(
            0,  0, 1, 0,
            -1, 0, 0, 0,
            0, -1, 0, 0,
            0,  0, 0, 1
        );

        let box_to_cam_m = new THREE.Matrix4().copy(cam_to_box_m).invert();

        let box_to_lidar_m = new THREE.Matrix4().multiplyMatrices(cam_to_lidar_m, box_to_cam_m);
        console.log(box_to_lidar_m);



        let position = new THREE.Vector3();
        let quaternion = new THREE.Quaternion();
        let scale = new THREE.Vector3();
        box_to_lidar_m.decompose (position, quaternion, scale);
        
        let euler_angle = new THREE.Euler().setFromQuaternion(quaternion);

        if (!this.calib_box)
        {
            this.calib_box = this.data.world.annotation.createCuboid(
                {
                    x: position.x, //+ this.data.world.coordinatesOffset[0],
                    y: position.y, // + this.data.world.coordinatesOffset[1],
                    z: position.z, // + this.data.world.coordinatesOffset[2]
                }, 
                {x:1,y:1, z:1}, 
                {
                    x: euler_angle.x,
                    y: euler_angle.y,
                    z: euler_angle.z
                }, 
                "camera", 
                this.targetCamera,
            );

            this.data.world.webglGroup.add(this.calib_box);
            
        }
        else{
            console.log("calib box exists.");
            this.calib_box.obj_type = 'camera';
            this.calib_box.obj_track_id = this.targetCamera;

            this.calib_box.position.x = position.x;// + this.data.world.coordinatesOffset[0];
            this.calib_box.position.y = position.y;// + this.data.world.coordinatesOffset[1];
            this.calib_box.position.z = position.z;// + this.data.world.coordinatesOffset[2];

            this.calib_box.rotation.x = euler_angle.x;
            this.calib_box.rotation.y = euler_angle.y;
            this.calib_box.rotation.z = euler_angle.z;
        }

        console.log(this.calib_box);
        this.editor.render();

        
        this.calib_box.on_box_changed = ()=>{
            console.log("calib box changed.");

            let box_to_lidar = new THREE.Matrix4().compose(this.calib_box.position, this.calib_box.quaternion, new THREE.Vector3(1,1,1));
            let lidar_to_cam = new THREE.Matrix4().multiplyMatrices(box_to_lidar, cam_to_box_m).invert();
            // let real_pos = this.calib_box.position;

            // let extrinsic = euler_angle_to_rotate_matrix(this.calib_box.rotation, real_pos);
            calib.extrinsic = lidar_to_cam.transpose().elements;
            console.log("extrinsic", calib.extrinsic)

            if ("debug")
            {
                let lidar_to_box = new THREE.Matrix4().copy(box_to_lidar).invert();
                let position = new THREE.Vector3();
                let quaternion = new THREE.Quaternion();
                let scale = new THREE.Vector3();
                lidar_to_box.decompose (position, quaternion, scale);
                let euler_angle = new THREE.Euler().setFromQuaternion(quaternion);
                console.log("lidar in cambox", position.x,  position.y, position.z, 
                                               euler_angle.x*180/Math.PI, euler_angle.y*180/Math.PI, euler_angle.z*180/Math.PI);
            }
            // console.log("euler", euler_angle, "translate", translate);    
        
            this.lastExtrinsicMatrix = calib.extrinsic;

            this.editor.imageContextManager.render_2d_image();
        }


        
    };
    
    this.stop_calibration = function()
    {
        if (this.calib_box){
            this.data.world.webglGroup.remove(this.calib_box);
            this.calib_box.geometry.dispose();
            this.calib_box.material.dispose();
            this.calib_box = null;
        }
    };
    
    /*
    function calibrate(ax, value){
        var scene_meta = data.meta[data.world.frameInfo.scene];
    
        var active_camera_name = data.world.cameras.active_name;
        var calib = scene_meta.calib.camera[active_camera_name]
        var extrinsic = calib.extrinsic.map(function(x){return x*1.0;});
    
        var euler_angle = rotation_matrix_to_euler_angle(extrinsic);
        var translate = {
            x: extrinsic[3]*1.0,
            y: extrinsic[7]*1.0,
            z: extrinsic[11]*1.0,
        };
    
        if (ax == 'z'){
            euler_angle.z += value;
        }else if (ax == 'x'){
            euler_angle.x += value;
        }
        else if (ax == 'y'){
            euler_angle.y += value;
        }else if (ax == 'tz'){
            translate.z += value;
        }else if (ax == 'tx'){
            translate.x += value;
        }
        else if (ax == 'ty'){
            translate.y += value;
        }
    
        calib.extrinsic = euler_angle_to_rotate_matrix(euler_angle, translate);
    
        console.log("extrinsic", calib.extrinsic)
        console.log("euler", euler_angle, "translate", translate);    
    
        render_2d_image();
    
        if (selected_box)
            update_image_box_projection(selected_box);
    }
    */
    
};


export {Calib}