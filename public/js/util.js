import * as THREE from './lib/three.module.js';

function dotproduct(a, b){
    var ret = 0;
    for (let i = 0; i<a.length; i++){
        ret += a[i]*b[i];
    }

    return ret;
}



// matrix (m*n), matrix(n*l), vl: vector length=n 
// this matmul is row-wise multiplication. 'x' and result are row-vectors.
// ret^T = m * x^T
//
function  matmul(m, x, vl)  //vl is vector length
{
    var ret=[];
    var res_l = m.length/vl;
    for (var vi =0; vi < x.length/vl; vi++){  //vector index
        for (var r = 0; r<m.length/vl; r++){  //row of matrix
            ret[vi*res_l+r] = 0;
            for (var i = 0; i<vl; i++){
                ret[vi*res_l+r] += m[r*vl+i]*x[vi*vl+i];
            }
        }
    }

    return ret;
}

function  matmul2(m, x, vl)  //vl is vector length
{
    var ret=[];
    var rows = m.length/vl;
    var cols = x.length/vl;
    for (var r =0; r < rows; r++){
        for (var c = 0; c < cols; c++){
            ret[r*cols+c] = 0;
            for (var i = 0; i<vl; i++){
                ret[r*cols+c] += m[r*vl+i]*x[i*cols+c];
            }
        }
    }

    return ret;
}

// box(position, scale, rotation) to box corner corrdinates.
// return 8 points, represented as (x,y,z,1)
// note the vertices order cannot be changed, draw-box-on-image assumes
//  the first 4 vertex is the front plane, so it knows box direction.
function psr_to_xyz(p,s,r){
    /*
    var trans_matrix=[
        Math.cos(r.z), -Math.sin(r.z), 0, p.x,
        Math.sin(r.z), Math.cos(r.z),  0, p.y,
        0,             0,              1, p.z,
        0,             0,              0, 1,
    ];
    */
   var trans_matrix = euler_angle_to_rotate_matrix(r, p);

    var x=s.x/2;
    var y=s.y/2;
    var z=s.z/2;
    /*
    var local_coord = [
        -x, y, -z, 1,   x, y, -z, 1,  //front-left-bottom, front-right-bottom
        x, y, z, 1,    -x, y, z, 1,  //front-right-top,   front-left-top

        -x, -y, -z, 1,   x, -y, -z, 1,  
        x, -y, z, 1,   -x, -y, z, 1,        
        
    ];
    */

   var local_coord = [
    x, y, -z, 1,   x, -y, -z, 1,  //front-left-bottom, front-right-bottom
    x, -y, z, 1,   x, y, z, 1,  //front-right-top,   front-left-top

    -x, y, -z, 1,   -x, -y, -z, 1,  //rear-left-bottom, rear-right-bottom
    -x, -y, z, 1,   -x, y, z, 1,  //rear-right-top,   rear-left-top
    
    //middle plane
    // 0, y, -z, 1,   0, -y, -z, 1,  //rear-left-bottom, rear-right-bottom
    // 0, -y, z, 1,   0, y, z, 1,  //rear-right-top,   rear-left-top
   ];

    var world_coord = matmul(trans_matrix, local_coord, 4);
    var w = world_coord;
    return w;
}



function xyz_to_psr(vertices){
    var ann = vertices;
    var ROW=4;
    var pos={x:0,y:0,z:0};
    for (var i=0; i<8; i++){
        pos.x+=ann[i*ROW];
        pos.y+=ann[i*ROW+1];
        pos.z+=ann[i*ROW+2];
    }
    pos.x /=8;
    pos.y /=8;
    pos.z /=8;



    var scale={
        x: Math.sqrt((ann[0]-ann[ROW])*(ann[0]-ann[ROW])+(ann[1]-ann[ROW+1])*(ann[1]-ann[ROW+1])),
        y: Math.sqrt((ann[0]-ann[ROW*3])*(ann[0]-ann[ROW*3])+(ann[1]-ann[ROW*3+1])*(ann[1]-ann[ROW*3+1])),
        z: ann[3*ROW+2]-ann[2],
    };
    
    /*
    1. atan2(y,x), not x,y
    2. point order in xy plane
        0   1
        3   2
    */

    var angle = Math.atan2(ann[1*ROW+1]+ann[5*ROW+1]-2*pos.y, ann[1*ROW]+ann[5*ROW]-2*pos.x);

    return {
        position: pos,
        scale:scale,
        rotation:{x:0,y:0,z:angle},
    }
    return w;
}


function vector4to3(v)
{
    var ret=[];
    for (var i=0; i<v.length; i++){
        if ((i+1)% 4 != 0){
            ret.push(v[i]);
        }
    }

    return ret;
}

function vector_range(v){

    if (v.length === 0){
        return null;
    }

    var min, max;
    min = [...v[0]];
    max = [...v[0]];

    for (var i=1; i<v.length; ++i){
        for (var j=0; j<min.length; ++j){
            if (min[j] > v[i][j]){
                min[j] = v[i][j];
            }

            if (max[j] < v[i][j]){
                max[j] = v[i][j];
            }
        }
    }

    return {
        min: min, 
        max: max,
    }

}

// v is array of vector, vl is vector length
function array_as_vector_range(v, vl){
    
    var n = v.length/vl;
    
    var min, max;
    if (n === 0){
        return null;
    } else{
        min = v.slice(0, vl);
        max = v.slice(0, vl);
    }

    for (var i=1; i<n; ++i){
        for (var j=0; j<vl; ++j){
            if (min[j] > v[i*vl+j]){
                min[j] = v[i*vl+j];
            }

            if (max[j] < v[i*vl+j]){
                max[j] = v[i*vl+j];
            }
        }
    }

    return {
        min: min, 
        max: max,
    }
}

// v is 1-d array of vector, vl is vector length, p is index into v.
function array_as_vector_index_range(v, vl, p){
    
    var n = p.length;
    
    var min, max;
    if (n === 0){
        return null;
    } else{
        min = v.slice(p[0]*vl, (p[0]+1)*vl);
        max = v.slice(p[0]*vl, (p[0]+1)*vl);
    }

    for (var i=1; i<n; ++i){
        for (var j=0; j<vl; ++j){
            if (min[j] > v[p[i]*vl+j]){
                min[j] = v[p[i]*vl+j];
            }

            if (max[j] < v[p[i]*vl+j]){
                max[j] = v[p[i]*vl+j];
            }
        }
    }

    return {
        min: min, 
        max: max,
    }
}



function vector3_nomalize(m){
    var ret=[];
    for (var i=0; i<m.length/3; i++){
        ret.push(m[i*3+0]/m[i*3+2]);
        ret.push(m[i*3+1]/m[i*3+2]);
    }

    return ret;
}



function mat(m, s, x, y){
    return m[x*s+y];
}

// m; matrix, vl: column vector length
function transpose(m, cl=NaN){
    var rl = m.length/cl;
    for (var i = 0; i<cl; i++){
        for(var j=i+1; j<rl; j++){
            var t = m[i*rl + j];
            m[i*rl + j] = m[j*cl+i];
            m[j*cl+i] = t;
        }
    }

    return m;
}

function euler_angle_to_rotate_matrix(eu, tr, order="ZYX"){
    var theta = [eu.x, eu.y, eu.z];
    // Calculate rotation about x axis
    var R_x = [
        1,       0,              0,
        0,       Math.cos(theta[0]),   -Math.sin(theta[0]),
        0,       Math.sin(theta[0]),   Math.cos(theta[0])
    ];

    // Calculate rotation about y axis
    var R_y = [
        Math.cos(theta[1]),      0,      Math.sin(theta[1]),
        0,                       1,      0,
        -Math.sin(theta[1]),     0,      Math.cos(theta[1])
    ];

    // Calculate rotation about z axis
    var R_z = [
        Math.cos(theta[2]),    -Math.sin(theta[2]),      0,
        Math.sin(theta[2]),    Math.cos(theta[2]),       0,
        0,               0,                  1];


    //console.log(R_x, R_y, R_z);

    // Combined rotation matrix
    //var R = matmul(matmul(R_z, R_y, 3), R_x,3);
    //var R = matmul2(R_x, matmul2(R_y, R_z, 3), 3);
    
    let matrices = {
        Z: R_z,
        Y: R_y,
        X: R_x,
    }

    let R = matmul2(matrices[order[2]], matmul2(matrices[order[1]], matrices[order[0]], 3), 3);


    return [
        mat(R,3,0,0), mat(R,3,0,1), mat(R,3,0,2), tr.x,
        mat(R,3,1,0), mat(R,3,1,1), mat(R,3,1,2), tr.y,
        mat(R,3,2,0), mat(R,3,2,1), mat(R,3,2,2), tr.z,
        0,          0,          0,          1,
    ];
}


function euler_angle_to_rotate_matrix_3by3(eu, order="ZYX"){
    var theta = [eu.x, eu.y, eu.z];
    // Calculate rotation about x axis
    var R_x = [
        1,       0,              0,
        0,       Math.cos(theta[0]),   -Math.sin(theta[0]),
        0,       Math.sin(theta[0]),   Math.cos(theta[0])
    ];

    // Calculate rotation about y axis
    var R_y = [
        Math.cos(theta[1]),      0,      Math.sin(theta[1]),
        0,                       1,      0,
        -Math.sin(theta[1]),     0,      Math.cos(theta[1])
    ];

    // Calculate rotation about z axis
    var R_z = [
        Math.cos(theta[2]),    -Math.sin(theta[2]),      0,
        Math.sin(theta[2]),    Math.cos(theta[2]),       0,
        0,               0,                  1];


    //console.log(R_x, R_y, R_z);

    // Combined rotation matrix
    //var R = matmul(matmul(R_z, R_y, 3), R_x,3);

    let matrices = {
        Z: R_z,
        Y: R_y,
        X: R_x,
    }

    let R = matmul2(matrices[order[2]], matmul2(matrices[order[1]], matrices[order[0]], 3), 3);
    
    return [
        mat(R,3,0,0), mat(R,3,0,1), mat(R,3,0,2),
        mat(R,3,1,0), mat(R,3,1,1), mat(R,3,1,2),
        mat(R,3,2,0), mat(R,3,2,1), mat(R,3,2,2),
    ];
}

function rotation_matrix_to_euler_angle(m, msize){ //m is 4* 4

    /*

    var sy = Math.sqrt(mat(m,4,0,0) * mat(m,4,0,0) +  mat(m,4,1,0) * mat(m,4, 1,0));
 

    var z = Math.atan2(mat(m,4,2,1) , mat(m,4,2,2));
    var y = Math.atan2(-mat(m,4,2,0), sy);
    var x = Math.atan2(mat(m,4,1,0), mat(m,4,0,0));


    return {
        x: x,
        y: y,
        z: z,
    };
    */
   var odd = false;
   var res = [0,0,0];
   var i=0,j=1,k=2;
   
   if (!msize){
       msize=4
   }

   function coeff(x,y){return mat(m,msize,x,y); }

   function atan2(x,y) { return Math.atan2(x,y);}
   var sin = Math.sin;
   var cos = Math.cos;
   function Scalar(x){return x;}

   res[0] = atan2(coeff(j,k), coeff(k,k));
   //var c2 = Vector2(coeff(i,i), coeff(i,j)).norm();
   var c2 = Math.sqrt(coeff(i,i)*coeff(i,i) + coeff(i,j)*coeff(i,j));
   if((odd && res[0]<Scalar(0)) || ((!odd) && res[0]>Scalar(0))) {
     if(res[0] > Scalar(0)) {
       res[0] -= Scalar(Math.PI);
     }
     else {
       res[0] += Scalar(Math.PI);
     }
     res[1] = atan2(-coeff(i,k), -c2);
   }
   else
     res[1] = atan2(-coeff(i,k), c2);
   var s1 = sin(res[0]);
   var c1 = cos(res[0]);
   res[2] = atan2(s1*coeff(k,i)-c1*coeff(j,i), c1*coeff(j,j) - s1 * coeff(k,j));

   if (!odd)
      res = res.map(function(x){return -x;})

   return {
       x: res[0],
       y: res[1],
       z: res[2],
   }
}



var linalg_std = {
    euler_angle_to_rotation_matrix: function(euler){
        var theta = [euler.x, euler.y, euler.z];
        // Calculate rotation about x axis
        var R_x = new THREE.Matrix4();
        R_x.set(
            1,                        0,                     0,   0,
            0,       Math.cos(theta[0]),   -Math.sin(theta[0]),   0,
            0,       Math.sin(theta[0]),   Math.cos(theta[0]) ,   0, 
            0,                        0,                     0,   1,
        );

        // Calculate rotation about y axis
        var R_y = new THREE.Matrix4();
        R_y.set(
            Math.cos(theta[1]),      0,      Math.sin(theta[1]), 0,
            0,                       1,                       0, 0, 
            -Math.sin(theta[1]),     0,      Math.cos(theta[1]), 0,
            0,                       0,                       0, 1,
        );

        // Calculate rotation about z axis
        var R_z = new THREE.Matrix4();
        R_z.set(
            Math.cos(theta[2]),    -Math.sin(theta[2]),      0,    0,
            Math.sin(theta[2]),    Math.cos(theta[2]),       0,    0,
            0,                     0,                        1,    0,
            0,                     0,                        0,    1,
        );

        R_z.multiply(R_y);
        R_z.multiply(R_x);

        return R_z;
    },

    euler_angle_from_rotation_matrix: function(m){
        var euler = new THREE.Euler();
        euler.setFromRotationMatrix(m);
        return euler;  
    },

    // {x:, y:, z:}
    euler_angle_composite: function(current, delta){
        var current_matrix = this.euler_angle_to_rotation_matrix(current);
        var delta_matrix = this.euler_angle_to_rotation_matrix(delta);
        var composite_matrix = new THREE.Matrix4();
        composite_matrix.multiplyMatrices(delta_matrix, current_matrix);
        
        return this.euler_angle_from_rotation_matrix(composite_matrix);
    }
}


function normalizeAngle(a)
{
    while (true)
    {
    if ( a > Math.PI)
        a -= Math.PI *2;
    else if (a < -Math.PI)
        a += Math.PI * 2;
    else
        return a;
    }
}



// box(position, scale, rotation) to box corner corrdinates.
// return 8 points, represented as (x,y,z,1)
// note the vertices order cannot be changed, draw-box-on-image assumes
//  the first 4 vertex is the front plane, so it knows box direction.
function psr_to_xyz_face_points(p,s,r, minGrid){
    /*
    var trans_matrix=[
        Math.cos(r.z), -Math.sin(r.z), 0, p.x,
        Math.sin(r.z), Math.cos(r.z),  0, p.y,
        0,             0,              1, p.z,
        0,             0,              0, 1,
    ];
    */
   var trans_matrix = euler_angle_to_rotate_matrix(r, p);

    var x=s.x/2;
    var y=s.y/2;
    var z=s.z/2;
   
//    var local_coord = [
//         [x, y, -z],   [x, -y, -z],  //front-left-bottom, front-right-bottom
//         [x, -y, z],   [x, y, z],  //front-right-top,   front-left-top

//         [-x, y, -z],   [-x, -y, -z],  //rear-left-bottom, rear-right-bottom
//         [-x, -y, z],   [-x, y, z],  //rear-right-top,   rear-left-top
//    ];


   

   let xs = [];
   for (let i = -x ; i <=x; i+=minGrid)
   {
       xs.push(i);
   }

   let ys = [];
   for (let i = -y ; i <=y; i+=minGrid)
   {
       ys.push(i);
   }

   let zs = [];
   for (let i = -z ; i <=z; i+=minGrid)
   {
       zs.push(i);
   }


   let points = [];

   points = points.concat(ys.map(i=>[x,  i, -z, 1]));
   points = points.concat(ys.map(i=>[x,  i,  z, 1]));
   points = points.concat(ys.map(i=>[-x, i, -z, 1]));
   points = points.concat(ys.map(i=>[-x, i,  z, 1]));
   
   points = points.concat(xs.map(i=>[i,  y, -z, 1]));
   points = points.concat(xs.map(i=>[i,  y,  z, 1]));
   points = points.concat(xs.map(i=>[i, -y, -z, 1]));
   points = points.concat(xs.map(i=>[i, -y,  z, 1]));
   
   points = points.concat(zs.map(i=>[x,   y, i, 1])); 
   points = points.concat(zs.map(i=>[x,  -y, i, 1]));
   points = points.concat(zs.map(i=>[-x, -y, i, 1]));
   points = points.concat(zs.map(i=>[-x,  y, i, 1]));


   points = points.reduce((a,b)=>a.concat(b))

   let world_coord = matmul(trans_matrix, points, 4);


   
   return vector4to3(world_coord);
}



function cornersAinB(boxA,boxB){
    

    let minGrid = Math.min(
        boxA.scale.x, boxA.scale.y, boxA.scale.z, 
        boxB.scale.x, boxB.scale.y, boxB.scale.z, 
    );

    minGrid = minGrid / 2;


    // in world coord, offset by b pos
    let boxAPosInB = {x: boxA.position.x - boxB.position.x,
        y: boxA.position.y - boxB.position.y,
        z: boxA.position.z - boxB.position.z};

    let cornersA = psr_to_xyz_face_points(boxAPosInB, boxA.scale, boxA.rotation, minGrid);   // in world coordinates

    cornersA.push(boxAPosInB.x, boxAPosInB.y, boxAPosInB.z); //center point
    

    // in box b coord
    let matrixB = euler_angle_to_rotate_matrix_3by3(boxB.rotation);
    matrixB = transpose(matrixB,3)
    let cornersAInB = matmul(matrixB, cornersA, 3);


    for (let i =0; i < cornersAInB.length; i+=3){
        let [x,y,z] = cornersAInB.slice(i, i+3)

        if ( Math.abs(x) < boxB.scale.x/2 &&
            Math.abs(y) < boxB.scale.y/2 &&
            Math.abs(z) < boxB.scale.z/2)
            {
                return true;
            }

    }

    return false;
}

// check if 2 boxes has non-empty intersection
    // the idea is to check if any corner of one box is inside the other one
    // when boxA contains B entirely, we shoudl test the opposite way.
function intersect(boxA, boxB){

        return cornersAinB(boxA, boxB) || cornersAinB(boxB, boxA);


        
    };


export {dotproduct, vector_range, array_as_vector_range, array_as_vector_index_range, vector4to3, vector3_nomalize, psr_to_xyz, matmul, 
    matmul2, 
    euler_angle_to_rotate_matrix_3by3, euler_angle_to_rotate_matrix, rotation_matrix_to_euler_angle, 
    linalg_std,
    transpose,
    mat,
    normalizeAngle,
    intersect
}