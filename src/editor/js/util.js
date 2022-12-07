import * as THREE from 'three';

function dotproduct (a, b) {
  let ret = 0;
  for (let i = 0; i < a.length; i++) {
    ret += a[i] * b[i];
  }

  return ret;
}

// matrix (m*n), matrix(n*l), vl: vector length=n
// this matmul is row-wise multiplication. 'x' and result are row-vectors.
// ret^T = m * x^T
// vl is vector length
function matmul (m, x, vl) {
  const ret = [];
  const resL = m.length / vl;
  for (let vi = 0; vi < x.length / vl; vi++) { // vector index
    for (let r = 0; r < m.length / vl; r++) { // row of matrix
      ret[vi * resL + r] = 0;
      for (let i = 0; i < vl; i++) {
        ret[vi * resL + r] += m[r * vl + i] * x[vi * vl + i];
      }
    }
  }

  return ret;
}

// vl is vector length
function matmul2 (m, x, vl) {
  const ret = [];
  const rows = m.length / vl;
  const cols = x.length / vl;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ret[r * cols + c] = 0;
      for (let i = 0; i < vl; i++) {
        ret[r * cols + c] += m[r * vl + i] * x[i * cols + c];
      }
    }
  }

  return ret;
}

// box(position, scale, rotation) to box corner corrdinates.
// return 8 points, represented as (x,y,z,1)
// note the vertices order cannot be changed, draw-box-on-image assumes
//  the first 4 vertex is the front plane, so it knows box direction.
function pxrToXyz (p, s, r) {
  /*
    var transMatrix=[
        Math.cos(r.z), -Math.sin(r.z), 0, p.x,
        Math.sin(r.z), Math.cos(r.z),  0, p.y,
        0,             0,              1, p.z,
        0,             0,              0, 1,
    ];
    */
  const transMatrix = eulerAngleToRotationMatrix(r, p);

  const x = s.x / 2;
  const y = s.y / 2;
  const z = s.z / 2;
  /*
    var localCoord = [
        -x, y, -z, 1,   x, y, -z, 1,  //front-left-bottom, front-right-bottom
        x, y, z, 1,    -x, y, z, 1,  //front-right-top,   front-left-top

        -x, -y, -z, 1,   x, -y, -z, 1,
        x, -y, z, 1,   -x, -y, z, 1,

    ];
    */

  const localCoord = [
    x, y, -z, 1, x, -y, -z, 1, // front-left-bottom, front-right-bottom
    x, -y, z, 1, x, y, z, 1, // front-right-top,   front-left-top

    -x, y, -z, 1, -x, -y, -z, 1, // rear-left-bottom, rear-right-bottom
    -x, -y, z, 1, -x, y, z, 1 // rear-right-top,   rear-left-top

    // middle plane
    // 0, y, -z, 1,   0, -y, -z, 1,  //rear-left-bottom, rear-right-bottom
    // 0, -y, z, 1,   0, y, z, 1,  //rear-right-top,   rear-left-top
  ];

  const worldCoord = matmul(transMatrix, localCoord, 4);
  const w = worldCoord;
  return w;
}

// function xyz_to_psr(vertices){
//     var ann = vertices;
//     var ROW=4;
//     var pos={x:0,y:0,z:0};
//     for (var i=0; i<8; i++){
//         pos.x+=ann[i*ROW];
//         pos.y+=ann[i*ROW+1];
//         pos.z+=ann[i*ROW+2];
//     }
//     pos.x /=8;
//     pos.y /=8;
//     pos.z /=8;

//     var scale={
//         x: Math.sqrt((ann[0]-ann[ROW])*(ann[0]-ann[ROW])+(ann[1]-ann[ROW+1])*(ann[1]-ann[ROW+1])),
//         y: Math.sqrt((ann[0]-ann[ROW*3])*(ann[0]-ann[ROW*3])+(ann[1]-ann[ROW*3+1])*(ann[1]-ann[ROW*3+1])),
//         z: ann[3*ROW+2]-ann[2],
//     };

//     /*
//     1. atan2(y,x), not x,y
//     2. point order in xy plane
//         0   1
//         3   2
//     */

//     var angle = Math.atan2(ann[1*ROW+1]+ann[5*ROW+1]-2*pos.y, ann[1*ROW]+ann[5*ROW]-2*pos.x);

//     return {
//         position: pos,
//         scale:scale,
//         rotation:{x:0,y:0,z:angle},
//     }

// }

function vector4to3 (v) {
  const ret = [];
  for (let i = 0; i < v.length; i++) {
    if ((i + 1) % 4 !== 0) {
      ret.push(v[i]);
    }
  }

  return ret;
}

function vectorRange (v) {
  if (v.length === 0) {
    return null;
  }

  const min = [...v[0]];
  const max = [...v[0]];

  for (let i = 1; i < v.length; ++i) {
    for (let j = 0; j < min.length; ++j) {
      if (min[j] > v[i][j]) {
        min[j] = v[i][j];
      }

      if (max[j] < v[i][j]) {
        max[j] = v[i][j];
      }
    }
  }

  return {
    min,
    max
  };
}

// v is array of vector, vl is vector length
function arrayAsVectorRange (v, vl) {
  const n = v.length / vl;

  let min, max;
  if (n === 0) {
    return null;
  } else {
    min = v.slice(0, vl);
    max = v.slice(0, vl);
  }

  for (let i = 1; i < n; ++i) {
    for (let j = 0; j < vl; ++j) {
      if (min[j] > v[i * vl + j]) {
        min[j] = v[i * vl + j];
      }

      if (max[j] < v[i * vl + j]) {
        max[j] = v[i * vl + j];
      }
    }
  }

  return {
    min,
    max
  };
}

// v is 1-d array of vector, vl is vector length, p is index into v.
function arrayAsVectorIndexRange (v, vl, p) {
  const n = p.length;

  let min, max;
  if (n === 0) {
    return null;
  } else {
    min = v.slice(p[0] * vl, (p[0] + 1) * vl);
    max = v.slice(p[0] * vl, (p[0] + 1) * vl);
  }

  for (let i = 1; i < n; ++i) {
    for (let j = 0; j < vl; ++j) {
      if (min[j] > v[p[i] * vl + j]) {
        min[j] = v[p[i] * vl + j];
      }

      if (max[j] < v[p[i] * vl + j]) {
        max[j] = v[p[i] * vl + j];
      }
    }
  }

  return {
    min,
    max
  };
}

function vector3Nomalize (m) {
  const ret = [];
  for (let i = 0; i < m.length / 3; i++) {
    ret.push(m[i * 3 + 0] / m[i * 3 + 2]);
    ret.push(m[i * 3 + 1] / m[i * 3 + 2]);
  }

  return ret;
}

function mat (m, s, x, y) {
  return m[x * s + y];
}

// m; matrix, vl: column vector length
function transpose (m, cl = NaN) {
  const rl = m.length / cl;
  for (let i = 0; i < cl; i++) {
    for (let j = i + 1; j < rl; j++) {
      const t = m[i * rl + j];
      m[i * rl + j] = m[j * cl + i];
      m[j * cl + i] = t;
    }
  }

  return m;
}

function eulerAngleToRotationMatrix (eu, tr, order = 'ZYX') {
  const theta = [eu.x, eu.y, eu.z];
  // Calculate rotation about x axis
  const rx = [
    1, 0, 0,
    0, Math.cos(theta[0]), -Math.sin(theta[0]),
    0, Math.sin(theta[0]), Math.cos(theta[0])
  ];

  // Calculate rotation about y axis
  const ry = [
    Math.cos(theta[1]), 0, Math.sin(theta[1]),
    0, 1, 0,
    -Math.sin(theta[1]), 0, Math.cos(theta[1])
  ];

  // Calculate rotation about z axis
  const rz = [
    Math.cos(theta[2]), -Math.sin(theta[2]), 0,
    Math.sin(theta[2]), Math.cos(theta[2]), 0,
    0, 0, 1];

  // console.log(rx, ry, rz);

  // Combined rotation matrix
  // var R = matmul(matmul(rz, ry, 3), rx,3);
  // var R = matmul2(rx, matmul2(ry, rz, 3), 3);

  const matrices = {
    Z: rz,
    Y: ry,
    X: rx
  };

  const R = matmul2(matrices[order[2]], matmul2(matrices[order[1]], matrices[order[0]], 3), 3);

  return [
    mat(R, 3, 0, 0), mat(R, 3, 0, 1), mat(R, 3, 0, 2), tr.x,
    mat(R, 3, 1, 0), mat(R, 3, 1, 1), mat(R, 3, 1, 2), tr.y,
    mat(R, 3, 2, 0), mat(R, 3, 2, 1), mat(R, 3, 2, 2), tr.z,
    0, 0, 0, 1
  ];
}

function eulerAngleToRotationMatrix3By3 (eu, order = 'ZYX') {
  const theta = [eu.x, eu.y, eu.z];
  // Calculate rotation about x axis
  const rx = [
    1, 0, 0,
    0, Math.cos(theta[0]), -Math.sin(theta[0]),
    0, Math.sin(theta[0]), Math.cos(theta[0])
  ];

  // Calculate rotation about y axis
  const ry = [
    Math.cos(theta[1]), 0, Math.sin(theta[1]),
    0, 1, 0,
    -Math.sin(theta[1]), 0, Math.cos(theta[1])
  ];

  // Calculate rotation about z axis
  const rz = [
    Math.cos(theta[2]), -Math.sin(theta[2]), 0,
    Math.sin(theta[2]), Math.cos(theta[2]), 0,
    0, 0, 1];

  // console.log(rx, ry, rz);

  // Combined rotation matrix
  // var R = matmul(matmul(rz, ry, 3), rx,3);

  const matrices = {
    Z: rz,
    Y: ry,
    X: rx
  };

  const R = matmul2(matrices[order[2]], matmul2(matrices[order[1]], matrices[order[0]], 3), 3);

  return [
    mat(R, 3, 0, 0), mat(R, 3, 0, 1), mat(R, 3, 0, 2),
    mat(R, 3, 1, 0), mat(R, 3, 1, 1), mat(R, 3, 1, 2),
    mat(R, 3, 2, 0), mat(R, 3, 2, 1), mat(R, 3, 2, 2)
  ];
}

function rotationMatrixToEulerAngle (m, msize) { // m is 4* 4
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
  const odd = false;
  let res = [0, 0, 0];
  const i = 0; const j = 1; const k = 2;

  if (!msize) {
    msize = 4;
  }

  function coeff (x, y) { return mat(m, msize, x, y); }

  function atan2 (x, y) { return Math.atan2(x, y); }
  const sin = Math.sin;
  const cos = Math.cos;
  function Scalar (x) { return x; }

  res[0] = atan2(coeff(j, k), coeff(k, k));
  // var c2 = Vector2(coeff(i,i), coeff(i,j)).norm();
  const c2 = Math.sqrt(coeff(i, i) * coeff(i, i) + coeff(i, j) * coeff(i, j));
  if ((odd && res[0] < Scalar(0)) || ((!odd) && res[0] > Scalar(0))) {
    if (res[0] > Scalar(0)) {
      res[0] -= Scalar(Math.PI);
    } else {
      res[0] += Scalar(Math.PI);
    }
    res[1] = atan2(-coeff(i, k), -c2);
  } else { res[1] = atan2(-coeff(i, k), c2); }
  const s1 = sin(res[0]);
  const c1 = cos(res[0]);
  res[2] = atan2(s1 * coeff(k, i) - c1 * coeff(j, i), c1 * coeff(j, j) - s1 * coeff(k, j));

  if (!odd) { res = res.map(function (x) { return -x; }); }

  return {
    x: res[0],
    y: res[1],
    z: res[2]
  };
}

const linalgStd = {
  eulerAngletoRotationMatrix: function (euler) {
    const theta = [euler.x, euler.y, euler.z];
    // Calculate rotation about x axis
    const rx = new THREE.Matrix4();
    rx.set(
      1, 0, 0, 0,
      0, Math.cos(theta[0]), -Math.sin(theta[0]), 0,
      0, Math.sin(theta[0]), Math.cos(theta[0]), 0,
      0, 0, 0, 1
    );

    // Calculate rotation about y axis
    const ry = new THREE.Matrix4();
    ry.set(
      Math.cos(theta[1]), 0, Math.sin(theta[1]), 0,
      0, 1, 0, 0,
      -Math.sin(theta[1]), 0, Math.cos(theta[1]), 0,
      0, 0, 0, 1
    );

    // Calculate rotation about z axis
    const rz = new THREE.Matrix4();
    rz.set(
      Math.cos(theta[2]), -Math.sin(theta[2]), 0, 0,
      Math.sin(theta[2]), Math.cos(theta[2]), 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );

    rz.multiply(ry);
    rz.multiply(rx);

    return rz;
  },

  eulerAngleFromRotationMatrix: function (m) {
    const euler = new THREE.Euler();
    euler.setFromRotationMatrix(m);
    return euler;
  },

  // {x:, y:, z:}
  eulerAngleComposite: function (current, delta) {
    const currentMatrix = this.eulerAngletoRotationMatrix(current);
    const deltaMatrix = this.eulerAngletoRotationMatrix(delta);
    const compositeMatrix = new THREE.Matrix4();
    compositeMatrix.multiplyMatrices(deltaMatrix, currentMatrix);

    return this.eulerAngleFromRotationMatrix(compositeMatrix);
  }
};

function normalizeAngle (a) {
  while (true) {
    if (a > Math.PI) { a -= Math.PI * 2; } else if (a < -Math.PI) { a += Math.PI * 2; } else { return a; }
  }
}

// box(position, scale, rotation) to box corner corrdinates.
// return 8 points, represented as (x,y,z,1)
// note the vertices order cannot be changed, draw-box-on-image assumes
//  the first 4 vertex is the front plane, so it knows box direction.
function psrToXyzFacePoints (p, s, r, minGrid) {
  /*
    var transMatrix=[
        Math.cos(r.z), -Math.sin(r.z), 0, p.x,
        Math.sin(r.z), Math.cos(r.z),  0, p.y,
        0,             0,              1, p.z,
        0,             0,              0, 1,
    ];
    */
  const transMatrix = eulerAngleToRotationMatrix(r, p);

  const x = s.x / 2;
  const y = s.y / 2;
  const z = s.z / 2;

  //    var localCoord = [
  //         [x, y, -z],   [x, -y, -z],  //front-left-bottom, front-right-bottom
  //         [x, -y, z],   [x, y, z],  //front-right-top,   front-left-top

  //         [-x, y, -z],   [-x, -y, -z],  //rear-left-bottom, rear-right-bottom
  //         [-x, -y, z],   [-x, y, z],  //rear-right-top,   rear-left-top
  //    ];

  const xs = [];
  for (let i = -x; i <= x; i += minGrid) {
    xs.push(i);
  }

  const ys = [];
  for (let i = -y; i <= y; i += minGrid) {
    ys.push(i);
  }

  const zs = [];
  for (let i = -z; i <= z; i += minGrid) {
    zs.push(i);
  }

  let points = [];

  points = points.concat(ys.map(i => [x, i, -z, 1]));
  points = points.concat(ys.map(i => [x, i, z, 1]));
  points = points.concat(ys.map(i => [-x, i, -z, 1]));
  points = points.concat(ys.map(i => [-x, i, z, 1]));

  points = points.concat(xs.map(i => [i, y, -z, 1]));
  points = points.concat(xs.map(i => [i, y, z, 1]));
  points = points.concat(xs.map(i => [i, -y, -z, 1]));
  points = points.concat(xs.map(i => [i, -y, z, 1]));

  points = points.concat(zs.map(i => [x, y, i, 1]));
  points = points.concat(zs.map(i => [x, -y, i, 1]));
  points = points.concat(zs.map(i => [-x, -y, i, 1]));
  points = points.concat(zs.map(i => [-x, y, i, 1]));

  points = points.reduce((a, b) => a.concat(b));

  const worldCoord = matmul(transMatrix, points, 4);

  return vector4to3(worldCoord);
}

function cornersAinB (boxA, boxB) {
  let minGrid = Math.min(
    boxA.scale.x, boxA.scale.y, boxA.scale.z,
    boxB.scale.x, boxB.scale.y, boxB.scale.z
  );

  minGrid = minGrid / 2;

  // in world coord, offset by b pos
  const boxAPosInB = {
    x: boxA.position.x - boxB.position.x,
    y: boxA.position.y - boxB.position.y,
    z: boxA.position.z - boxB.position.z
  };

  const cornersA = psrToXyzFacePoints(boxAPosInB, boxA.scale, boxA.rotation, minGrid); // in world coordinates

  cornersA.push(boxAPosInB.x, boxAPosInB.y, boxAPosInB.z); // center point

  // in box b coord
  let matrixB = eulerAngleToRotationMatrix3By3(boxB.rotation);
  matrixB = transpose(matrixB, 3);
  const cornersAInB = matmul(matrixB, cornersA, 3);

  for (let i = 0; i < cornersAInB.length; i += 3) {
    const [x, y, z] = cornersAInB.slice(i, i + 3);

    if (Math.abs(x) < boxB.scale.x / 2 &&
            Math.abs(y) < boxB.scale.y / 2 &&
            Math.abs(z) < boxB.scale.z / 2) {
      return true;
    }
  }

  return false;
}

// check if 2 boxes has non-empty intersection
// the idea is to check if any corner of one box is inside the other one
// when boxA contains B entirely, we shoudl test the opposite way.
function intersect (boxA, boxB) {
  return cornersAinB(boxA, boxB) || cornersAinB(boxB, boxA);
}

function calculate_rect_iou(a,b) {
    const i = intersect(a, b)

    if (i['x2'] < i['x1'] || i['y2'] < i['y1']) {
        return 0
    } else {
        return area(i)/(area(a)+area(b) - area(i))
    }

    
      function area(r) {
          return (r['x2'] - r['x1']) * (r['y2'] - r['y1'])
      }
      
      
      function intersect(a,b){
          const x1 = Math.max(a['x1'], b['x1'])
          const y1 = Math.max(a['y1'], b['y1'])
      
          const x2 = Math.min(a['x2'], b['x2'])
          const y2 = Math.min(a['y2'], b['y2'])
      
          return {
              'x1': x1,
              'x2': x2,
              'y1': y1,
              'y2': y2
          }
        }
}


export {
  dotproduct, vectorRange, arrayAsVectorRange, arrayAsVectorIndexRange, vector4to3, vector3Nomalize, pxrToXyz, matmul,
  matmul2,
  eulerAngleToRotationMatrix3By3, eulerAngleToRotationMatrix, rotationMatrixToEulerAngle,
  linalgStd,
  transpose,
  mat,
  normalizeAngle,
  intersect,
  calculate_rect_iou
};
