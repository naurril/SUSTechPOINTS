// import { eulerAngleToRotationMatrix, eulerAngleToRotationMatrix3By3, matmul, matmul2 , mat} from './util.js';
export function FrameInfo (data, sceneMeta, sceneName, frame) {
  this.data = data;
  this.sceneMeta = sceneMeta;
  this.dir = '';
  this.scene = sceneName;
  this.frame = frame;
  this.pcd_ext = '';
  this.frameIndex = this.sceneMeta.frames.findIndex(function (x) { return x === frame; });
  this.transform_matrix = this.sceneMeta.point_transform_matrix;
  this.annotation_format = this.sceneMeta.boxtype; // xyz(24 number), csr(center, scale, rotation, 9 number)

  // this.set = function(scene, frameIndex, frame, transform_matrix, annotation_format){
  //         this.scene = scene;
  //         this.frame = frame;
  //         this.frameIndex = frameIndex;
  //         this.transform_matrix = transform_matrix;
  //         this.annotation_format = annotation_format;
  // };
  this.get_pcd_path = function () {
    return 'data/' + this.scene + '/lidar/' + this.frame + this.sceneMeta.lidar_ext + '?token=' + window.pointsGlobalConfig.userToken;
  };
  this.get_radar_path = function (name) {
    return `data/${this.scene}/radar/${name}/${this.frame}${this.sceneMeta.radar_ext}?token=${window.pointsGlobalConfig.userToken}`;
  };
  this.get_aux_lidar_path = function (name) {
    return `data/${this.scene}/aux_lidar/${name}/${this.frame}${this.sceneMeta.radar_ext}?token=${window.pointsGlobalConfig.userToken}`;
  };

  this.get_egopose_path = function () {
    return `data/${this.scene}/ego_pose/${this.frame}.json?token=${window.pointsGlobalConfig.userToken}`;
  };

  this.get_calib_path = function (sensortype, sensorname) {
    return `data/${this.scene}/calib/${sensortype}/${sensorname}/${this.frame}.json?token=${window.pointsGlobalConfig.userToken}`;
  };

  this.get_anno_path = function () {
    if (this.annotation_format === 'psr') {
      return 'data/' + this.scene + '/label/' + this.frame + '.json';
    } else {
      return 'data/' + this.scene + '/bbox.xyz/' + this.frame + '.bbox.txt';
    }
  };

  this.anno_to_boxes = function (text) {
    if (this.annotation_format === 'psr') {
      const boxes = JSON.parse(text);

      return boxes;
    } else { return this.python_xyz_to_psr(text); }
  };
  this.transform_point = function (m, x, y, z) {
    const rx = x * m[0] + y * m[1] + z * m[2];
    const ry = x * m[3] + y * m[4] + z * m[5];
    const rz = x * m[6] + y * m[7] + z * m[8];

    return [rx, ry, rz];
  };

  /*
    input is coordinates of 8 vertices
    bottom-left-front, bottom-right-front, bottom-right-back, bottom-left-back
    top-left-front,    top-right-front,    top-right-back,    top-left-back

    this format is what SECOND/PointRcnn save their results.
    */
  this.python_xyz_to_psr = function (text) {
    const _self = this;

    const pointsArray = text.split('\n').filter(function (x) { return x; }).map(function (x) { return x.split(' ').map(function (x) { return parseFloat(x); }); });

    const boxes = pointsArray.map(function (ps) {
      for (let i = 0; i < 8; i++) {
        const p = _self.transform_point(_self.transform_matrix, ps[3 * i + 0], ps[3 * i + 1], ps[3 * i + 2]);
        ps[i * 3 + 0] = p[0];
        ps[i * 3 + 1] = p[1];
        ps[i * 3 + 2] = p[2];
      }
      return ps;
    });

    const boxesAnn = boxes.map(this.xyz_to_psr);

    return boxesAnn; //, boxes];
  };

  this.xyz_to_psr = function (annInput) {
    let ann = [];
    if (annInput.length === 24) {
      ann = annInput;
    } else {
      for (let i = 0; i < annInput.length; i++) {
        if ((i + 1) % 4 !== 0) {
          ann.push(annInput[i]);
        }
      }
    }

    const pos = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 8; i++) {
      pos.x += ann[i * 3];
      pos.y += ann[i * 3 + 1];
      pos.z += ann[i * 3 + 2];
    }
    pos.x /= 8;
    pos.y /= 8;
    pos.z /= 8;

    const scale = {
      x: Math.sqrt((ann[0] - ann[3]) * (ann[0] - ann[3]) + (ann[1] - ann[4]) * (ann[1] - ann[4])),
      y: Math.sqrt((ann[0] - ann[9]) * (ann[0] - ann[9]) + (ann[1] - ann[10]) * (ann[1] - ann[10])),
      z: ann[14] - ann[2]
    };

    /*
            1. atan2(y,x), not x,y
            2. point order in xy plane
                0   1
                3   2
            */
    const angle = Math.atan2(ann[4] + ann[7] - 2 * pos.y, ann[3] + ann[6] - 2 * pos.x);

    return {
      position: pos,
      scale,
      rotation: { x: 0, y: 0, z: angle }
    };
  };
}
