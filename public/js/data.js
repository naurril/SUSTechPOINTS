import { World } from "./world.js";
import { Debug } from "./debug.js";
import { logger } from "./log.js";

class Data {
  constructor(cfg) {
    this.cfg = cfg;
    console.log("data constructor called");
  }

  // gets the names of folders from the backend
  // a scene is in a folder
  // see get_all_scene_desc in main.py
  // below is an example of the response object sent by the backend 

  /* <-- can collapse object in vscode
    {
      ".DS_Store": null,
      "example": null,
      "example2": null,
      "example3": null,
      "example4": null
  }
  */
  async readSceneList() {
    const req = new Request("/get_all_scene_desc");
    let init = {
      method: "GET",
      //body: JSON.stringify({"points": data})
    };
    // we defined the xhr

    return fetch(req, init)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        } else {
          return response.json();
        }
      })
      .then((ret) => {
        console.log("successful request to scene desc /get_all_scene_desc");
        console.log("response is: ", ret);
        this.sceneDescList = ret;
        return ret;
      })
      .catch((reject) => {
        console.log("error read scene list!");
      });
  }

  async init() {
    await this.readSceneList();
  }

  // multiple world support
  // place world by a offset so they don't overlap
  dbg = new Debug(); // for counting the current number of memory allocations

  worldGap = 1000.0;
  worldList = [];
  MaxWorldNumber = 80;
  createWorldIndex = 0; // this index shall not repeat, so it increases permanently

  async getWorld(sceneName, frame, on_preload_finished) {
    // find in list

    if (!this.meta[sceneName]) {
      await this.readSceneMetaData(sceneName);
    }

    if (!this.meta[sceneName]) {
      logger.log("load scene failed", sceneName);
      return null;
    }

    let world = this.worldList.find((w) => {
      return w.frameInfo.scene == sceneName && w.frameInfo.frame == frame;
    });
    if (world)
      // found!
      return world;

    world = this._createWorld(sceneName, frame, on_preload_finished);

    return world;
  }

  _createWorld(sceneName, frame, on_preload_finished) {
    let [x, y, z] = this.allocateOffset();
    console.log("create world", x, y, z);
    let world = new World(
      this,
      sceneName,
      frame,
      [this.worldGap * x, this.worldGap * y, this.worldGap * z],
      on_preload_finished
    );
    world.offsetIndex = [x, y, z];
    this.createWorldIndex++;
    this.worldList.push(world);

    return world;
  }

  findWorld(sceneName, frameIndex) {
    let world = this.worldList.find((w) => {
      return (
        w.frameInfo.scene == sceneName && w.frameInfo.frame_index == frameIndex
      );
    });
    if (world)
      // found!
      return world;
    else return null;
  }

  offsetList = [[0, 0, 0]];
  lastSeedOffset = [0, 0, 0];
  offsetsAliveCount = 0;

  // called when creating a world
  allocateOffset() {
    // we need to make sure the first frame loaded in a scene
    // got to locate in [0,0,0]

    if (this.offsetsAliveCount == 0) {
      //reset offsets.
      this.offsetList = [[0, 0, 0]];
      this.lastSeedOffset = [0, 0, 0];
    }

    if (this.offsetList.length == 0) {
      let [x, y, z] = this.lastSeedOffset;

      if (x == y) {
        x = x + 1;
        y = 0;
      } else {
        y = y + 1;
      }

      this.lastSeedOffset = [x, y, 0];

      this.offsetList.push([x, y, 0]);

      if (x != 0) this.offsetList.push([-x, y, 0]);
      if (y != 0) this.offsetList.push([x, -y, 0]);
      if (x * y != 0) this.offsetList.push([-x, -y, 0]);

      if (x != y) {
        this.offsetList.push([y, x, 0]);

        if (y != 0) this.offsetList.push([-y, x, 0]);
        if (x != 0) this.offsetList.push([y, -x, 0]);
        if (x * y != 0) this.offsetList.push([-y, -x, 0]);
      }
    }

    let ret = this.offsetList.pop();
    this.offsetsAliveCount++;

    console.log({
      file: "data.js",
      function: "allocationOffset",
      offsetsAliveCount: this.offsetsAliveCount,
      offsetList: this.offsetList,
    });

    return ret;
  }

  // called when deleting a world
  returnOffset(offset) {
    this.offsetList.push(offset);
    this.offsetsAliveCount--;
  }

  deleteDistantWorlds(world) {
    // checks which worlds are "disposable" compared to the current world and deletes them
    // deletion is done by updating the offset list (returnOffset) and calling deleteAll() on the world
    let currentWorldIndex = world.frameInfo.frame_index;

    let disposable = (w) => {
      let distant =
        Math.abs(w.frameInfo.frame_index - currentWorldIndex) >
        this.MaxWorldNumber;
      let active = w.everythingDone;
      if (w.annotation.modified) {
        console.log("deleting world not saved. stop.");
      }

      return distant && !active && !w.annotation.modified;
    };

    let distantWorldList = this.worldList.filter((w) => disposable(w));

    distantWorldList.forEach((w) => {
      this.returnOffset(w.offsetIndex);
      w.deleteAll();
    });

    this.worldList = this.worldList.filter((w) => !disposable(w));
  }

  deleteOtherWorldsExcept = function (keepScene) {
    // deletes all worlds except the one which has the scene as "keepScene"
    // release resources if scene changed
    this.worldList.forEach((w) => {
      if (w.frameInfo.scene != keepScene) {
        this.returnOffset(w.offsetIndex);
        w.deleteAll();

        this.removeRefEgoPoseOfScene(w.frameInfo.scene);
      }
    });
    this.worldList = this.worldList.filter(
      (w) => w.frameInfo.scene == keepScene
    );
  };

  refEgoPose = {};
  getRefEgoPose(sceneName, currentPose) {
    if (this.refEgoPose[sceneName]) {
      return this.refEgoPose[sceneName];
    } else {
      this.refEgoPose[sceneName] = currentPose;
      return currentPose;
    }
  }

  removeRefEgoPoseOfScene(sceneName) {
    if (this.refEgoPose[sceneName]) delete this.refEgoPose[sceneName];
  }

  // preloads a couple of scenes starting from the currentWorld
  forcePreloadScene(sceneName, currentWorld) {
    //this.deleteOtherWorldsExcept(sceneName);
    let meta = currentWorld.sceneMeta;

    let currentWorldIndex = currentWorld.frameInfo.frame_index;
    let startIndex = Math.max(0, currentWorldIndex - this.MaxWorldNumber / 2);
    let endIndex = Math.min(
      meta.frames.length,
      startIndex + this.MaxWorldNumber
    );

    this._doPreload(sceneName, startIndex, endIndex);

    logger.log(`${endIndex - startIndex} frames created`);
  }

  // calls force preload scene
  preloadScene(sceneName, currentWorld) {
    // clean other scenes.
    this.deleteOtherWorldsExcept(sceneName);
    this.deleteDistantWorlds(currentWorld);

    if (!this.cfg.enablePreload) return;

    this.forcePreloadScene(sceneName, currentWorld);
  }

  // checks which worlds need to be created, and does it
  _doPreload(sceneName, startIndex, endIndex) {
    let meta = this.getMetaBySceneName(sceneName);

    let numLoaded = 0;
    let _need_create = (frame) => {
      let world = this.worldList.find((w) => {
        return w.frameInfo.scene == sceneName && w.frameInfo.frame == frame;
      });

      return !world;
    };

    let _do_create = (frame) => {
      this._createWorld(sceneName, frame);
      numLoaded++;
    };

    let pendingFrames = meta.frames
      .slice(startIndex, endIndex)
      .filter(_need_create);

    logger.log(`preload ${meta.scene} ${pendingFrames}`);
    // if (numLoaded > 0){
    //     meta.frames.slice(endIndex, Math.min(endIndex+5, meta.frames.length)).forEach(_do_create);
    //     meta.frames.slice(Math.max(0, startIndex-5), startIndex).forEach(_do_create);
    // }

    pendingFrames.forEach(_do_create);
  }

  reloadAllAnnotation = function (done) {
    this.worldList.forEach((w) => w.reloadAnnotation(done));
  };

  onAnnotationUpdatedByOthers(scene, frames) {
    frames.forEach((f) => {
      let world = this.worldList.find(
        (w) => w.frameInfo.scene == scene && w.frameInfo.frame == f
      );
      if (world) world.annotation.reloadAnnotation();
    });
  }

  webglScene = null;
  set_webglScene = function (scene, mainScene) {
    this.webglScene = scene;
    this.webglMainScene = mainScene;
  };

  scale_point_size(v) {
    this.cfg.point_size *= v;
    // if (this.world){
    //     this.world.lidar.set_point_size(this.cfg.point_size);
    // }

    this.worldList.forEach((w) => {
      w.lidar.set_point_size(this.cfg.point_size);
    });
  }

  scale_point_brightness(v) {
    this.cfg.point_brightness *= v;

    // if (this.world){
    //     this.world.lidar.recolor_all_points();
    // }

    this.worldList.forEach((w) => {
      w.lidar.recolor_all_points();
    });
  }

  set_box_opacity(opacity) {
    this.cfg.box_opacity = opacity;

    this.worldList.forEach((w) => {
      w.annotation.set_box_opacity(this.cfg.box_opacity);
    });
  }

  toggle_background() {
    this.cfg.show_background = !this.cfg.show_background;

    if (this.cfg.show_background) {
      this.world.lidar.cancel_highlight();
    } else {
      this.world.lidar.hide_background();
    }
  }

  set_obj_color_scheme(scheme) {
    pointsGlobalConfig.color_obj = scheme;

    // if (pointsGlobalConfig.color_obj != "no"){
    //     this.world.lidar.color_points();
    // } else {
    //     this.world.lidar.set_points_color({
    //         x: this.cfg.point_brightness,
    //         y: this.cfg.point_brightness,
    //         z: this.cfg.point_brightness,
    //     });
    // }

    // this.world.lidar.update_points_color();
    // this.world.annotation.color_boxes();

    // toto: move to world
    this.worldList.forEach((w) => {
      if (pointsGlobalConfig.color_obj == "no") {
        w.lidar.color_points();
      } else {
        w.lidar.color_objects();
      }

      w.lidar.update_points_color();

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

  world = null;

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

  activate_world = function (world, on_finished, dontDestroyOldWorld) {
    if (dontDestroyOldWorld) {
      world.activate(this.webglScene, null, on_finished);
    } else {
      var old_world = this.world; // current world, should we get current world later?
      this.world = world; // swich when everything is ready. otherwise data.world is half-baked, causing mysterious problems.

      world.activate(
        this.webglMainScene,
        function () {
          if (old_world) old_world.unload();
        },
        on_finished
      );
    }
  };

  meta = {}; //meta data

  getMetaBySceneName = (sceneName) => {
    return this.meta[sceneName];
  };

  get_current_world_scene_meta() {
    return this.getMetaBySceneName(this.world.frameInfo.scene);
  }

  // can refer in main.py and scene_reader.py
  // a scene is a folder in the data folder
  // a frame is a lidar file in the scene/lidar directory
  // the backend trys to read all directories and subdirectories (calib/camera, calib/radar, etc)
  // there are other directories like radar, aux_lidar which are not given in the example data
  // there is an ego_pose directory which is commented out, maybe that means ref_ego_pose is no longer used
  // but I'm not sure yet
  // this doesn't seem to get the labels for the frames
  // below is the response object from the backend, after reading the example folder
  // as we can see (refer to the backend code), this supports only a single lidar extension (.pcd, .las, etc)

  /* <--- can collapse the object in vscode
  {
    "file": "editor.js",
    "function": "this.scene_changed",
    "message": "meta is the following object",
    "meta": {
        "scene": "example",
        "frames": [
            "000950",
            "000965",
            "000970",
            "000975"
        ],
        "lidar_ext": ".pcd",
        "camera_ext": ".jpg",
        "radar_ext": ".pcd",
        "aux_lidar_ext": ".pcd",
        "boxtype": "psr",
        "camera": [
            "right",
            "left",
            "front"
        ],
        "calib": {
            "camera": {
                "front": {
                    "extrinsic": [
                        -0.9994466143126584,
                        0.033033376071303994,
                        -0.003906559137689193,
                        0.20487898588180542,
                        0.0025198193977806005,
                        -0.0419178508124942,
                        -0.9991178830816032,
                        0.0013696063542738557,
                        -0.033167991334523576,
                        -0.9985748293686324,
                        0.04181141593201179,
                        -0.10943480581045151,
                        0,
                        0,
                        0,
                        1
                    ],
                    "intrinsic": [
                        1210.062981,
                        0,
                        1022.429903,
                        0,
                        1205.850714,
                        792.541644,
                        0,
                        0,
                        1
                    ]
                },
                "left": {
                    "extrinsic_ok": [
                        0.000795916642330613,
                        -0.9994847331424607,
                        0.03208792189972302,
                        -0.5,
                        0.05182623470216488,
                        -0.03200358149726322,
                        -0.9981431821977967,
                        0.0013696063542738557,
                        0.998655800520527,
                        0.002457434941619845,
                        0.05177405817794394,
                        -0.10943480581045151,
                        0,
                        0,
                        0,
                        1
                    ],
                    "extrinsic": [
                        -0.03938450368827373,
                        -0.9972116065404,
                        0.06338669142921338,
                        0.12484878301620483,
                        0.05021894746218786,
                        -0.06533114111429145,
                        -0.9965991668251053,
                        -0.1844022274017334,
                        0.9979613811090176,
                        -0.036067350634868045,
                        0.05265195184571092,
                        -0.39436036348342896,
                        0,
                        0,
                        0,
                        1
                    ],
                    "intrinsic": [
                        1210.062981,
                        0,
                        1022.429903,
                        0,
                        1205.850714,
                        792.541644,
                        0,
                        0,
                        1
                    ]
                },
                "right": {
                    "extrinsic": [
                        0.03564000242115317,
                        0.9978643295462211,
                        -0.05474093574913458,
                        0.10951525717973709,
                        -0.009726211086240999,
                        -0.054426799113952706,
                        -0.998470392328243,
                        -0.003179325256496668,
                        -0.9993173625257024,
                        0.03611790909618268,
                        0.007765667852400182,
                        -0.39152929186820984,
                        0,
                        0,
                        0,
                        1
                    ],
                    "intrinsic": [
                        1210.062981,
                        0,
                        1022.429903,
                        0,
                        1205.850714,
                        792.541644,
                        0,
                        0,
                        1
                    ]
                }
            }
        }
    }
}
*/
  readSceneMetaData(sceneName) {
    let self = this;
    return new Promise(function (resolve, reject) {
      let xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;

        if (this.status == 200) {
          let sceneMeta = JSON.parse(this.responseText);
          self.meta[sceneName] = sceneMeta; // sets the metadata for the given scene (folder) in the meta object of "this"
          resolve(sceneMeta);
        }
      };

      xhr.open("GET", `/scenemeta?scene=${sceneName}`, true);
      xhr.send();
    });
  }
}

export { Data };
