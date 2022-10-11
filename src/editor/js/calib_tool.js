
import { PopupDialog } from './common/popup_dialog.js'

import * as THREE from 'three'

class CalibTool extends PopupDialog {
  constructor (ui, editor) {
    super(ui)
    this.data = editor.data
    this.editor = editor
    this.ui = ui

    this.ui.querySelector('#btn-start').onclick = () => {
      this.start()
    }
    this.ui.querySelector('#btn-stop').onclick = () => {
      this.stop()
    }

    this.ui.querySelector('#btn-apply-settings').onclick = () => {
      const rotateStep = this.ui.querySelector('#rotate-step').value
      const translateStep = this.ui.querySelector('#translate-step').value
      this.editor.editorCfg.rotateStep = rotateStep
      this.editor.editorCfg.moveStep = translateStep
    }

    this.ui.querySelector('#calib-proj-pts').onchange = (event) => {
      const v = event.currentTarget.checked
      this.editor.editorCfg.projectLidarToImage = v
      this.editor.imageContextManager.render_2d_image()
    }

    this.ui.querySelector('#btn-inc-opacity').onclick = (event) => {
      const svg = editor.imageContextManager.images[0].ui.querySelector('#svg-points')
      const opacity = svg.style.opacity ? parseFloat(svg.style.opacity) : 1
      svg.style.opacity = Math.min(1, (0.1 + opacity))
    }

    this.ui.querySelector('#btn-dec-opacity').onclick = (event) => {
      const svg = editor.imageContextManager.images[0].ui.querySelector('#svg-points')
      const opacity = svg.style.opacity ? parseFloat(svg.style.opacity) : 1
      svg.style.opacity = Math.min(1, (-0.1 + opacity))
    }
    this.ui.querySelector('#btn-inc-width').onclick = (event) => {
      const svg = editor.imageContextManager.images[0].ui.querySelector('#svg-points')
      const strokeWidth = svg.style.strokeWidth ? parseFloat(svg.style.strokeWidth.split('px')[0]) : 1
      svg.style.strokeWidth = strokeWidth * 1.2 + 'px'
    }

    this.ui.querySelector('#btn-dec-width').onclick = (event) => {
      const svg = editor.imageContextManager.images[0].ui.querySelector('#svg-points')
      const strokeWidth = svg.style.strokeWidth ? parseFloat(svg.style.strokeWidth.split('px')[0]) : 1
      svg.style.strokeWidth = strokeWidth * 0.8 + 'px'
    }

    this.ui.querySelector('#calib-proj-boxes').onchange = (event) => {
      const v = event.currentTarget.checked
      this.editor.editorCfg.projectBoxesToImage = v
      this.editor.imageContextManager.render_2d_image()
    }

    this.cam_to_box_m = new THREE.Matrix4().set(
      0, 0, 1, 0,
      -1, 0, 0, 0,
      0, -1, 0, 0,
      0, 0, 0, 1
    )
  }

  calibBox = null

  idealLidarToCamMatrix (angle, height, horizontal_distance) {
    const box_to_lidar_m = new THREE.Matrix4()
    box_to_lidar_m.makeRotationFromEuler(new THREE.Euler(0, 0, angle, 'XYZ'))

    const z = height
    const x = horizontal_distance * Math.cos(angle)
    const y = horizontal_distance * Math.sin(angle)

    box_to_lidar_m.setPosition(x, y, z)

    const cam_to_lidar = new THREE.Matrix4().multiplyMatrices(box_to_lidar_m, this.cam_to_box_m)
    const lidar_to_cam = new THREE.Matrix4().copy(cam_to_lidar).invert()

    return lidar_to_cam
  }

  save_calib (calib) {
    this.savedCalib = calib
  }

  calcCalibBox (extrinsic) {
    const lidar_to_cam_m = new THREE.Matrix4().set(...extrinsic)
    const cam_to_lidar_m = new THREE.Matrix4().copy(lidar_to_cam_m).invert()

    const box_to_cam_m = new THREE.Matrix4().copy(this.cam_to_box_m).invert()

    const box_to_lidar_m = new THREE.Matrix4().multiplyMatrices(cam_to_lidar_m, box_to_cam_m)
    console.log(box_to_lidar_m)

    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    box_to_lidar_m.decompose(position, quaternion, scale)

    const rotation = new THREE.Euler().setFromQuaternion(quaternion)

    return {
      position,
      scale,
      rotation
    }
  }

  showCalibBox (position, rotation) {
    if (!this.calibBox) {
      this.calibBox = this.data.world.annotation.add_box(position, { x: 1, y: 1, z: 1 }, rotation, 'camera', this.targetCamera)
      this.calibBox.dontsave = true
      this.calibBox.world = this.data.world
    } else {
      console.log('calib box exists.')
      this.calibBox.dontsave = true
      this.calibBox.obj_type = 'camera'
      this.calibBox.obj_track_id = this.targetCamera

      this.calibBox.position.x = position.x// + this.data.world.coordinatesOffset[0];
      this.calibBox.position.y = position.y// + this.data.world.coordinatesOffset[1];
      this.calibBox.position.z = position.z// + this.data.world.coordinatesOffset[2];

      this.calibBox.rotation.x = rotation.x
      this.calibBox.rotation.y = rotation.y
      this.calibBox.rotation.z = rotation.z
    }

    this.editor.render()

    this.calibBox.onBoxChanged = () => {
      this.applyCalibAdjustment()
      this.editor.imageContextManager.render_2d_image()
    }
  }

  applyCalibAdjustment () //
  {
    const box_to_lidar = new THREE.Matrix4().compose(this.calibBox.position, this.calibBox.quaternion, new THREE.Vector3(1, 1, 1))
    const lidar_to_cam = new THREE.Matrix4().multiplyMatrices(box_to_lidar, this.cam_to_box_m).invert()

    this.calib.extrinsic = lidar_to_cam.transpose().elements

    if ('debug') {
      this.showCalibInfo()
    }
  }
  // show a manipulating box

  showCalibInfo () {
    const box_to_lidar = new THREE.Matrix4().compose(this.calibBox.position, this.calibBox.quaternion, new THREE.Vector3(1, 1, 1))
    const lidar_to_box = new THREE.Matrix4().copy(box_to_lidar).invert()

    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    lidar_to_box.decompose(position, quaternion, scale)
    const rotation = new THREE.Euler().setFromQuaternion(quaternion)

    this.ui.querySelector('#camera').innerHTML = this.targetCamera

    let ui = null
    ui = this.ui.querySelector('#lidar-to-camera').querySelector('#position');
    ['x', 'y', 'z'].forEach(a => ui.querySelector('#' + a).value = position[a])

    ui = this.ui.querySelector('#lidar-to-camera').querySelector('#rotation');
    ['x', 'y', 'z'].forEach(a => ui.querySelector('#' + a).value = rotation[a] * 180 / Math.PI)

    const m = this.calib.extrinsic
    this.ui.querySelector('#calib-matrix').innerHTML = '' +
           m.slice(0, 4) + ',<br>' +
           m.slice(4, 8) + ',<br>' +
           m.slice(8, 12) + ',<br>' +
           m.slice(12, 16) + '<br>'
  }

  updateSettings () {
    this.ui.querySelector('#translate-step').value = this.editor.editorCfg.moveStep
    this.ui.querySelector('#rotate-step').value = this.editor.editorCfg.rotateStep
  }

  start () {
    this.stop()

    this.updateSettings()

    const targetName = this.editor.imageContextManager.images[0].name
    const [cameraType, cameraName] = targetName.split(':')
    this.targetCamera = targetName

    // adjust only the defalt extrinsic matrix
    const extrinsic = this.data.world.calib.getDefaultExtrinicCalib(cameraType, cameraName) // sceneMeta.calib[cameraType][cameraName];
    this.calib = this.data.world.sceneMeta.calib[cameraType][cameraName]
    if (!this.calib.extrinsic) { this.calib.extrinsic = extrinsic }

    const { position, rotation } = this.calcCalibBox(extrinsic)

    this.showCalibBox(position, rotation)

    this.showCalibInfo()
  };

  stop () {
    if (this.calibBox) {
      this.calibBox.world.annotation.unload_box(this.calibBox)
      this.calibBox.world.annotation.remove_box(this.calibBox)
      this.calibBox = null
      this.editor.render()
    }
  };
};

export { CalibTool }
