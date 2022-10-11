import { loadjson } from './jsonrpc'

class EgoPose {
  constructor (sceneMeta, world, frameInfo) {
    this.world = world
    this.data = this.world.data
    this.sceneMeta = sceneMeta
  }

  preload (onPreloadFinished) {
    this.onPreloadFinished = onPreloadFinished
    this.load_ego_pose()
  };

  load_ego_pose () {
    const path = this.world.frameInfo.get_egopose_path()
    loadjson(path).then(ret => {
      const egoPose = ret
      this.egoPose = egoPose

      // console.log(this.world.frameInfo.frame, "egopose", "loaded");
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

export { EgoPose }
