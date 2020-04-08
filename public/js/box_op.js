
import {
	Quaternion,
	Vector3
} from "./lib/three.module.js";

import{ml} from "./ml.js";
import {dotproduct} from "./util.js"


function BoxOp(){
    this.auto_rotate_xyz=function(box, callback, apply_mask, on_box_changed){
        let points = box.world.get_points_relative_coordinates_of_box_wo_rotation(box, 1.0);
        //let points = box.world.get_points_relative_coordinates_of_box(box, 1.0);

        points = points.filter(function(p){
            return p[2] > - box.scale.z/2 + 0.3;
        })

        //points is N*3 shape

        var angle = ml.predict_rotation(points, (angle)=>{
            
            if (!angle){
                console.log("prediction not implemented?");
                return;
            }


            var points_indices = box.world.get_points_indices_of_box(box);

            
            var euler_delta = {
                x: angle[0],
                y: angle[1],
                z: angle[2]
            };

            /*
            var composite_angel = linalg_std.euler_angle_composite(box.rotation, euler_delta);

            console.log("orig ", box.rotation.x, box.rotation.y, box.rotation.z);
            console.log("delt ", euler_delta.x, euler_delta.y, euler_delta.z);
            console.log("comp ", composite_angel.x, composite_angel.y, composite_angel.z);

            box.rotation.x = composite_angel.x;
            box.rotation.y = composite_angel.y;
            box.rotation.z = composite_angel.z;
            */
            
            if (apply_mask){
                if (apply_mask.x)
                    box.rotation.x = euler_delta.x;
                if (apply_mask.y)
                    box.rotation.y = euler_delta.y;
                if (apply_mask.z)
                    box.rotation.z = euler_delta.z;
            } 
            else{
                box.rotation.x = euler_delta.x;
                box.rotation.y = euler_delta.y;
                box.rotation.z = euler_delta.z;
            }
        
            var extreme = box.world.get_dimension_of_points(points_indices, box);



            let auto_adj_dimension = [];

            if (apply_mask){
                if (apply_mask.x || apply_mask.y)
                    auto_adj_dimension.push('z');

                if (apply_mask.x || apply_mask.z)
                    auto_adj_dimension.push('y');

                if (apply_mask.y || apply_mask.z)
                    auto_adj_dimension.push('x');
            }
            else{
                auto_adj_dimension = ['x','y','z'];
            }

            auto_adj_dimension.forEach((axis)=>{

                this.translate_box(box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                box.scale[axis] = extreme.max[axis] - extreme.min[axis];        

            }) 

            if (on_box_changed)
                on_box_changed(box);
            
            if (callback){
                callback();
            }
        });
    }



    this.change_rotation_y = function(box, theta, sticky, on_box_changed){
        //box.rotation.x += theta;
        //on_box_changed(box);
        
        var points_indices = box.world.get_points_indices_of_box(box);
        
        var _tempQuaternion = new Quaternion();
        var rotationAxis = new Vector3(0, 1, 0);

        // NOTE: the front/end subview is different from top/side view, that we look at the reverse direction of y-axis
        //       it's end view acturally.
        //       we could project front-view, but the translation (left, right) will be in reverse direction of top view.
        ///       that would be frustrating.
        box.quaternion.multiply( _tempQuaternion.setFromAxisAngle( rotationAxis, -theta ) ).normalize();

        if (sticky){
            var extreme = box.world.get_dimension_of_points(points_indices, box);

            ['x','z'].forEach((axis)=>{

                this.translate_box(box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                box.scale[axis] = extreme.max[axis] - extreme.min[axis];        

            }) 
        }

        if (on_box_changed)
            on_box_changed(box);
    }


    this.auto_rotate_y=function(box, on_box_changed){
        let points = box.world.get_points_of_box(box, 2.0);

        // 1. find surounding points
        var side_indices = []
        var side_points = []
        points.position.forEach(function(p, i){
            if ((p[0] > box.scale.x/2 || p[0] < -box.scale.x/2) && (p[1] < box.scale.y/2 && p[1] > -box.scale.y/2)){
                side_indices.push(points.index[i]);
                side_points.push(points.position[i]);
            }
        })


        var end_indices = []
        var end_points = []
        points.position.forEach(function(p, i){
            if ((p[0] < box.scale.x/2 && p[0] > -box.scale.x/2) && (p[1] > box.scale.y/2 || p[1] < -box.scale.y/2)){
                end_indices.push(points.index[i]);
                end_points.push(points.position[i]);
            }
        })
        

        // 2. grid by 0.3 by 0.3

        // compute slope (derivative)
        // for side part (pitch/tilt), use y,z axis
        // for end part (row), use x, z axis

        

        box.world.set_spec_points_color(side_indices, {x:1,y:0,z:0});
        box.world.set_spec_points_color(end_indices, {x:0,y:0,z:1});
        box.world.update_points_color();
        
        var x = end_points.map(function(x){return x[0]});
        //var y = side_points.map(function(x){return x[1]});
        var z = end_points.map(function(x){return x[2]});
        var z_mean = z.reduce(function(x,y){return x+y;}, 0)/z.length;
        var z = z.map(function(x){return x-z_mean;});
        var  theta =  Math.atan2(dotproduct(x,z), dotproduct(x,x));
        console.log(theta);

        this.change_rotation_y(box, theta, true, on_box_changed);
    }



    this.change_rotation_x=function(box, theta, sticky, on_box_changed){
        var points_indices = box.world.get_points_indices_of_box(box);

        //box.rotation.x += theta;
        //on_box_changed(box);
        var _tempQuaternion = new Quaternion();
        var rotationAxis = new Vector3(1,0,0);
        box.quaternion.multiply( _tempQuaternion.setFromAxisAngle( rotationAxis, theta ) ).normalize();

        if (sticky){
            var extreme = box.world.get_dimension_of_points(points_indices, box);

            ['y','z'].forEach((axis)=>{

                this.translate_box(box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                box.scale[axis] = extreme.max[axis] - extreme.min[axis];        

            }) 
        }

        if (on_box_changed)
            on_box_changed(box);

    };


    this.auto_rotate_x=function(box, on_box_changed){
        console.log("x auto ratote");
        
        let points = box.world.get_points_of_box(box, 2.0);

        // 1. find surounding points
        var side_indices = []
        var side_points = []
        points.position.forEach(function(p, i){
            if ((p[0] > box.scale.x/2 || p[0] < -box.scale.x/2) && (p[1] < box.scale.y/2 && p[1] > -box.scale.y/2)){
                side_indices.push(points.index[i]);
                side_points.push(points.position[i]);
            }
        })


        var end_indices = []
        var end_points = []
        points.position.forEach(function(p, i){
            if ((p[0] < box.scale.x/2 && p[0] > -box.scale.x/2) && (p[1] > box.scale.y/2 || p[1] < -box.scale.y/2)){
                end_indices.push(points.index[i]);
                end_points.push(points.position[i]);
            }
        })
        

        // 2. grid by 0.3 by 0.3

        // compute slope (derivative)
        // for side part (pitch/tilt), use y,z axis
        // for end part (row), use x, z axis

        

        box.world.set_spec_points_color(side_indices, {x:1,y:0,z:0});
        box.world.set_spec_points_color(end_indices, {x:0,y:0,z:1});
        box.world.update_points_color();
        //render();

        var x = side_points.map(function(x){return x[0]});
        var y = side_points.map(function(x){return x[1]});
        var z = side_points.map(function(x){return x[2]});
        var z_mean = z.reduce(function(x,y){return x+y;}, 0)/z.length;
        var z = z.map(function(x){return x-z_mean;});
        var  theta =  Math.atan2(dotproduct(y,z), dotproduct(y,y));
        console.log(theta);

        this.change_rotation_x(box, theta, true, on_box_changed);
    };


    this.translate_box=function(box, axis, delta){
        switch (axis){
            case 'x':
                box.position.x += delta*Math.cos(box.rotation.z);
                box.position.y += delta*Math.sin(box.rotation.z);
                break;
            case 'y':
                box.position.x += delta*Math.cos(Math.PI/2 + box.rotation.z);
                box.position.y += delta*Math.sin(Math.PI/2 + box.rotation.z);  
                break;
            case 'z':
                box.position.z += delta;
                break;

        }
    };


    this.rotate_z=function(box, theta, sticky){
        // points indices shall be obtained before rotation.
        var points_indices = box.world.get_points_indices_of_box(box);
            

        var _tempQuaternion = new Quaternion();
        var rotationAxis = new Vector3(0,0,1);
        box.quaternion.multiply( _tempQuaternion.setFromAxisAngle( rotationAxis, theta ) ).normalize();

        if (sticky){
        
            var extreme = box.world.get_dimension_of_points(points_indices, box);

            ['x','y'].forEach((axis)=>{

                this.translate_box(box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                box.scale[axis] = extreme.max[axis] - extreme.min[axis];        

            }) 
        }
    },



    this.interpolate_selected_object= function(sceneName, objTrackId, currentFrame){

        var xhr = new XMLHttpRequest();
        // we defined the xhr
        
        xhr.onreadystatechange = function () {
            if (this.readyState != 4) 
                return;
        
            if (this.status == 200) {
                var ret = JSON.parse(this.responseText);
                console.log(ret);
            }

        };
        
        xhr.open('GET', "/interpolate?scene="+sceneName+"&frame="+currentFrame+"&obj_id="+objTrackId, true);
        xhr.send();
    };

    this.highlightBox = function(box){
        if (box){
            box.material.color.r=1;
            box.material.color.g=0;
            box.material.color.b=1;
            box.material.opacity=1;
        }
    };
}


export {BoxOp}