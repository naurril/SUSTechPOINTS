

import { PopupDialog } from "./popup_dialog.js";

import * as THREE from 'three';

class Calib  extends PopupDialog{

    constructor(ui, editor)
    {
        super(ui);
        this.data = editor.data;
        this.editor = editor;
        this.ui = ui;

        this.ui.querySelector("#btn-start").onclick = ()=>{
            this.start();
        };
        this.ui.querySelector("#btn-stop").onclick = ()=>{
            this.stop();
        };

        this.cam_to_box_m = new THREE.Matrix4().set(
            0,  0, 1, 0,
            -1, 0, 0, 0,
            0, -1, 0, 0,
            0,  0, 0, 1
        );
    }

    
    show_calibration(){
        this.editor.infoBox.show("calib-" + this.targetCamera,
            JSON.stringify(this.lastExtrinsicMatrix, null,"<br>"));
    }
    
   
    calibBox = null;
    
    idealLidarToCamMatrix(angle, height, horizontal_distance) {
        let box_to_lidar_m = new THREE.Matrix4();
        box_to_lidar_m.makeRotationFromEuler(new THREE.Euler( 0, 0, angle, 'XYZ' ));

        let z = height;
        let x = horizontal_distance * Math.cos(angle);
        let y = horizontal_distance * Math.sin(angle);

        box_to_lidar_m.setPosition(x,y,z);

        let cam_to_lidar = new THREE.Matrix4().multiplyMatrices(box_to_lidar_m, this.cam_to_box_m);
        let lidar_to_cam = new THREE.Matrix4().copy(cam_to_lidar).invert();

        return lidar_to_cam;
    }
    
    save_calib(calib)
    {
        this.savedCalib = calib;
    }

    calcCalibBox(extrinsic)
    {
        let lidar_to_cam_m = new THREE.Matrix4().set(...extrinsic);
        let cam_to_lidar_m = new THREE.Matrix4().copy(lidar_to_cam_m).invert();

        let box_to_cam_m = new THREE.Matrix4().copy(this.cam_to_box_m).invert();

        let box_to_lidar_m = new THREE.Matrix4().multiplyMatrices(cam_to_lidar_m, box_to_cam_m);
        console.log(box_to_lidar_m);



        let position = new THREE.Vector3();
        let quaternion = new THREE.Quaternion();
        let scale = new THREE.Vector3();
        box_to_lidar_m.decompose (position, quaternion, scale);

        let rotation = new THREE.Euler().setFromQuaternion(quaternion);

        return {
            position,
            scale,
            rotation,
        };
    }


    showCalibBox(position, rotation){

        if (!this.calibBox)
        {
            this.calibBox = this.data.world.annotation.add_box(position, {x:1,y:1, z:1}, rotation, "camera",  this.targetCamera);
            this.calibBox.dontsave = true;
        }
        else{
            console.log("calib box exists.");
            this.calibBox.dontsave = true;
            this.calibBox.obj_type = 'camera';
            this.calibBox.obj_track_id = this.targetCamera;

            this.calibBox.position.x = position.x;// + this.data.world.coordinatesOffset[0];
            this.calibBox.position.y = position.y;// + this.data.world.coordinatesOffset[1];
            this.calibBox.position.z = position.z;// + this.data.world.coordinatesOffset[2];

            this.calibBox.rotation.x = rotation.x;
            this.calibBox.rotation.y = rotation.y;
            this.calibBox.rotation.z = rotation.z;
        }

        this.editor.render();

        this.calibBox.on_box_changed = ()=>{
            this.applyCalibAdjustment();            
            this.editor.imageContextManager.render_2d_image();
        }


    }

    applyCalibAdjustment()  //
    {
        let box_to_lidar = new THREE.Matrix4().compose(this.calibBox.position, this.calibBox.quaternion, new THREE.Vector3(1,1,1));
        let lidar_to_cam = new THREE.Matrix4().multiplyMatrices(box_to_lidar, this.cam_to_box_m).invert();
        
        this.calib.extrinsic = lidar_to_cam.transpose().elements;
        
        if ("debug")
        {
           this.showCalibInfo();
        }
    }
    // show a manipulating box

    showCalibInfo()
    {
        let box_to_lidar = new THREE.Matrix4().compose(this.calibBox.position, this.calibBox.quaternion, new THREE.Vector3(1,1,1));
        let lidar_to_box = new THREE.Matrix4().copy(box_to_lidar).invert();
        
        let position = new THREE.Vector3();
        let quaternion = new THREE.Quaternion();
        let scale = new THREE.Vector3();
        lidar_to_box.decompose (position, quaternion, scale);
        let rotation = new THREE.Euler().setFromQuaternion(quaternion);

        this.ui.querySelector("#camera").innerHTML = this.targetCamera;
        
        let ui = null;
        ui = this.ui.querySelector("#lidar-to-camera").querySelector("#position");
        ['x','y','z'].forEach(a=> ui.querySelector("#"+a).value = position[a]);

        ui = this.ui.querySelector("#lidar-to-camera").querySelector("#rotation");
        ['x','y','z'].forEach(a=> ui.querySelector("#"+a).value = rotation[a]*180/Math.PI);
    }


    start(){
        var scene_meta = this.data.meta[this.data.world.frameInfo.scene];
    
        let targetName = this.editor.imageContextManager.images[0].name;
        this.targetCamera = targetName;
        this.calib = scene_meta.calib.camera[targetName];

        let extrinsic = this.calib.extrinsic.map(function(x){return x*1.0;});

        let {position, rotation} = this.calcCalibBox(extrinsic);
        
        this.showCalibBox(position, rotation);       

        this.showCalibInfo();

    };

    
    stop()
    {
        if (this.calibBox){
            this.data.world.annotation.unload_box(this.calibBox);
            this.data.world.annotation.remove_box(this.calibBox);
            this.calibBox = null;
            this.editor.render();
        }
    };
    
    
};


export {Calib}