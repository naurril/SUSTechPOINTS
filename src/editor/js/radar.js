import * as THREE from 'three';
import { loadfile } from './jsonrpc.js';
// import { PCDLoader } from './lib/PCDLoader.js'
import { pointcloudReader } from './lib/pointcloud_reader.js';
import { matmul, eulerAngleToRotationMatrix3By3 } from './util.js';

class Radar {
  constructor (sceneMeta, world, frameInfo, radarName) {
    this.world = world;
    this.frameInfo = frameInfo;
    this.name = radarName;
    this.sceneMeta = sceneMeta;
    this.coordinatesOffset = world.coordinatesOffset;

    this.showPointsOnly = false;
    this.showRadarBoxFlag = false;
    this.cssStyleSelector = this.sceneMeta.calib.radar[this.name].cssstyleselector;
    this.color = this.sceneMeta.calib.radar[this.name].color;
    this.velocityScale = 0.3;

    if (!this.color) {
      this.color = [1.0, 0.0, 0.0];
    }

    this._radar_points_raw = null; // read from file, centered at 0
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

        if (!this.showPointsOnly) { this.elements.arrows.forEach(a => this.webglGroup.add(a)); }

        if (this.showRadarBoxFlag) { this.webglGroup.add(this.radar_box); }
      }

      this.loaded = true;
      if (onGoFinished) { onGoFinished(); }
    }

    // anyway we save go cmd

    this.goCmdReceived = true;
    this.onGoFinished = onGoFinished;
  }

  showRadarBox () {
    this.showRadarBoxFlag = true;
    this.webglGroup.add(this.radar_box);
  }

  hideRadarBox () {
    this.showRadarBoxFlag = false;
    this.webglGroup.remove(this.radar_box);
  }

  getUnOffsetRadarPoints () {
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

      if (!deepBox) { this.webglGroup.remove(this.radar_box); }
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
      this.world.data.dbg.free();

      if (this.elements.points) {
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

    if (!deepBox && this.radar_box) {
      this.world.data.dbg.free();
      this.radar_box.geometry.dispose();
      this.radar_box.material.dispose();
      this.radar_box = null;
    }

    this.destroyed = true;
  }

  calcTransformMatrix () {
    const translate = this.sceneMeta.calib.radar[this.name].translation;
    const rotation = this.sceneMeta.calib.radar[this.name].rotation;

    const m = new THREE.Matrix4();
    m.makeRotationFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
    m.setPosition(translate[0], translate[1], translate[2]);

    this.webglGroup.matrix.copy(m);
    this.webglGroup.matrixAutoUpdate = false;
  }

  processPcd (pcd) {
    if (this.destroyed) {
      console.error('received radar after destroyed.');
      return;
    }
    const position = pcd.position;
    // var velocity = pcd.velocity;
    // velocity is a vector anchored at position,
    // we translate them into position of the vector head
    const velocity = position.map((p, i) => pcd.velocity[i] / 5 + pcd.position[i]);

    // scale velocity
    // velocity = velocity.map(v=>v*this.velocityScale);

    // this.points_parse_time = new Date().getTime();
    // console.log(this.points_load_time, this.frameInfo.scene, this.frameInfo.frame, "parse pionts ", this.points_parse_time - this.create_time, "ms");
    this._radar_points_raw = position;
    this._radar_velocity_raw = velocity;

    // add one box to calibrate radar with lidar
    this.radar_box = this.createRadarBox();

    // install callback for box changing
    this.radar_box.onBoxChanged = () => {
      this.moveRadar(this.radar_box);
    };

    // position = this.transformPointsByOffset(position);
    // position = this.moveRadarPoints(this.radar_box);
    // velocity = this.moveRadarVelocity(this.radar_box);

    const elements = this.buildRadarGeometry(position, velocity);
    this.elements = elements;

    this.webglGroup = new THREE.Group();
    this.webglGroup.name = 'radar-' + this.name;
    this.world.webglGroup.add(this.webglGroup);
    this.calcTransformMatrix();

    // this.points_backup = mesh;

    this._afterPreload();
  }

  preload (onPreloadFinished) {
    this.onPreloadFinished = onPreloadFinished;

    const url = this.frameInfo.get_radar_path(this.name);
    const [rsp,ctl] = loadfile(url)
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
    console.log(`radar ${this.radarname} preloaded`);
    if (this.onPreloadFinished) {
      this.onPreloadFinished();
    }
    if (this.goCmdReceived) {
      this.go(this.webglScene, this.onGoFinished);
    }
  }

  createRadarBox () {
    if (this.sceneMeta.calib.radar && this.sceneMeta.calib.radar[this.name]) {
      return this.world.annotation.createCuboid(
        {
          x: this.sceneMeta.calib.radar[this.name].translation[0] + this.coordinatesOffset[0],
          y: this.sceneMeta.calib.radar[this.name].translation[1] + this.coordinatesOffset[1],
          z: this.sceneMeta.calib.radar[this.name].translation[2] + this.coordinatesOffset[2]
        },
        { x: 1, y: 1, z: 1 },
        {
          x: this.sceneMeta.calib.radar[this.name].rotation[0],
          y: this.sceneMeta.calib.radar[this.name].rotation[1],
          z: this.sceneMeta.calib.radar[this.name].rotation[2]
        },
        'radar',
        this.name);
    } else {
      return this.world.annotation.createCuboid(
        {
          x: this.coordinatesOffset[0],
          y: this.coordinatesOffset[1],
          z: this.coordinatesOffset[2]
        },
        { x: 1, y: 1, z: 1 },
        { x: 0, y: 0, z: 0 },
        'radar',
        this.name);
    }
  }

  buildPoints (position) {
    // build geometry
    this.world.data.dbg.alloc('rader point');
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
    let pointSize = this.sceneMeta.calib.radar[this.name].point_size;
    if (!pointSize) { pointSize = 2; }

    const material = new THREE.PointsMaterial({ size: pointSize, vertexColors: true });
    // material.size = 2;
    material.sizeAttenuation = false;

    // build mesh
    const mesh = new THREE.Points(geometry, material);
    mesh.name = 'radar';

    return mesh;
  }

  buildArrow (position, velocity) {
    const p = position;
    const v = velocity;

    const body = [
      p[0], p[1], p[2],
      v[0], v[1], v[2]
    ];

    this.world.data.dbg.alloc('radar arrow');
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(body, 3));

    const color = this.color.map(c => Math.round(c * 255)).reduce((a, b) => a * 256 + b, 0);

    const material = new THREE.LineBasicMaterial({ color, linewidth: 1, opacity: 1, transparent: true });
    const arrow = new THREE.LineSegments(geo, material);
    return arrow;
  }

  buildRadarGeometry (position, velocity) {
    const points = this.buildPoints(position);

    const arrows = [];

    if (!this.showPointsOnly) {
      for (let i = 0; i < position.length / 3; i++) {
        const arr = this.buildArrow(position.slice(i * 3, i * 3 + 3), velocity.slice(i * 3, i * 3 + 3));
        arrows.push(arr);
      }
    }

    return {
      points,
      arrows
    };
  }

  movePoints (points, box) {
    const trans = eulerAngleToRotationMatrix3By3(box.rotation);
    const rotatedPoints = matmul(trans, points, 3);
    const translation = [box.position.x, box.position.y, box.position.z];
    const translatedPoints = rotatedPoints.map((p, i) => {
      return p + translation[i % 3];
    });
    return translatedPoints;
  }

  moveRadarPoints (box) {
    return this.movePoints(this._radar_points_raw, box);
  }

  moveRadarVelocity (box) {
    return this.movePoints(this._radar_velocity_raw, box);
  }

  moveRadar (box) {
    const translatedPoints = this.moveRadarPoints(box);
    const translatedVelocity = this.moveRadarVelocity(box);

    const elements = this.buildRadarGeometry(translatedPoints, translatedVelocity);

    // remove old points
    this.unload(true);
    this.deleteAll(true);

    this.elements = elements;
    // _self.points_backup = mesh;
    if (this.goCmdReceived) {
      // this should be always true
      this.webglGroup.add(this.elements.points);
      if (!this.showPointsOnly) { this.elements.arrows.forEach(a => this.webglGroup.add(a)); }
    }
  }
}

class RadarManager {
  constructor (sceneMeta, world, frameInfo) {
    this.radarList = [];

    if (world.data.cfg.enableRadar && sceneMeta.radar) {
      const radars = [];

      for (const r in sceneMeta.calib.radar) {
        if (!sceneMeta.calib.radar[r].disable) { radars.push(r); }
      }

      this.radarList = radars.map(name => {
        return new Radar(sceneMeta, world, frameInfo, name);
      });
    }

    this.showRadarBoxFlag = false;
  }

  getAllBoxes () {
    if (this.showRadarBoxFlag) {
      return this.radarList.map(r => r.radar_box);
    } else {
      return [];
    }
  }

  preloaded () {
    for (const r in this.radarList) {
      if (!this.radarList[r].preloaded) { return false; }
    }
    return true;
  }

  go (webglScene, onGoFinished) {
    this.radarList.forEach(r => r.go(webglScene, onGoFinished));
  }

  preload (onPreloadFinished) {
    this.radarList.forEach(r => r.preload(onPreloadFinished));
  }

  unload () {
    this.radarList.forEach(r => r.unload());
  }

  deleteAll () {
    this.radarList.forEach(r => r.deleteAll());
  }

  getOperableObjects () {
    return this.radarList.flatMap(r => r.getOperableObjects());
  }

  showRadarBox () {
    this.showRadarBoxFlag = true;
    this.radarList.forEach(r => r.showRadarBox());
  }

  hideRadarBox () {
    this.showRadarBoxFlag = false;
    this.radarList.forEach(r => r.hideRadarBox());
  }
}

export { RadarManager };
