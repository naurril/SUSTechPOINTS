
import * as THREE from 'three';
import { jsonrpc } from './jsonrpc.js';
import { matmul2 } from './util.js';

class Calib {
  constructor (sceneMeta, world, frameInfo) {
    this.world = world;
    this.data = this.world.data;
    this.sceneMeta = sceneMeta;

    this.goCmdReceived = false;
    this.onGoFinished = null;
  }

  preload (onPreloadFinished) {
    this.onPreloadFinished = onPreloadFinished;
    this.load();
  }

  getDefaultExtrinicCalib (sensorType, sensorName) {
    if (this.world.sceneMeta.calib[sensorType] && this.world.sceneMeta.calib[sensorType][sensorName]) {
      const defaultCalib = this.world.sceneMeta.calib[sensorType][sensorName];

      if (defaultCalib.extrinsic) { return defaultCalib.extrinsic; }

      if (defaultCalib.lidar_to_camera) { return defaultCalib.lidar_to_camera; }

      if (defaultCalib.camera_to_lidar) {
        const ret = [];
        const m = new THREE.Matrix4().set(...defaultCalib.camera_to_lidar);
        m.toArray(ret, 0);
        console.log(ret);

        // m.invert();
        // m.toArray(ret,0);
        // console.log(ret);
        return ret;
      }
    }

    return null;
  }

  getExtrinsicCalib (sensorType, sensorName) {
    const defaultExtrinsic = this.getDefaultExtrinicCalib(sensorType, sensorName);

    if (this.calib && this.calib[sensorType] && this.calib[sensorType][sensorName]) {
      const frameCalib = this.calib[sensorType][sensorName];

      if (frameCalib.extrinsic) { return frameCalib.extrinsic; }

      if (frameCalib.lidar_to_camera) { return frameCalib.lidar_to_camera; }

      if (frameCalib.camera_to_lidar) {
        const ret = [];
        new THREE.Matrix4().set(...frameCalib.camera_to_lidar).invert().toArray(ret, 0);
        return ret;
      }

      if (frameCalib.lidar_transform && defaultExtrinsic) { return matmul2(defaultExtrinsic, frameCalib.lidar_transform, 4); }
    }

    return defaultExtrinsic;
  }

  getIntrinsicCalib (sensorType, sensorName) {
    if (this.calib && this.calib[sensorType] && this.calib[sensorType][sensorName]) {
      const frameCalib = this.calib[sensorType][sensorName];

      if (frameCalib.intrinsic) { return frameCalib.intrinsic; }
    }

    if (this.world.sceneMeta.calib[sensorType] && this.world.sceneMeta.calib[sensorType][sensorName]) { return this.world.sceneMeta.calib[sensorType][sensorName].intrinsic; }

    return null;
  }

  getCalib (sensorType, sensorName) {
    const extrinsic = this.getExtrinsicCalib(sensorType, sensorName);
    const intrinsic = this.getIntrinsicCalib(sensorType, sensorName);

    return { extrinsic, intrinsic };
  }

  load () {
    jsonrpc('/api/load_calib?scene=' + this.world.frameInfo.scene + '&frame=' + this.world.frameInfo.frame)
      .then(ret => {
      this.calib = ret;

      // console.log(this.world.frameInfo.frame, "calib", "loaded");
      this.preloaded = true;

      if (this.onPreloadFinished) {
        this.onPreloadFinished();
      }
      if (this.goCmdReceived) {
        this.go(this.webglScene, this.onGoFinished);
      }
    });
  }

  go (webglScene, onGoFinished) {
    if (this.preloaded) {
      if (onGoFinished) { onGoFinished(); }
    } else {
      this.goCmdReceived = true;
      this.onGoFinished = onGoFinished;
    }
  }

  unload () {

  }
}

export { Calib };
