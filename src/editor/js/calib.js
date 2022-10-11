
import * as THREE from 'three'
import { jsonrpc } from './jsonrpc.js'
import { matmul2 } from './util.js'

class Calib {
  constructor (sceneMeta, world, frameInfo) {
    this.world = world
    this.data = this.world.data
    this.sceneMeta = sceneMeta
  }

  preload (onPreloadFinished) {
    this.onPreloadFinished = onPreloadFinished
    this.load()
  };

  getDefaultExtrinicCalib (sensorType, sensorName) {
    if (this.world.sceneMeta.calib[sensorType] && this.world.sceneMeta.calib[sensorType][sensorName]) {
      const default_calib = this.world.sceneMeta.calib[sensorType][sensorName]

      if (default_calib.extrinsic) { return default_calib.extrinsic }

      if (default_calib.lidar_to_camera) { return default_calib.lidar_to_camera }

      if (default_calib.camera_to_lidar) {
        const ret = []
        const m = new THREE.Matrix4().set(...default_calib.camera_to_lidar)
        m.toArray(ret, 0)
        console.log(ret)

        // m.invert();
        // m.toArray(ret,0);
        // console.log(ret);
        return ret
      }
    }

    return null
  }

  getExtrinsicCalib (sensorType, sensorName) {
    const default_extrinsic = this.getDefaultExtrinicCalib(sensorType, sensorName)

    if (this.calib && this.calib[sensorType] && this.calib[sensorType][sensorName]) {
      const frame_calib = this.calib[sensorType][sensorName]

      if (frame_calib.extrinsic) { return frame_calib.extrinsic }

      if (frame_calib.lidar_to_camera) { return frame_calib.lidar_to_camera }

      if (frame_calib.camera_to_lidar) {
        const ret = []
        new THREE.Matrix4().set(...frame_calib.camera_to_lidar).invert().toArray(ret, 0)
        return ret
      }

      if (frame_calib.lidar_transform && default_extrinsic) { return matmul2(default_extrinsic, frame_calib.lidar_transform, 4) }
    }

    return default_extrinsic
  }

  getIntrinsicCalib (sensorType, sensorName) {
    if (this.calib && this.calib[sensorType] && this.calib[sensorType][sensorName]) {
      const frame_calib = this.calib[sensorType][sensorName]

      if (frame_calib.intrinsic) { return frame_calib.intrinsic }
    }

    if (this.world.sceneMeta.calib[sensorType] && this.world.sceneMeta.calib[sensorType][sensorName]) { return this.world.sceneMeta.calib[sensorType][sensorName].intrinsic }

    return null
  }

  getCalib (sensorType, sensorName) {
    const extrinsic = this.getExtrinsicCalib(sensorType, sensorName)
    const intrinsic = this.getIntrinsicCalib(sensorType, sensorName)

    return { extrinsic, intrinsic }
  }

  load () {
    jsonrpc('/api/load_calib' + '?scene=' + this.world.frameInfo.scene + '&frame=' + this.world.frameInfo.frame).then(ret => {
      this.calib = ret

      // console.log(this.world.frameInfo.frame, "calib", "loaded");
      this.preloaded = true

      if (this.onPreloadFinished) {
        this.onPreloadFinished()
      }
      if (this.goCmdReceived) {
        this.go(this.webglScene, this.onGoFinished)
      }
    })
  };

  goCmdReceived = false
  onGoFinished = null

  go (webglScene, onGoFinished) {
    if (this.preloaded) {
      if (onGoFinished) { onGoFinished() }
    } else {
      this.goCmdReceived = true
      this.onGoFinished = onGoFinished
    }
  };

  unload () {

  };
}

export { Calib }
