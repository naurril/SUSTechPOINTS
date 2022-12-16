
import { ProjectiveViewOps } from './side_view_op.js';
import { BoxImageContext } from './image.js';
import { saveWorldList, reloadWorldList } from './save.js';
import { objIdManager } from './obj_id_list.js';
import { globalKeyDownManager } from './keydown_manager.js';
import { ml } from './ml.js';

import { check3dLabels } from './error_check.js';
import { logger } from './log.js';
import { globalObjectCategory } from './obj_cfg.js';
import { jsonrpc } from './jsonrpc.js';

/*
2 ways to attach and edit a box
1) attach/detach
2) setTarget, tryAttach, resetTarget, this is only for batch-editor-manager
*/
function BoxEditor (parentUi, boxEditorManager, viewManager, cfg, boxOp,
  funcOnBoxChanged, funcOnBoxRemoved, name) {
  this.boxEditorManager = boxEditorManager;
  this.parentUi = parentUi;
  this.name = name;
  const uiTmpl = document.getElementById('box-editor-ui-template');
  const tmpui = uiTmpl.content.cloneNode(true); // sub-views

  parentUi.appendChild(tmpui);
  this.ui = parentUi.lastElementChild;
  this.boxInfoUi = this.ui.querySelector('#box-info');

  this.viewManager = viewManager;
  this.boxOp = boxOp;
  this.boxView = this.viewManager.addBoxView(this.ui); // this.editorUi.querySelector("#sub-views")
  this.projectiveViewOps = new ProjectiveViewOps(
    this.ui, // this.editorUi.querySelector("#sub-views"),
    cfg,
    this,
    this.boxView.views,
    this.boxOp,
    funcOnBoxChanged,
    funcOnBoxRemoved);

  this.focusImageContext = new BoxImageContext(this.ui.querySelector('#focuscanvas'));

  this.pseudoBox = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  };

  this.fastToolbox = window.editor.fastToolBox;

  this.copyPseudoBox = function (b) {
    this.pseudoBox.position.x = b.position.x;
    this.pseudoBox.position.y = b.position.y;
    this.pseudoBox.position.z = b.position.z;

    this.pseudoBox.rotation.x = b.rotation.x;
    this.pseudoBox.rotation.y = b.rotation.y;
    this.pseudoBox.rotation.z = b.rotation.z;

    this.pseudoBox.scale.x = b.scale.x;
    this.pseudoBox.scale.y = b.scale.y;
    this.pseudoBox.scale.z = b.scale.z;
  };

  this.isInBatchMode = function () {
    return !!this.boxEditorManager;
  };

  this.target = {};

  this.setTarget = function (world, objTrackId, objType) {
    this.target = {
      world,
      objTrackId,
      objType
    };

    if (this.isInBatchMode()) {
      this.pseudoBox.world = world;
      this.boxView.attachBox(this.pseudoBox);
    }

    this.tryAttach();
    this.ui.style.display = 'inline-block';
    this.updateInfo();
  };

  this.setIndex = function (index) {
    this.index = index; // index as of in all editors.
  };

  this.setSelected = function (selected, eventId) {
    if (selected) {
      this.ui.className = 'selected';
      this.selected = true;
      this.selectEventId = eventId;


     
      if (this.box) {
        const rect = this.ui.getClientRects()[0];

        if (rect) {
          this.fastToolbox.show(this.handleFastToolboxEvent, 'notools');      
          this.fastToolbox.setPos({
            top: rect.y+"px",
            left:rect.x+"px",
          });

          this.fastToolbox.target = this;
          this.fastToolbox.setValue(this.box.obj_type, this.box.obj_id, this.box.obj_attr, this.box);
        }
      }

    } else {      
      if (!eventId || (this.selectEventId === eventId)) {
        // cancel only you selected.
        this.ui.className = '';
        this.selected = false;
        this.selectEventId = null;

        if (this === this.fastToolbox.target) {
          this.fastToolbox.hide();
        }
      }
    }
  };

  this.handleFastToolboxEvent = (event)=>{
    switch (event.currentTarget.id) {
      case 'object-category-selector':
        this.box.obj_type = event.currentTarget.value;
        funcOnBoxChanged(this.box);
        break;
      case 'object-track-id-editor':
        this.box.obj_id = event.currentTarget.value;
        funcOnBoxChanged(this.box);
        break;
      case 'attr-input':
        this.box.obj_attr = event.currentTarget.value;
        funcOnBoxChanged(this.box);
        break;
      default:
        console.log('unknown event');
        break;
    }
  }

  // this.onContextMenu = (event)=>{
  //     if (this.boxEditorManager)  // there is no manager for box editor in main ui
  //         this.boxEditorManager.onContextMenu(event, this);
  // };

  // this.ui.oncontextmenu = this.onContextMenu;

  this.resetTarget = function () {
    if (this.target.world) {
      // unload if it's not the main world

      // if (this.target.world !== this.target.world.data.world)
      //     this.target.world.unload();
    }

    this.detach();
    this.target = {};
    // this.ui.style.display="none";
  };

  this.tryAttach = function () {
    // find target box, attach to me
    if (this.target && this.target.world) {
      const box = this.target.world.annotation.findBoxByTrackId(this.target.objTrackId);
      if (box) {
        this.attachBox(box);
      }
    }
  };

  /*
     the projectiveView tiggers zoomratio changing event.
     editormanager broaccasts it to all editors
    */
  this._setViewZoomRatio = function (viewIndex, ratio) {
    this.boxView.views[viewIndex].zoomRatio = ratio;
  };

  this.updateViewZoomRatio = function (viewIndex, ratio) {
    // this.upate();
    if (this.boxEditorManager) { this.boxEditorManager.updateViewZoomRatio(viewIndex, ratio); } else {
      this._setViewZoomRatio(viewIndex, ratio);
      this.update();
      // this.viewManager.render();
    }
  };

  this.onOpCmd = function (cmd) {
    if (this.boxEditorManager) { this.boxEditorManager.onOpCmd(cmd, this); } else {
      this.executeOpCmd(cmd);
    }
  };

  this.executeOpCmd = function (cmd) {
    if (!this.box) {
      return;
    }

    if (cmd.op === 'translate') {
      for (const axis in cmd.params.delta) {
        this.boxOp.translateBox(this.box, axis, cmd.params.delta[axis]);
        // this.boxOp.translateBox(this.box, "y", delta.y);
      }

      funcOnBoxChanged(this.box);
    }
  };

  this.box = null;
  this.attachBox = function (box) {
    if (this.box && this.box !== box) {
      this.box.boxEditor = null;
      console.log('detach box editor');
      // todo de-highlight box
    }

    this.box = null;
    this.show();

    if (box) {
      box.boxEditor = this;
      this.box = box;
      // this.boxOp.highlightBox(box);
      this.boxView.attachBox(box);
      this.projectiveViewOps.attachBox(box);
      this.focusImageContext.updateFocusedImageContext(box);

      // this.update();
      this.updateInfo();
      // this.boxView.render();

      if (this.isInBatchMode()) {
        this.boxEditorManager.onBoxChanged(this);
      }

      // if (this.selected) {
      //   this.fastToolbox.setValue(this.box.obj_type, this.box.obj_id, this.box.obj_attr);
      // }
    }
  };

  this.detach = function (dontHide) {
    if (this.box) {
      if (this.box.boxEditor === this) {
        this.box.boxEditor = null;
      }
      // this.boxOp.unhighlightBox(this.box);
      // todo de-highlight box

      this.projectiveViewOps.detach();

      if (!this.isInBatchMode()) {
        this.boxView.detach();
      } else {
        this.copyPseudoBox(this.box);
        this.boxView.attachBox(this.pseudoBox);
      }

      this.focusImageContext.clearCanvas();

      this.box = null;
    }

    if (!dontHide) { this.hide(); }
  };

  this.hide = function () {
    this.ui.style.display = 'none';

    // this is a hack, if we don't have manager, this is the main editor
    // hide parent ui
    // todo, add a pseudo manager, hide itself when child hide
    if (!this.boxEditorManager) {
      this.parentUi.style.display = 'none';
    }
  };
  this.show = function () {
    this.ui.style.display = '';// "inline-block";
    if (!this.boxEditorManager) {
      this.parentUi.style.display = '';
    }
  };

  this.onBoxChanged = function () {
    this.projectiveViewOps.updateViewHandle();
    this.focusImageContext.updateFocusedImageContext(this.box);
    this.boxView.onBoxChanged();

    // mark
    delete this.box.annotator; // human annotator doesn't need a name
    delete this.box.follows;
    this.box.changed = true;

    // don't mark world's change flag, for it's hard to clear it.

    // inform boxEditorMgr to transfer annotation to other frames.
    if (this.boxEditorManager) { this.boxEditorManager.onBoxChanged(this); }

    this.updateInfo();

    // this.boxView.render();
  };

  this.onDelBox = function () {
    // const box = this.box;
    this.detach('donthide');
  };

  // windowresize...
  this.update = function (dontRender = false) {
    if (this.boxView) {
      this.boxView.onBoxChanged(dontRender);

      // this.boxView.updateCameraRange(this.box);
      // this.boxView.updateCameraPose(this.box);

      // if (!dontRender)
      //     this.boxView.render();
    }

    // boxview should be updated for pseudobox.

    if (this.box === null) { return; }

    this.projectiveViewOps.updateViewHandle();

    // this is not needed somtime
    this.focusImageContext.updateFocusedImageContext(this.box);

    // should we update info?
    this.updateInfo();
  };

  this.updateInfo = function () {
    let info = '';
    if (this.target.world) {
      info += String(this.target.world.frameInfo.frame);

      if (this.box) {
        info += ','+String(this.box.obj_type) + (this.box.obj_attr?(',' + this.box.obj_attr):'')
      }

      if (this.box && this.box.annotator) { info += ',' + this.box.annotator; }

      // if (this.box && this.box.changed)
      //     info += " *";
    }

    this.boxInfoUi.innerHTML = info;
  };

  this.updateBoxDimension = function () {

  };

  this.resize = function (width, height) {
    // if (height + "px" === this.ui.style.height &&  width + "px" === this.ui.style.width)
    // {
    //     return;
    // }

    this.ui.style.width = width + 'px';
    this.ui.style.height = height + 'px';
    this.boxView.render();
  };

  this.setResize = function (option) {
    this.ui.style.resize = option;
    this.ui.style['z-index'] = '0';

    if (option === 'both') {
      this.lastSize = {
        width: 0,
        height: 0
      };

      this.resizeObserver = new ResizeObserver(elements => {
        const rect = elements[0].contentRect;
        console.log('sub-views resized.', rect);

        if (rect.height === 0 || rect.width === 0) {
          return;
        }

        if (rect.height !== this.lastSize.height || rect.width !== this.lastSize.width) {
          // viewManager will clear backgound
          // so this render is effectiveless.
          // this.boxView.render();

          // save

          if (this.boxEditorManager) { // there is no manager for box editor in main ui
            window.pointsGlobalConfig.setItem('batchModeSubviewSize', { width: rect.width, height: rect.height });
            this.boxEditorManager.onSubViewsResize(rect.width, rect.height);
          } else {
            this.boxView.render();
          }

          // save
          this.lastSize.width = rect.width;
          this.lastSize.height = rect.height;
        }
      });

      this.resizeObserver.observe(this.ui);
    }
  };
}

// parentUi  #batch-box-editor
function BoxEditorManager (parentUi, viewManager, objectTrackView,
  cfg, boxOp, globalHeader, contextMenu, configMenu,
  funcOnBoxChanged, funcOnBoxRemoved, funcOnAnnotationReloaded) {
  this.viewManager = viewManager;
  this.objectTrackView = objectTrackView;
  this.boxOp = boxOp;
  this.activeIndex = 0;
  this.editorList = [];
  this.cfg = cfg;
  this.globalHeader = globalHeader;
  this.contextMenu = contextMenu;
  this.parentUi = parentUi; // #batch-box-editor
  this.boxEditorGroupUi = parentUi.querySelector('#batch-box-editor-group');
  this.boxEditorHeaderUi = parentUi.querySelector('#batch-box-editor-header');
  this.batchSize = cfg.batchModeInstNumber;
  // this.configMenu = configMenu;

  this.activeEditorList = function () {
    return this.editorList.slice(0, this.activeIndex);
  };

  this.editingTarget = {
    data: null,
    sceneMeta: '',
    objTrackId: '',
    frame: '',
    frameIndex: NaN
  };

  this.onExit = null;
  // frame specifies the center frame to edit

  // this.parentUi.addEventListener("contextmenu", event=>{
  //     this.contextMenu.show("boxEditorManager", event.clientX, event.clientY, this);
  //     event.stopPropagation();
  //     event.preventDefault();
  // })

  this.onSubViewsResize = function (width, height) {
    this.viewManager.mainView.clearView();
    this.editorList.forEach(e => {
      e.resize(width, height);
    });

    // this.viewManager.render();
  };

  this.calculateBestSubviewSize = function (batchSize) {
    const parentRect = this.parentUi.getBoundingClientRect();
    const headerRect = this.boxEditorHeaderUi.getBoundingClientRect();
    // const editorsGroupRect = this.boxEditorGroupUi.getBoundingClientRect();

    const availableHeight = parentRect.height - headerRect.height;
    const availableWidth = parentRect.width;

    if (availableHeight === 0 || availableWidth === 0) {
      this.batchSizeUpdated = true;
      return;
    }

    const defaultBoxWidth = 130;
    const defaultBoxHeight = 450;

    let rows = 1;
    const w = availableWidth / Math.ceil(batchSize / rows);
    const h = availableHeight / rows;
    const cost = Math.abs((w / h) - (defaultBoxWidth / defaultBoxHeight));
    let minCost = cost;
    let bestRows = rows;
    while (true) {
      rows += 1;

      const w = Math.floor(availableWidth / Math.ceil(batchSize / rows));
      const h = Math.floor(availableHeight / rows);
      const cost = Math.abs((w / h) - (defaultBoxWidth / defaultBoxHeight));

      if (cost < minCost) {
        minCost = cost;
        bestRows = rows;
      } else {
        break;
      }
    }

    // bestRows
    window.pointsGlobalConfig.batchModeSubviewSize = {
      width: Math.floor(availableWidth / Math.ceil(batchSize / bestRows)),
      height: Math.floor(availableHeight / bestRows)
    };
  };

  this.setBatchSize = function (batchSize) {
    this.calculateBestSubviewSize(batchSize);

    this.batchSize = batchSize;
    if (this.parentUi.style.display !== 'none') {
      this.edit(this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.frame,
        this.editingTarget.objTrackId,
        this.editingTarget.objType
      );
    }
  };

  this.onWindowResize = function () {
    this.setBatchSize(this.batchSize);
  };

  this.editObjectsInFrame = async function(data, sceneMeta, frame, objType, startIndex=0) {

    const world = await data.getWorld(sceneMeta.scene, frame);
    world.data.forcePreloadScene(sceneMeta.scene, world);

    if (!world.preloaded()) {
      console.log("waiting, not loaded.");
      window.editor.infoBox.show('Notice',`frame loading in progress.`);
//      return;
    }

    this.show();
    this.reset();

    this.editingTarget.frameIndex = sceneMeta.frames.findIndex(f => f === frame);
    
    this.editingTarget.data = data;
    this.editingTarget.sceneMeta = sceneMeta;

    this.editingTarget.objTrackId = undefined;
    this.editingTarget.objType = objType;

    this.editingTarget.frame = frame;


    let boxes = world.annotation.boxes.concat();
    if (objType) {
      boxes = boxes.filter(x=>x.obj_type == objType);
    }

    if (boxes.length === 0) {
      window.editor.infoBox.show('Info', `Frame ${frame} contains no object of type ${this.editingTarget.objType}.`);
      return;
    }

    boxes = boxes.sort((a,b)=>a.obj_type > b.obj_type?1:-1);

    if (startIndex === -1)
    {
      startIndex = boxes.length - (boxes.length % this.batchSize);
    }

    if (startIndex === boxes.length) {
      startIndex -= this.batchSize;
    }

    this.editingTarget.startIndex = startIndex;
    boxes = boxes.slice(startIndex, startIndex+this.batchSize);
  
    boxes.forEach((box, editorIndex)=>{
      const editor = this.addEditor();
      editor.setIndex(editorIndex);
      editor.resize(window.pointsGlobalConfig.batchModeSubviewSize.width, window.pointsGlobalConfig.batchModeSubviewSize.height);
      editor.setTarget(world, box.obj_id, box.obj_type);
    });

    this.globalHeader.setObject(frame);
  }

  this.editObjById = function(data, sceneMeta, frame, objTrackId, objType) {
    this.show();
    this.reset();


    let centerIndex = sceneMeta.frames.findIndex(f => f === frame);
    this.editingTarget.frameIndex = centerIndex;
    this.editingTarget.data = data;
    this.editingTarget.sceneMeta = sceneMeta;

    this.editingTarget.objTrackId = objTrackId;
    this.editingTarget.objType = objType;

    this.editingTarget.frame = frame;


    if (centerIndex < 0) {
      centerIndex = 0;
    }

    let startIndex = Math.max(0, centerIndex - this.batchSize / 2);

    if (startIndex > 0) {
      if (startIndex + this.batchSize > sceneMeta.frames.length) {
        startIndex -= startIndex + this.batchSize - sceneMeta.frames.length;

        if (startIndex < 0) {
          startIndex = 0;
        }
      }
    }

    const frames = sceneMeta.frames.slice(startIndex, startIndex + this.batchSize);

    // this.viewManager.mainView.clearView();

    frames.forEach(async (frame, editorIndex) => {
      const world = await data.getWorld(sceneMeta.scene, frame);
      const editor = this.addEditor();
      // editor.setTarget(world, objTrackId, objType);
      editor.setIndex(editorIndex);
      editor.resize(window.pointsGlobalConfig.batchModeSubviewSize.width, window.pointsGlobalConfig.batchModeSubviewSize.height);

      if (this.editingTarget.frame === frame) {
        editor.setSelected(true);
      }

      data.activateWorld(world,
        () => {
          // editor.tryAttach();

          editor.setTarget(world, objTrackId, objType);

          //
          // this.viewManager.render();
        },
        false);
    });

    // set obj selector
    this.globalHeader.setObject(objTrackId);
  }

  this.isCheckingFrameMode = function(){
    return this.editingTarget.objTrackId === undefined;
  }


  this.prepareFramesForObjType = async function(data, sceneMeta, objType){
    const frames = await jsonrpc(`/api/queryFrames?scene=${sceneMeta.scene}&objtype=${objType}`)
    data.setViewFrames(sceneMeta, frames);
  }

  this.edit = async function (data, sceneMeta, frame, objTrackId, objType, onExit) {

    this.show();
    this.reset();

    if (this.batchSizeUpdated) {
      this.batchSizeUpdated = false;
      this.calculateBestSubviewSize(this.batchSize);
    }

    if (onExit) {
      // next/prev call will not update onExit
      this.onExit = onExit;
    }
    
    if (objTrackId === undefined) {

      await this.prepareFramesForObjType(data, sceneMeta, objType);

      this.editObjectsInFrame(data, sceneMeta, frame, objType);
    } else {
      this.editObjById(data, sceneMeta, frame, objTrackId, objType);
    }    
  };

  this.onContextMenu = function (event, boxEditor) {
    this.firingBoxEditor = boxEditor;

    if (boxEditor.selected) {
      // ok
    } else {
      this.getSelectedEditors().forEach(e => e.setSelected(false));
      boxEditor.setSelected(true);
    }

    this.contextMenu.show('boxEditor', event.clientX, event.clientY, this);
    event.stopPropagation();
    event.preventDefault();
  };

  this.parentUi.oncontextmenu = (event) => {
    const ed = this.getEditorByMousePosition(event.clientX, event.clientY);

    this.onContextMenu(event, ed);
  };

  this.handleContextMenuKeydownEvent = function (event, menuPos) {
    switch (event.key) {
      case 's':
        this.activeEditorList().forEach(e => e.setSelected(true));
        return true;
        // break;
      case 'a':
        this.autoAnnotateSelectedFrames();
        break;
      case 'f':
        this.finalizeSelectedBoxes();
        break;
      case 'd':
        this.deleteSelectedBoxes(menuPos);
        break;
      case 'e':
        this.interpolateSelectedFrames();
        break;
      case 'g':
        this.gotoThisFrame();
        break;
      case 't':
        this.showTrajectory();
        break;
      default:
        return true;
    }

    return false;
  };

  this.delayUpdateAutoGeneratedBoxesTimer = null;

  this.updateAutoGeneratedBoxes = function () {
    if (this.delayUpdateAutoGeneratedBoxesTimer) {
      clearTimeout(this.delayUpdateAutoGeneratedBoxesTimer);
    }

    this.delayUpdateAutoGeneratedBoxesTimer = setTimeout(async () => {
      if (this.cfg.autoUpdateInterpolatedBoxes) {
        await this.updateInterpolatedBoxes();
      }

      await this.updatePseudoBoxes();
    },
    500);
  };

  this.updateInterpolatedBoxes = async function () {
    const editorList = this.activeEditorList();
    const applyIndList = editorList.map(e => e.box && e.box.annotator === 'i');

    const boxList = editorList.map(e => e.box);
    const worldList = editorList.map(e => e.target.world);
    await this.boxOp.interpolateAsync(worldList, boxList, applyIndList);
    // this.activeEditorList().forEach(e=>e.tryAttach());

    this.globalHeader.updateModifiedStatus();
    // this.viewManager.render();
    editorList.forEach(e => {
      if (e.box && e.box.annotator === 'i') {
        e.boxView.onBoxChanged();
      }
    });
  };

  this.updatePseudoBoxes = async function () {
    const editorList = this.activeEditorList();
    const boxList = editorList.map(e => e.box);
    const anns = boxList.map(b => b ? b.world.annotation.ann_to_vector_global(b) : null);

    const ret = await ml.interpolateAnnotation(anns);

    editorList.forEach((e, i) => {
      if (!e.box) {
        const ann = e.target.world.annotation.vector_global_to_ann(ret[i]);
        e.copyPseudoBox(ann);
        e.boxView.onBoxChanged();
      }
    });
  };

  // manager
  this.onBoxChanged = function (e) {

    if (this.isCheckingFrameMode()) {
      return;
    }

    this.updateAutoGeneratedBoxes();
    //
  };

  const onBoxChangedInBatchMode = function (box) {
    if (box.boxEditor) { // if in batch mode with less than 40 windows, some box don't have editor attached.
      box.boxEditor.update();
    } // render.

    box.world.annotation.setModified();
  };

  this.finalizeSelectedBoxes = function () {
    this.getSelectedEditors().forEach(e => {
      if (e.box) {
        if (e.box.annotator) {
          delete e.box.annotator;
          funcOnBoxChanged(e.box);
          // e.box.world.annotation.setModified();
          e.updateInfo();
        }
      }
    });

    this.globalHeader.updateModifiedStatus();
  };

  this.interpolateSelectedFrames = function () {
    const applyIndList = this.activeEditorList().map(e => false); // all shoud be applied.
    const selectedEditors = this.getSelectedEditors();

    // if interpolate only one box, remove it if exist.
    // no matter who is the annotator.
    if (selectedEditors.length === 1) {
      if (selectedEditors[0].box) {
        funcOnBoxRemoved(selectedEditors[0].box, true);
      }
    }

    selectedEditors.forEach(e => {
      applyIndList[e.index] = true;
    });
    this.interpolate(applyIndList);

    this.updateAutoGeneratedBoxes();
  };

  this.deleteEmptyBoxes = function () {
    const editors = this.activeEditorList();
    editors.forEach(e => {
      if (e.box) {
        if (e.box.world.lidar.getBoxPointsNumber(e.box) <= this.cfg.maxEmptyBoxPoints) {
          funcOnBoxRemoved(e.box, true);
        }
      }
    });

    this.updateAutoGeneratedBoxes();
  };

  this.deleteIntersectedBoxes = function () {
    const editors = this.getSelectedEditors();
    editors.forEach(e => {
      if (e.box) {
        const boxes = e.box.world.annotation.findIntersectedBoxes(e.box);

        boxes.forEach(b => {
          funcOnBoxRemoved(b, true);
        });

        onBoxChangedInBatchMode(e.box);
      }
    });
  };

  this.deleteSelectedBoxes = function (infoBoxPos) {
    const selectedEditors = this.getSelectedEditors();

    if (selectedEditors.length >= 2) {
      window.editor.infoBox.show(
        'Confirm',
                `Delete <span class="red">${selectedEditors.length}</span> selected boxes?`,
                ['yes', 'no'],
                (btn) => {
                  if (btn === 'yes') {
                    selectedEditors.forEach(e => {
                      if (e.box) { funcOnBoxRemoved(e.box, true); }
                    });

                    this.updateAutoGeneratedBoxes();
                  }
                },
                infoBoxPos
      );
    } else {
      selectedEditors.forEach(e => {
        if (e.box) { funcOnBoxRemoved(e.box, true); }
      });

      this.updateAutoGeneratedBoxes();
    }
  };

  this.autoAnnotateSelectedFrames = function () {
    const applyIndList = this.activeEditorList().map(e => false); // all shoud be applied.
    this.getSelectedEditors().forEach(e => {
      applyIndList[e.index] = true;
    });
    this.autoAnnotate(applyIndList);
  };

  this.onOpCmd = function (cmd, firingEditor) {
    firingEditor.executeOpCmd(cmd);

    if (this.cfg.linkEditorsInBatchMode) {
      const editors = this.getSelectedEditors();

      if (editors.includes(firingEditor)) {
        editors.filter(x => x !== firingEditor).forEach(e => {
          if (e.box && !e.box.annotator) {
            e.executeOpCmd(cmd);
          }
        });
      }
    }
  };

  this.handleContextMenuEvent = function (event) {
    console.log(event.currentTarget.id, event.type);
    switch (event.currentTarget.id) {
      // manager
      case 'cm-increase-box-editor':
        this.batchSize += 1;
        this.edit(
          this.editingTarget.data,
          this.editingTarget.sceneMeta,
          this.editingTarget.sceneMeta.frame,
          this.editingTarget.objTrackId,
          this.editingTarget.objType
        );
        break;

      case 'cm-decrease-box-editor':
        this.batchSize -= 1;
        this.edit(
          this.editingTarget.data,
          this.editingTarget.sceneMeta,
          this.editingTarget.sceneMeta.frame,
          this.editingTarget.objTrackId,
          this.editingTarget.objType
        );
        break;

        /// //////////////////// obj instance //

      case 'cm-select-all':
        this.activeEditorList().forEach(e => e.setSelected(true));
        return false;// don't hide context menu
        // break;
      case 'cm-select-all-previous':
        this.activeEditorList().forEach(e => e.setSelected(e.index <= this.firingBoxEditor.index));
        return false;// don't hide context menu
        // break;
      case 'cm-select-all-next':
        this.activeEditorList().forEach(e => e.setSelected(e.index >= this.firingBoxEditor.index));
        return false;// don't hide context menu
        // break;

      case 'cm-delete':
        this.deleteSelectedBoxes({ x: event.clientX, y: event.clientY });
        break;
      case 'cm-delete-empty-boxes':
        this.deleteEmptyBoxes();
        break;
      case 'cm-delete-intersected-boxes':
        this.deleteIntersectedBoxes();
        break;
      case 'cm-interpolate':
        this.interpolateSelectedFrames();
        break;

      case 'cm-auto-annotate':
        this.autoAnnotateSelectedFrames();
        break;

      case 'cm-auto-annotate-wo-rotation':
        {
          const applyIndList = this.activeEditorList().map(e => false); // all shoud be applied.
          this.getSelectedEditors().forEach(e => {
            applyIndList[e.index] = true;
          });
          this.autoAnnotate(applyIndList, 'dontrotate');
        }
        break;

      case 'cm-fit-moving-direction':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }

          const currentBox = e.box;
          const estimatedRot = boxOp.estimate_rotation_by_moving_direciton(currentBox);

          if (estimatedRot) {
            currentBox.rotation.z = estimatedRot.z;
            funcOnBoxChanged(currentBox);
          }
        });

        this.updateAutoGeneratedBoxes();

        break;
      case 'cm-fit-size':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }

          boxOp.fitSize(e.box, ['x', 'y']);
          funcOnBoxChanged(e.box);
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-position':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.auto_rotate_xyz(e.box, null,
            null, // {x:false, y:false, z:true},
            funcOnBoxChanged, // onBoxChangedInBatchMode,
            'noscaling', 'dontrotate');
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-rotation':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.auto_rotate_xyz(e.box, null,
            null,
            funcOnBoxChanged, // onBoxChangedInBatchMode, //
            'noscaling');
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-bottom':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.fit_bottom(e.box);

          funcOnBoxChanged(e.box);
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-top':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.fit_top(e.box);

          funcOnBoxChanged(e.box);
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-left':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.fit_left(e.box);

          funcOnBoxChanged(e.box);
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-right':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.fit_right(e.box);

          funcOnBoxChanged(e.box);
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-rear':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.fit_rear(e.box);

          funcOnBoxChanged(e.box);
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-fit-front':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          boxOp.fit_front(e.box);

          funcOnBoxChanged(e.box);
        });

        this.updateAutoGeneratedBoxes();
        break;
      case 'cm-reverse-direction':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          if (e.box.rotation.z > 0) {
            e.box.rotation.z -= Math.PI;
          } else {
            e.box.rotation.z += Math.PI;
          }

          onBoxChangedInBatchMode(e.box);
        });

        // this.viewManager.render();

        this.updateAutoGeneratedBoxes();

        break;
      case 'cm-reset-roll-pitch':
        this.getSelectedEditors().forEach(e => {
          if (!e.box) { return; }
          e.box.rotation.x = 0;
          e.box.rotation.y = 0;
          e.update('dontrender');
          e.box.world.annotation.setModified();

          onBoxChangedInBatchMode(e.box);
        });

        // this.viewManager.render();
        this.updateAutoGeneratedBoxes();

        break;

      case 'cm-reset-size':
        {
          const b = this.firingBoxEditor.box;
          const objType = b.obj_type;
          const objCfg = globalObjectCategory.getObjCfgByType(objType);

          b.scale.x = objCfg.size[0];
          b.scale.y = objCfg.size[1];
          b.scale.z = objCfg.size[2];
          funcOnBoxChanged(b);
        }
        break;
      case 'cm-show-trajectory':
        this.showTrajectory();
        break;

      case 'cm-check':
        {
          const scene = this.editingTarget.sceneMeta.scene;
          check3dLabels(scene);
          logger.show();
          logger.errorBtn.onclick();
        }
        break;

      case 'cm-finalize':
        this.finalizeSelectedBoxes();
        break;

      case 'cm-sync-size':
        if (this.isCheckingFrameMode()) {

        } else {
          this.editingTarget.data.worldList.forEach(w => {
            const box = w.annotation.boxes.find(b => b.obj_id === this.firingBoxEditor.target.objTrackId);
            if (box && box !== this.firingBoxEditor.box) {
              box.scale.x = this.firingBoxEditor.box.scale.x;
              box.scale.y = this.firingBoxEditor.box.scale.y;
              box.scale.z = this.firingBoxEditor.box.scale.z;
              // saveList.push(w);
              w.annotation.setModified();

              onBoxChangedInBatchMode(box);
            }
          });

          // this.activeEditorList().forEach(e=>e.update('dontrender'));
          // this.viewManager.render();
          this.updateAutoGeneratedBoxes();
        }

        break;
      case 'cm-reload':
        {
          const selectedEditors = this.getSelectedEditors();
          this.reloadAnnotation(selectedEditors);

          this.updateAutoGeneratedBoxes();
        }
        break;

      case 'cm-goto-this-frame':
        this.gotoThisFrame();
        break;
      case 'cm-follow-static-objects':
        {
          const b = this.firingBoxEditor.box;
          window.editor.autoAdjust.followStaticObjects(b);
          this.globalHeader.updateModifiedStatus();

          this.activeEditorList().forEach(e => {
            e.tryAttach();
          });

          // this.viewManager.render();
          this.updateAutoGeneratedBoxes();
        }
        break;
      default:
        console.log('unknown command.', event.currentTarget.id);
        break;
    }

    return true;
  };

  this.reset = function () {
    this.activeEditorList().forEach(e => {
      e.setSelected(false);
      e.resetTarget();
      // logger.log("batchedit, on subview reset.");
    });

    // logger.log("batchedit, subviews reset.");

    this.viewManager.mainView.clearView();
    // logger.log("batchedit, mainview cleared.");
    this.activeIndex = 0;
  };

  this.keydownHandler = (event) => {
    switch (event.key) {
      case 'a':
        if (event.ctrlKey) {
          this.activeEditorList().forEach(e => e.setSelected(true));
        }
        break;

      case 's':
        if (event.ctrlKey) {
          this._save();
          console.log('saved for batch editor');
        }
        break;
      case '+':
      case '=':
        this.editingTarget.data.scalePointSize(1.2);
        this.viewManager.render();
        break;
      case '-':
        this.editingTarget.data.scalePointSize(0.8);
        this.viewManager.render();
        break;
      case 'v':
      case 'Escape':

        // let selected = this.getSelectedEditors();
        // if (selected.length >= 2){
        //     selected.forEach(e=>e.setSelected(false));
        // }
        // else
        logger.log('exiting batchedit.');
        this.hide();
        logger.log('hide batch edit window.');
        this.reset();
        logger.log('reset batch edit window.');
        this.exit();

        break;
      case 'PageUp':
      case '3':
        this.prevBatch();
        break;
      case 'PageDown':
      case '4':
        this.nextBatch();
        break;
      case 't':
        this.showTrajectory();
        break;
      default:
        console.log(`key ${event.key} igonored`);
        break;
    }

    return false;
  };

  this.exit = function() {

    this.editingTarget.data.resetViewFrames(this.editingTarget.sceneMeta);

    if (this.onExit) {

      if (this.isCheckingFrameMode()) {
        this.onExit(this.editingTarget.frame);
      } else {
        this.onExit();
      }

      logger.log('called exit cb.');
    }
  }

  const keydownHandler = (event) => this.keydownHandler(event);

  this.hide = function () {
    if (this.parentUi.style.display !== 'none') {
      this.parentUi.style.display = 'none';
      this.toolbox.style.display = 'none';
      // document.removeEventListener("keydown", keydownHandler);
      globalKeyDownManager.deregister('batch-editor');
    }
  };

  this.show = function () {
    if (this.parentUi.style.display === 'none') {
      this.parentUi.style.display = '';
      // document.addEventListener("keydown", keydownHandler);
      globalKeyDownManager.register(keydownHandler, 'batch-editor');
      this.toolbox.style.display = '';
    }
  };

  this.render = function () {
    if (this.parentUi.style.display !== 'none') {
      this.viewManager.render();
    }
  };

  this._addToolBox = function () {
    const template = document.getElementById('batch-editor-tools-template');
    const tool = template.content.cloneNode(true);
    // this.boxEditorHeaderUi.appendChild(tool);
    // return this.boxEditorHeaderUi.lastElementChild;

    document.getElementById('dynamic-buttons-placeholder').appendChild(tool);
    return document.getElementById('dynamic-buttons-placeholder').lastElementChild;
  };

  this.toolbox = this._addToolBox();

  this.reloadAnnotation = function (editorList) {
    const done = (anns) => {
      // update editor
      editorList.forEach(e => {
        e.tryAttach();
        e.update('dontrender');
      });

      // reload main view
      if (funcOnAnnotationReloaded) { funcOnAnnotationReloaded(); }
      // render all, at last

      this.viewManager.render();

      this.globalHeader.updateModifiedStatus();
    };

    const worldList = editorList.map(e => e.target.world);

    const modifiedFrames = worldList.filter(w => w && w.annotation.modified);

    if (modifiedFrames.length > 0) {
      window.editor.infoBox.show(
        'Confirm',
                `Discard changes to ${modifiedFrames.length} frames, continue to reload?`,
                ['yes', 'no'],
                (choice) => {
                  if (choice === 'yes') {
                    reloadWorldList(worldList, done);
                  }
                }
      );
    } else {
      reloadWorldList(worldList, done);
    }
  };

  this.interpolate = async function (applyIndList) {
    const boxList = this.activeEditorList().map(e => e.box);
    const worldList = this.activeEditorList().map(e => e.target.world);
    await this.boxOp.interpolateAsync(worldList, boxList, applyIndList);
    this.activeEditorList().forEach(e => e.tryAttach());

    this.globalHeader.updateModifiedStatus();

    this.viewManager.render();
  };

  this.gotoThisFrame = function () {

    this.editingTarget.data.resetViewFrames(this.editingTarget.sceneMeta);

    const targetFrame = this.firingBoxEditor.target.world.frameInfo.frame;
    const targetTrackId = this.firingBoxEditor.target.objTrackId;
    this.hide();

    this.reset();
    if (this.onExit) { 
      this.onExit(targetFrame, targetTrackId); 
    }
  };

  this.autoAnnotate = async function (applyIndList, dontRotate) {
    const editors = this.activeEditorList();
    const boxList = editors.map(e => e.box);
    const worldList = editors.map(e => e.target.world);

    const onFinishOneBox = (i) => {
      editors[i].tryAttach();
      editors[i].box.world.annotation.setModified();
      this.viewManager.render();

      this.updateAutoGeneratedBoxes();
    };

    await this.boxOp.interpolateAndAutoAdjustAsync(worldList, boxList, onFinishOneBox, applyIndList, dontRotate);

    this.globalHeader.updateModifiedStatus();
  };

  // this.parentUi.querySelector("#object-track-id-editor").addEventListener("keydown", function(e){
  //     e.stopPropagation();});

  // this.parentUi.querySelector("#object-track-id-editor").addEventListener("keyup", function(e){
  //     e.stopPropagation();
  // });

  // this.parentUi.querySelector("#object-track-id-editor").onchange = (ev)=>this.objectIdChanged(ev);
  // this.parentUi.querySelector("#object-category-selector").onchange = (ev)=>this.objectTypeChanged(ev);

  // this should follow addToolBox

  // this.parentUi.querySelector("#instance-number").value = this.batchSize;
  // this.parentUi.querySelector("#instance-number").onchange = (ev)=>{
  //     this.batchSize = parseInt(ev.currentTarget.value);
  //     this.edit(
  //         this.editingTarget.data,
  //         this.editingTarget.sceneMeta,
  //         this.editingTarget.frame,
  //         this.editingTarget.objTrackId,
  //         this.editingTarget.objType
  //     );
  // }

  this.showTrajectory = () => {

    if (this.isCheckingFrameMode()) {
      return;
    }

    const tracks = this.editingTarget.data.worldList.map(w => {
      const box = w.annotation.findBoxByTrackId(this.editingTarget.objTrackId);
      let ann = null;
      if (box) {
        ann = w.annotation.boxToAnn(box);
        ann.psr.position = w.lidarPosToUtm(ann.psr.position);
        ann.psr.rotation = w.lidarRotToUtm(ann.psr.rotation);
      }
      return [w.frameInfo.frame, ann, false];
    });

    tracks.sort((a, b) => (a[0] > b[0]) ? 1 : -1);

    this.objectTrackView.setObject(
      this.editingTarget.objType,
      this.editingTarget.objTrackId,
      tracks,
      (targetFrame) => { // onExit
        this.getSelectedEditors().forEach(e => e.setSelected(false));
        this.activeEditorList().find(e => e.target.world.frameInfo.frame === targetFrame).setSelected(true);
      }
    );
  };

  this.toolbox.querySelector('#trajectory').onclick = (e) => {
    this.showTrajectory();
  };

  this.toolbox.querySelector('#reload').onclick = (e) => {
    const selectedEditors = this.activeEditorList();
    this.reloadAnnotation(selectedEditors);
  };

  this.toolbox.querySelector('#interpolate').onclick = async () => {
    // this.boxOp.interpolate_selected_object(this.editingTarget.scene, this.editingTarget.objTrackId, "");

    const applyIndList = this.activeEditorList().map(e => true); // all shoud be applied.
    this.interpolate(applyIndList);
  };

  this.toolbox.querySelector('#auto-annotate').onclick = async () => {
    const applyIndList = this.activeEditorList().map(e => true); // all shoud be applied.
    this.autoAnnotate(applyIndList);
  };

  this.toolbox.querySelector('#auto-annotate-translate-only').onclick = async () => {
    const applyIndList = this.activeEditorList().map(e => true); // all shoud be applied.
    this.autoAnnotate(applyIndList, 'dontrotate');
  };

  this.toolbox.querySelector('#exit').onclick = () => {
    this.hide();

    this.reset();

    this.exit();
  };

  this.toolbox.querySelector('#next').onclick = () => {
    this.nextBatch();
  };

  this.toolbox.querySelector('#prev').onclick = () => {
    this.prevBatch();
  };

  this.nextBatch = function() {
    if (this.isCheckingFrameMode()) {
      this.nextObjectBatch();
    } else {
      this.nextFrameBatch();
    }
  }


  this.getNextFrameByObjType = async function(data, sceneMeta, currentFrame, objType, step=1) {

    const frames = sceneMeta.frames;
    let currentFrameIndex = frames.findIndex(x=>x===currentFrame);

    console.log(`next obj ${objType}, from  ${currentFrame}`)
    let frameIndex;
    
    for (frameIndex = currentFrameIndex + step; 
      frameIndex < frames.length && frameIndex >=0;
      frameIndex+=step) {
        const frame = frames[frameIndex];
        const world = await data.getWorld(sceneMeta.scene, frame);
        data.forcePreloadScene(sceneMeta.scene, world);
    
        if (!world.annotation.preloaded) {
          console.log("waiting, not loaded.");
          window.editor.infoBox.show('Notice',`frame loading in progress.`);
          return frameIndex - step;
        }

        if (world.annotation.boxes.find(x=> x.obj_type == objType)) {
          return frameIndex;
        }
    }
    return frameIndex;
  }

  this.nextObjectBatch =  async function() {

    const lastObjIndex = this.editingTarget.startIndex + this.batchSize;

    //let world = this.editorList[0].box.world;
    let world = await this.editingTarget.data.getWorld(
      this.editingTarget.sceneMeta.scene,
      this.editingTarget.frame
    );

    let boxes = world.annotation.boxes.concat();
    if (this.editingTarget.objType) {
      boxes = boxes.filter(x=>x.obj_type === this.editingTarget.objType);
    }
    //boxes = boxes.sort((a,b)=>a.obj_type > b.obj_type?1:-1);

    //boxes = boxes.slice(lastObjIndex, lastObjIndex+this.batchSize);

    if (boxes.length > lastObjIndex) {
      this.editObjectsInFrame(this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.frame,
        this.editingTarget.objType,
        lastObjIndex)
    } else {
      // next frame
      console.log("next frame");

      const frameIndex = await this.getNextFrameByObjType(
        this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.frame,
        this.editingTarget.objType);

      if (frameIndex >= this.editingTarget.data.world.sceneMeta.frames.length ) {
        window.editor.infoBox.show('Info', 'last frame.');
        return;
      }


      // find next frame that contains editingTarget.objType

      this.editObjectsInFrame(this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.sceneMeta.frames[frameIndex],
        this.editingTarget.objType,
        0);


      
    }
  }

  this.nextFrameBatch = function () {
    const maxFrameIndex = this.editingTarget.sceneMeta.frames.length - 1;

    const editors = this.activeEditorList();
    const lastEditor = editors[editors.length - 1];
    if (lastEditor.target.world.frameInfo.getFrameIndex() === maxFrameIndex) {
      if (this.batchSize >= this.editingTarget.sceneMeta.frames.length) {
        this.nextObj();
      } else {
        window.editor.infoBox.show('Info', 'This is the last batch of frames.');
      }
    } else {
      this.edit(
        this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.sceneMeta.frames[Math.min(this.editingTarget.frameIndex + this.batchSize / 2, maxFrameIndex)],
        this.editingTarget.objTrackId,
        this.editingTarget.objType
      );
    }
  };

  this.prevBatch = function() {
    if (this.isCheckingFrameMode()) {
      this.prevObjectBatch();
    } else {
      this.prevFrameBatch();
    }
  }

  this.prevObjectBatch = async function() {

    const lastObjIndex = this.editingTarget.startIndex - this.batchSize;

     let world = await this.editingTarget.data.getWorld(
      this.editingTarget.sceneMeta.scene,
      this.editingTarget.frame
    );

    //let boxes = world.annotation.boxes.concat();
    //boxes = boxes.sort((a,b)=>a.obj_type > b.obj_type?1:-1);

    //boxes = boxes.slice(lastObjIndex, lastObjIndex+this.batchSize);

    if (this.editingTarget.startIndex > 0) {
      this.editObjectsInFrame(this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.frame,
        this.editingTarget.objType,
        Math.max(this.editingTarget.startIndex - this.batchSize, 0))
    } else {
      // next frame
      console.log("prev frame");

      const frameIndex = await this.getNextFrameByObjType(
        this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.frame,
        this.editingTarget.objType,
        -1);

      if (frameIndex < 0) {
        window.editor.infoBox.show('Info', 'First frame.');
        return;
      }

      this.editObjectsInFrame(this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.sceneMeta.frames[frameIndex],
        this.editingTarget.objType,
        -1);
    }
  }


  this.prevFrameBatch = function () {
    const firstEditor = this.activeEditorList()[0];
    if (firstEditor.target.world.frameInfo.getFrameIndex() === 0) {
      if (this.batchSize >= this.editingTarget.sceneMeta.frames.length) {
        this.prevObj();
      } else {
        window.editor.infoBox.show('Info', 'This is the first batch  of frames');
      }
    } else {
      this.edit(
        this.editingTarget.data,
        this.editingTarget.sceneMeta,
        this.editingTarget.sceneMeta.frames[Math.max(this.editingTarget.frameIndex - this.batchSize / 2, 0)],
        this.editingTarget.objTrackId,
        this.editingTarget.objType
      );
    }
  };

  this.prevObj = function () {
    let idx = objIdManager.objectList.findIndex(x => x.id === this.editingTarget.objTrackId);

    const objNum = objIdManager.objectList.length;

    idx = (idx + objNum - 1) % objNum;

    const obj = objIdManager.objectList[idx];

    this.edit(
      this.editingTarget.data,
      this.editingTarget.sceneMeta,
      this.editingTarget.sceneMeta.frames[this.editingTarget.frameIndex],
      obj.id,
      obj.category
    );
  };

  this.gotoFrame = function (frameID) {
    this.getSelectedEditors().forEach(e => e.setSelected(false));
    this.activeEditorList().find(e => e.target.world.frameInfo.frame === frameID).setSelected(true);
  };

  this.gotoObjectFrame = function (frameId, objId) {
    if (objId !== this.editingTarget.objTrackId) {
      const obj = objIdManager.getObjById(objId);

      this.edit(
        this.editingTarget.data,
        this.editingTarget.sceneMeta,
        frameId,
        objId,
        obj.category
      );
    }

    this.getSelectedEditors().forEach(e => e.setSelected(false));
    this.activeEditorList().find(e => e.target.world.frameInfo.frame === frameId).setSelected(true);
  };

  this.nextObj = function () {
    let idx = objIdManager.objectList.findIndex(x => x.id === this.editingTarget.objTrackId && x.category === this.editingTarget.objType);

    const objNum = objIdManager.objectList.length;

    idx = (idx + 1) % objNum;

    const obj = objIdManager.objectList[idx];

    this.edit(
      this.editingTarget.data,
      this.editingTarget.sceneMeta,
      this.editingTarget.sceneMeta.frames[this.editingTarget.frameIndex],
      obj.id,
      obj.category
    );
  };

  // this.toolbox.querySelector("#save").onclick = ()=>{
  //     this._save();
  // };

  this.toolbox.querySelector('#finalize').onclick = () => {
    this.finalize();
  };

  this.finalize = function () {
    this.activeEditorList().forEach(e => {
      if (e.box) {
        if (e.box.annotator) {
          delete e.box.annotator;
          funcOnBoxChanged(e.box);
        }
        e.box.world.annotation.setModified();
        e.updateInfo();
      }
    });

    this.globalHeader.updateModifiedStatus();
  };

  this.objectIdChanged = function (event) {
    let id = event.currentTarget.value;

    if (id === 'new') {
      id = objIdManager.generateNewUniqueId();
      this.parentUi.querySelector('#object-track-id-editor').value = id;
    }

    this.activeEditorList().forEach(e => {
      if (e.box) {
        e.box.obj_id = id;
      }
    });
  };

  this.objectTypeChanged = function (event) {
    const objType = event.currentTarget.value;
    this.activeEditorList().forEach(e => {
      if (e.box) {
        e.box.obj_type = objType;
      }
    });
  };

  this._save = function () {
    const worldList = [];
    const editorList = [];
    this.activeEditorList().forEach(e => {
      worldList.push(e.target.world);
      editorList.push(e);
    });

    saveWorldList(worldList);
  };

  this.updateViewZoomRatio = function (viewIndex, ratio) {
    const dontRender = true;
    this.activeEditorList().forEach(e => {
      e._setViewZoomRatio(viewIndex, ratio);
      e.update(dontRender);
    });

    // render all
    this.viewManager.render();
  };

  this.addEditor = function () {
    const editor = this.allocateEditor();
    this.activeIndex += 1;
    return editor;
  };

  this.allocateEditor = function () {
    if (this.activeIndex >= this.editorList.length) {
      const editor = new BoxEditor(this.boxEditorGroupUi, this, this.viewManager, cfg, this.boxOp, funcOnBoxChanged, funcOnBoxRemoved, String(this.activeIndex));

      // resizable for the first editor

      // if (this.editorList.length === 0)
      // {
      //     editor.setResize("both");
      // }

      this.editorList.push(editor);

      return editor;
    } else {
      return this.editorList[this.activeIndex];
    }
  };

  this.getEditorByMousePosition = function (x, y) {
    return this.editorList.find(e => {
      const rect = e.ui.getBoundingClientRect();

      return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;
    });
  };

  this.parentUi.onmousedown = (event) => {
    if (event.which !== 1) { return; }

    const eventId = Date.now();

    const selectStartPos = {
      x: event.clientX,
      y: event.clientY
    };

    console.log('box editor manager, on mouse down.', selectStartPos);

    const selectEndPos = {
      x: event.clientX,
      y: event.clientY
    };

    // a1<a2, b1<b2
    function lineIntersect (a1, a2, b1, b2) {
      if (a1 > a2) [a1, a2] = [a2, a1];
      if (b1 > b2) [b1, b2] = [b2, b1];

      return (a1 > b1 && a1 < b2) || (a2 > b1 && a2 < b2) || (b1 > a1 && b1 < a2) || (b2 > a1 && b2 < a2);
    }

    // a,b: left, right, right, bottom
    function intersect (domRect, mouseA, mouseB) {
      return (lineIntersect(selectEndPos.x, selectStartPos.x, domRect.left, domRect.right) &&
                    lineIntersect(selectEndPos.y, selectStartPos.y, domRect.top, domRect.bottom));
    }

    this.parentUi.onmousemove = (event) => {
      selectEndPos.x = event.clientX;
      selectEndPos.y = event.clientY;

      this.editorList.forEach(e => {
        const rect = e.ui.getBoundingClientRect();
        const intersected = intersect(rect, selectStartPos, selectEndPos);

        e.setSelected(intersected, event.ctrlKey ? eventId : null);
      });
    };

    this.parentUi.onmouseup = (event) => {
      if (event.which !== 1) { return; }

      this.parentUi.onmousemove = null;
      this.parentUi.onmouseup = null;

      if (event.clientX === selectStartPos.x && event.clientY === selectStartPos.y) { // click
        const ed = this.getEditorByMousePosition(event.clientX, event.clientY);

        if (event.shiftKey) {
          const selectedEditors = this.getSelectedEditors();
          if (selectedEditors.length === 0) {
            // do nothing
          } else if (ed.index < selectedEditors[0].index) {
            this.activeEditorList().forEach(e => {
              if (e.index >= ed.index && e.index < selectedEditors[0].index) {
                e.setSelected(true);
              }
            });
          } else if (ed.index > selectedEditors[selectedEditors.length - 1].index) {
            this.activeEditorList().forEach(e => {
              if (e.index <= ed.index && e.index > selectedEditors[selectedEditors.length - 1].index) {
                e.setSelected(true);
              }
            });
          }
        } else if (event.ctrlKey) {
          ed.setSelected(!ed.selected);
        } else {
          const selectedEditors = this.getSelectedEditors();

          if (ed) {
            if (ed.selected && selectedEditors.length === 1) {
              ed.setSelected(false);
            } else {
              selectedEditors.forEach(e => e.setSelected(false));
              ed.setSelected(true);
            }
          } else {
            selectedEditors.forEach(e => e.setSelected(false));
          }
        }
      }
    };
  };

  this.getSelectedEditors = function () {
    return this.editorList.filter(e => e.selected);
  };
}
export { BoxEditorManager, BoxEditor };
