import * as THREE from 'three';

import { ViewManager } from './view';
import { FastToolBox, FloatLabelManager } from './floatlabel';
import { Mouse } from './mouse.js';
import { BoxEditor, BoxEditorManager } from './box_editor.js';
import { ImageContextManager } from './image.js';
import { globalObjectCategory } from './obj_cfg.js';
import { objIdManager } from './obj_id_list.js';
import { Header } from './header.js';
import { BoxOp } from './box_op.js';
import { AutoAdjust } from './auto-adjust.js';
import { PlayControl } from './play.js';
import { reloadWorldList, saveWorldList } from './save.js';
import { logger, createLogger } from './log.js';
import { autoAnnotate } from './auto_annotate.js';
import { CalibTool } from './calib_tool';
import { Trajectory } from './trajectory.js';
import { ContextMenu } from './context_menu.js';
import { InfoBox } from './info_box.js';
import { CropScene } from './crop_scene.js';
import { ConfigUi } from './config_ui.js';
import { MovableView } from './common/popup_dialog.js';
import { globalKeyDownManager } from './keydown_manager.js';
import { vectorRange } from './util.js';
import { check3dLabels, check2dLabels } from './error_check.js';
import { jsonrpc } from './jsonrpc.js';
import { unstable_renderSubtreeIntoContainer } from 'react-dom';

function Editor (editorUi, wrapperUi, editorCfg, data, name = 'editor') {
  // create logger before anything else.
  createLogger(editorUi.querySelector('#log-wrapper'), editorUi.querySelector('#log-button'));
  this.logger = logger;

  this.editorCfg = editorCfg;
  this.sideview_enabled = true;
  this.editorUi = editorUi;
  this.wrapperUi = wrapperUi;
  this.container = null;
  this.name = name;

  this.data = data;
  this.scene = null;
  this.renderer = null;
  this.selectedBox = null;
  this.windowWidth = null;
  this.windowHeight = null;
  this.floatLabelManager = null;
  this.operationSTate = {
    key_pressed: false,
    boxNavigateIndex: 0
  };

  this.viewState = {
    lockObjTrackId: '',
    lockObjInHighlight: false, // focus mode
    autoLock: function (trackid, focus) {
      this.lockObjTrackId = trackid;
      this.lockObjInHighlight = focus;
    }
  };

  this.header = null;
  this.imageContextManager = null;
  this.boxOp = null;
  this.boxEditorManager = null;
  this.params = {};

  this.currentMainEditor = this; // who is on focus, this or batch-editor-manager?

  this.hide = function () {
    this.wrapperUi.style.display = 'none';
  };
  this.show = function () {
    this.wrapperUi.style.display = 'block';
  };

  this.init = function () {
    const editorUi = this.editorUi;

    const self = this;

    this.playControl = new PlayControl(this.data);

    this.configUi = new ConfigUi(editorUi.querySelector('#config-button'), editorUi.querySelector('#config-wrapper'), this);

    this.header = new Header(editorUi.querySelector('#header'), this.data, this.editorCfg,
      (e) => {
        this.scene_changed(e.currentTarget.value);
        // event.currentTarget.blur();
      },
      (e) => { this.frame_changed(e); },
      (e) => { this.object_changed(e); }
    );

    //
    // that way, the operation speed may be better
    // if we load all worlds, we can speed up batch-mode operations, but the singl-world operations slows down.
    // if we use two seperate scenes. can we solve this problem?
    //
    this.scene = new THREE.Scene();

    this.data.setWebglScene(this.scene);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.container = editorUi.querySelector('#container');
    this.container.appendChild(this.renderer.domElement);

    this.boxOp = new BoxOp(this.data);
    this.viewManager = new ViewManager(this.container, this.scene, this.renderer,
      function () { self.render(); },
      function (box) { self.onBoxChanged(box); },
      this.editorCfg);

    this.imageContextManager = new ImageContextManager(
      this.editorUi.querySelector('#images-wrapper'), // content"),
      this.editorUi.querySelector('#camera-selector'),
      this.editorCfg,
      (lidarPoints) => this.onImgClick(lidarPoints));

    if (!this.editorCfg.disableRangeCircle) { this.addRangeCircle(); }

    this.floatLabelManager = new FloatLabelManager(this.editorUi, this.container, this.viewManager.mainView, function (box) { self.selectBox(box); });
    this.fastToolBox = new FastToolBox(this.editorUi.querySelector('#obj-editor'));
    // this.controlGui = this.init_gui();

    this.axis = new THREE.AxesHelper(1);

    this.scene.add(this.axis);

    window.addEventListener('resize', function () { self.onWindowResize(); }, false);

    if (!this.editorCfg.disableMainViewKeyDown) {
      // this.container.onmouseenter = (event)=>{
      //     this.container.focus();
      // };

      // this.container.onmouseleave = (event)=>{
      //     this.container.blur();
      // };

      // this.container.addEventListener( 'keydown', function(e){self.keydown(e);} );
      // this.editorUi.addEventListener( 'keydown', e=>this.keydown(e); );

      this.keydownHandler = (event) => this.keydown(event);
      // this.keydownDisabled = false;
      // document.removeEventListener('keydown', this.keydownHandler);
      // document.addEventListener( 'keydown', this.keydownHandler);
      globalKeyDownManager.register(this.keydownHandler, 'main editor');
    }

    this.globalKeyDownManager = globalKeyDownManager;

    this.objectTrackView = new Trajectory(
      this.editorUi.querySelector('#object-track-wrapper')
    );

    this.infoBox = new InfoBox(
      this.editorUi.querySelector('#info-wrapper')
    );

    this.cropScene = new CropScene(
      this.editorUi.querySelector('#crop-scene-wrapper'),
      this
    );

    this.calib = new CalibTool(this.editorUi.querySelector('#calib-wrapper'), this);

    this.contextMenu = new ContextMenu(this.editorUi.querySelector('#context-menu-wrapper'));

    this.boxEditorManager = new BoxEditorManager(
      document.querySelector('#batch-box-editor'),
      this.viewManager,
      this.objectTrackView,
      this.editorCfg,
      this.boxOp,
      this.header,
      this.contextMenu,
      this.configUi,
      (b) => this.onBoxChanged(b),
      (b, r) => this.removeBox(b, r), // on box remove
      () => {
        // this.onLoadWorldFinished(this.data.world);
        // this.imageContextManager.hide();
        // this.floatLabelManager.hide();

        // this.viewManager.mainView.disable();
        // this.boxEditor.hide();
        // this.hideGridLines();
        // this.controlGui.hide();

      }); // funcOnAnnotationReloaded
    this.boxEditorManager.hide();

    const boxEditorUi = this.editorUi.querySelector('#main-box-editor-wrapper');
    this.boxEditor = new BoxEditor(
      boxEditorUi,
      null, // no box editor manager
      this.viewManager,
      this.editorCfg,
      this.boxOp,
      (b) => this.onBoxChanged(b),
      (b) => this.removeBox(b),
      'main-boxe-ditor');
    this.boxEditor.detach(); // hide it
    this.boxEditor.setResize('both');
    this.boxEditor.moveHandle = new MovableView(
      boxEditorUi.querySelector('#focuscanvas'),
      boxEditorUi.querySelector('#sub-views'),
      () => {
        this.boxEditor.update();
        this.render();
      }
    );

    this.mouse = new Mouse(
      this.viewManager.mainView,
      this.operationSTate,
      this.container,
      this.editorUi,
      function (ev) { self.handleLeftClick(ev); },
      function (ev) { self.handleRightClick(ev); },
      function (x, y, w, h, ctl, shift) { self.handleSelectRect(x, y, w, h, ctl, shift); });

    this.autoAdjust = new AutoAdjust(this.boxOp, this.mouse, this.header);

    // this.projectiveViewOps.hide();

    if (!this.editorCfg.disableGrid) { this.installGridLines(); }

    window.onbeforeunload = function () {
      return 'Exit?';
      // if we return nothing here (just calling return;) then there will be no pop-up question at all
      // return;
    };

    this.updateUserInfo();

    this.onWindowResize();
  };

  this.updateUserInfo = function () {
    jsonrpc('/api/get_user_info').then(ret => {
      logger.log(ret);
      this.header.setUserInfo(ret);
    });
  };

  this.run = function () {
    // this.animate();
    this.render();
    // $( "#maincanvas" ).resizable();

    this.imageContextManager.initImageOp(() => this.selectedBox);

    this.add_global_obj_type();
  };

  this.moveRangeCircle = function (world) {
    if (this.rangeCircle.parent) {
      world.webglGroup.add(this.rangeCircle);
    }
  };

  this.addRangeCircle = function () {
    const h = 1;

    const body = [
    ];

    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const theta1 = (2 * Math.PI / segments) * i;
      const x1 = Math.cos(theta1);
      const y1 = Math.sin(theta1);

      const theta2 = 2 * Math.PI / segments * ((i + 1) % segments);
      const x2 = Math.cos(theta2);
      const y2 = Math.sin(theta2);

      body.push(x1, y1, h, x2, y2, h);
      body.push(0.6 * x1, 0.6 * y1, h, 0.6 * x2, 0.6 * y2, h);
      body.push(2.0 * x1, 2.0 * y1, h, 2.0 * x2, 2.0 * y2, h);
    }

    this.data.dbg.alloc('range circle');
    const bbox = new THREE.BufferGeometry();
    bbox.setAttribute('position', new THREE.Float32BufferAttribute(body, 3));

    const box = new THREE.LineSegments(bbox,
      new THREE.LineBasicMaterial({ color: 0x888800, linewidth: 1, opacity: 0.5, transparent: true }));

    box.scale.x = 50;
    box.scale.y = 50;
    box.scale.z = -3;
    box.position.x = 0;
    box.position.y = 0;
    box.position.z = 0;
    box.computeLineDistances();
    this.rangeCircle = box;
    this.scene.add(box);
  };

  this.showRangeCircle = function (show) {
    if (show) {
      if (this.data.world) {
        this.data.world.webglGroup.add(this.rangeCircle);
      }
    } else {
      if (this.rangeCircle.parent) { this.rangeCircle.parent.remove(this.rangeCircle); }
    }

    this.render();
  };

  this.hideGridLines = function () {
    const svg = this.editorUi.querySelector('#grid-lines-wrapper');
    svg.style.display = 'none';
  };
  this.showGridLines = function () {
    const svg = this.editorUi.querySelector('#grid-lines-wrapper');
    svg.style.display = '';
  };
  this.installGridLines = function () {
    const svg = this.editorUi.querySelector('#grid-lines-wrapper');

    for (let i = 1; i < 10; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0%');
      line.setAttribute('y1', String(i * 10) + '%');
      line.setAttribute('x2', '100%');
      line.setAttribute('y2', String(i * 10) + '%');
      line.setAttribute('class', 'grid-line');
      svg.appendChild(line);
    }

    for (let i = 1; i < 10; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('y1', '0%');
      line.setAttribute('x1', String(i * 10) + '%');
      line.setAttribute('y2', '100%');
      line.setAttribute('x2', String(i * 10) + '%');
      line.setAttribute('class', 'grid-line');
      svg.appendChild(line);
    }
  };

  this.handleFastToolboxEvent = (event) =>{
    const self = this;
    switch (event.currentTarget.id) {
      case 'label-del':
        self.remove_selected_box();
        self.header.updateModifiedStatus();
        break;
      case 'label-gen-id':
        // self.autoAdjust.mark_bbox(self.selectedBox);
        // event.currentTarget.blur();
        {
          const id = objIdManager.generateNewUniqueId(this.data.world);
          self.fastToolBox.setValue(self.selectedBox.obj_type, id, self.selectedBox.obj_attr);
          self.setObjectId(id);
        }
        break;
      case 'label-copy':
        if (!this.selectedBox.obj_id) {
          this.infoBox.show('Error', 'Please assign object track ID.');
        } else {
          self.autoAdjust.mark_bbox(self.selectedBox);
        }
        break;

      case 'label-paste':
        // this.autoAdjust.smart_paste(self.selectedBox, null, (b)=>this.onBoxChanged(b));
        this.boxOp.auto_rotate_xyz(this.selectedBox, null, null,
          (b) => this.onBoxChanged(b),
          'noscaling');
        // event.currentTarget.blur();
        break;

      case 'label-batchedit':

        if (!this.ensureBoxTrackIdExist()) {
          break;
        }

        if (!this.ensurePreloaded()) {
          break;
        }

        this.header.setObject(this.selectedBox.obj_id);
        this.editBatch(
          this.data.world.frameInfo.scene,
          this.data.world.frameInfo.frame,
          this.selectedBox.obj_id,
          this.selectedBox.obj_type
        );

        break;

      case 'label-trajectory':
        this.showTrajectory();
        break;

      case 'label-edit':
        event.currentTarget.blur();
        self.selectBox(self.selectedBox);
        break;

        // case "label-reset":
        //     event.currentTarget.blur();
        //     if (self.selectedBox){
        //         //switch_bbox_type(this.selectedBox.obj_type);
        //         self.transform_bbox("reset");
        //     }
        //     break;

      case 'label-highlight':
        event.currentTarget.blur();
        if (self.selectedBox.in_highlight) {
          self.cancelFocus(self.selectedBox);
          self.viewState.lockObjInHighlight = false;
        } else {
          self.focusOnBox(self.selectedBox);
        }
        break;

      case 'label-rotate':
        event.currentTarget.blur();
        self.transform_bbox('z_rotate_reverse');
        break;

      case 'object-category-selector':
        this.objectTypeChanged(event);
        break;
      case 'object-track-id-editor':
        this.objectIdChanged(event);
        break;
      case 'attr-input':
        this.objectAttributeChanged(event.currentTarget.value);
        break;
      default:
        this.handleContextMenuEvent(event);
        break;
    }
  };

  this.cancelFocus = function (box) {
    box.in_highlight = false;
    // viewState.lockObjInHighlight = false; // when user unhighlight explicitly, set it to false
    this.data.world.lidar.cancelHightlight(box);
    this.floatLabelManager.restoreAll();

    this.viewManager.mainView.save_orbit_state(box.scale);
    this.viewManager.mainView.orbit.reset();
  };

  this.focusOnBox = function (box) {
    if (this.editorCfg.disableMainView) { return; }

    if (box) {
      this.data.world.lidar.highlightBoxPoints(box);

      this.floatLabelManager.hideAll();
      this.viewManager.mainView.orbit.saveState();

      // this.viewManager.mainView.camera.position.set(this.selectedBox.position.x+this.selectedBox.scale.x*3, this.selectedBox.position.y+this.selectedBox.scale.y*3, this.selectedBox.position.z+this.selectedBox.scale.z*3);

      const posG = this.data.world.lidarPosToScene(box.position);
      this.viewManager.mainView.orbit.target.x = posG.x;
      this.viewManager.mainView.orbit.target.y = posG.y;
      this.viewManager.mainView.orbit.target.z = posG.z;

      this.viewManager.mainView.restore_relative_orbit_state(box.scale);
      this.viewManager.mainView.orbit.update();

      this.render();
      box.in_highlight = true;
      this.viewState.lockObjInHighlight = true;
    }
  };

  this.show4Dworm = function (box) {
    this.data.worldList.forEach(w => {
      const b = w.annotation.findBoxByTrackId(box.obj_id);
      if (b) {
        w.resetCoordinateOffset();
        w.lidar.highlightBoxPoints(b);
      }
    });

    this.render();
  };

  this.cancel4Dworm = function () {
    this.data.worldList.forEach(w => {
      w.restoreCoordinateOffset();
      w.lidar.cancelHightlight();
    });

    this.render();
  };

  this.showTrajectory = function () {
    if (!this.selectedBox) { return; }

    if (!this.selectedBox.obj_id) {
      console.error('no track id');
      return;
    }

    const tracks = this.data.worldList.map(w => {
      const box = w.annotation.findBoxByTrackId(this.selectedBox.obj_id);
      let ann = null;
      if (box) {
        ann = w.annotation.boxToAnn(box);
        ann.psr.position = w.lidarPosToUtm(ann.psr.position);
        ann.psr.rotation = w.lidarRotToUtm(ann.psr.rotation);
      }
      return [w.frameInfo.frame, ann, w === this.data.world];
    });

    tracks.sort((a, b) => (a[0] > b[0]) ? 1 : -1);

    this.objectTrackView.setObject(
      this.selectedBox.obj_type,
      this.selectedBox.obj_id,
      tracks,
      (targetFrame) => { // onExit
        this.loadWorld(this.data.world.frameInfo.scene, targetFrame);
      }
    );
  };

  this.interpolateCurrentObject = async function () {
    const objId = this.viewState.lockObjTrackId;

    if (objId) {
      const worldList = this.data.worldList;
      const boxList = this.data.worldList.map(w => w.annotation.findBoxByTrackId(objId));
      const applyIndList = this.data.worldList.map(w => (w === this.data.world));

      await this.boxOp.interpolateAsync(worldList, boxList, applyIndList);

      this.select_locked_object();

      this.header.updateModifiedStatus();

      this.viewManager.render();
    }
  };
  // return true to close contextmenu
  // return false to keep contextmenu
  this.handleContextMenuEvent = function (event) {
    switch (event.currentTarget.id) {
      case 'cm-play-2fps':
        this.playControl.play((w) => { this.onLoadWorldFinished(w); }, 2);
        break;
      case 'cm-play-10fps':
        this.playControl.play((w) => { this.onLoadWorldFinished(w); }, 10);
        break;
      case 'cm-play-20fps':
        this.playControl.play((w) => { this.onLoadWorldFinished(w); }, 20);
        break;
      case 'cm-play-50fps':
        this.playControl.play((w) => { this.onLoadWorldFinished(w); }, 50);
        break;
      case 'cm-paste':
        {
          const box = this.add_box_on_mouse_pos_by_ref();

          if (!event.shiftKey) {
            logger.log('paste without auto-adjusting');
            this.boxOp.auto_rotate_xyz(box, null, null,
              b => this.onBoxChanged(b),
              'noscaling');
          }
        }
        break;
      case 'cm-interpolate-cur-obj':
        this.interpolateCurrentObject();
        break;
      case 'cm-auto-annotate-cur-obj':
        this.autoAnnotateCurrentObject();
        break;
      case 'cm-prev-frame':
        this.previousFrame();
        break;
      case 'cm-next-frame':
        this.nextFrame();
        break;
      case 'cm-last-frame':
        this.lastFrame();
        break;
      case 'cm-first-frame':
        this.firstFrmae();
        break;
        // case 'cm-go-to-10hz':
        //     this.loadWorld(this.data.world.frameInfo.scene+"_10hz", this.data.world.frameInfo.frame)

        //     // {
        //     //     let link = document.createElement("a");
        //     //     //link.download=`${this.data.world.frameInfo.scene}-${this.data.world.frameInfo.frame}-webgl`;
        //     //     link.href="http://localhost";
        //     //     link.target="_blank";
        //     //     link.click();
        //     // }
        //     break;
        // case 'cm-go-to-full-2hz':
        //     this.loadWorld(this.data.world.frameInfo.scene+"_full_2hz", this.data.world.frameInfo.frame)
        //     break;

        // case 'cm-go-to-2hz':
        //     this.loadWorld(this.data.world.frameInfo.scene.split("_")[0], this.data.world.frameInfo.frame)
        //     break;

      case 'cm-save':
        saveWorldList(this.data.worldList);
        break;

      case 'cm-reload':

        // reloadWorldList([this.data.world], () => {
        //   this.onLoadWorldFinished(this.data.world);
        //   this.header.updateModifiedStatus();
        // });
        this.reloadCurrentWorld();

        break;

      case 'cm-reload-all':
        this.reloadAllWorlds();
        break;

      case 'cm-stop':
        this.playControl.stopPlay();
        break;
      case 'cm-pause':
        this.playControl.pauseResumePlay();
        break;

      case 'cm-prev-object':
        this.selectPreviousObject();
        break;

      case 'cm-next-object':
        this.selectPreviousObject();
        break;

      case 'cm-show-frame-info':
        {
          let info = {
            'scend-id': this.data.world.frameInfo.scene,
            frame: this.data.world.frameInfo.frame
          };

          if (this.data.world.frameInfo.sceneMeta.desc) {
            info = {
              ...info,
              ...this.data.world.frameInfo.sceneMeta.desc
            };
          }

          this.infoBox.show('Frame info - ' + this.data.world.frameInfo.scene, JSON.stringify(info, null, '<br>'));
        }
        break;

      case 'cm-show-stat':
        {
          const scene = this.data.world.frameInfo.scene;
          objIdManager.loadObjIdsOfScenes(scene, (objs) => {
            const info = {
              objects: objs.length,
              boxes: objs.reduce((a, b) => a + b.count, 0),
              frames: this.data.world.frameInfo.sceneMeta.frames.length
            };

            this.infoBox.show('Stat - ' + scene, JSON.stringify(info, null, '<br>'));
          });
        }
        break;
        /// object

      case 'cm-check-3d-labels':
        {
          const scene = this.data.world.frameInfo.scene;
          check3dLabels(scene);
          logger.show();
          logger.errorBtn.onclick();
        }
        break;

      case 'cm-check-2d-labels':
          {
            const scene = this.data.world.frameInfo.scene;
            check2dLabels(scene);
            logger.show();
            logger.errorBtn.onclick();
          }
          break;

      case 'cm-show-all-objs':
        this.editBatch(this.data.world.frameInfo.scene, this.data.world.frameInfo.frame)
        break;

      case 'cm-reset-view':
        this.resetView();
        break;
      case 'cm-delete':
        this.remove_selected_box();
        this.header.updateModifiedStatus();
        break;

      case 'cm-edit-multiple-instances':
        this.enterBatchEditMode();

        break;
      case 'cm-auto-ann-background':
        this.autoAnnInBackground();
        break;
      case 'cm-interpolate-background':
        this.interpolateInBackground();
        break;
      case 'cm-show-trajectory':

        this.showTrajectory();
        break;

      case 'cm-select-as-ref':
        if (!this.selectedBox.obj_id) {
          this.infoBox.show('Error', 'Please assign object track ID.');
          return false;
        } else {
          this.autoAdjust.mark_bbox(this.selectedBox);
        }
        break;

      case 'cm-change-id-to-ref':
        if (!this.ensureRefObjExist()) { break; }

        this.setObjectId(this.autoAdjust.marked_object.ann.obj_id);
        this.fastToolBox.setValue(this.selectedBox.obj_type,
          this.selectedBox.obj_id,
          this.selectedBox.obj_attr);

        break;
      case 'cm-change-id-to-ref-in-scene':

        if (!this.ensureBoxTrackIdExist()) { break; }
        if (!this.ensurePreloaded()) { break; }
        if (!this.ensureRefObjExist()) { break; }

        this.data.worldList.forEach(w => {
          const box = w.annotation.boxes.find(b => b.obj_id === this.selectedBox.obj_id && b.obj_type === this.selectedBox.obj_type);
          if (box && box !== this.selectedBox) {
            box.obj_id = this.autoAdjust.marked_object.ann.obj_id;
            w.annotation.setModified();
          }
        });

        this.setObjectId(this.autoAdjust.marked_object.ann.obj_id);
        this.fastToolBox.setValue(this.selectedBox.obj_type,
          this.selectedBox.obj_id,
          this.selectedBox.obj_attr);

        break;
      case 'cm-follow-ref':

        if (!this.ensureBoxTrackIdExist()) { break; }
        if (!this.ensurePreloaded()) { break; }
        this.autoAdjust.followsRef(this.selectedBox);
        this.header.updateModifiedStatus();
        this.editBatch(
          this.data.world.frameInfo.scene,
          this.data.world.frameInfo.frame,
          this.selectedBox.obj_id,
          this.selectedBox.obj_type
        );
        break;
      case 'cm-follow-static-objects':
        if (!this.ensureBoxTrackIdExist()) { break; }
        if (!this.ensurePreloaded()) { break; }
        this.autoAdjust.followStaticObjects(this.selectedBox);
        this.header.updateModifiedStatus();

        this.editBatch(
          this.data.world.frameInfo.scene,
          this.data.world.frameInfo.frame,
          this.selectedBox.obj_id,
          this.selectedBox.obj_type
        );

        break;
      case 'cm-sync-followers':

        if (!this.ensurePreloaded()) { break; }
        this.autoAdjust.syncFollowers(this.selectedBox);
        this.header.updateModifiedStatus();
        this.render();
        break;

      case 'cm-delete-obj':

        this.infoBox.show(
          'Confirm',
          'Delete all instances of this object?',
          ['yes', 'no'],
          (btn) => {
            if (btn === 'yes') {
              // let saveList=[];
              this.data.worldList.forEach(w => {
                const box = w.annotation.boxes.find(b => b.obj_id === this.selectedBox.obj_id);
                if (box && box !== this.selectedBox) {
                  w.annotation.unload_box(box);
                  w.annotation.removeBox(box);
                  // saveList.push(w);
                  w.annotation.setModified();
                }
              });

              // saveWorldList(saveList);
              this.remove_selected_box();
              this.header.updateModifiedStatus();
            }
          });
        break;

      case 'cm-modify-obj-type':
        if (!this.ensurePreloaded()) { break; }
        // let saveList=[];
        this.data.worldList.forEach(w => {
          const box = w.annotation.boxes.find(b => b.obj_id === this.selectedBox.obj_id);
          if (box && box !== this.selectedBox) {
            box.obj_type = this.selectedBox.obj_type;
            box.obj_attr = this.selectedBox.obj_attr;
            box.world.lidar.setBoxPointsColor(box);
            box.world.lidar.updatePointsColor();
            box.world.annotation.color_box(box);
            // saveList.push(w);
            w.annotation.setModified();
          }
        });

        // saveWorldList(saveList);
        this.header.updateModifiedStatus();

        break;

      case 'cm-modify-obj-size':
        if (!this.ensurePreloaded()) { break; }
        // let saveList=[];
        this.data.worldList.forEach(w => {
          const box = w.annotation.boxes.find(b => b.obj_id === this.selectedBox.obj_id);
          if (box && box !== this.selectedBox) {
            box.scale.x = this.selectedBox.scale.x;
            box.scale.y = this.selectedBox.scale.y;
            box.scale.z = this.selectedBox.scale.z;
            // saveList.push(w);
            // this.data.world.lidar.setBoxPointsColor(box);
            w.annotation.setModified();
          }
        });

        // saveWorldList(saveList);
        this.header.updateModifiedStatus();
        break;

      case 'cm-reset-obj-size':
        {
          const objType = this.selectedBox.obj_type;
          const objCfg = globalObjectCategory.getObjCfgByType(objType);

          this.selectedBox.scale.x = objCfg.size[0];
          this.selectedBox.scale.y = objCfg.size[1];
          this.selectedBox.scale.z = objCfg.size[2];
          this.onBoxChanged(this.selectedBox);
        }
        break;
      default:
        console.log('unhandled', event.currentTarget.id, event.type);
    }

    return true;
  };

  this.selectBoxById = function (targetTrackId) {
    const box = this.data.world.annotation.findBoxByTrackId(targetTrackId);

    if (box) {
      if (this.selectedBox !== box) {
        this.selectBox(box);
      }
    } else {
      this.unselectBox();
      this.unselectBox();
    }
  };

  // this.animate= function() {
  //     let self=this;
  //     requestAnimationFrame( function(){self.animate();} );
  //     this.viewManager.mainView.orbit_orth.update();
  // };

  this.render = function () {
    this.viewManager.mainView.render();
    this.boxEditor.boxView.render();

    this.floatLabelManager.updateAllPosition();
    if (this.selectedBox) {
      this.fastToolBox.setPos(this.floatLabelManager.getLabelEditorPos(this.selectedBox.objLocalId));
    }
  };

  this.resetView = function (targetPos) {
    if (!targetPos) {
      const center = this.data.world.lidar.computeCenter();
      targetPos = { ...center };// {x:0, y:0, z:50};
      targetPos.z += 50;
    } else { targetPos.z = 50; }

    const pos = this.data.world.lidarPosToScene(targetPos);
    this.viewManager.mainView.orbit.object.position.set(pos.x, pos.y, pos.z); // object is camera
    this.viewManager.mainView.orbit.target.set(pos.x, pos.y, 0);
    this.viewManager.mainView.orbit.update();
    this.render();
  };

  this.scene_changed = async function (sceneName) {
    // var sceneName = event.currentTarget.value;

    if (sceneName.length === 0) {
      return;
    }

    console.log('choose sceneName ' + sceneName);
    let meta = this.data.getMetaBySceneName(sceneName);

    if (!meta) {
      this.editorUi.querySelector('#frame-selector').innerHTML = '<option>--frame--</option>';
      meta = await this.data.readSceneMetaData(sceneName);
    }

    const frameSelectorStr = meta.frames.map(function (f) {
      return '<option value=' + f + '>' + f + '</option>';
    }).reduce(function (x, y) { return x + y; }, '<option>--frame--</option>');

    this.editorUi.querySelector('#frame-selector').innerHTML = frameSelectorStr;

    if (meta.camera) {
      const cameraList = meta.camera.map(x => 'camera:' + x).concat(meta.aux_camera.map(c => 'aux_camera:' + c));

      this.imageContextManager.updateCameraList(cameraList);
    }

    // loadObjIdsOfScenes(sceneName);
  };

  this.frame_changed = function (event) {
    let sceneName = this.editorUi.querySelector('#scene-selector').value;

    if (sceneName.length === 0 && this.data.world) {
      sceneName = this.data.world.frameInfo.scene;
    }

    if (sceneName.length === 0) {
      return;
    }

    const frame = event.currentTarget.value;
    console.log(sceneName, frame);
    this.loadWorld(sceneName, frame);
    event.currentTarget.blur();
  };

  this.ensureBoxTrackIdExist = function () {
    if (!this.selectedBox) {
      return false;
    }

    if (!this.selectedBox.obj_id) {
      this.infoBox.show('Error', 'Please assign object track ID.');
      return false;
    }

    return true;
  };

  this.ensureRefObjExist = function () {
    if (!this.autoAdjust.marked_object) {
      this.infoBox.show('Notice', 'No reference object was selected');
      return false;
    }

    return true;
  };

  this.ensurePreloaded = function () {
    let worldList = this.data.worldList.filter(w => w.frameInfo.scene === this.data.world.frameInfo.scene);
    worldList = worldList.sort((a, b) => a.frameInfo.frameIndex - b.frameInfo.frameIndex);

    // const meta = this.data.getCurrentWorldSceneMeta();

    const allLoaded = worldList.map(w => w.preloaded()).reduce((a, b) => a && b, true);

    if (!allLoaded) {
      this.data.forcePreloadScene(this.data.world.frameInfo.scene, this.data.world);

      this.infoBox.show('Notice',
        'Loading scene in background. Please try again later.');
      return false;
    }

    return true;
  };

  this.interpolateInBackground = function () {
    if (!this.ensureBoxTrackIdExist()) { return; }

    if (!this.ensurePreloaded()) { return; }

    let worldList = this.data.worldList.filter(w => w.frameInfo.scene === this.data.world.frameInfo.scene);
    worldList = worldList.sort((a, b) => a.frameInfo.frameIndex - b.frameInfo.frameIndex);
    const boxList = worldList.map(w => w.annotation.findBoxByTrackId(this.selectedBox.obj_id));

    const applyIndList = boxList.map(b => true);
    this.boxOp.interpolateAsync(worldList, boxList, applyIndList).then(ret => {
      this.header.updateModifiedStatus();
      this.viewManager.render();
    });
  };
  this.enterBatchEditMode = function () {
    if (!this.ensureBoxTrackIdExist()) { return; }

    if (!this.ensurePreloaded()) { return; }

    this.header.setObject(this.selectedBox.obj_id);

    this.editBatch(
      this.data.world.frameInfo.scene,
      this.data.world.frameInfo.frame,
      this.selectedBox.obj_id,
      this.selectedBox.obj_type
    );
  };

  this.autoAnnInBackground = function () {
    if (!this.ensureBoxTrackIdExist()) { return; }

    if (!this.ensurePreloaded()) { return; }

    let worldList = this.data.worldList.filter(w => w.frameInfo.scene === this.data.world.frameInfo.scene);
    worldList = worldList.sort((a, b) => a.frameInfo.frameIndex - b.frameInfo.frameIndex);

    const boxList = worldList.map(w => w.annotation.findBoxByTrackId(this.selectedBox.obj_id));

    const onFinishOneBox = (i) => {
      this.viewManager.render();
    };
    const applyIndList = boxList.map(b => true);
    const dontRotate = false;

    this.boxOp.interpolateAndAutoAdjustAsync(worldList, boxList, onFinishOneBox, applyIndList, dontRotate).then(ret => {
      this.header.updateModifiedStatus();
    });
  };

  this.editBatch = function (sceneName, frame, objectTrackId, objectType) {
    // this.keydownDisabled = true;
    // hide something
    this.imageContextManager.hide();
    this.floatLabelManager.hide();
    this.fastToolBox.hide();

    // this.floatLabelManager.showFastToolbox();

    this.viewManager.mainView.disable();
    this.boxEditor.hide();
    this.hideGridLines();
    // this.controlGui.hide();
    this.editorUi.querySelector('#selectors').style.display = 'none';
    // this.editorUi.querySelector("#object-selector").style.display='none';
    this.currentMainEditor = this.boxEditorManager;

    this.boxEditorManager.edit(this.data,
      this.data.getMetaBySceneName(sceneName),
      frame,
      objectTrackId,
      objectType,
      (targetFrame, targetTrackId) => { // on exit
        this.currentMainEditor = this;
        // this.keydownDisabled = false;
        this.viewManager.mainView.enable();

        this.imageContextManager.show();
        this.floatLabelManager.show();

        if (targetTrackId) { 
          this.viewState.lockObjTrackId = targetTrackId; 
        }

        this.onLoadWorldFinished(this.data.world);

        // if (this.selectedBox){
        //     // attach again, restore box.boxEditor
        //     // obj type/id may have changed in batch mode
        //     this.floatLabelManager.setObjectTrackId(this.selectedBox.objLocalId, this.selectedBox.obj_id);
        //     this.boxEditor.attachBox(this.selectedBox);
        //     this.boxEditor.update();

        //     // update fasttoolbox
        //     this.fastToolBox.setValue(this.selectedBox.obj_type, this.selectedBox.obj_id, this.selectedBox.obj_attr);
        // }

        this.showGridLines();
        this.render();
        // this.controlGui.show();
        this.editorUi.querySelector('#selectors').style.display = 'inherit';

        if (targetFrame) {
          this.loadWorld(this.data.world.frameInfo.scene, targetFrame, () => { // onfinished
            this.makeVisible(targetTrackId);
          });
        }
      }
    );
  };

  this.gotoObjectFrame = function (frame, objId) {
    this.loadWorld(this.data.world.frameInfo.scene, frame, () => { // onfinished
      this.makeVisible(objId);
    });
  };

  this.makeVisible = function (targetTrackId) {
    const box = this.data.world.annotation.findBoxByTrackId(targetTrackId);

    if (box) {
      if (this.selectedBox !== box) {
        this.selectBox(box);
      }

      this.resetView({ x: box.position.x, y: box.position.y, z: 50 });
    }
  };

  this.object_changed = function (event) {
    const sceneName = this.data.world.frameInfo.scene; // this.editorUi.querySelector("#scene-selector").value;

    const objectTrackId = event.currentTarget.value;
    const obj = objIdManager.getObjById(objectTrackId);

    this.editBatch(sceneName, null, objectTrackId, obj.category);
  };

  this.downloadWebglScreenShot = function () {
    const link = document.createElement('a');
    link.download = `${this.data.world.frameInfo.scene}-${this.data.world.frameInfo.frame}-webgl`;
    link.href = this.renderer.domElement.toDataURL('image/png', 1);
    link.click();
  };

  this.showLog = function () {

  };

  this.annotateByAlg1 = function () {
    autoAnnotate(this.data.world, () => this.onLoadWorldFinished(this.data.world));
  };

  this.objectTypeChanged = function (event) {
    if (this.selectedBox) {
      const category = event.currentTarget.value;

      this.selectedBox.obj_type = category;
      this.floatLabelManager.setObjectType(this.selectedBox.objLocalId, this.selectedBox.obj_type);
      // this.header.mark_changed_flag();
      // this.updateBoxPointsColor(this.selectedBox);
      // this.imageContextManager.boxManager.update_obj_type(this.selectedBox.objLocalId, this.selectedBox.obj_type);

      // this.render();
      this.onBoxChanged(this.selectedBox);

      // todo: we don't know if the old one is already deleted.
      // could use object count number?
      objIdManager.addObject({
        category: this.selectedBox.obj_type,
        id: this.selectedBox.obj_id
      });
    }
  };

  this.setObjectId = function (id) {
    this.selectedBox.obj_id = id;
    this.floatLabelManager.setObjectTrackId(this.selectedBox.objLocalId, this.selectedBox.obj_id);

    this.viewState.lockObjTrackId = id;
    this.header.setCurrentObject(id);

    // this.header.mark_changed_flag();
    this.onBoxChanged(this.selectedBox);

    //
    objIdManager.addObject({
      category: this.selectedBox.obj_type,
      id: this.selectedBox.obj_id
    });
  };

  this.objectIdChanged = function (event) {
    if (this.selectedBox) {
      const id = event.currentTarget.value;
      this.setObjectId(id);
    }
  };

  this.objectAttributeChanged = function (value) {
    if (this.selectedBox) {
      this.selectedBox.obj_attr = value;
      this.floatLabelManager.setObjectAttr(this.selectedBox.objLocalId, value);
      this.data.world.annotation.setModified();
      this.header.updateModifiedStatus();
    }
  };

  // this.updateSubviewRangeByWindowResize= function(box){

  //     if (box === null)
  //         return;

  //     if (box.boxEditor)
  //         box.boxEditor.onWindowResize();

  //     this.render();
  // };

  this.handleRightClick = function (event) {
    // select new object

    if (!this.data.world) {
      return;
    }

    if (event.shiftKey || event.ctrlKey) {
      // if ctrl or shift hold, don't select any object.
      this.contextMenu.show('world', event.layerX, event.layerY, this);
      return;
    }

    const intersects = this.mouse.getIntersects(this.mouse.onUpPosition, this.data.world.annotation.boxes);
    if (intersects.length > 0) {
      // var object = intersects[ 0 ].object;
      const object = intersects[0].object;
      let targetObj = object.userData.object;
      if (targetObj === undefined) {
        // helper
        targetObj = object;
      }

      if (targetObj !== this.selectedBox) {
        this.selectBox(targetObj);
      }

      // this.hideWorldContextMenu();
      // this.showObjectContextMenu(event.layerX, event.layerY);
      this.contextMenu.show('object', event.layerX, event.layerY, this);
    } else {
      // if no object is selected, popup context menu
      // var pos = getMousePosition(renderer.domElement, event.clientX, event.clientY );
      this.contextMenu.show('world', event.layerX, event.layerY, this);
    }
  };

  this.showWorldContextMenu = function (posX, posY) {
    const menu = this.editorUi.querySelector('#context-menu');
    menu.style.display = 'inherit';
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';
    this.editorUi.querySelector('#context-menu-wrapper').style.display = 'block';
  };

  this.hideWorldContextMenu = function () {
    const menu = this.editorUi.querySelector('#context-menu');
    menu.style.display = 'none';
  };

  this.showObjectContextMenu = function (posX, posY) {
    const menu = this.editorUi.querySelector('#object-context-menu');
    menu.style.display = 'inherit';
    menu.style.left = posX + 'px';
    menu.style.top = posY + 'px';
    this.editorUi.querySelector('#context-menu-wrapper').style.display = 'block';
  };

  this.hideObjectContextMenu = function () {
    const menu = this.editorUi.querySelector('#object-context-menu');
    menu.style.display = 'none';
  };

  this.onImgClick = function (lidarPointIndices) {
    console.log(lidarPointIndices);

    const self = this;
    const objType = 'Car';
    this.data.world.lidar.setSpecPontsColor(lidarPointIndices, { x: 0, y: 0, z: 1 });
    this.data.world.lidar.updatePointsColor();
    this.render();
    // return;

    const pos = this.data.world.lidar.getCentroid(lidarPointIndices);
    pos.z = 0;

    const rotation = { x: 0, y: 0, z: this.viewManager.mainView.camera.rotation.z + Math.PI / 2 };

    const objCfg = globalObjectCategory.getObjCfgByType(objType);
    const scale = {
      x: objCfg.size[0],
      y: objCfg.size[1],
      z: objCfg.size[2]
    };

    const box = this.addBox(pos, scale, rotation, objType, '');
    self.boxOp.auto_rotate_xyz(box, null, null, function (b) {
      self.onBoxChanged(b);
    });

    /*
        var box = this.data.world.lidar.createBoxByPoints(lidar_point_indices, this.viewManager.mainView.camera);

        this.scene.add(box);

        this.imageContextManager.boxManager.addBox(box);

        this.boxOp.auto_shrink_box(box);

        // guess obj type here

        box.obj_type = guessObjTypeByDimension(box.scale);

        this.floatLabelManager.addLabel(box);

        this.selectBox(box);
        this.onBoxChanged(box);

        this.boxOp.auto_rotate_xyz(box, function(){
            box.obj_type = guessObjTypeByDimension(box.scale);
            self.floatLabelManager.setObjectType(box.objLocalId, box.obj_type);
            self.floatLabelManager.update_label_editor(box.obj_type, box.obj_id);
            self.onBoxChanged(box);
        });
        */
  };

  this.handleSelectRect = function (x, y, w, h, ctrl, shift) {
    // y = y+h;
    // x = x*2-1;
    // y = -y*2+1;
    // w *= 2;
    // h *= 2;

    // x,y: start cornor, w: width, h: height

    /*
        console.log("main select rect", x,y,w,h);

        this.viewManager.mainView.camera.updateProjectionMatrix();
        this.data.world.selectPointsByViewRect(x,y,w,h, this.viewManager.mainView.camera);
        render();
        render2dImage();
        */

    // check if any box is inside the rectangle

    this.viewManager.mainView.camera.updateProjectionMatrix();

    const boxes = this.data.world.annotation.findBoxesInsideRect(x, y, w, h, this.viewManager.mainView.camera);
    if (boxes.length > 0) {
      if (boxes.length === 1) {
        this.selectBox(boxes[0]);
      } else {
        // this is dangerous
        // for (let b in boxes){
        //     this.removeBox(boxes[b],false)
        // }
        // this.render();
      }

      return;
    }

    const points = this.data.world.lidar.selectPointsByViewRect(x, y, w, h, this.viewManager.mainView.camera);

    // show color
    // this.render();

    // return;
    // // create new box
    // var self=this;
    // let centerPos = this.mouse.getScreenLocationInWorld(x + w / 2, y + h / 2);
    // centerPos = this.data.world.scenePosToLidar(centerPos);

    const initRoationZ = this.viewManager.mainView.camera.rotation.z + Math.PI / 2;

    const box = this.createBoxByPoints(points, initRoationZ);

    const id = objIdManager.generateNewUniqueId(this.data.world);
    box.obj_id = id;

    // this.scene.add(box);

    if (!shift) {
      try {
        this.boxOp.auto_shrink_box(box);
      } catch (e) {
        logger.log(e);
      }
    }

    // guess obj type here

    box.obj_type = globalObjectCategory.guessObjTypeByDimension(box.scale);

    objIdManager.addObject({
      category: box.obj_type,
      id: box.obj_id
    });

    this.imageContextManager.boxManager.addBox(box);
    this.floatLabelManager.addLabel(box);

    this.selectBox(box);
    this.onBoxChanged(box);

    if (!shift) {
      this.boxOp.auto_rotate_xyz(box, () => {
        box.obj_type = globalObjectCategory.guessObjTypeByDimension(box.scale);
        this.floatLabelManager.setObjectType(box.objLocalId, box.obj_type);
        this.fastToolBox.setValue(box.obj_type, box.obj_id, box.obj_attr);
        this.onBoxChanged(box);
      });
    }

    // floatLabelManager.addLabel(box);
  };

  this.createBoxByPoints = function (points, rotationZ) {
    const localRot = this.data.world.sceneRotToLidar(new THREE.Euler(0, 0, rotationZ, 'XYZ'));

    const transToBoxMatrix = new THREE.Matrix4().makeRotationFromEuler(localRot)
      .setPosition(0, 0, 0)
      .invert();

    // var trans = transpose(eulerAngleToRotationMatrix({x:0,y:0,z:rotation_z}, {x:0, y:0, z:0}), 4);

    const relativePosition = [];
    const v = new THREE.Vector3();
    points.forEach(function (p) {
      v.set(p[0], p[1], p[2]);
      const boxP = v.applyMatrix4(transToBoxMatrix);
      relativePosition.push([boxP.x, boxP.y, boxP.z]);
    });

    const relativeExtreme = vectorRange(relativePosition);
    const scale = {
      x: relativeExtreme.max[0] - relativeExtreme.min[0],
      y: relativeExtreme.max[1] - relativeExtreme.min[1],
      z: relativeExtreme.max[2] - relativeExtreme.min[2]
    };

    // enlarge scale a little

    const center = this.boxOp.translateBoxInBoxCoord(
      localRot,
      {
        x: (relativeExtreme.max[0] + relativeExtreme.min[0]) / 2,
        y: (relativeExtreme.max[1] + relativeExtreme.min[1]) / 2,
        z: (relativeExtreme.max[2] + relativeExtreme.min[2]) / 2
      }
    );

    return this.data.world.annotation.addBox(center, scale, localRot, 'Unknown', '');
  };

  this.handleLeftClick = function (event) {
    if (event.ctrlKey) {
      // Ctrl+left click to smart paste!
      // smart_paste();
    } else {
      // select box /unselect box
      if (!this.data.world || (!this.data.world.annotation.boxes && this.data.world.radars.radarList.length === 0)) {
        return;
      }

      let allBoxes = this.data.world.annotation.boxes.concat(this.data.world.radars.getAllBoxes());
      allBoxes = allBoxes.concat(this.data.world.aux_lidars.getAllBoxes());

      let intersects = this.mouse.getIntersects(this.mouse.onUpPosition, allBoxes);

      if (intersects.length === 0) {
        if (this.data.world.radar_box) {
          intersects = this.mouse.getIntersects(this.mouse.onUpPosition, [this.data.world.radar_box]);
        }
      }

      if (intersects.length > 0) {
        // var object = intersects[ 0 ].object;
        const object = intersects[0].object;
        if (object.userData.object !== undefined) {
          // helper
          this.selectBox(object.userData.object);
        } else {
          this.selectBox(object);
        }
      } else {
        this.unselectBox(null);
      }

      // render();
    }
  };

  this.select_locked_object = function () {
    const self = this;
    if (this.viewState.lockObjTrackId !== '') {
      const box = this.data.world.annotation.boxes.find(function (x) {
        return x.obj_id === self.viewState.lockObjTrackId;
      });

      if (box) {
        this.selectBox(box);

        if (self.viewState.lockObjInHighlight) {
          this.focusOnBox(box);
        }
      }
    }
  };

  // new_object
  this.unselectBox = function (newObject, keepLock) {
    if (newObject === null) {
      if (this.viewManager.mainView && this.viewManager.mainView.transformControl.visible) {
        // unselect first time
        this.viewManager.mainView.transformControl.detach();
      } else {
        // unselect second time
        if (this.selectedBox) {
          // restore from highlight
          if (this.selectedBox.in_highlight) {
            this.cancelFocus(this.selectedBox);

            if (!keepLock) {
              this.viewState.lockObjInHighlight = false;
            }
          } else {
            // unselected finally
            // this.selectedBox.material.color = new THREE.Color(parseInt("0x"+getObjCfgByType(this.selectedBox.obj_type).color.slice(1)));
            // this.selectedBox.material.opacity = this.data.cfg.box_opacity;
            this.boxOp.unhighlightBox(this.selectedBox);
            // this.floatLabelManager.unselect_box(this.selectedBox.objLocalId, this.selectedBox.obj_type);
            this.fastToolBox.hide();

            if (!keepLock) {
              this.viewState.lockObjTrackId = '';
              this.header.unsetCurrentObject();
            }

            this.imageContextManager.boxManager.onBoxUnselected(this.selectedBox.objLocalId, this.selectedBox.obj_type);
            this.selectedBox = null;
            this.boxEditor.detach();

            this.onSelectedBoxChanged(null);
          }
        } else {
          // just an empty click
          return;
        }
      }
    } else {
      // selected other box
      // unselect all
      this.viewManager.mainView.transformControl.detach();

      if (this.selectedBox) {
        // restore from highlight

        if (this.selectedBox.in_highlight) {
          this.cancelFocus(this.selectedBox);
          if (!keepLock) {
            this.viewState.lockObjInHighlight = false;
          }
        }

        this.selectedBox.material.color = new THREE.Color(parseInt('0x' + globalObjectCategory.getObjCfgByType(this.selectedBox.obj_type).color.slice(1)));
        this.selectedBox.material.opacity = this.data.cfg.box_opacity;
        // this.floatLabelManager.unselect_box(this.selectedBox.objLocalId);
        this.fastToolBox.hide();
        this.imageContextManager.boxManager.onBoxUnselected(this.selectedBox.objLocalId, this.selectedBox.obj_type);

        this.selectedBox = null;
        this.boxEditor.detach();
        if (!keepLock) {
          this.viewState.lockObjTrackId = '';
          this.header.unsetCurrentObject();
        }
      }
    }

    this.render();
  };

  this.selectBox = function (object) {
    if (this.selectedBox !== object) {
      // unselect old bbox

      let inHighlight = false;

      if (this.selectedBox) {
        inHighlight = this.selectedBox.in_highlight;
        this.unselectBox(this.selectedBox);
      }

      // select me, the first time
      this.selectedBox = object;

      // switch camera
      if (!this.editorCfg.disableMainImageContext) {
        const bestCamera = this.imageContextManager.chooseBestCameraForPoint(
          this.selectedBox.world,
          this.selectedBox.position);

        if (bestCamera) {
          // var image_changed = this.data.set_active_image(best_camera);

          // if (image_changed){
          //     this.editorUi.querySelector("#camera-selector").value=best_camera;
          //     this.imageContextManager.boxManager.displayImage();
          // }

          this.imageContextManager.setBestCamera(bestCamera);
        }
      }

      // highlight box
      // shold change this id if the current selected box changed id.
      this.viewState.lockObjTrackId = object.obj_id;
      this.header.setCurrentObject(object.obj_id);

      // this.floatLabelManager.select_box(this.selectedBox.objLocalId);

      this.fastToolBox.setPos(this.floatLabelManager.getLabelEditorPos(this.selectedBox.objLocalId));
      this.fastToolBox.setValue(object.obj_type, object.obj_id, object.obj_attr);
      this.fastToolBox.show(this.handleFastToolboxEvent);

      this.boxOp.highlightBox(this.selectedBox);

      if (inHighlight) {
        this.focusOnBox(this.selectedBox);
      }

      this.save_box_info(object); // this is needed since when a frame is loaded, all box haven't saved anything.
      // we could move this to when a frame is loaded.
      this.boxEditor.attachBox(object);
      this.onSelectedBoxChanged(object);
    } else {
      // reselect the same box
      if (this.viewManager.mainView.transformControl.visible) {
        this.change_transform_control_view();
      } else {
        // select me the second time
        // object.add(this.viewManager.mainView.transformControl);
        this.viewManager.mainView.transformControl.attach(object);
      }
    }

    this.render();
  };

  this.adjustContainerSize = function () {
    const editorRect = this.editorUi.getBoundingClientRect();
    const headerRect = this.editorUi.querySelector('#header').getBoundingClientRect();

    this.container.style.height = editorRect.height - headerRect.height + 'px';
  };

  this.onWindowResize = function () {
    this.adjustContainerSize();
    this.boxEditorManager.onWindowResize();

    // use clientwidth and clientheight to resize container
    // but use scrollwidth/height to place other things.
    if (this.windowWidth !== this.container.clientWidth || this.windowHeight !== this.container.clientHeight) {
      // update_mainview();
      if (this.viewManager.mainView) { this.viewManager.mainView.onWindowResize(); }

      if (this.boxEditor) { this.boxEditor.update('dontrender'); }

      this.windowWidth = this.container.clientWidth;
      this.windowHeight = this.container.clientHeight;
      this.renderer.setSize(this.windowWidth, this.windowHeight);

      // this.viewManager.updateViewPort();

      // update sideview svg if there exists selected box
      // the following update is called in updateSubviewRangeByWindowResize
      // if (this.selectedBox){
      //     this.projectiveViewOps.updateViewHandle(this.selectedBox);
      // }
    }

    this.viewManager.render();
  };

  this.change_transform_control_view = function () {
    if (this.viewManager.mainView.transformControl.mode === 'scale') {
      this.viewManager.mainView.transformControl.setMode('translate');
      this.viewManager.mainView.transformControl.showY = true;
      this.viewManager.mainView.transformControl.showX = true;
      this.viewManager.mainView.transformControl.showz = true;
    } else if (this.viewManager.mainView.transformControl.mode === 'translate') {
      this.viewManager.mainView.transformControl.setMode('rotate');
      this.viewManager.mainView.transformControl.showY = false;
      this.viewManager.mainView.transformControl.showX = false;
      this.viewManager.mainView.transformControl.showz = true;
    } else if (this.viewManager.mainView.transformControl.mode === 'rotate') {
      this.viewManager.mainView.transformControl.setMode('scale');
      this.viewManager.mainView.transformControl.showY = true;
      this.viewManager.mainView.transformControl.showX = true;
      this.viewManager.mainView.transformControl.showz = true;
    }
  };

  this.add_box_on_mouse_pos_by_ref = function () {
    const globalP = this.mouse.getMouseLocationInWorld();
    // trans pos to world local pos
    const pos = this.data.world.scenePosToLidar(globalP);

    const refbox = this.autoAdjust.marked_object.ann;
    pos.z = refbox.psr.position.z;

    let id = refbox.obj_id;

    if (this.autoAdjust.marked_object.frame === this.data.world.frameInfo.frame) {
      id = '';
    }

    const box = this.addBox(pos, refbox.psr.scale, refbox.psr.rotation, refbox.obj_type, id, refbox.obj_attr);

    return box;
  };

  this.addBoxOnMousePosition = function (objType) {
    // todo: move to this.data.world
    const globalP = this.mouse.getMouseLocationInWorld();

    // trans pos to world local pos
    const pos = this.data.world.scenePosToLidar(globalP);

    let rotation = new THREE.Euler(0, 0, this.viewManager.mainView.camera.rotation.z + Math.PI / 2, 'XYZ');
    rotation = this.data.world.sceneRotToLidar(rotation);

    const objCfg = globalObjectCategory.getObjCfgByType(objType);
    const scale = {
      x: objCfg.size[0],
      y: objCfg.size[1],
      z: objCfg.size[2]
    };

    const groundLevel = this.data.world.lidar.computeGroundLevel({
      position: pos,
      scale, 
      rotation
    });

    console.log("ground level", groundLevel);

    pos.z = groundLevel + scale.z / 2; // -1.8 is height of lidar

    const id = objIdManager.generateNewUniqueId(this.data.world);

    objIdManager.addObject({
      category: objType,
      id
    });

    const box = this.addBox(pos, scale, rotation, objType, id);

    return box;
  };

  this.addBox = function (pos, scale, rotation, objType, objId, objAttr) {
    const box = this.data.world.annotation.addBox(pos, scale, rotation, objType, objId, objAttr);

    this.floatLabelManager.addLabel(box);

    this.imageContextManager.boxManager.addBox(box);

    this.selectBox(box);
    return box;
  };

  this.save_box_info = function (box) {
    box.last_info = {
      // obj_type: box.obj_type,
      position: {
        x: box.position.x,
        y: box.position.y,
        z: box.position.z
      },
      rotation: {
        x: box.rotation.x,
        y: box.rotation.y,
        z: box.rotation.z
      },
      scale: {
        x: box.scale.x,
        y: box.scale.y,
        z: box.scale.z
      }
    };
  };

  // axix, xyz, action: scale, move, direction, up/down
  this.transform_bbox = function (command) {
    if (!this.selectedBox) { return; }

    switch (command) {
      case 'x_move_up':
        this.boxOp.translateBox(this.selectedBox, 'x', 0.05);
        break;
      case 'x_move_down':
        this.boxOp.translateBox(this.selectedBox, 'x', -0.05);
        break;
      case 'x_scale_up':
        this.selectedBox.scale.x *= 1.01;
        break;
      case 'x_scale_down':
        this.selectedBox.scale.x /= 1.01;
        break;

      case 'y_move_up':
        this.boxOp.translateBox(this.selectedBox, 'y', 0.05);
        break;
      case 'y_move_down':
        this.boxOp.translateBox(this.selectedBox, 'y', -0.05);
        break;
      case 'y_scale_up':
        this.selectedBox.scale.y *= 1.01;
        break;
      case 'y_scale_down':
        this.selectedBox.scale.y /= 1.01;
        break;

      case 'z_move_up':
        this.selectedBox.position.z += 0.05;
        break;
      case 'z_move_down':
        this.selectedBox.position.z -= 0.05;
        break;
      case 'z_scale_up':
        this.selectedBox.scale.z *= 1.01;
        break;
      case 'z_scale_down':
        this.selectedBox.scale.z /= 1.01;
        break;

      case 'z_rotate_left':
        this.selectedBox.rotation.z += 0.01;
        break;
      case 'z_rotate_right':
        this.selectedBox.rotation.z -= 0.01;
        break;

      case 'z_rotate_reverse':

        if (this.selectedBox.rotation.z > 0) {
          this.selectedBox.rotation.z -= Math.PI;
        } else {
          this.selectedBox.rotation.z += Math.PI;
        }

        // {
        //     this.selectedBox.rotation.z += Math.PI/2;
        //     this.selectedBox.rotation.z %= Math.PI*2;

        //     let temp = this.selectedBox.scale.x;
        //     this.selectedBox.scale.x = this.selectedBox.scale.y;
        //     this.selectedBox.scale.y = temp;
        // }

        break;

      case 'reset':
        this.selectedBox.rotation.x = 0;
        this.selectedBox.rotation.y = 0;
        this.selectedBox.rotation.z = 0;
        this.selectedBox.position.z = 0;
        break;
      default:
        console.log('unknown command', command);
        break;
    }

    this.onBoxChanged(this.selectedBox);
  };

  // function switch_bbox_type(target_type){
  //     if (!this.selectedBox)
  //         return;

  //     if (!target_type){
  //         target_type = get_next_obj_type_name(this.selectedBox.obj_type);
  //     }

  //     this.selectedBox.obj_type = target_type;
  //     var obj_cfg = getObjCfgByType(target_type);
  //     this.selectedBox.scale.x=obj_cfg.size[0];
  //     this.selectedBox.scale.y=obj_cfg.size[1];
  //     this.selectedBox.scale.z=obj_cfg.size[2];

  //     this.floatLabelManager.setObjectType(this.selectedBox.objLocalId, this.selectedBox.obj_type);
  //     this.floatLabelManager.update_label_editor(this.selectedBox.obj_type, this.selectedBox.obj_id);

  // }

  this.keydown = function (ev) {
    // if (this.keydownDisabled)
    //     return;

    this.operationSTate.key_pressed = true;

    switch (ev.key) {
      case '+':
      case '=':
        this.data.scalePointSize(1.2);
        this.render();
        break;
      case '-':
        this.data.scalePointSize(0.8);
        this.render();
        break;
      case '1':
        this.selectPreviousObject();
        break;
      case '2':
        this.selectNextObject();
        break;
      case '3':
      case 'PageUp':
        this.previousFrame();
        break;
      case 'PageDown':
      case '4':
        this.nextFrame();
        break;
      case 'p':
        this.downloadWebglScreenShot();
        break;

        // case 'v':
        //     this.change_transform_control_view();
        //     break;
        /*
            case 'm':
            case 'M':
                smart_paste();
                break;
            case 'N':
            case 'n':
                //add_bbox();
                //header.mark_changed_flag();
                break;
            case 'B':
            case 'b':
                switch_bbox_type();
                self.header.mark_changed_flag();
                self.onBoxChanged(this.selectedBox);
                break;
            */
      case 'z': // X
        this.viewManager.mainView.transformControl.showX = !this.viewManager.mainView.transformControl.showX;
        break;
      case 'x': // Y
        this.viewManager.mainView.transformControl.showY = !this.viewManager.mainView.transformControl.showY;
        break;
      case 'c': // Z
        if (ev.ctrlKey) {
          this.mark_bbox(this.selectedBox);
        } else {
          this.viewManager.mainView.transformControl.showZ = !this.viewManager.mainView.transformControl.showZ;
        }
        break;
      case ' ': // Spacebar
        // this.viewManager.mainView.transformControl.enabled = ! this.viewManager.mainView.transformControl.enabled;
        this.playControl.pauseResumePlay();
        break;

      case '5':
      case '6':
      case '7':
        this.boxEditor.boxView.views[ev.key - 5].cameraHelper.visible = !this.boxEditor.boxView.views[ev.key - 5].cameraHelper.visible;
        this.render();
        break;

      case 's':
        if (ev.ctrlKey) {
          saveWorldList(this.data.worldList);
        } else if (this.selectedBox) {
          const v = Math.max(this.editorCfg.moveStep * this.selectedBox.scale.x, 0.02);
          this.boxOp.translateBox(this.selectedBox, 'x', -v);
          this.onBoxChanged(this.selectedBox);
        }
        break;
      case 'w':
        if (this.selectedBox) {
          const v = Math.max(this.editorCfg.moveStep * this.selectedBox.scale.x, 0.02);
          this.boxOp.translateBox(this.selectedBox, 'x', v);
          this.onBoxChanged(this.selectedBox);
        }
        break;
      case 'a':
        if (this.selectedBox) {
          const v = Math.max(this.editorCfg.moveStep * this.selectedBox.scale.y, 0.02);
          this.boxOp.translateBox(this.selectedBox, 'y', v);
          this.onBoxChanged(this.selectedBox);
        }
        break;

      case 'q':
        if (this.selectedBox) {
          this.boxOp.rotate_z(this.selectedBox, this.editorCfg.rotateStep, false);
          this.onBoxChanged(this.selectedBox);
        }
        break;
      case 'e':
        if (this.selectedBox) {
          this.boxOp.rotate_z(this.selectedBox, -this.editorCfg.rotateStep, false);
          this.onBoxChanged(this.selectedBox);
        }
        break;
      case 'r':
        if (this.selectedBox) {
          // this.transform_bbox("z_rotate_left");
          this.boxOp.rotate_z(this.selectedBox, this.editorCfg.rotateStep, true);
          this.onBoxChanged(this.selectedBox);
        }
        break;

      case 'f':
        if (this.selectedBox) {
          // this.transform_bbox("z_rotate_right");
          this.boxOp.rotate_z(this.selectedBox, -this.editorCfg.rotateStep, true);
          this.onBoxChanged(this.selectedBox);
        }
        break;
      case 'g':
        this.transform_bbox('z_rotate_reverse');
        break;
      case 't':
        // this.transform_bbox("reset");
        this.showTrajectory();
        break;
      case 'v':
        this.enterBatchEditMode();
        break;
      case 'd':
        if (this.selectedBox) {
          if (ev.ctrlKey) {
            this.remove_selected_box();
            this.header.updateModifiedStatus();
          } else {
            const v = Math.max(this.editorCfg.moveStep * this.selectedBox.scale.y, 0.02);
            this.boxOp.translateBox(this.selectedBox, 'y', -v);
            this.onBoxChanged(this.selectedBox);
          }
        }
        break;
      // case 'd':
      // case 'D':
      //   if (ev.ctrlKey) {
      //     this.remove_selected_box();
      //     this.header.updateModifiedStatus();
      //   }
      //   break;
      case 'Delete':
        this.remove_selected_box();
        this.header.updateModifiedStatus();
        break;
      case 'Escape':
        if (this.selectedBox) {
          this.unselectBox(null);
        }
        break;
      default:
        break;
    }
  };

  this.previousFrame = function () {
    if (!this.data.meta) { return; }

    const sceneMeta = this.data.getCurrentWorldSceneMeta();

    const frameIndex = this.data.world.frameInfo.frameIndex - 1;

    if (frameIndex < 0) {
      console.log('first frame');
      this.infoBox.show('Notice', 'This is the first frame');
      return;
    }

    this.loadWorld(sceneMeta.scene, sceneMeta.frames[frameIndex]);
  };

  this.lastFrame = function () {
    const sceneMeta = this.data.getCurrentWorldSceneMeta();
    this.loadWorld(sceneMeta.scene, sceneMeta.frames[sceneMeta.frames.length - 1]);
  };
  this.firstFrmae = function () {
    const sceneMeta = this.data.getCurrentWorldSceneMeta();
    this.loadWorld(sceneMeta.scene, sceneMeta.frames[0]);
  };

  this.nextFrame = function () {
    if (!this.data.meta) { return; }

    const sceneMeta = this.data.getCurrentWorldSceneMeta();

    const numFrames = sceneMeta.frames.length;

    const frameIndex = (this.data.world.frameInfo.frameIndex + 1);

    if (frameIndex >= numFrames) {
      console.log('last frame');
      this.infoBox.show('Notice', 'This is the last frame');
      return;
    }

    this.loadWorld(sceneMeta.scene, sceneMeta.frames[frameIndex]);
  };

  this.selectNextObject = function () {
    const self = this;
    if (this.data.world.annotation.boxes.length <= 0) { return; }

    if (this.selectedBox) {
      this.operationSTate.boxNavigateIndex = this.data.world.annotation.boxes.findIndex(function (x) {
        return self.selectedBox === x;
      });
    }

    this.operationSTate.boxNavigateIndex += 1;
    this.operationSTate.boxNavigateIndex %= this.data.world.annotation.boxes.length;

    this.selectBox(this.data.world.annotation.boxes[this.operationSTate.boxNavigateIndex]);
  };

  this.selectPreviousObject = function () {
    const self = this;
    if (this.data.world.annotation.boxes.length <= 0) { return; }

    if (this.selectedBox) {
      this.operationSTate.boxNavigateIndex = this.data.world.annotation.boxes.findIndex(function (x) {
        return self.selectedBox === x;
      });
    }

    this.operationSTate.boxNavigateIndex += this.data.world.annotation.boxes.length - 1;
    this.operationSTate.boxNavigateIndex %= this.data.world.annotation.boxes.length;

    this.selectBox(this.data.world.annotation.boxes[this.operationSTate.boxNavigateIndex]);
  };

  // this.centerMainView =function(){
  //     let offset = this.data.world.coordinatesOffset;
  //     this.viewManager.mainView.orbit.target.x += offset[0];
  //     this.viewManager.mainView.orbit.target.y += offset[1];
  //     this.viewManager.mainView.orbit.target.z += offset[2];
  // };

  this.onLoadWorldFinished = function (world) {
    document.title = 'SUSTech POINTS-' + world.frameInfo.scene;
    // switch view positoin
    this.moveAxisHelper(world);
    this.moveRangeCircle(world);
    this.lookAtWorld(world);
    this.unselectBox(null, true);
    this.unselectBox(null, true);
    this.render();
    this.imageContextManager.attachWorld(world);
    this.imageContextManager.render2dImage();
    this.render2dLabels(world);
    this.update_frame_info(world.frameInfo.scene, world.frameInfo.frame);

    this.select_locked_object();

    // loadObjIdsOfScenes(world.frameInfo.scene);
    objIdManager.setCurrentScene(world.frameInfo.scene);

    // preload after the first world loaded
    // otherwise the loading of the first world would be too slow
    this.data.preloadScene(world.frameInfo.scene, world);
  };
  this.moveAxisHelper = function (world) {
    world.webglGroup.add(this.axis);
  };

  this.mainViewOffset = [0, 0, 0];

  this.lookAtWorld = function (world) {
    const newOffset = [
      world.coordinatesOffset[0] - this.mainViewOffset[0],
      world.coordinatesOffset[1] - this.mainViewOffset[1],
      world.coordinatesOffset[2] - this.mainViewOffset[2]
    ];

    this.mainViewOffset = world.coordinatesOffset;

    this.viewManager.mainView.orbit.target.x += newOffset[0];
    this.viewManager.mainView.orbit.target.y += newOffset[1];
    this.viewManager.mainView.orbit.target.z += newOffset[2];

    this.viewManager.mainView.camera.position.x += newOffset[0];
    this.viewManager.mainView.camera.position.y += newOffset[1];
    this.viewManager.mainView.camera.position.z += newOffset[2];

    this.viewManager.mainView.orbit.update();
  };

  this.reloadCurrentWorld = function(){
    this.deactivateCurrentWorld();
    this.data.deleteWorld(this.data.world);
    this.loadWorld(
      this.data.world.frameInfo.scene, 
      this.data.world.frameInfo.frame);
  }

  this.reloadAllWorlds = function(){

    const doReload = ()=>{
      this.deactivateCurrentWorld();

      //this.data.deleteWorld(this.data.world);
      this.data.worldList.forEach(w=>{
         this.data.deleteWorld(w);
      });

      this.loadWorld(
        this.data.world.frameInfo.scene, 
        this.data.world.frameInfo.frame);


      // this.data.worldList.forEach(w=>{
      //   this.data.deleteWorld(w);
      //   this.loadWorld(
      //     w.frameInfo.scene, 
      //     w.frameInfo.frame);
      // });

      // objIdManager.forceUpdate();


    }


    const modifiedFrames = this.data.worldList.filter(w => w.annotation.modified);
    if (modifiedFrames.length > 0) {
      this.infoBox.show(
        'Confirm',
                  `Discard changes to ${modifiedFrames.length} frames, continue to reload?`,
                  ['yes', 'no'],
                  (choice) => {
                    if (choice === 'yes') {
                      doReload();
                    }
                  }
      );
    } else {
      doReload();
    }
  }

  this.loadWorld = async function (sceneName, frame, onFinished) {
    this.data.dbg.dump();

    logger.log(`load ${sceneName}, ${frame}`);

    const self = this;
    // stop if current world is not ready!
    // if (this.data.world && !this.data.world.preloaded()){
    //     console.error("current world is still loading.");
    //     return;
    // }



    const world = await this.data.getWorld(sceneName, frame);

    if (world !== this.data.world) {

      if (this.selectedBox && this.selectedBox.in_highlight) {
        this.cancelFocus(this.selectedBox);
      }
  
      if (this.viewManager.mainView && this.viewManager.mainView.transformControl.visible) {
        // unselect first time
        this.viewManager.mainView.transformControl.detach();
      }

      this.unselectBox(null, true);
      this.unselectBox(null, true);

      if (this.data.world) {
        this.data.world.deactivate();
      }

      this.data.activateWorld(
        world,
        function () {
          self.onLoadWorldFinished(world);
          if (onFinished) { onFinished(); }
        },
        true
      );
    } else {
      if (onFinished) { onFinished(); }
    }
  };

  this.deactivateCurrentWorld = function() {
      this.unselectBox(null, true);
      this.unselectBox(null, true);

      if (this.data.world) {
        this.data.world.deactivate();
      }
  }

  this.removeBox = function (box, render = true) {
    if (box === this.selectedBox) {
      this.unselectBox(null, true);
      this.unselectBox(null, true); // twice to safely unselect.
      this.selectedBox = null;
      // this.remove_selected_box();
    }

    this.do_remove_box(box, false); // render later.

    // this should be after do-remove-box
    // subview renderings don't need to be done again after
    // the box is removed.
    if (box.boxEditor) {
      if (box.boxEditor) {
        box.boxEditor.detach('donthide');
      } else {
        console.error('what?');
      }
    }

    this.header.updateModifiedStatus();

    if (render) { this.render(); }
  };

  this.remove_selected_box = function () {
    this.removeBox(this.selectedBox);
  };

  this.do_remove_box = function (box, render = true) {
    if (!box.annotator) { this.restore_box_points_color(box, render); }

    this.imageContextManager.boxManager.removeBox(box.objLocalId);

    this.floatLabelManager.removeBox(box);
    this.fastToolBox.hide();

    // this.selectedBox.dispose();

    box.world.annotation.unload_box(box);
    box.world.annotation.removeBox(box);

    box.world.annotation.setModified();
  };

  this.clear = function () {
    this.header.clear_box_info();
    // this.editorUi.querySelector("#image").innerHTML = '';

    this.unselectBox(null);
    this.unselectBox(null);

    this.imageContextManager.clearMainCanvas();
    this.boxEditor.detach();

    this.data.world.unload();
    this.data.world = null; // dump it
    this.floatLabelManager.removeAllLabels();
    this.fastToolBox.hide();
    this.render();
  };

  this.update_frame_info = function (scene, frame) {
    const self = this;
    this.header.set_frame_info(scene, frame, function (sceneName) {
      self.scene_changed(sceneName);
    });
  };

  // box edited
  this.onBoxChanged = function (box) {
    if (!this.imageContextManager.hidden()) { this.imageContextManager.boxManager.update_box(box); }

    this.header.updateBoxInfo(box);
    // floatLabelManager.updatePosition(box, false);  don't update position, or the ui is annoying.

    if (!box.dontsave) { box.world.annotation.setModified(); }

    this.updateBoxPointsColor(box);
    this.save_box_info(box);

    if (box.boxEditor) {
      box.boxEditor.onBoxChanged();
    } else {
      console.error('what?');
    }

    this.autoAdjust.syncFollowers(box);

    // if (box === this.data.world.radar_box){
    //     this.data.world.moveRadar(box);
    // }

    if (box.onBoxChanged) {
      box.onBoxChanged();
    }

    this.header.updateModifiedStatus();

    this.render();
  };

  // box removed, restore points color.
  this.restore_box_points_color = function (box, render = true) {
    if (this.data.cfg.colorObject !== 'no') {
      box.world.lidar.resetBoxPointsColor(box);
      box.world.lidar.updatePointsColor();
      if (render) { this.render(); }
    }
  };

  this.updateBoxPointsColor = function (box) {
    if (this.data.cfg.colorObject !== 'no') {
      if (box.last_info) {
        box.world.lidar.setBoxPointsColor(box.last_info, { x: this.data.cfg.pointBrightness, y: this.data.cfg.pointBrightness, z: this.data.cfg.pointBrightness });
      }

      box.world.lidar.setBoxPointsColor(box);
      box.world.lidar.updatePointsColor();
    }
  };

  this.onSelectedBoxChanged = function (box) {
    if (box) {
      this.header.updateBoxInfo(box);
      // this.floatLabelManager.updatePosition(box, true);
      // this.fastToolBox.setPos(this.floatLabelManager.getLabelEditorPos(box.objLocalId));
      this.imageContextManager.boxManager.onBoxSelected(box.objLocalId,
        box.obj_type,
        box.obj_id);

      // this.boxEditor.attachBox(box);

      this.render();
      // this.boxEditor.boxView.render();

      // this.updateSubviewRangeByWindowResize(box);
    } else {
      this.header.clear_box_info();
    }
  };

  this.removeGroundPoints = function(box) {
    if (!box) {
      return;
    }

    box.scale.z = box.scale.z - 0.05;
    box.position.z = box.position.z + 0.025;
    this.onBoxChanged(box);

  };

  this.render2dLabels = function (world) {
    if (this.editorCfg.disableMainView) { return; }

    this.floatLabelManager.removeAllLabels();
    const self = this;
    world.annotation.boxes.forEach(function (b) {
      self.floatLabelManager.addLabel(b);
    });

    // if (this.selectedBox) {
    //   // this.floatLabelManager.select_box(this.selectedBox.objLocalId)
    //   this.fastToolBox.show();
    //   this.fastToolBox.setValue(this.selectedBox.obj_type, this.selectedBox.obj_id, this.selectedBox.obj_attr);
    // }
  };

  this.add_global_obj_type = function () {
    this.imageContextManager.buildCssStyle();

    const objTypeMap = globalObjectCategory.objTypeMap;

    // submenu of new
    let items = '';
    for (const o in objTypeMap) {
      items += '<div class="menu-item cm-new-item ' + o + '" id="cm-new-' + o + '" uservalue="' + o + '"><div class="menu-item-text">' + o + '</div></div>';
    }

    this.editorUi.querySelector('#new-submenu').innerHTML = items;

    this.contextMenu.installMenu('newSubMenu', this.editorUi.querySelector('#new-submenu'), (event) => {
      const objType = event.currentTarget.getAttribute('uservalue');
      const box = this.addBoxOnMousePosition(objType);
      // switch_bbox_type(event.currentTarget.getAttribute("uservalue"));
      // self.boxOp.growBox(box, 0.2, {x:2, y:2, z:3});
      // self.auto_shrink_box(box);
      // self.onBoxChanged(box);

      const noscaling = event.shiftKey;

      this.boxOp.auto_rotate_xyz(box, null, null, (b) => {
        this.onBoxChanged(b);
      }, noscaling);

      return true;
    });
  };

  this.interpolate_selected_object = function () {
    const scene = this.data.world.frameInfo.scene;
    const frame = this.data.world.frameInfo.frame;
    const objId = this.selectedBox.obj_id;

    this.boxOp.interpolate_selected_object(scene, objId, frame, (s, fs) => {
      this.onAnnotationUpdatedByOthers(s, fs);
    });
  };

  this.onAnnotationUpdatedByOthers = function (scene, frames) {
    this.data.onAnnotationUpdatedByOthers(scene, frames);
  };
}

export { Editor };
