import * as THREE from 'three';

import { RadarManager } from './radar.js';
import { AuxLidarManager } from './aux_lidar.js';
import { Lidar } from './lidar.js';
import { Annotation } from './annotation.js';
import { EgoPose } from './ego_pose.js';
import { logger } from './log.js';
import { Calib } from './calib.js';
import { ImageRectAnnotation } from './image_rect_annotation.js';
import { FrameInfo } from './frame_info';

function Images (sceneMeta, imageType, sceneName, frame) {
  this.loaded = function () {
    for (const n in this.names) {
      if (!this.loaded_flag[this.names[n]]) { return false; }
    }

    return true;
  };

  this.names = sceneMeta[imageType]; // ["image","left","right"],
  this.loaded_flag = {};
  // this.active_name = "";
  // this.active_image = function(){
  //     return this.content[this.active_name];
  // };
  this.getImageByName = function (name) {
    return this.content[name];
  };

  // this.activate = function(name){
  //     this.active_name = name;
  // };

  this.content = {};
  this.onAllLoaded = null;

  this.load = function (onAllLoaded) {
    this.onAllLoaded = onAllLoaded;

    // if global camera not set, use first camera as default.
    // if (active_name.length > 0)
    //     this.active_name = active_name;
    // else if (this.names && this.names.length>0)
    //     this.active_name = this.names[0];

    const _self = this;

    if (this.names) {
      this.names.forEach( (cam) => {
        const img = new Image();
        img.onload =  () => {
          this.loaded_flag[cam] = true;
          this.on_image_loaded();
        };

        img.onerror =  () => {
          this.loaded_flag[cam] = true;
          this.on_image_loaded();
        };

        let src = 'data/' + sceneName + '/' + imageType + '/' + cam + '/' + frame + sceneMeta.camera_ext;
        if (window.pointsGlobalConfig.userToken) { 
          src += '?token=' + window.pointsGlobalConfig.userToken; 
        }

        img.src = src;
        this.content[cam] = img;
      });
    }
  };

  this.on_image_loaded = function () {
    if (this.loaded()) {
      this.onAllLoaded();
    }
  };

  this.deleteAll = function() {
    for (let cam in this.content) {
      this.content[cam].src = null;
      this.content[cam].onload = null;
      this.content[cam].onerror = null;
      this.content[cam] = null;
    }
  }
}

function World (data, sceneName, frame, coordinatesOffset, onPreloadFinished) {
  this.data = data;
  this.sceneMeta = this.data.getMetaBySceneName(sceneName);
  this.frameInfo = new FrameInfo(this.data, this.sceneMeta, sceneName, frame);

  this.coordinatesOffset = coordinatesOffset;

  this.toString = function () {
    return this.frameInfo.scene + ',' + this.frameInfo.frame;
  };
  // points_backup: null, //for restore from highlight

  // note the name must be same as sensortype.
  this.camera = new Images(this.sceneMeta, 'camera', sceneName, frame);
  this.aux_camera = new Images(this.sceneMeta, 'aux_camera', sceneName, frame);

  this.radars = new RadarManager(this.sceneMeta, this, this.frameInfo);
  this.lidar = new Lidar(this.sceneMeta, this, this.frameInfo);
  this.annotation = new Annotation(this.sceneMeta, this, this.frameInfo);
  this.imageRectAnnotation = new ImageRectAnnotation(this.sceneMeta, this.frameInfo);
  this.aux_lidars = new AuxLidarManager(this.sceneMeta, this, this.frameInfo);
  this.egoPose = new EgoPose(this.sceneMeta, this, this.FrameInfo);
  this.calib = new Calib(this.sceneMeta, this, this.FrameInfo);

  // todo: state of world could be put in  a variable
  // but still need mulitple flags.

  this.points_loaded = false;

  this.preloaded = function () {
    return this.lidar.preloaded &&
               this.annotation.preloaded &&
               // this.cameras.loaded() &&
               // this.auxCameras.loaded() &&
               this.aux_lidars.preloaded() &&
               this.radars.preloaded() &&
               this.egoPose.preloaded &&
               this.imageRectAnnotation.preloaded &&
               this.calib.preloaded;
  };

  this.create_time = 0;
  this.finish_time = 0;
  this.onPreloadFinished = null;

  this.on_subitem_preload_finished = function (onPreloadFinished) {
    if (this.destroyed) {
      console.log("preloaded after destroyed");
      return;
    }


    if (this.preloaded()) {
      // logger.log(`finished preloading ${this.frameInfo.scene} ${this.frameInfo.frame}`);

      this.calcTransformMatrix();

      if (this.onPreloadFinished) {
        this.onPreloadFinished(this);
      }

      if (this.active) {
        this.go();
      }
    }
  };

  this.resetCoordinateOffset = function () {
    if (!this.savedCoordinatesOffset) {
      this.savedCoordinatesOffset = coordinatesOffset;
      this.coordinatesOffset = [0, 0, 0];
    }

    if (this.preloaded()) { this.calcTransformMatrix(); }
  };

  this.restoreCoordinateOffset = function () {
    if (this.savedCoordinatesOffset) {
      this.coordinatesOffset = this.savedCoordinatesOffset;
      this.savedCoordinatesOffset = null;
    }

    if (this.preloaded()) { this.calcTransformMatrix(); }
  };

  this.calcTransformMatrix = function () {
    if (this.egoPose.egoPose) {
      const thisPose = this.egoPose.egoPose;
      const refPose = this.data.getRefEgoPose(this.frameInfo.scene, thisPose);

      // overview
      // generally we render points on utm-coordinate system.
      // since for each frame we have gps/position info which is based on utm frame.
      // wo all we need to do is rotate the lidar to appropriate angles and done.

      //
      // the azimuth ouput from novatel is clock-wise, as can be deduced from scene-000011
      //    car heading north, 0 degree
      //    car heading east,  90 degree
      //    ...
      // the novatel imu coordiante system: x goes right, y goes forward. (we use it as ego-car coordinate system)
      //
      // utm coordiante system: x axis goes east, y axis goes north.
      //
      // when ego car is heading north, the ego-car coordinate system is coincident with utm coordinate system.
      //
      const thisRot = {
        x: thisPose.pitch * Math.PI / 180.0,
        y: thisPose.roll * Math.PI / 180.0,
        z: -thisPose.azimuth * Math.PI / 180.0
      };

      const posDelta = {
        x: thisPose.x - refPose.x,
        y: thisPose.y - refPose.y,
        z: thisPose.z - refPose.z
      };

      // console.log("pose", thisPose, refPose, delta);

      // let theta = delta.rotation.z*Math.PI/180.0;

      // https://docs.novatel.com/OEM7/Content/SPAN_Operation/SPAN_Translations_Rotations.htm
      // let trans_utm_ego = eulerAngleToRotationMatrix3By3({x: refPose.pitch*Math.PI/180.0, y: refPose.roll*Math.PI/180.0, z: refPose.azimuth*Math.PI/180.0}, "ZXY");

      // this should be a calib matrix
      // let transLidarEgo = eulerAngleToRotationMatrix({x: 0, y: 0, z: Math.PI}, {x:0, y:0, z:0.4});

      const transLidarEgo = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, 0, Math.PI, 'ZXY')) // lidar y goes backward, ego/imu y goes forward.
        .setPosition(0, 0, 0.4);

      // ego pose: positionis are already in utm frame
      //           rotations are in local frame, in zxy order.
      //
      // let transEgoUtm = eulerAngleToRotationMatrix(thisRot, posDelta, "ZXY");
      const transEgoUtm = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(thisRot.x, thisRot.y, thisRot.z, 'ZXY'))
        .setPosition(posDelta.x, posDelta.y, posDelta.z);

      // ref utm to scene
      const transUtmScene = new THREE.Matrix4().identity().setPosition(this.coordinatesOffset[0], this.coordinatesOffset[1], this.coordinatesOffset[2]);
      // let offset_ego = matmul(trans_utm_ego, [delta.position.x, delta.position.y, delta.position.z], 3);
      // let offset_lidar =  matmul(trans_ego_lidar, offset_ego, 3);

      // let trans_lidar = eulerAngleToRotationMatrix({x: - delta.rotation.x*Math.PI/180.0,  y: -delta.rotation.y*Math.PI/180.0,  z: - delta.rotation.z*Math.PI/180.0},
      //         {x:offset_lidar[0], y:offset_lidar[1], z:offset_lidar[2]},
      //         "ZXY");

      // let R =  matmul2(transEgoUtm, transLidarEgo, 4);
      // let inv = [
      //         mat(R,4,0,0), mat(R,4,1,0), mat(R,4,2,0), -mat(R,4,0,3),
      //         mat(R,4,0,1), mat(R,4,1,1), mat(R,4,2,1), -mat(R,4,1,3),
      //         mat(R,4,0,2), mat(R,4,1,2), mat(R,4,2,2), -mat(R,4,2,3),
      //         0,          0,          0,          1,
      //     ];

      this.transLidarUtm = new THREE.Matrix4().multiplyMatrices(transEgoUtm, transLidarEgo);

      if (this.data.cfg.coordinateSystem === 'utm') { this.transLidarScene = new THREE.Matrix4().multiplyMatrices(transUtmScene, this.transLidarUtm); } else { this.transLidarScene = transUtmScene; } // only offset.

      this.transUtmLidar = new THREE.Matrix4().copy(this.transLidarUtm).invert();
      this.trans_scene_lidar = new THREE.Matrix4().copy(this.transLidarScene).invert();
    } else {
      const transUtmScene = new THREE.Matrix4().identity().setPosition(this.coordinatesOffset[0], this.coordinatesOffset[1], this.coordinatesOffset[2]);
      const id = new THREE.Matrix4().identity();

      this.transLidarUtm = id;
      this.transLidarScene = transUtmScene;

      this.transUtmLidar = new THREE.Matrix4().copy(this.transLidarUtm).invert();
      this.trans_scene_lidar = new THREE.Matrix4().copy(this.transLidarScene).invert();
    }

    this.webglGroup.matrix.copy(this.transLidarScene);
    this.webglGroup.matrixAutoUpdate = false;
  };

  // global scene
  this.scenePosToLidar = function (pos) {
    const tp = new THREE.Vector4(pos.x, pos.y, pos.z, 1).applyMatrix4(this.trans_scene_lidar);

    return tp;
  };

  // global scene
  this.lidarPosToScene = function (pos) {
    const tp = new THREE.Vector3(pos.x, pos.y, pos.z).applyMatrix4(this.transLidarScene);

    return tp;
  };

  // global scene
  this.lidarPosToUtm = function (pos) {
    const tp = new THREE.Vector3(pos.x, pos.y, pos.z).applyMatrix4(this.transLidarUtm);

    return tp;
  };

  this.utmPosToLidar = function (pos) {
    const tp = new THREE.Vector3(pos.x, pos.y, pos.z).applyMatrix4(this.transUtmLidar);

    return tp;
  };

  this.sceneRotToLidar = function (rotEuler) {
    if (!rotEuler.isEuler) {
      rotEuler = new THREE.Euler(rotEuler.x, rotEuler.y, rotEuler.z, 'XYZ');
    }

    const rotG = new THREE.Quaternion().setFromEuler(rotEuler);
    const GlobalToLocalRot = new THREE.Quaternion().setFromRotationMatrix(this.trans_scene_lidar);

    const retQ = rotG.multiply(GlobalToLocalRot);

    const retEuler = new THREE.Euler().setFromQuaternion(retQ, rotEuler.order);

    return retEuler;
  };

  this.lidarRotToScene = function (rotEuler) {
    if (!rotEuler.isEuler) {
      rotEuler = new THREE.Euler(rotEuler.x, rotEuler.y, rotEuler.z, 'XYZ');
    }

    const rotL = new THREE.Quaternion().setFromEuler(rotEuler);
    const localToGlobalRot = new THREE.Quaternion().setFromRotationMatrix(this.transLidarScene);

    const retQ = rotL.multiply(localToGlobalRot);

    const retEuler = new THREE.Euler().setFromQuaternion(retQ, rotEuler.order);

    return retEuler;
  };

  this.lidarRotToUtm = function (rotEuler) {
    if (!rotEuler.isEuler) {
      rotEuler = new THREE.Euler(rotEuler.x, rotEuler.y, rotEuler.z, 'XYZ');
    }

    const rotL = new THREE.Quaternion().setFromEuler(rotEuler);
    const localToGlobalRot = new THREE.Quaternion().setFromRotationMatrix(this.transLidarUtm);

    const retQ = rotL.multiply(localToGlobalRot);

    const retEuler = new THREE.Euler().setFromQuaternion(retQ, rotEuler.order);

    return retEuler;
  };

  this.utmRotToLidar = function (rotEuler) {
    if (!rotEuler.isEuler) {
      rotEuler = new THREE.Euler(rotEuler.x, rotEuler.y, rotEuler.z, 'XYZ');
    }

    const rot = new THREE.Quaternion().setFromEuler(rotEuler);
    const trans = new THREE.Quaternion().setFromRotationMatrix(this.transUtmLidar);

    const retQ = rot.multiply(trans);

    const retEuler = new THREE.Euler().setFromQuaternion(retQ, rotEuler.order);

    return retEuler;
  };

  this.preload = function (onPreloadFinished) {
    this.create_time = new Date().getTime();
    // console.log(this.create_time, sceneName, frame, "start");

    this.webglGroup = new THREE.Group();
    this.webglGroup.name = 'world';

    const preloadCallBack = () => this.on_subitem_preload_finished(onPreloadFinished);

    this.lidar.preload(preloadCallBack);
    this.annotation.preload(preloadCallBack);
    this.imageRectAnnotation.preload(preloadCallBack);
    this.radars.preload(preloadCallBack);
    this.camera.load(preloadCallBack);
    this.aux_camera.load(preloadCallBack);
    this.aux_lidars.preload(preloadCallBack);
    this.egoPose.preload(preloadCallBack);
    this.calib.preload(preloadCallBack);
  };

  this.scene = null;
  this.onFinished = null;
  this.activate = function (scene, onFinished) {
    this.scene = scene;
    this.active = true;
    console.log(this.frameInfo.frame, 'world activated.');
    this.onFinished = onFinished;
    if (this.preloaded()) {
      this.go();
    }
  };

  this.deactivate = function () {
    this.active = false;
    console.log(this.frameInfo.frame, 'world deactivated.');
  };

  this.active = false;
  this.everythingDone = false;

  this.go = function () {
    if (this.everythingDone) {
      // console.error("re-activate world?");

      // however we still call onFinished
      if (this.onFinished) {
        this.onFinished();
      }
      return;
    }

    if (this.preloaded()) {
      // this.points.material.size = data.cfg.point_size;

      if (this.destroyed) {
        console.log('go after destroyed.');
        this.unload();
        return;
      }

      this.scene.add(this.webglGroup);

      this.lidar.go(this.scene);
      this.annotation.go(this.scene);
      this.radars.go(this.scene);
      this.aux_lidars.go(this.scene);

      this.finish_time = new Date().getTime();
      console.log(`${sceneName},${frame} loaded in ${this.finish_time - this.create_time} ms`);

      // render is called in onFinished() callback
      if (this.onFinished) {
        this.onFinished();
      }

      this.everythingDone = true;
    }
  };

  this.add_line = function (start, end, color) {
    const line = this.new_line(start, end, color);
    this.scene.add(line);
  };

  this.new_line = function (start, end, color) {
    const vertex = start.concat(end);
    this.world.data.dbg.alloc('line');
    const line = new THREE.BufferGeometry();
    line.addAttribute('position', new THREE.Float32BufferAttribute(vertex, 3));

    if (!color) {
      color = 0x00ff00;
    }

    const material = new THREE.LineBasicMaterial({ color, linewidth: 1, opacity: this.data.cfg.box_opacity, transparent: true });
    return new THREE.LineSegments(line, material);
  };

  this.destroyed = false;

  // todo, Image resource to be released?

  this.unload = function () {
    if (this.everythingDone) {
      // unload all from scene, but don't destroy elements
      this.lidar.unload();
      this.radars.unload();
      this.aux_lidars.unload();
      this.annotation.unload();

      this.scene.remove(this.webglGroup);

      this.active = false;
      this.everythingDone = false;
    }
  };

  this.deleteAll = function () {
    logger.log(`delete world ${this.frameInfo.scene},${this.frameInfo.frame}`);

    if (this.everythingDone) {
      this.unload();
    }

    // todo, check if all objects are removed from webgl scene.
    if (this.destroyed) {
      console.log('destroy destroyed world!');
    }

    this.lidar.deleteAll();
    this.radars.deleteAll();
    this.aux_lidars.deleteAll();
    this.annotation.deleteAll();
    this.camera.deleteAll();
    this.aux_camera.deleteAll();
    this.destroyed = true;

    this.lidar = null;
    this.annotation = null;
    this.aux_lidars = null;
    this.radars = null;
    this.Images = null;
    
    console.log(this.frameInfo.scene, this.frameInfo.frame, 'destroyed');
    // remove me from buffer
  };

  this.preload(onPreloadFinished);
}

export { World };
