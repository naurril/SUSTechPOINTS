
import {rotation_matrix_to_euler_angle,euler_angle_to_rotate_matrix, matmul, transpose} from "./util.js"
//import {render_2d_image, update_image_box_projection} from "./image.js"

function Calib(data, editor){
    this.data = data;
    this.editor = editor;

    var euler_angle={x:0, y:0, y:0};
    var translate = {x:0, y:0, z:0};
    
    this.save_calibration = function(){
    
        
        var scene_meta = data.meta[data.world.frameInfo.scene];
    
    
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
    
        let matrix =  euler_angle_to_rotate_matrix(euler_angle, translate)
        console.log("restoreed matrix",matrix);
    
        
        this.editor.infoBox.show("calib", JSON.stringify(matrix));
    }
    
    this.reset_calibration = function(){
        // to be done
        this.editor.imageContextManager.render_2d_image();
    }
    
    this.calib_box = null;
    
    this.show_camera_pos = function(){
        this.editor.viewManager.mainView.dumpPose();
    };

    
    // show a manipulating box
    this.start_calibration = function(){
        var scene_meta = this.data.meta[data.world.frameInfo.scene];
    
        var active_camera_name = this.data.world.cameras.active_name;
        var calib = scene_meta.calib.camera[active_camera_name]
        var extrinsic = calib.extrinsic.map(function(x){return x*1.0;});
        let viewMatrix = [0, -1,  0,  0,  //row vector
                        0, 0,  -1, 0,
                        1, 0,  0,  0,
                        0, 0,  0,  1];
        function transpose_transmatrix(m){
            //m=4*4
            return [
                m[0],m[4],m[8],m[3],
                m[1],m[5],m[9],m[7],
                m[2],m[6],m[10],m[11],
                m[12],m[13],m[14],m[15],

            ];
        }

        var op_matrix = matmul (transpose_transmatrix(viewMatrix),
                                transpose_transmatrix(extrinsic), 4);

        var euler_angle = rotation_matrix_to_euler_angle(op_matrix);
        var translate = {
            x: extrinsic[3]*1.0,
            y: extrinsic[7]*1.0,
            z: extrinsic[11]*1.0,
        };
    
        console.log(euler_angle, translate);
        this.show_camera_pos();

        
        if (!this.calib_box)
        {
            this.calib_box = this.data.world.annotation.createCuboid(
                {
                    x: translate.x,// + this.data.world.coordinatesOffset[0],
                    y: translate.y,// + this.data.world.coordinatesOffset[1],
                    z: translate.z, // + this.data.world.coordinatesOffset[2]
                }, 
                {x:1,y:1, z:1}, 
                {
                    x: euler_angle.x,
                    y: euler_angle.y,
                    z: euler_angle.z
                }, 
                "camera", 
                "camera"
            );

            this.data.world.scene.add(this.calib_box);
            
        }
        else{
            console.log("calib box exists.");
            this.calib_box.position.x = translate.x;// + this.data.world.coordinatesOffset[0];
            this.calib_box.position.y = translate.y;// + this.data.world.coordinatesOffset[1];
            this.calib_box.position.z = translate.z;// + this.data.world.coordinatesOffset[2];

            this.calib_box.rotation.x = euler_angle.x;
            this.calib_box.rotation.y = euler_angle.y;
            this.calib_box.rotation.z = euler_angle.z;
        }

        console.log(this.calib_box);
        this.editor.render();

        
        this.calib_box.on_box_changed = ()=>{
            console.log("calib box changed.");

            let real_pos = {
                x: this.calib_box.position.x,// - this.data.world.coordinatesOffset[0],
                y: this.calib_box.position.y,// - this.data.world.coordinatesOffset[1],
                z: this.calib_box.position.z,// - this.data.world.coordinatesOffset[2],
            };

            let extrinsic = euler_angle_to_rotate_matrix(this.calib_box.rotation, real_pos);
            calib.extrinsic = transpose_transmatrix(matmul (viewMatrix, extrinsic, 4));
            console.log("extrinsic", calib.extrinsic)
            console.log("euler", euler_angle, "translate", translate);    
        
            this.editor.imageContextManager.render_2d_image();
        }


        
    };
    
    function stop_calibration()
    {
        //tbd
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