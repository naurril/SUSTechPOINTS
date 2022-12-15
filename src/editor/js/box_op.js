import * as THREE from 'three';

import { logger } from './log.js';
import {
  Quaternion,
  Vector3
} from 'three';

import { ml } from './ml.js';
import { dotproduct, transpose, matmul, eulerAngleToRotationMatrix3By3 } from './util.js';

function BoxOp () {
  console.log('BoxOp called');
  this.grow_box_distance_threshold = 0.3;
  this.initScaleRatio = { x: 2, y: 2, z: 3 };

  this.fit_bottom = function (box) {
    const bottom = box.world.lidar.findBottom(box, { x: 2, y: 2, z: 3 });
    this.translateBox(box, 'z', bottom + box.scale.z / 2);
  };

  this.fit_top = function (box) {
    const top = box.world.lidar.findTop(box, { x: 1.2, y: 1.2, z: 2 });
    this.translateBox(box, 'z', top - box.scale.z / 2);
  };

  this.fit_left = function (box) {
    const extreme = box.world.lidar.growBox(box, this.grow_box_distance_threshold, this.initScaleRatio);

    if (extreme) {
      this.translateBox(box, 'y', extreme.max.y - box.scale.y / 2);
    }
  };

  this.fit_right = function (box) {
    const extreme = box.world.lidar.growBox(box, this.grow_box_distance_threshold, this.initScaleRatio);

    if (extreme) {
      this.translateBox(box, 'y', extreme.min.y + box.scale.y / 2);
    }
  };

  this.fit_front = function (box) {
    const extreme = box.world.lidar.growBox(box, this.grow_box_distance_threshold, this.initScaleRatio);

    if (extreme) {
      this.translateBox(box, 'x', extreme.max.x - box.scale.x / 2);
    }
  };

  this.fit_rear = function (box) {
    const extreme = box.world.lidar.growBox(box, this.grow_box_distance_threshold, this.initScaleRatio);

    if (extreme) {
      this.translateBox(box, 'x', extreme.min.x + box.scale.x / 2);
    }
  };

  this.fitSize = function (box, axies) {
    this.growBox(box, this.grow_box_distance_threshold, { x: 2, y: 2, z: 3 }, axies);
  };

  this.justifyAutoAdjResult = function (orgBox, box) {
    const distance = Math.sqrt((box.position.x - orgBox.position.x) * (box.position.x - orgBox.position.x) +
                                     (box.position.y - orgBox.position.y) * (box.position.y - orgBox.position.y) +
                                     (box.position.z - orgBox.position.z) * (box.position.z - orgBox.position.z));

    if (distance > Math.sqrt(box.scale.x * box.scale.x + box.scale.y * box.scale.y + box.scale.z * box.scale.z)) {
      return false;
    }

    // if (Math.abs(box.rotation.z - orgBox.rotation.z) > Math.PI/4)
    // {
    //     return false;
    // }

    if (box.scale.x > orgBox.scale.x * 3 ||
                box.scale.y > orgBox.scale.y * 3 ||
                box.scale.z > orgBox.scale.z * 3) {
      return false;
    }

    return true;
  };

  this.subsamplePoints = function (points, num) {
    if (points.length < num) { return points; }

    const ret = [];
    for (let i = 0; i < num; i++) {
      const index = Math.round(Math.random() * (num - 1));
      ret.push(points[index]);
    }

    return ret;
  };

  this.auto_rotate_xyz = async function (box, callback, applyMask, onBoxChanged, noscaling, rotateMethod) {
    const orgBox = box;
    box = {
      position: { x: box.position.x, y: box.position.y, z: box.position.z },
      rotation: { x: box.rotation.x, y: box.rotation.y, z: box.rotation.z },
      scale: { x: box.scale.x, y: box.scale.y, z: box.scale.z },
      world: box.world
    };

    // auto grow
    // save scale
    const grow = (box) => {
      const orgScale = {
        x: box.scale.x,
        y: box.scale.y,
        z: box.scale.z
      };
      this.growBox(box, this.grow_box_distance_threshold, { x: 2, y: 2, z: 3 });
      this.auto_shrink_box(box);
      // now box has been centered.

      const pointIndices = box.world.lidar.getPointsInBox(box, 1.0).index;
      const extreme = box.world.lidar.getDimensionOfPoints(pointIndices, box);
      // restore scale
      if (noscaling) {
        box.scale.x = orgScale.x;
        box.scale.y = orgScale.y;
        box.scale.z = orgScale.z;
      }
      //
      return extreme;
    };

    // points is N*3 shape

    const applyRotation = (ret, extremeAfterGrow) => {
      const angle = ret.angle;
      if (!angle) {
        console.log('prediction not implemented?');
        return;
      }

      // var points_indices = box.world.getPointIndices(box);
      const pointIndices = box.world.lidar.getPointsInBox(box, 1.0).index;

      const eulerDelta = {
        x: angle[0],
        y: angle[1],
        z: angle[2]
      };

      if (eulerDelta.z > Math.PI) {
        eulerDelta.z -= Math.PI * 2;
      }

      /*
                var composite_angel = linalgStd.eulerAngleComposite(box.rotation, euler_delta);

                console.log("orig ", box.rotation.x, box.rotation.y, box.rotation.z);
                console.log("delt ", euler_delta.x, euler_delta.y, euler_delta.z);
                console.log("comp ", composite_angel.x, composite_angel.y, composite_angel.z);

                box.rotation.x = composite_angel.x;
                box.rotation.y = composite_angel.y;
                box.rotation.z = composite_angel.z;
                */

      if (applyMask) {
        if (applyMask.x) { box.rotation.x = eulerDelta.x; }
        if (applyMask.y) { box.rotation.y = eulerDelta.y; }
        if (applyMask.z) { box.rotation.z = eulerDelta.z; }
      } else {
        box.rotation.x = eulerDelta.x;
        box.rotation.y = eulerDelta.y;
        box.rotation.z = eulerDelta.z;
      }

      // rotation set, now rescaling the box
      // important: should use original points before rotation set
      let extreme = box.world.lidar.getDimensionOfPoints(pointIndices, box);

      let autoAdjDimension = [];

      if (applyMask) {
        if (applyMask.x || applyMask.y) { autoAdjDimension.push('z'); }

        if (applyMask.x || applyMask.z) { autoAdjDimension.push('y'); }

        if (applyMask.y || applyMask.z) { autoAdjDimension.push('x'); }
      } else {
        autoAdjDimension = ['x', 'y', 'z'];
      }

      if (!noscaling) {
        autoAdjDimension.forEach((axis) => {
          this.translateBox(box, axis, (extreme.max[axis] + extreme.min[axis]) / 2);
          box.scale[axis] = extreme.max[axis] - extreme.min[axis];
        });
      } else {
        // anyway, we move the box in a way
        let trans = eulerAngleToRotationMatrix3By3(box.rotation);
        trans = transpose(trans, 3);

        // compute the relative position of the origin point,that is, the lidar's position
        // note the origin point is offseted, we need to restore first.
        const boxpos = box.position;
        const orgPoint = [
          -boxpos.x,
          -boxpos.y,
          -boxpos.z
        ];
        const orgPointInBoxCoord = matmul(trans, orgPoint, 3);
        const relativePosition = {
          x: orgPointInBoxCoord[0],
          y: orgPointInBoxCoord[1],
          z: 1 // orgPointInBoxCoord[2],
        };

        if (extremeAfterGrow) { extreme = extremeAfterGrow; }

        autoAdjDimension.forEach((axis) => {
          if (relativePosition[axis] > 0) {
            // stick to max
            this.translateBox(box, axis, extreme.max[axis] - box.scale[axis] / 2);
          } else {
            // stick to min
            this.translateBox(box, axis, extreme.min[axis] + box.scale[axis] / 2);
          }
        });
      }

      return box;
    };

    const postProc = (box) => {
      if (this.justifyAutoAdjResult(orgBox, box)) {
        // copy back
        orgBox.position.x = box.position.x;
        orgBox.position.y = box.position.y;
        orgBox.position.z = box.position.z;

        orgBox.rotation.x = box.rotation.x;
        orgBox.rotation.y = box.rotation.y;
        orgBox.rotation.z = box.rotation.z;

        orgBox.scale.x = box.scale.x;
        orgBox.scale.y = box.scale.y;
        orgBox.scale.z = box.scale.z;
      }

      if (onBoxChanged) { onBoxChanged(orgBox); }

      if (callback) {
        callback();
      }
      return orgBox;
    };

    const extremeAfterGrow = grow(box);

    if (!rotateMethod) {
      let points = box.world.lidar.getPointsRelativeCoordinatesOfBoxWithoutRotation(box, 1);
      // let points = box.world.getPointRelativeCoordinatesOfBox(box, 1.0);

      points = points.filter(function (p) {
        return p[2] > -box.scale.z / 2 + 0.3;
      });

      // do sub sampling to reduce network usage
      if (points.length > 2000) {
        points = this.subsamplePoints(points, 2000);
      }

      const retBox = await ml.predictRotation(points)
        .then(applyRotation)
        .then(postProc);

      return retBox;
    }
    if (rotateMethod === 'moving-direction') {
      const estimatedRot = this.estimate_rotation_by_moving_direciton(box);

      applyRotation({
        angle: [
          box.rotation.x, // use original rotation
          box.rotation.y, // use original rotation
          estimatedRot ? estimatedRot.z : box.rotation.z // use original rotation
        ]
      },
      extremeAfterGrow);

      postProc(box);
      return box;
    } else { // dont rotate, or null
      applyRotation({
        angle: [
          box.rotation.x, // use original rotation
          box.rotation.y, // use original rotation
          box.rotation.z // use original rotation
        ]
      },
      extremeAfterGrow);

      postProc(box);
      return box;
    }
  };

  this.auto_shrink_box = function (box) {
    const extreme = box.world.lidar.getPointsDimensionOfBox(box);

    ['x', 'y', 'z'].forEach((axis) => {
      this.translateBox(box, axis, (extreme.max[axis] + extreme.min[axis]) / 2);
      box.scale[axis] = extreme.max[axis] - extreme.min[axis];
    });
  };

  this.estimate_rotation_by_moving_direciton = function (box) {
    const prevWorld = box.world.data.findWorld(box.world.frameInfo.scene,
      box.world.frameInfo.frameIndex - 1);

    const nextWorld = box.world.data.findWorld(box.world.frameInfo.scene,
      box.world.frameInfo.frameIndex + 1);

    let prevBox = prevWorld ? prevWorld.annotation.findBoxByTrackId(box.obj_id) : null;
    let nextBox = nextWorld ? nextWorld.annotation.findBoxByTrackId(box.obj_id) : null;

    if (prevBox && nextBox) {
      if ((prevBox.annotator && nextBox.annotator) || (!prevBox.annotator && !nextBox.annotator)) {
        // all annotated by machine or man, it's ok
      } else {
        // only one is manually annotated, use this one.
        if (prevBox.annotator) { prevBox = null; }

        if (nextBox.annotator) { nextBox = null; }
      }
    }

    if (!nextBox && !prevBox) {
      logger.logcolor('red', 'Cannot estimate direction: neither previous nor next frame/box loaded/annotated.');
      return null;
    }

    const currentP = box.world.lidarPosToUtm(box.position);
    let nextP = nextBox ? nextBox.world.lidarPosToUtm(nextBox.position) : null;
    let prevP = prevBox ? prevBox.world.lidarPosToUtm(prevBox.position) : null;

    if (!prevP) { prevP = currentP; }

    if (!nextP) { nextP = currentP; }

    const azimuth = Math.atan2(nextP.y - prevP.y, nextP.x - prevP.x);

    const estimatedRot = box.world.utmRotToLidar(new THREE.Euler(0, 0, azimuth, 'XYZ'));

    return estimatedRot;
  };

  this.growBox = function (box, minDistance, initScaleRatio, axies) {
    if (!axies) {
      axies = ['x', 'y', 'z'];
    }

    let extreme = box.world.lidar.growBox(box, minDistance, initScaleRatio);
    // if (extreme.insidePoints === 0) {
    //   initScaleRatio.z *= 5;
    //   initScaleRatio.x *= 2;
    //   initScaleRatio.y *= 2;
    //   extreme = box.world.lidar.growBox(box, minDistance, initScaleRatio);
    // }

    if (extreme) {
      axies.forEach((axis) => {
        this.translateBox(box, axis, (extreme.max[axis] + extreme.min[axis]) / 2);
        box.scale[axis] = extreme.max[axis] - extreme.min[axis];
      });
    }
  };

  this.change_rotation_y = function (box, theta, sticky, onBoxChanged) {
    // box.rotation.x += theta;
    // onBoxChanged(box);

    const pointIndices = box.world.lidar.getPointIndices(box);

    const _tempQuaternion = new Quaternion();
    const rotationAxis = new Vector3(0, 1, 0);

    // NOTE: the front/end subview is different from top/side view, that we look at the reverse direction of y-axis
    //       it's end view acturally.
    //       we could project front-view, but the translation (left, right) will be in reverse direction of top view.
    ///       that would be frustrating.
    box.quaternion.multiply(_tempQuaternion.setFromAxisAngle(rotationAxis, -theta)).normalize();

    if (sticky) {
      const extreme = box.world.lidar.getDimensionOfPoints(pointIndices, box);

      ['x', 'z'].forEach((axis) => {
        this.translateBox(box, axis, (extreme.max[axis] + extreme.min[axis]) / 2);
        box.scale[axis] = extreme.max[axis] - extreme.min[axis];
      });
    }

    if (onBoxChanged) { onBoxChanged(box); }
  };

  this.auto_rotate_y = function (box, onBoxChanged) {
    const points = box.world.lidar.getPointsInBox(box, 2.0);

    // 1. find surounding points
    const sideIndices = [];
    const sidePoints = [];
    points.position.forEach(function (p, i) {
      if ((p[0] > box.scale.x / 2 || p[0] < -box.scale.x / 2) && (p[1] < box.scale.y / 2 && p[1] > -box.scale.y / 2)) {
        sideIndices.push(points.index[i]);
        sidePoints.push(points.position[i]);
      }
    });

    const endIndices = [];
    const endPoints = [];
    points.position.forEach(function (p, i) {
      if ((p[0] < box.scale.x / 2 && p[0] > -box.scale.x / 2) && (p[1] > box.scale.y / 2 || p[1] < -box.scale.y / 2)) {
        endIndices.push(points.index[i]);
        endPoints.push(points.position[i]);
      }
    });

    // 2. grid by 0.3 by 0.3

    // compute slope (derivative)
    // for side part (pitch/tilt), use y,z axis
    // for end part (row), use x, z axis

    // box.world.lidar.setSpecPontsColor(side_indices, {x:1,y:0,z:0});
    // box.world.lidar.setSpecPontsColor(end_indices, {x:0,y:0,z:1});
    // box.world.lidar.updatePointsColor();

    const x = endPoints.map(function (x) { return x[0]; });
    // var y = side_points.map(function(x){return x[1]});
    let z = endPoints.map(function (x) { return x[2]; });
    const zMean = z.reduce(function (x, y) { return x + y; }, 0) / z.length;
    z = z.map(function (x) { return x - zMean; });
    const theta = Math.atan2(dotproduct(x, z), dotproduct(x, x));
    console.log(theta);

    this.change_rotation_y(box, theta, false, onBoxChanged);
  };

  this.changeRotationX = function (box, theta, sticky, onBoxChanged) {
    const piontIndices = box.world.lidar.getPointIndices(box);

    // box.rotation.x += theta;
    // onBoxChanged(box);
    const _tempQuaternion = new Quaternion();
    const rotationAxis = new Vector3(1, 0, 0);
    box.quaternion.multiply(_tempQuaternion.setFromAxisAngle(rotationAxis, theta)).normalize();

    if (sticky) {
      const extreme = box.world.lidar.getDimensionOfPoints(piontIndices, box);

      ['y', 'z'].forEach((axis) => {
        this.translateBox(box, axis, (extreme.max[axis] + extreme.min[axis]) / 2);
        box.scale[axis] = extreme.max[axis] - extreme.min[axis];
      });
    }

    if (onBoxChanged) { onBoxChanged(box); }
  };

  this.auto_rotate_x = function (box, onBoxChanged) {
    console.log('x auto ratote');

    const points = box.world.lidar.getPointsInBox(box, 2.0);

    // 1. find surounding points
    const sideIndices = [];
    const sidePoints = [];
    points.position.forEach(function (p, i) {
      if ((p[0] > box.scale.x / 2 || p[0] < -box.scale.x / 2) && (p[1] < box.scale.y / 2 && p[1] > -box.scale.y / 2)) {
        sideIndices.push(points.index[i]);
        sidePoints.push(points.position[i]);
      }
    });

    const endIndices = [];
    const endPoints = [];
    points.position.forEach(function (p, i) {
      if ((p[0] < box.scale.x / 2 && p[0] > -box.scale.x / 2) && (p[1] > box.scale.y / 2 || p[1] < -box.scale.y / 2)) {
        endIndices.push(points.index[i]);
        endPoints.push(points.position[i]);
      }
    });

    // 2. grid by 0.3 by 0.3

    // compute slope (derivative)
    // for side part (pitch/tilt), use y,z axis
    // for end part (row), use x, z axis

    // box.world.lidar.setSpecPontsColor(side_indices, {x:1,y:0,z:0});
    // box.world.lidar.setSpecPontsColor(end_indices, {x:0,y:0,z:1});
    // box.world.lidar.updatePointsColor();
    // render();

    // const x = sidePoints.map(function (x) { return x[0]; });
    const y = sidePoints.map(function (x) { return x[1]; });
    let z = sidePoints.map(function (x) { return x[2]; });
    const zMean = z.reduce(function (x, y) { return x + y; }, 0) / z.length;
    z = z.map(function (x) { return x - zMean; });
    const theta = Math.atan2(dotproduct(y, z), dotproduct(y, y));
    console.log(theta);

    this.changeRotationX(box, theta, false, onBoxChanged);
  };

  this.translateBox = function (box, axis, delta) {
    const t = { x: 0, y: 0, z: 0 };

    t[axis] = delta;

    // switch (axis){
    //     case 'x':

    //         box.position.x += delta*Math.cos(box.rotation.z);
    //         box.position.y += delta*Math.sin(box.rotation.z);
    //         break;
    //     case 'y':
    //         box.position.x += delta*Math.cos(Math.PI/2 + box.rotation.z);
    //         box.position.y += delta*Math.sin(Math.PI/2 + box.rotation.z);
    //         break;
    //     case 'z':
    //         box.position.z += delta;
    //         break;

    // }

    const trans = this.translateBoxInBoxCoord(box.rotation, t);
    box.position.x += trans.x;
    box.position.y += trans.y;
    box.position.z += trans.z;
  };

  this.translateBoxInBoxCoord = function (rotation, t) {
    // euler
    const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ');

    const trans = new THREE.Vector3(t.x, t.y, t.z).applyEuler(euler);

    return trans;
  };

  this.rotate_z = function (box, theta, sticky) {
    // points indices shall be obtained before rotation.
    const pointIndices = box.world.lidar.getPointIndices(box);

    const _tempQuaternion = new Quaternion();
    const rotationAxis = new Vector3(0, 0, 1);
    box.quaternion.multiply(_tempQuaternion.setFromAxisAngle(rotationAxis, theta)).normalize();

    if (sticky) {
      const extreme = box.world.lidar.getDimensionOfPoints(pointIndices, box);

      ['x', 'y'].forEach((axis) => {
        this.translateBox(box, axis, (extreme.max[axis] + extreme.min[axis]) / 2);
        box.scale[axis] = extreme.max[axis] - extreme.min[axis];
      });
    }
  };

  this.interpolate_selected_object = function (sceneName, objTrackId, currentFrame, done) {

    // var xhr = new XMLHttpRequest();
    // // we defined the xhr

    // xhr.onreadystatechange = function () {
    //     if (this.readyState != 4)
    //         return;

    //     if (this.status == 200) {
    //         var ret = JSON.parse(this.responseText);
    //         console.log(ret);

    //         if (done)
    //             done(sceneName, ret);
    //     }

    // };

    // xhr.open('GET', "/interpolate?scene="+sceneName+"&frame="+currentFrame+"&obj_id="+objTrackId, true);
    // xhr.send();
  };

  this.highlightBox = function (box) {
    if (box) {
      box.material.color.r = 1;
      box.material.color.g = 0;
      box.material.color.b = 1;
      box.material.opacity = 1;
    }
  };

  this.unhighlightBox = function (box) {
    if (box) {
      // box.material.color = new THREE.Color(parseInt("0x"+getObjCfgByType(box.obj_type).color.slice(1)));

      // box.material.opacity = box.world.data.cfg.box_opacity;

      if (box.world && box.world.annotation) {
        box.world.annotation.color_box(box);
      }
    }
  };

  this.interpolateAsync = async function (worldList, boxList, applyIndList) {
    // if annotator is not null, it's annotated by us algorithms
    const anns = boxList.map(b => (!b || b.annotator) ? null : b.world.annotation.ann_to_vector_global(b));
    console.log(anns);
    const ret = await ml.interpolateAnnotation(anns);
    console.log(ret);

    const refObj = boxList.find(b => !!b);
    const objType = refObj.obj_type;
    const objId = refObj.obj_id;
    const objAttr = refObj.obj_attr;

    for (let i = 0; i < boxList.length; i++) {
      if (!applyIndList[i]) {
        continue;
      }

      //
      const world = worldList[i];
      const ann = world.annotation.vector_global_to_ann(ret[i]);

      // don't roate x/y
      if (!window.pointsGlobalConfig.enableAutoRotateXY) {
        ann.rotation.x = 0;
        ann.rotation.y = 0;
      }

      // if (world.lidar.getBoxPointsNumber(ann) == 0)
      // {
      //     continue;
      // }

      if (!boxList[i]) {
        // create new box
        const newBox = world.annotation.addBox(ann.position,
          ann.scale,
          ann.rotation,
          objType,
          objId,
          objAttr);
        newBox.annotator = 'i';
        world.annotation.load_box(newBox);
        world.annotation.setModified();
      } else if (boxList[i].annotator) {
        // modify box attributes
        const b = ann;

        boxList[i].position.x = b.position.x;
        boxList[i].position.y = b.position.y;
        boxList[i].position.z = b.position.z;

        boxList[i].scale.x = b.scale.x;
        boxList[i].scale.y = b.scale.y;
        boxList[i].scale.z = b.scale.z;

        boxList[i].rotation.x = b.rotation.x;
        boxList[i].rotation.y = b.rotation.y;
        boxList[i].rotation.z = b.rotation.z;

        boxList[i].annotator = 'i';

        boxList[i].world.annotation.setModified();
      }
    }
  };

  this.interpolateAndAutoAdjustAsync = async function (worldList, boxList, onFinishOneBoxCB, applyIndList, dontRotate) {
    // if annotator is not null, it's annotated by us algorithms
    const anns = boxList.map((b, i) => {
      if (!b) { return null; }

      if (b.annotator) { return null; }

      return b.world.annotation.ann_to_vector_global(b);
    });

    console.log('anns to interpolate', anns);

    const autoAdjAsync = async (index, newAnn) => {
      // let box = boxList[index];
      const world = worldList[index];

      const tempBox = world.annotation.vector_global_to_ann(newAnn);
      tempBox.world = world;

      // autoadj is timecomsuming
      // jump this step
      let rotateThis = dontRotate;
      if (!applyIndList[index]) {
        rotateThis = 'dontrotate';
      }

      const adjustedBox = await this.auto_rotate_xyz(tempBox, null, null, null, true, rotateThis);
      return world.annotation.ann_to_vector_global(adjustedBox);
    };

    const refObj = boxList.find(b => !!b);
    const objType = refObj.obj_type;
    const objId = refObj.obj_id;
    const objAttr = refObj.obj_attr;

    const onFinishOneBox = (index) => {
      console.log(`auto insert ${index} ${worldList[index].frameInfo.frame}done`);
      const i = index;

      if (!applyIndList[i]) {
        return;
      }

      if (!boxList[i]) {
        // create new box
        const world = worldList[i];
        const ann = world.annotation.vector_global_to_ann(anns[i]);

        const newBox = world.annotation.addBox(ann.position,
          ann.scale,
          ann.rotation,
          objType,
          objId,
          objAttr);
        newBox.annotator = 'a';
        world.annotation.load_box(newBox);
      } else if (boxList[i].annotator) {
        // modify box attributes
        const b = boxList[i].world.annotation.vector_global_to_ann(anns[i]);
        boxList[i].position.x = b.position.x;
        boxList[i].position.y = b.position.y;
        boxList[i].position.z = b.position.z;

        boxList[i].scale.x = b.scale.x;
        boxList[i].scale.y = b.scale.y;
        boxList[i].scale.z = b.scale.z;

        boxList[i].rotation.x = b.rotation.x;
        boxList[i].rotation.y = b.rotation.y;
        boxList[i].rotation.z = b.rotation.z;

        boxList[i].annotator = 'a';
      }

      if (onFinishOneBoxCB) { onFinishOneBoxCB(i); }
    };

    const ret = await ml.interpolateAnnotation(anns, autoAdjAsync, onFinishOneBox);
    console.log(ret);

    // for (let i = 0; i< boxList.length; i++){
    //     onFinishOneBox(i);
    // }
  };
}

export { BoxOp };
