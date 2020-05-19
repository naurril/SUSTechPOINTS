
import {rotation_matrix_to_euler_angle,euler_angle_to_rotate_matrix} from "./util.js"
//import {render_2d_image, update_image_box_projection} from "./image.js"
import {selected_box} from "./main.js"

var euler_angle={x:0, y:0, y:0};
var translate = {x:0, y:0, z:0};

function save_calibration(){

    
    var scene_meta = data.meta.find(function(x){return x.scene==data.world.frameInfo.scene;});


    var active_camera_name = data.world.cameras.active_name;
    var calib = scene_meta.calib.camera[active_camera_name]
    
    var extrinsic = calib.extrinsic.map(function(x){return x*1.0;});

    euler_angle = rotation_matrix_to_euler_angle(extrinsic);
    translate = {
        x: extrinsic[3]*1.0,
        y: extrinsic[7]*1.0,
        z: extrinsic[11]*1.0,
    };


    console.log(extrinsic, euler_angle, translate);

    console.log("restoreed matrix", euler_angle_to_rotate_matrix(euler_angle, translate));

}

function reset_calibration(){
    var scene_meta = data.meta.find(function(x){return x.scene==data.world.frameInfo.scene;});

    var active_camera_name = data.world.cameras.active_name;
    var calib = scene_meta.calib.camera[active_camera_name]

    calib.extrinsic = euler_angle_to_rotate_matrix(euler_angle, translate);
    render_2d_image();

    if (selected_box)
        update_image_box_projection(selected_box);
}


function calibrate(ax, value){
    var scene_meta = data.meta.find(function(x){return x.scene==data.world.frameInfo.scene;});

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


function install_calib_menu(parent_gui){
    var params = {};

    //calibrate
    var calibrateFolder = parent_gui.addFolder( 'Calibrate LiDAR-camera' );
    params['save cal'] = function () {
        save_calibration();
    };
    calibrateFolder.add( params, 'save cal');

    params['reset cal'] = function () {
       reset_calibration();
   };

   calibrateFolder.add(params, 'reset cal');

   [
        {name: "x", v: 0.002},
        {name: "x", v: -0.002},
        {name: "y", v: 0.002},
        {name: "y", v: -0.002},
        {name: "z", v: 0.002},
        {name: "z", v: -0.002},
        
        {name: "tx", v: 0.005},
        {name: "tx", v: -0.005},
        {name: "ty", v: 0.005},
        {name: "ty", v: -0.005},
        {name: "tz", v: 0.005},
        {name: "tz", v: -0.005},
    ].forEach(function(x){
        var item_name= x.name+","+x.v;
        params[item_name] = function () {
           calibrate(x.name, x.v);
        };
        calibrateFolder.add(params, item_name);
    });
}
export {install_calib_menu}