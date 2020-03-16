
import {data} from './data.js'
import {matmul, euler_angle_to_rotate_matrix_3by3, transpose, matmul2} from "./util.js"

var ml = {
    backend: tf.getBackend(),

    calibrate_axes: function(points){
        console.log("backend of tensorflow:", tf.getBackend());
        console.log("number of points:", points.count);

        var center_points = {};
        for (var i = 0; i<points.count; i++){
            if (points.array[i*3] < 10 && points.array[i*3]>-10 &&
                points.array[i*3+1] < 10 && points.array[i*3+1]>-10)  // x,y in [-10,10]
            {
                var key = (10 + Math.round(points.array[i*3]))*100 + (Math.round(points.array[i*3+1])+10);
                if (center_points[key]){

                    // save only  minimal index
                    if (points.array[i*3+2] < points.array[center_points[key]*3+2]){
                        center_points[key] = i;
                    }
                    
                }else {
                    center_points[key] = i;
                }
            }
        }

        var center_point_indices = [];
        for (var i in center_points){
            center_point_indices.push(center_points[i]);
        }

        //console.log(center_point_indices);
        var points_2d = center_point_indices.map(i => [points.array[i*3],points.array[i*3+1],points.array[i*3+2]]);
        var points_array = points_2d.flatMap(x=> x);


        var sum = points_2d.reduce(function(s, x){
            return [s[0] + x[0],
                    s[1] + x[1],
                    s[2] + x[2]];
        },[0,0,0]);
        var count = points_2d.length;
        var mean = [sum[0]/count, sum[1]/count, sum[2]/count];

        var data_centered = points_2d.map(function(x){
            return [
                x[0] - mean[0],
                x[1] - mean[1],
                x[2] - mean[2],
            ];
        })

        var normal_v = this.train(data_centered);

       

        data.world.add_line(mean, [-normal_v[0]*10, -normal_v[1]*10, normal_v[2]*10]);
        data.world.reset_points(points_array);
        /*

        var trans_matrix = transpose(euler_angle_to_rotate_matrix_3by3({x:Math.atan2(normal_v[1], -1), y: 0, z: 0}));

        var transfromed_point_array = matmul(trans_matrix, points_array, 3);

        data.world.reset_points(transfromed_point_array);
        
        //data.world.set_spec_points_color(center_point_indices, {x:1,y:0,z:0});
        //data.world.update_points_color();
        */

        

        return center_point_indices;
    },

    train: function(data_centered)  // data is ?*3 array.
    {
        


        var XY = data_centered.map(function(x){return x.slice(0,2);});
        var Z = data_centered.map(function(x){return x[2];});

        
        var x = tf.tensor2d(XY);
        var para = tf.variable(tf.tensor2d([[Math.random(), Math.random()]]));

        const learningRate = 0.00001;
        const optimizer = tf.train.sgd(learningRate);
        para.print();
        for (var i=0; i<20; i++){
            optimizer.minimize(function() { 
                var dists = tf.matMul(para, x.transpose());
                var sqrdiff = tf.squaredDifference(dists, Z);
                var loss = tf.div(tf.sum(sqrdiff), sqrdiff.shape[0]);
                loss.print();
                return loss;
            }); 

            console.log(i);
            para.print();
        }

        var pv = para.dataSync();
        console.log("train result: ", pv);
        return [pv[0], pv[1], 1];
    }
    ,


    // data is N*2 matrix, 
    l_shape_fit: function(data){

        // cos, sin
        // -sin, cos
        var A = tf.tensor2d(data);
        //A = tf.expandDims(A, [0]);

        var theta = [];
        var min = 0;
        var min_index = 0;
        for (var  i =0; i<=90; i+=1){
            var obj = cal_objetive(A, i);

            if (min==0 || min > obj){
                min_index = i;
                min = obj;
            }
        }

        console.log(min_index, min);
        return min;

        //end of func

        function cal_objetive(A, theta){
            let r = theta*Math.PI/180;
            let bases =  tf.tensor2d([[Math.cos(r), -Math.sin(r)],
                        [Math.sin(r), Math.cos(r)]]);

            let proj = tf.matMul(A, bases);  // n * 2
            let max = tf.max(proj, 0); // 1*2
            let min = tf.min(proj, 0); // 1*2
            var dist_to_min = tf.sum(tf.square(tf.sub(proj, min)), 0);
            var dist_to_max = tf.sum(tf.square(tf.sub(max, proj)), 0);
            
            // axis 0
            var dist0, dist1; // dist to axis 0, axis 1
            if (dist_to_min.gather(0).dataSync() < dist_to_max.gather(0).dataSync()){
                dist0 = tf.sub(proj.gather([0], 1), min.gather(0));
            } else {
                dist0 = tf.sub(max.gather(0), proj.gather([0], 1));
            }

            if (dist_to_min.gather(1).dataSync() < dist_to_max.gather(1).dataSync()){
                dist1 = tf.sub(proj.gather([1], 1), min.gather(1));
            } else {
                dist1 = tf.sub(max.gather(1), proj.gather([1], 1));
            }

            // concat dist0, dist1
            var min_dist = tf.concat([dist0, dist1], 1).min(1);
            return min_dist.sum().dataSync()[0];
        }

    }
    ,

    predict_rotation: function(data, callback){
        var xhr = new XMLHttpRequest();
        // we defined the xhr
        
        xhr.onreadystatechange = function () {
            if (this.readyState != 4) 
                return;
        
            if (this.status == 200) {
                var ret = JSON.parse(this.responseText);
                console.log(ret);
                callback(ret.angle);
            }
            else{
                console.log(this);
            }

        };
        
        xhr.open('POST', "/predict_rotation", true);
        xhr.send(JSON.stringify({"points": data}));
    }
}


export {ml};