
class Config {
  // dataCfg = {

  // disableLabels: true,

  constructor () {
    this.baseUrl = ''; // "http://127.0.0.1:8083";

    this.enablePreload = true;
    this.colorPoints = 'mono';
    this.enableRadar = false;
    this.enableAuxLidar = false;
    this.enableDynamicGroundLevel = true;
    this.coordinateSystem = 'utm';
    this.point_size = 1;
    this.pointBrightness = 0.6;
    this.box_opacity = 1;
    this.show_background = true;
    this.colorObject = 'category';
    this.theme = 'dark';
    this.enableFilterPoints = false;
    this.filterPointsZ = 2.0;
    this.batchModeInstNumber = 20;
    this.batchModeSubviewSize = { width: 130, height: 450 };
    this.maxWorldNumber = 40;
    this.maxEmptyBoxPoints = 10;
    // edit on one box, apply to all selected boxes.
    this.linkEditorsInBatchMode = false;

    // only rotate z in 'auto/interpolate' algs
    this.enableAutoRotateXY = false;
    this.autoSave = true;

    this.autoUpdateInterpolatedBoxes = true;

    this.hideId = false;
    this.hideCategory = false;

    this.moveStep = 0.01; // ratio, percentage
    this.rotateStep = Math.PI / 360;

    this.speedUpForRepeatedOp = 2;

    this.ignoreDistantObject = true;
    this.cameraGroupForContext = 'camera';

    /// editorCfg

    // this.disableSceneSelector = true;
    // this.disableFrameSelector = true;
    // this.disableCameraSelector = true;
    // this.disableFastToolbox= true;
    // this.disableMainView= true;
    // this.disableMainImageContext = true;
    // this.disableGrid = true;
    // this.disableRangeCircle = true;
    // this.disableAxis = true;
    // this.disableMainViewKeyDown = true;
    // this.projectRadarToImage = true;
    this.projectLidarToImage = false;
    this.projectBoxesToImage = true;
    this.autoCheckScene = false;
    this.enableImageAnnotation = false;

    this.saveItems = [
      ['theme', null],
      ['enableRadar', this.toBool],
      ['enablePreload', this.toBool],
      ['enableAuxLidar', this.toBool],
      ['enableFilterPoints', this.toBool],
      ['filterPointsZ', parseFloat],
      ['colorPoints', null],
      ['coordinateSystem', null],
      ['batchModeInstNumber', parseInt],
      ['batchModeSubviewSize', JSON.parse],
      ['enableAutoRotateXY', this.toBool],
      ['autoUpdateInterpolatedBoxes', this.toBool],
      ['maxWorldNumber', parseInt],
      ['cameraGroupForContext', null],
      ['enableImageAnnotation', this.toBool]
    ];
  }

  readItem (name, defaultValue, castFunc) {
    const ret = window.localStorage.getItem(name);

    if (ret) {
      if (castFunc) { return castFunc(ret); } else { return ret; }
    } else {
      return defaultValue;
    }
  }

  setItem (name, value) {
    this[name] = value;
    if (typeof value === 'object') { value = JSON.stringify(value); }
    window.localStorage.setItem(name, value);
  }

  toBool (v) {
    return v === 'true';
  }

  load () {
    this.saveItems.forEach(item => {
      const key = item[0];
      const castFunc = item[1];

      this[key] = this.readItem(key, this[key], castFunc);
    });
  }
}

export { Config };
