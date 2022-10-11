import * as THREE from 'three'
import { OrbitControls } from './lib/OrbitControls.js'
import { TransformControls } from './lib/TransformControls.js'

function ViewManager (mainViewContainer, webglScene, renderer, globalRenderFunc, onBoxChanged, cfg) {
  this.mainViewContainer = mainViewContainer
  this.globalRenderFunc = globalRenderFunc
  this.webglScene = webglScene
  this.renderer = renderer

  this.mainView = cfg.disableMainView ? null : createMainView(webglScene, renderer, this.globalRenderFunc, this.mainViewContainer, onBoxChanged)

  this.boxViewList = []

  this.addBoxView = function (subviewsUi) {
    const boxview = new BoxView(subviewsUi, this.mainViewContainer, this.webglScene, this.renderer, this)
    this.boxViewList.push(boxview)
    return boxview
  }

  this.onWindowResize = function () {
    if (this.mainView) { this.mainView.onWindowResize() }
  }

  this.render = function () {
    console.log('render verything')
    if (this.mainView) { this.mainView.renderAll() }

    this.boxViewList.forEach(v => {
      // if (v.ui.style.display != 'none')  //we have pseudo box now. render as commanded.
      v.render()
    })
  }

  this.setColorScheme = function () {
    const scheme = document.documentElement.className
    if (scheme === 'theme-dark') {
      this.mainView.backgroundColor = new THREE.Color(0.0, 0.0, 0.0)
      this.boxViewList.forEach(v => {
        v.views[0].backgroundColor = new THREE.Color(0.1, 0.05, 0.05)
        v.views[1].backgroundColor = new THREE.Color(0.05, 0.1, 0.05)
        v.views[2].backgroundColor = new THREE.Color(0.05, 0.05, 0.1)
      })
    } else {
      this.mainView.backgroundColor = new THREE.Color(1.0, 1.0, 1.0)
      this.boxViewList.forEach(v => {
        v.views[0].backgroundColor = new THREE.Color(0.95, 0.9, 0.9)
        v.views[1].backgroundColor = new THREE.Color(0.9, 0.95, 0.9)
        v.views[2].backgroundColor = new THREE.Color(0.9, 0.9, 0.95)
      })
    }
  }

  // this.setColorScheme();

  // no public funcs below
  function createMainView (scene, renderer, globalRenderFunc, container, onBoxChanged) {
    const view = {}

    view.backgroundColor =　(document.documentElement.className === 'theme-dark') ? new THREE.Color(0.0, 0.0, 0.0) : new THREE.Color(1.0, 1.0, 1.0)
    view.zoomRatio = 1.0 // useless for mainview

    let camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 1, 500)
    camera.position.x = 0
    camera.position.z = 50
    camera.position.y = 0
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 0, 0)
    camera.name = 'main view camera'
    view.camera_perspective = camera
    view.camera = camera

    // make a blind camera to clean background when batch editing is enabled.
    camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 1, 500)
    camera.position.x = -1000
    camera.position.z = -1000
    camera.position.y = -1000
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 0, 0)
    view.blind_camera = camera

    view.container = container
    view.renderer = renderer
    view.scene = scene

    view.active = true

    view.disable = function () {
      this.active = false
      this.renderWithCamera(this.blind_camera)
    }

    view.dumpPose = function () {
      console.log(this.camera.position, this.camera.rotation)
    }

    view.enable = function () {
      this.active = true
      this.render()
    }

    // var cameraOrthoHelper = new THREE.CameraHelper( camera );
    // cameraOrthoHelper.visible=true;
    // scene.add( cameraOrthoHelper );

    view.render = function () {
      // console.log("render mainview.");
      if (this.active) {
        // this.switch_camera(false);
        this.renderWithCamera(this.camera)
      }
      // else
      // {
      //     this.renderWithCamera(this.blind_camera);
      // }
    }

    view.renderAll = function () {
      console.log('render mainview.')
      if (this.active) {
        // this.switch_camera(false);
        this.renderWithCamera(this.camera)
      } else {
        this.renderWithCamera(this.blind_camera)
      }
    }

    view.clearView = function () {
      this.renderWithCamera(this.blind_camera)
    }

    view.renderWithCamera = function (camera) {
      const left = 0
      const bottom = 0
      const width = this.container.scrollWidth
      const height = this.container.scrollHeight

      // update viewport, so the operating lines over these views
      // will be updated in time.

      // console.log(left,bottom, width, height);

      this.renderer.setViewport(left, bottom, width, height)
      this.renderer.setScissor(left, bottom, width, height)
      this.renderer.setClearColor(view.backgroundColor)
      this.renderer.setScissorTest(true)

      this.renderer.render(this.scene, camera)
    }

    const orbitPerspective = new OrbitControls(view.camera_perspective, view.container)
    orbitPerspective.update()
    orbitPerspective.addEventListener('change', globalRenderFunc)
    // orbitPerspective.enabled = true;
    view.orbitPerspective = orbitPerspective

    const transformControl = new TransformControls(view.camera_perspective, view.container)
    transformControl.setSpace('local')
    transformControl.addEventListener('change', globalRenderFunc)
    transformControl.addEventListener('objectChange', function (e) { onBoxChanged(e.target.object) })

    transformControl.addEventListener('dragging-changed', function (event) {
      view.orbitPerspective.enabled = !event.value
    })
    transformControl.visible = false
    // transformControl.enabled = false;
    scene.add(transformControl)
    view.transformControlPerspective = transformControl

    // var width = container.clientWidth;
    // var height = container.clientHeight;
    // var asp = width/height;

    // camera = new THREE.OrthographicCamera(-800*asp, 800*asp, 800, -800, -800, 800);
    // camera.position.x = 0;
    // camera.position.z = 0;
    // camera.position.y = 0;
    // camera.up.set( 1, 0, 0);
    // camera.lookAt( 0, 0, -3 );

    // camera = new THREE.OrthographicCamera( container.clientWidth / - 2, container.clientWidth / 2, container.clientHeight / 2, container.clientHeight / - 2, -400, 400 );

    // camera = new THREE.OrthographicCamera(-asp*200, asp*200, 200, -200, -200, 200 );
    // camera.position.z = 50;

    // var cameraOrthoHelper = new THREE.CameraHelper( camera );
    // cameraOrthoHelper.visible=true;
    // scene.add( cameraOrthoHelper );

    // view.camera_orth = camera;

    // var orbit_orth = new OrbitControls( view.camera_orth, view.container );
    // orbit_orth.update();
    // orbit_orth.addEventListener( 'change', render );
    // orbit_orth.enabled = false;
    // view.orbit_orth = orbit_orth;

    // var orbit_orth = new OrthographicTrackballControls( view.camera_orth, view.container );
    // orbit_orth.rotateSpeed = 1.0;
    // orbit_orth.zoomSpeed = 1.2;
    // orbit_orth.noZoom = false;
    // orbit_orth.noPan = false;
    // orbit_orth.noRotate = false;
    // orbit_orth.staticMoving = true;

    // orbit_orth.dynamicDampingFactor = 0.3;
    // orbit_orth.keys = [ 65, 83, 68 ];
    // orbit_orth.addEventListener( 'change', globalRenderFunc );
    // orbit_orth.enabled=true;
    // view.orbit_orth = orbit_orth;

    // transformControl = new TransformControls(view.camera_orth, view.container );
    // transformControl.setSpace("local");
    // transformControl.addEventListener( 'change', globalRenderFunc );
    // transformControl.addEventListener( 'objectChange', function(e){onBoxChanged(e.target.object);} );

    // transformControl.addEventListener( 'dragging-changed', function ( event ) {
    //     view.orbit_orth.enabled = ! event.value;
    // } );

    // transformControl.visible = false;
    // //transformControl.enabled = true;
    // //scene.add( transformControl );

    // view.transform_control_orth = transformControl;

    view.camera = view.camera_perspective
    view.orbit = view.orbitPerspective
    view.transformControl = view.transformControlPerspective

    view.switch_camera = function (birdseye) {
      if (!birdseye && (this.camera === this.camera_orth)) {
        this.camera = this.camera_perspective
        this.orbit_orth.enabled = false
        this.orbitPerspective.enabled = true
        this.orbit = this.orbitPerspective

        this.transformControlPerspective.detach()
        this.transform_control_orth.detach()

        this.transform_control_orth.enabled = false
        this.transformControlPerspective.enabled = true
        // this.transformControlPerspective.visible = false;
        // this.transform_control_orth.visible = false;
        this.transformControl = this.transformControlPerspective
      } else if (birdseye && (this.camera === this.camera_perspective)) {
        this.camera = this.camera_orth
        this.orbit_orth.enabled = true
        this.orbitPerspective.enabled = false
        this.orbit = this.orbit_orth

        this.transformControlPerspective.detach()
        this.transform_control_orth.detach()
        this.transform_control_orth.enabled = true
        this.transformControlPerspective.enabled = false
        this.transformControl = this.transform_control_orth
      }

      this.camera.updateProjectionMatrix()
    }

    view.reset_camera = function () {
      const camera = this.camera_perspective
      camera.position.x = 0
      camera.position.z = 50
      camera.position.y = 0
      camera.up.set(0, 0, 1)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()

      this.orbitPerspective.reset() // this func will call render()
    }

    view.look_at = function (p) {
      if (this.orbit === this.orbitPerspective) {
        this.orbit.target.x = p.x
        this.orbit.target.y = p.y
        this.orbit.target.z = p.z
        this.orbit.update()
      }
    }

    view.onWindowResize = function () {
      // var asp = container.clientWidth/container.clientHeight;
      // this.camera_orth.left = -asp*200;
      // this.camera_orth.right = asp*200;
      // this.camera_orth.top = 200;
      // this.camera_orth.bottom = -200
      // this.camera_orth.updateProjectionMatrix();

      // this.orbit_orth.handleResize();
      // this.orbit_orth.update();

      this.camera_perspective.aspect = container.clientWidth / container.clientHeight
      this.camera_perspective.updateProjectionMatrix()
    }

    view.reset_birdseye = function () {
      // this.orbit_orth.reset(); //
    }
    view.rotate_birdseye = function () {
      // this.camera_orth.up.set( 1, 0, 0);
      // this.orbit_orth.update();
    }
    view.detach_control = function () {
      this.transformControl.detach()
    }

    view.target0 = view.orbit.target.clone()
    view.position0 = view.camera.position.clone()
    view.zoom0 = view.camera.zoom
    view.scale0 = null

    view.save_orbit_state = function (highlightObjScale) {
      this.target0.copy(this.orbit.target)
      this.position0.copy(this.camera.position)
      this.zoom0 = this.camera.zoom
      this.scale0 = { x: highlightObjScale.x, y: highlightObjScale.y, z: highlightObjScale.z }
    }

    view.restore_relative_orbit_state = function (highlightObjScale) {
      if (view.scale0) {
        // restore last viewpoint

        const objSize = Math.sqrt(view.scale0.x * view.scale0.x + view.scale0.y * view.scale0.y + view.scale0.z * view.scale0.z)
        const targetObjSize = Math.sqrt(highlightObjScale.x * highlightObjScale.x + highlightObjScale.y * highlightObjScale.y + highlightObjScale.z * highlightObjScale.z)
        const ratio = targetObjSize / objSize

        this.camera.position.x = this.orbit.target.x + (this.position0.x - this.target0.x) * ratio
        this.camera.position.y = this.orbit.target.y + (this.position0.y - this.target0.y) * ratio
        this.camera.position.z = this.orbit.target.z + (this.position0.z - this.target0.z) * ratio

        this.camera.zoom = this.zoom0
      } else {
        // not saved yet, set default viewpoint
        this.camera.position.set(
          this.orbit.target.x + highlightObjScale.x * 3,
          this.orbit.target.y + highlightObjScale.y * 3,
          this.orbit.target.z + highlightObjScale.z * 3)
      }
      // target is set
    }

    return view
  }
}

function BoxView (ui, mainViewContainer, scene, renderer, viewManager) {
  this.viewManager = viewManager
  this.mainViewContainer = mainViewContainer
  this.ui = ui // sub-views
  this.baseOffset = function () {
    // ui offset
    return {
      top: this.ui.offsetTop,
      left: this.ui.offsetLeft
    }
  }

  this.defaultBox = {
    position: { x: -100, y: -100, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 5, y: 5, z: 5 }
  }

  this.box = this.defaultBox

  this.attachBox = function (box) {
    this.box = box

    this.views.forEach(v => {
      // this.box.world.webglGroup.add(v.camera);
      // this.box.world.webglGroup.add(v.cameraHelper);

      this.box.world.webglGroup.add(v.cameraContainer)
      // this.box.world.webglGroup.add(v.cameraHelper); //seems camerahelp shold be added to top-most scene only.
    })

    this.onBoxChanged()
  }
  this.detach = function () {
    this.box = this.defaultBox
    this.onBoxChanged()
  }

  this.onBoxChanged = function (dontRender) {
    this.updateCameraPose(this.box)
    this.updateCameraRange(this.box)

    if (!dontRender) { this.render() }
  }

  this.updateCameraPose = function (box) {
    this.views.forEach((v) => v.updateCameraPose(box))
  }

  this.updateCameraRange = function (box) {
    this.views.forEach((v) => v.updateCameraRange(box))
  }

  this.hidden = function () {
    return this.ui.style.display === 'none'
  }

  this.render = function () {
    //        console.log("render one obj");
    if (!this.hidden()) { this.views.forEach((v) => v.render()) }
  }

  const scope = this

  scope.projViewProto = {
    render () {
      // logger.log("render view", this.name);
      const vp = this.getViewPort()

      this.renderer.setViewport(vp.left, vp.bottom, vp.width, vp.height)
      this.renderer.setScissor(vp.left, vp.bottom, vp.width, vp.height)
      this.renderer.setClearColor(this.backgroundColor)
      this.renderer.setScissorTest(true)

      // logger.log("render preparation finished");
      this.renderer.render(this.scene, this.camera)
      // logger.log("render finished");
    },

    getViewPort () {
      return {
        left: this.placeHolderUi.offsetLeft + scope.baseOffset().left,
        bottom: this.container.scrollHeight - (scope.baseOffset().top + this.placeHolderUi.offsetTop + this.placeHolderUi.clientHeight),
        width: this.placeHolderUi.clientWidth,
        height: this.placeHolderUi.clientHeight,
        zoomRatio: this.zoomRatio
      }
    }

  }

  this.views = [
    createTopView(scene, renderer, mainViewContainer),
    createSideView(scene, renderer, mainViewContainer),
    createBackView(scene, renderer, mainViewContainer)
  ]

  function createTopView (scene, renderer, container) {
    const view = Object.create(scope.projViewProto)
    view.name = 'topview'
    view.zoomRatio = 1.0

    view.backgroundColor = 　(document.documentElement.className === 'theme-dark') ? new THREE.Color(0.1, 0.05, 0.05) : new THREE.Color(0.95, 0.9, 0.9)
    view.container = container
    view.scene = scene
    view.renderer = renderer
    view.placeHolderUi = ui.querySelector('#z-view-manipulator')

    // var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
    const width = container.clientWidth
    const height = container.clientHeight
    const asp = width / height

    const camera = new THREE.OrthographicCamera(-3 * asp, 3 * asp, 3, -3, -3, 3)

    const cameraOrthoHelper = new THREE.CameraHelper(camera)
    cameraOrthoHelper.visible = false
    // scene.add( cameraOrthoHelper );
    view.cameraHelper = cameraOrthoHelper

    camera.position.set(0, 0, 0)
    camera.up.set(1, 0, 0)
    camera.lookAt(0, 0, -3)

    view.camera = camera
    view.cameraContainer = new THREE.Group()
    view.cameraContainer.name = 'topview-camera'
    view.cameraContainer.add(camera)

    view.updateCameraPose = function (box) {
      const p = box.position
      const r = box.rotation
      // console.log(r);
      //
      this.cameraContainer.position.set(p.x, p.y, p.z)
      this.cameraContainer.rotation.set(r.x, r.y, r.z)
    }

    view.updateCameraRange = function (box) {
      const viewWidth = view.placeHolderUi.clientWidth
      const viewHeight = view.placeHolderUi.clientHeight

      let expCameraHeight = box.scale.x * 1.5 * view.zoomRatio
      let expCameraWidth = box.scale.y * 1.5 * view.zoomRatio
      const expCameraClip = box.scale.z + 0.8

      if (expCameraWidth / expCameraHeight > viewWidth / viewHeight) {
        // increase height
        expCameraHeight = expCameraWidth * viewHeight / viewWidth
      } else {
        expCameraWidth = expCameraHeight * viewWidth / viewHeight
      }

      this.camera.top = expCameraHeight / 2
      this.camera.bottom = expCameraHeight / -2
      this.camera.right = expCameraWidth / 2
      this.camera.left = expCameraWidth / -2

      this.camera.near = expCameraClip / -2
      this.camera.far = expCameraClip / 2

      // this.camera.scale.x = box.scale.x;
      // this.camera.scale.y = box.scale.y;
      // this.camera.scale.z = box.scale.z;
      // camera.aspect = viewWidth / viewHeight;
      this.camera.updateProjectionMatrix()
      this.cameraHelper.update()
    }

    return view
  }

  function createSideView (scene, renderer, container) {
    const view = Object.create(scope.projViewProto)
    view.name = 'sideview'
    view.zoomRatio = 1.0
    // view.backgroundColor=new THREE.Color( 0.1, 0.2, 0.1 );
    view.backgroundColor = (document.documentElement.className === 'theme-dark') ? new THREE.Color(0.05, 0.1, 0.05) : new THREE.Color(0.9, 0.95, 0.9)
    view.container = container
    view.scene = scene
    view.renderer = renderer
    view.placeHolderUi = ui.querySelector('#y-view-manipulator')

    // var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
    const width = container.clientWidth
    const height = container.clientHeight
    const asp = width / height

    const camera = new THREE.OrthographicCamera(-3 * asp, 3 * asp, 3, -3, -3, 3)

    const cameraOrthoHelper = new THREE.CameraHelper(camera)
    cameraOrthoHelper.visible = false
    // scene.add( cameraOrthoHelper );
    view.cameraHelper = cameraOrthoHelper

    view.cameraContainer = new THREE.Group()
    view.cameraContainer.name = 'sideview-camera'

    view.cameraContainer.position.x = 0
    view.cameraContainer.position.z = 0
    view.cameraContainer.position.y = 0

    view.cameraContainer.rotation.x = 0 // Math.PI/2;
    view.cameraContainer.rotation.y = 0
    view.cameraContainer.rotation.z = 0

    // view.cameraContainer.updateProjectionMatrix();

    view.cameraContainer.add(camera)

    camera.position.set(0, 0, 0)
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 3, 0)

    // camera.up.set( 0, 1, 0);
    // camera.lookAt( 0, 0, -3 );

    // camera should not be changed again?
    view.camera = camera

    view.updateCameraPose = function (box) {
      const p = box.position
      const r = box.rotation

      view.cameraContainer.position.x = p.x
      view.cameraContainer.position.y = p.y
      view.cameraContainer.position.z = p.z

      view.cameraContainer.rotation.x = r.x
      view.cameraContainer.rotation.y = r.y
      view.cameraContainer.rotation.z = r.z
      // view.cameraContainer.updateProjectionMatrix();

      // var transMatrix = eulerAngleToRotationMatrix(r, p);

      // this.camera.position.x= p.x;
      // this.camera.position.y= p.y;
      // this.camera.position.z= p.z;

      // var up = matmul2(transMatrix, [0, 0, 1, 0], 4);
      // this.camera.up.set( up[0], up[1], up[2]);
      // var at = matmul2(transMatrix, [0, 1, 0, 1], 4);
      // this.camera.lookAt( at[0], at[1], at[2] );

      // this.camera.updateProjectionMatrix();
      // this.cameraHelper.update();
    }

    view.updateCameraRange = function (box) {
      let expCameraWidth, expCameraHeight, expCameraClip

      // view.width = 0.2;//params["side view width"];

      const viewWidth = view.placeHolderUi.clientWidth
      const viewHeight = view.placeHolderUi.clientHeight

      expCameraWidth = box.scale.x * 1.5 * view.zoomRatio
      expCameraHeight = box.scale.z * 1.5 * view.zoomRatio

      expCameraClip = box.scale.y * 1.2

      if (expCameraWidth / expCameraHeight > viewWidth / viewHeight) {
        // increase height
        expCameraHeight = expCameraWidth * viewHeight / viewWidth
      } else {
        expCameraWidth = expCameraHeight * viewWidth / viewHeight
      }

      this.camera.top = expCameraHeight / 2
      this.camera.bottom = expCameraHeight / -2
      this.camera.right = expCameraWidth / 2
      this.camera.left = expCameraWidth / -2

      this.camera.near = expCameraClip / -2
      this.camera.far = expCameraClip / 2

      // camera.aspect = viewWidth / viewHeight;
      this.camera.updateProjectionMatrix()
      this.cameraHelper.update()
    }

    return view
  }

  function createBackView (scene, renderer, container) {
    const view = Object.create(scope.projViewProto)
    view.name = 'backview'
    view.zoomRatio = 1.0
    // view.backgroundColor=new THREE.Color( 0.2, 0.1, 0.1 );
    view.backgroundColor = (document.documentElement.className === 'theme-dark') ? new THREE.Color(0.05, 0.05, 0.1) : new THREE.Color(0.9, 0.9, 0.95)
    view.container = container
    view.scene = scene
    view.renderer = renderer
    view.placeHolderUi = ui.querySelector('#x-view-manipulator')

    // var camera = new THREE.PerspectiveCamera( 65, container.clientWidth / container.clientHeight, 1, 800 );
    const width = container.clientWidth
    const height = container.clientHeight
    const asp = width / height

    const camera = new THREE.OrthographicCamera(-3 * asp, 3 * asp, 3, -3, -3, 3)

    const cameraOrthoHelper = new THREE.CameraHelper(camera)
    cameraOrthoHelper.visible = false
    // scene.add( cameraOrthoHelper );
    view.cameraHelper = cameraOrthoHelper

    camera.position.set(0, 0, 0)
    camera.up.set(0, 0, 1)
    camera.lookAt(3, 0, 0)

    view.camera = camera
    view.cameraContainer = new THREE.Group()
    view.cameraContainer.name = 'backview-camera'
    view.cameraContainer.position.set(0, 0, 0)
    view.cameraContainer.rotation.set(0, 0, 0)

    view.cameraContainer.add(camera)

    view.updateCameraPose = function (box) {
      const p = box.position
      const r = box.rotation

      // let transMatrix = eulerAngleToRotationMatrix(r, p);

      // this.camera.position.x= p.x;
      // this.camera.position.y= p.y;
      // this.camera.position.z= p.z;

      // var up3 = matmul2(transMatrix, [0, 0, 1, 0], 4);
      // this.camera.up.set( up3[0], up3[1], up3[2]);
      // var at3 = matmul2(transMatrix, [1, 0, 0, 1], 4);
      // this.camera.lookAt( at3[0], at3[1], at3[2] );

      // this.camera.updateProjectionMatrix();
      // this.cameraHelper.update();

      this.cameraContainer.position.set(p.x, p.y, p.z)
      this.cameraContainer.rotation.set(r.x, r.y, r.z)
    }

    view.updateCameraRange = function (box) {
      const viewWidth = view.placeHolderUi.clientWidth
      const viewHeight = view.placeHolderUi.clientHeight

      let expCameraWidth = box.scale.y * 1.5 * view.zoomRatio
      let expCameraHeight = box.scale.z * 1.5 * view.zoomRatio
      const expCameraClip = box.scale.x * 1.2

      if (expCameraWidth / expCameraHeight > viewWidth / viewHeight) {
        // increase height
        expCameraHeight = expCameraWidth * viewHeight / viewWidth
      } else {
        expCameraWidth = expCameraHeight * viewWidth / viewHeight
      }

      this.camera.top = expCameraHeight / 2
      this.camera.bottom = expCameraHeight / -2
      this.camera.right = expCameraWidth / 2
      this.camera.left = expCameraWidth / -2

      this.camera.near = expCameraClip / -2
      this.camera.far = expCameraClip / 2

      // camera.aspect = viewWidth / viewHeight;
      this.camera.updateProjectionMatrix()
      this.cameraHelper.update()
    }

    return view
  }
}

export { ViewManager }
