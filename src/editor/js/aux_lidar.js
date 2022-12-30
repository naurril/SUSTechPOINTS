import * as THREE from 'three';
import { loadfile } from './jsonrpc.js';
// import { PCDLoader } from './lib/PCDLoader.js'
import { pointcloudReader } from './lib/pointcloud_reader.js';
import { eulerAngleToRotationMatrix3By3, matmul } from './util.js';

// todo: clean arrows

class AuxLidar {
  constructor (sceneMeta, world, frameInfo, auxLidarName) {
    this.world = world;
    this.frameInfo = frameInfo;
    this.name = auxLidarName;
    this.sceneMeta = sceneMeta;
    this.coordinatesOffset = world.coordinatesOffset;

    this.showPointsOnly = true;
    this.showCalibBox = false;
    // this.cssStyleSelector = this.sceneMeta.calib.aux_lidar[this.name].cssstyleselector;
    this.color = this.sceneMeta.calib.aux_lidar[this.name].color;

    if (!this.color) {
      this.color = [
        this.world.data.cfg.pointBrightness,
        this.world.data.cfg.pointBrightness,
        this.world.data.cfg.pointBrightness
      ];
    }

    this.lidar_points = null; // read from file, centered at 0
    this.elements = null; // geometry points

    this.preloaded = false;
    this.loaded = false;

    this.goCmdReceived = false;
    this.webglScene = null;
    this.onGoFinished = null;
  }

  go (webglScene, onGoFinished) {
    this.webglScene = webglScene;

    if (this.preloaded) {
      if (this.elements) {
        this.webglGroup.add(this.elements.points);

        if (this.showCalibBox) { this.webglGroup.add(this.calib_box); }
      }

      this.loaded = true;
      if (onGoFinished) { onGoFinished(); }
    }

    // anyway we save go cmd
    // {
    this.goCmdReceived = true;
    this.onGoFinished = onGoFinished;
    // }
  }

  showCalibBox () {
    this.showCalibBox = true;
    this.webglGroup.add(this.calib_box);
  }

  hideCalibBox () {
    this.showCalibBox = false;
    this.webglGroup.remove(this.calib_box);
  }

  getUnoffsetLidarPoints () {
    if (this.elements) {
      const pts = this.elements.points.geometry.getAttribute('position').array;
      return pts.map((p, i) => p - this.world.coordinatesOffset[i % 3]);
    } else {
      return [];
    }
  }

  // todo: what if it's not preloaded yet
  unload (deepBox) {
    if (this.elements) {
      this.webglGroup.remove(this.elements.points);
      if (!this.showPointsOnly) { this.elements.arrows.forEach(a => this.webglGroup.remove(a)); }

      if (!deepBox) { this.webglGroup.remove(this.calib_box); }
    }
    this.loaded = false;
  }

  // todo: its possible to remove points before preloading,
  deleteAll (deepBox) {
    if (this.loaded) {
      this.unload();
    }

    if (this.elements) {
      // this.scene.remove(this.points);

      if (this.elements.points) {
        this.world.data.dbg.free();
        this.elements.points.geometry.dispose();
        this.elements.points.material.dispose();
      }

      if (this.elements.arrows) {
        this.elements.arrows.forEach(a => {
          this.world.data.dbg.free();
          a.geometry.dispose();
          a.material.dispose();
        });
      }

      this.elements = null;
    }

    if (!deepBox && this.calib_box) {
      this.world.data.dbg.free();
      this.calib_box.geometry.dispose();
      this.calib_box.material.dispose();
      this.calib_box = null;
    }

    this.destroyed = true;
  }

  filterPoints (position) {
    const filteredPosition = [];

    if (window.pointsGlobalConfig.enableFilterPoints) {
      for (let i = 0; i <= position.length; i += 3) {
        if (position[i + 2] <= window.pointsGlobalConfig.filterPointsZ) {
          filteredPosition.push(position[i]);
          filteredPosition.push(position[i + 1]);
          filteredPosition.push(position[i + 2]);
        }
      }
    }

    return filteredPosition;
  }

  calcTransformMatrix () {
    const translate = this.sceneMeta.calib.aux_lidar[this.name].translation;
    const rotation = this.sceneMeta.calib.aux_lidar[this.name].rotation;

    const m = new THREE.Matrix4();
    m.makeRotationFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
    m.setPosition(translate[0], translate[1], translate[2]);

    this.webglGroup.matrix.copy(m);
    this.webglGroup.matrixAutoUpdate = false;
  }

  processPcd (pcd) {
    if (this.destroyed) {
      console.error('received aux_lidar after destroyed.');
      return;
    }

    const position = pcd.position;

    // this.points_parse_time = new Date().getTime();
    // console.log(this.points_load_time, this.frameInfo.scene, this.frameInfo.frame, "parse pionts ", this.points_parse_time - this.create_time, "ms");
    this.lidar_points = position;

    // add one box to calibrate lidar with lidar
    this.calib_box = this.createCalibBox();

    // install callback for box changing
    this.calib_box.onBoxChanged = () => {
      this.moveLidar(this.calib_box);
    };

    // position = this.transformPointsByOffset(position);
    // position = this.movePoints(this.calib_box);

    const elements = this.buildGeometry(position);
    this.elements = elements;

    this.webglGroup = new THREE.Group();
    this.webglGroup.name = 'aux_lidar-' + this.name;
    this.world.webglGroup.add(this.webglGroup);
    this.calcTransformMatrix();

    // this.points_backup = mesh;

    this._afterPreload();
  }

  preload (onPreloadFinished) {
    this.onPreloadFinished = onPreloadFinished;

    const url = this.frameInfo.get_aux_lidar_path(this.name);

    const [rsp, concel] = loadfile(url);
    rsp.then(buffer => {
      if (this.destroyed) {
        console.error('received pcd after world been destroyed.');
        return;
      }

      const pcd = pointcloudReader.parse(buffer, url);
      this.processPcd(pcd);
    });
  }

  // internal funcs below
  _afterPreload () {
    this.preloaded = true;
    console.log(`lidar ${this.auxLidarName} preloaded`);
    if (this.onPreloadFinished) {
      this.onPreloadFinished();
    }
    if (this.goCmdReceived) {
      this.go(this.webglScene, this.onGoFinished);
    }
  }

  createCalibBox () {
    if (this.sceneMeta.calib.aux_lidar && this.sceneMeta.calib.aux_lidar[this.name]) {
      return this.world.annotation.createCuboid(
        {
          x: this.sceneMeta.calib.aux_lidar[this.name].translation[0] + this.coordinatesOffset[0],
          y: this.sceneMeta.calib.aux_lidar[this.name].translation[1] + this.coordinatesOffset[1],
          z: this.sceneMeta.calib.aux_lidar[this.name].translation[2] + this.coordinatesOffset[2]
        },
        { x: 0.5, y: 0.5, z: 0.5 },
        {
          x: this.sceneMeta.calib.aux_lidar[this.name].rotation[0],
          y: this.sceneMeta.calib.aux_lidar[this.name].rotation[1],
          z: this.sceneMeta.calib.aux_lidar[this.name].rotation[2]
        },
        'lidar',
        this.name);
    } else {
      return this.world.annotation.createCuboid(
        {
          x: this.coordinatesOffset[0],
          y: this.coordinatesOffset[1],
          z: this.coordinatesOffset[2]
        },
        { x: 0.5, y: 0.5, z: 0.5 },
        { x: 0, y: 0, z: 0 },
        'lidar',
        this.name);
    }
  }

  buildPoints (position) {
    // build geometry
    this.world.data.dbg.alloc('aux lidar');
    const geometry = new THREE.BufferGeometry();
    if (position.length > 0) { geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); }

    const pointColor = this.color;
    const color = [];
    for (let i = 0; i < position.length; i += 3) {
      color.push(pointColor[0]);
      color.push(pointColor[1]);
      color.push(pointColor[2]);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));

    geometry.computeBoundingSphere();

    // build material
    let pointSize = this.sceneMeta.calib.aux_lidar[this.name].point_size;
    if (!pointSize) { pointSize = 1; }

    const material = new THREE.PointsMaterial({ size: pointSize, vertexColors: true });
    // material.size = 2;
    material.sizeAttenuation = false;

    // build mesh
    const mesh = new THREE.Points(geometry, material);
    mesh.name = 'lidar';

    return mesh;
  }

  buildGeometry (position) {
    const points = this.buildPoints(position);

    return {
      points
    };
  }

  movePoints (box) {
    const points = this.lidar_points;
    const trans = eulerAngleToRotationMatrix3By3(box.rotation);
    const rotatedPoints = matmul(trans, points, 3);
    const translation = [box.position.x, box.position.y, box.position.z];
    const translatedPoints = rotatedPoints.map((p, i) => {
      return p + translation[i % 3];
    });

    const filteredPosition = this.filterPoints(translatedPoints);
    return filteredPosition;
  }

  moveLidar (box) {
    const translatedPoints = this.movePoints(box);

    const elements = this.buildGeometry(translatedPoints);

    // remove old points
    this.unload(true);
    this.deleteAll(true);

    this.elements = elements;
    // _self.points_backup = mesh;
    if (this.goCmdReceived) { // this should be always true
      this.webglGroup.add(this.elements.points);
      if (!this.showPointsOnly) { this.elements.arrows.forEach(a => this.webglGroup.add(a)); }
    }
  }
}

class AuxLidarManager {
  constructor (sceneMeta, world, frameInfo) {
    this.lidarList = [];

    if (world.data.cfg.enableAuxLidar && sceneMeta.aux_lidar) {
      const lidars = [];

      for (const r in sceneMeta.calib.aux_lidar) {
        if (!sceneMeta.calib.aux_lidar[r].disable) { lidars.push(r); }
      }

      this.lidarList = lidars.map(name => {
        return new AuxLidar(sceneMeta, world, frameInfo, name);
      });
    }

    this.showCalibBox = false;
  }

  getAllBoxes () {
    if (this.showCalibBox) {
      return this.lidarList.map(r => r.calib_box);
    } else {
      return [];
    }
  }

  preloaded () {
    for (const r in this.lidarList) {
      if (!this.lidarList[r].preloaded) { return false; }
    }
    return true;
  }

  go (webglScene, onGoFinished) {
    this.lidarList.forEach(r => r.go(webglScene, onGoFinished));
  }

  preload (onPreloadFinished) {
    this.lidarList.forEach(r => r.preload(onPreloadFinished));
  }

  unload () {
    this.lidarList.forEach(r => r.unload());
  }

  deleteAll () {
    this.lidarList.forEach(r => r.deleteAll());
  }

  getOperableObjects () {
    return this.lidarList.flatMap(r => r.getOperableObjects());
  }

  showCalibBox () {
    this.showCalibBox = true;
    this.lidarList.forEach(r => r.showCalibBox());
  }

  hideCalibBox () {
    this.showCalibBox = false;
    this.lidarList.forEach(r => r.hideCalibBox());
  }
}

export { AuxLidarManager };
