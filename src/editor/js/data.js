
import { World } from './world.js';
import { Debug } from './debug.js';
import { logger } from './log.js';
import { jsonrpc } from './jsonrpc.js';

class Data {
  constructor (cfg) {
    this.cfg = cfg;

    this.dbg = new Debug();

    this.worldGap = 1000.0;
    this.worldList = [];

    this.createWorldIndex = 0; // this index shall not repeat, so it increases permanently
    this.offsetList = [[0, 1, 0]];
    this.lastSeedOffset = [0, 1, 0];
    this.offsetsAliveCount = 0;
    this.refEgoPose = {};
    this.webglScene = null;
    this.world = null;
    this.meta = {}; // meta data
  }

  async readSceneList () {
    return jsonrpc('/api/get_all_scene_desc').then(ret => {
      console.log(ret);
      return ret;
    })
      .catch(reject => {
        console.log('error read scene list!');
      });
  }

  init () {
    // this.sceneDescList = this.readSceneList();
  }

  // multiple world support
  // place world by a offset so they don't overlap

  async getWorld (sceneName, frame, onPreloadFinished) {
    // find in list

    if (!this.meta[sceneName]) {
      await this.readSceneMetaData(sceneName);
    }

    if (!this.meta[sceneName]) {
      logger.log('load scene failed', sceneName);
      return null;
    }

    let world = this.worldList.find((w) => {
      return w.frameInfo.scene === sceneName && w.frameInfo.frame === frame;
    });

    if (world) { // found!
      return world;
    }

    world = this._createWorld(sceneName, frame, onPreloadFinished);

    return world;
  }

  _createWorld (sceneName, frame, onPreloadFinished) {
    const [x, y, z] = this.allocateOffset();
    console.log('create world', x, y, z);
    const world = new World(this, sceneName, frame, [this.worldGap * x, this.worldGap * y, this.worldGap * z], onPreloadFinished);

    this.activateWorld(world, null, false);

    world.offsetIndex = [x, y, z];
    this.createWorldIndex++;
    this.worldList.push(world);

    return world;
  }

  findWorld (sceneName, frameIndex) {
    const world = this.worldList.find((w) => {
      return w.frameInfo.scene === sceneName && w.frameInfo.frameIndex === frameIndex;
    });

    if (world) { // found!
      return world;
    } else {
      return null;
    }
  }

  allocateOffset () {
    // we need to make sure the first frame loaded in a scene
    // got to locate in [0,0,0]

    if (this.offsetsAliveCount === 0) {
      // reset offsets.
      this.offsetList = [[0, 1, 0]];
      this.lastSeedOffset = [0, 1, 0];
    }

    if (this.offsetList.length === 0) {
      let [x, y] = this.lastSeedOffset;

      if (x === y) {
        x = x + 1;
        y = 0;
      } else {
        y = y + 1;
      }

      this.lastSeedOffset = [x, y, 0];

      this.offsetList.push([x, y, 0]);

      if (x !== 0) this.offsetList.push([-x, y, 0]);
      if (y !== 0) this.offsetList.push([x, -y, 0]);
      if (x * y !== 0) this.offsetList.push([-x, -y, 0]);

      if (x !== y) {
        this.offsetList.push([y, x, 0]);

        if (y !== 0) this.offsetList.push([-y, x, 0]);
        if (x !== 0) this.offsetList.push([y, -x, 0]);
        if (x * y !== 0) this.offsetList.push([-y, -x, 0]);
      }
    }

    const ret = this.offsetList.pop();
    this.offsetsAliveCount++;

    return ret;
  }

  returnOffset (offset) {
    this.offsetList.push(offset);
    this.offsetsAliveCount--;
  }

  deleteDistantWorlds (world) {
    const currentWorldIndex = world.frameInfo.frameIndex;

    const disposable = (w) => {
      const distant = Math.abs(w.frameInfo.frameIndex - currentWorldIndex) > this.cfg.maxWorldNumber;
      // let active  = w.everythingDone;
      if (w.annotation.modified) {
        console.log('deleting world unsaved yet. stop.');
      }

      return distant; // && !w.active && !w.annotation.modified;
    };

    const distantWorldList = this.worldList.filter(w => (disposable(w) && (w !=this.world)));

    distantWorldList.forEach(w => {
      this.returnOffset(w.offsetIndex);
      w.deleteAll();
    });

    this.worldList = this.worldList.filter(w => !disposable(w));
  }


  deleteWorld(world){
      this.worldList = this.worldList.filter(w => w!== world);
      this.returnOffset(world.offsetIndex);
      world.deleteAll();    
  }

  deleteOtherWorldsExcept (keepScene) {
    // release resources if scene changed
    this.worldList.forEach(w => {
      if (w.frameInfo.scene !== keepScene) {
        // if (!w.active)
        this.returnOffset(w.offsetIndex);
        w.deleteAll();

        this.removeRefEgoPoseOfScene(w.frameInfo.scene);
      }
    });
    this.worldList = this.worldList.filter(w => w.frameInfo.scene === keepScene);
  }

  getRefEgoPose (sceneName, currentPose) {
    if (this.refEgoPose[sceneName]) {
      return this.refEgoPose[sceneName];
    } else {
      this.refEgoPose[sceneName] = currentPose;
      return currentPose;
    }
  }

  removeRefEgoPoseOfScene (sceneName) {
    if (this.refEgoPose[sceneName]) { delete this.refEgoPose[sceneName]; }
  }

  forcePreloadScene (sceneName, currentWorld) {
    // this.deleteOtherWorldsExcept(sceneName);
    const meta = currentWorld.sceneMeta;

    const currentWorldIndex = currentWorld.frameInfo.frameIndex;
    const startIndex = Math.max(0, currentWorldIndex - this.cfg.maxWorldNumber / 2);
    const endIndex = Math.min(meta.frames.length, startIndex + this.cfg.maxWorldNumber);

    this._doPreload(sceneName, startIndex, endIndex);
  }

  preloadScene (sceneName, currentWorld) {
    // clean other scenes.

    if (!this.cfg.enablePreload) { return; }

    this.forcePreloadScene(sceneName, currentWorld);
  }

  _doPreload (sceneName, startIndex, endIndex) {
    const meta = this.getMetaBySceneName(sceneName);

    const needCreate = (frame) => {
      const world = this.worldList.find((w) => {
        return w.frameInfo.scene === sceneName && w.frameInfo.frame === frame;
      });

      return !world;
    };

    const doCreate = (frame) => {
      this._createWorld(sceneName, frame);
    };

    const pendingFrames = meta.frames.slice(startIndex, endIndex).filter(needCreate);

    pendingFrames.forEach(doCreate);

    console.log(pendingFrames.length + ' world created.');
  }

  reloadAllAnnotation (done) {
    this.worldList.forEach(w => w.reloadAnnotation(done));
  }

  onAnnotationUpdatedByOthers (scene, frames) {
    frames.forEach(f => {
      const world = this.worldList.find(w => (w.frameInfo.scene === scene && w.frameInfo.frame === f));
      if (world) { world.annotation.reloadAnnotation(); }
    });
  }

  setWebglScene (scene) {
    this.webglScene = scene;
  }

  scalePointSize (v) {
    this.cfg.point_size *= v;
    // if (this.world){
    //     this.world.lidar.setPointSize(this.cfg.point_size);
    // }

    this.worldList.forEach(w => {
      w.lidar.setPointSize(this.cfg.point_size);
    });
  }

  scalePointBrightness (v) {
    this.cfg.pointBrightness *= v;

    // if (this.world){
    //     this.world.lidar.recolorAllPoints();
    // }

    this.worldList.forEach(w => {
      w.lidar.recolorAllPoints();
    });
  }

  setBoxOpacity (opacity) {
    this.cfg.box_opacity = opacity;

    this.worldList.forEach(w => {
      w.annotation.setBoxOpacity(this.cfg.box_opacity);
    });
  }

  toggleBackground () {
    this.cfg.show_background = !this.cfg.show_background;

    if (this.cfg.show_background) {
      this.world.lidar.cancelHightlight();
    } else {
      this.world.lidar.hideBackground();
    }
  }

  setObjColorScheme (scheme) {
    window.pointsGlobalConfig.colorObject = scheme;

    // if (window.pointsGlobalConfig.colorObject !== "no"){
    //     this.world.lidar.color_points();
    // } else {
    //     this.world.lidar.set_points_color({
    //         x: this.cfg.point_brightness,
    //         y: this.cfg.point_brightness,
    //         z: this.cfg.point_brightness,
    //     });
    // }

    // this.world.lidar.updatePointsColor();
    // this.world.annotation.color_boxes();

    // toto: move to world
    this.worldList.forEach(w => {
      if (window.pointsGlobalConfig.colorObject === 'no') {
        w.lidar.colorPoints();
      } else {
        w.lidar.colorObjects();
      }

      w.lidar.updatePointsColor();

      w.annotation.color_boxes();
    });
  }

  // active_camera_name = "";

  // // return null means not changed.
  // set_active_image(name){
  //     if (name === this.active_camera_name){
  //         return null;
  //     }

  //     this.active_camera_name = name;
  //     if (this.world){
  //         this.world.cameras.activate(name);
  //     }
  //     this.worldList.forEach(w=>w.cameras.activate(name));

  //     return name;
  // };

  // this.future_world_buffer = [];
  // this.put_world_into_buffer= function(world){
  //     this.future_world_buffer.push(world);
  // };

  // this.reset_world_buffer= function(){
  //     this.future_world_buffer=[];
  // };

  // this.activateMultiWorld=function(world, on_finished){
  //     world.activate(this.webglScene,
  //         null,  //don't destroy old world
  //         on_finished);
  //     this.worldList.push(world);
  // };

  activateWorld (world, onFinished, show) {
    if (show) {
      this.world = world;
    }
    
    this.deleteOtherWorldsExcept(world.frameInfo.scene);
    this.deleteDistantWorlds(world);
    
    world.activate(this.webglScene, onFinished);
  }

  getMetaBySceneName (sceneName) {
    return this.meta[sceneName];
  }

  getCurrentWorldSceneMeta () {
    return this.getMetaBySceneName(this.world.frameInfo.scene);
  }

  readSceneMetaData (sceneName) {
    return jsonrpc(`/api/scenemeta?scene=${sceneName}`).then(ret => {
      this.meta[sceneName] = ret;
      return ret;
    });
  }
}

export { Data };
