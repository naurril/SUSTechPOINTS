import { loadjson } from './jsonrpc';

class EgoPose {
  constructor (sceneMeta, world, frameInfo) {
    this.world = world;
    this.data = this.world.data;
    this.sceneMeta = sceneMeta;
    this.goCmdReceived = false;
    this.onGoFinished = null;
  }

  preload (onPreloadFinished) {
    this.onPreloadFinished = onPreloadFinished;
    this.loadEgoPose();
  }

  loadEgoPose () {
    const path = this.world.frameInfo.get_egopose_path();
    loadjson(path).then(ret => {

      if (ret) {
        this.lidarPose = ret.lidarPose;
      }
      else {
        this.lidarPose = null;
      }

      // console.log(this.world.frameInfo.frame, "egopose", "loaded");
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

export { EgoPose };
