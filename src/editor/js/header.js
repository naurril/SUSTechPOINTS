
import { saveWorldList } from './save.js';

const Header = function (ui, data, cfg, onSceneChanged, onFrameChanged, onObjectSelected) {
  this.ui = ui;
  this.data = data;
  this.cfg = cfg;
  this.boxUi = ui.querySelector('#box');
  this.refObjUi = ui.querySelector('#ref-obj');
  this.curObjUi = ui.querySelector('#cur-obj');
  this.sceneSelectorUi = ui.querySelector('#scene-selector');
  this.frameSelectorUi = ui.querySelector('#frame-selector');
  this.objectSelectorUi = ui.querySelector('#object-selector');
  this.cameraSelectorUi = ui.querySelector('#camera-selector');
  this.changedMarkUi = ui.querySelector('#changed-mark');

  this.userInfoUi = this.ui.querySelector('#user-info');

  this.onSceneChanged = onSceneChanged;
  this.onFrameChanged = onFrameChanged;
  this.onObjectSelected = onObjectSelected;

  if (cfg.disableSceneSelector) {
    this.sceneSelectorUi.style.display = 'none';
  }

  if (cfg.disableFrameSelector) {
    this.frameSelectorUi.style.display = 'none';
  }

  if (cfg.disableCameraSelector) {
    this.cameraSelectorUi.style.display = 'none';
  }

  // update scene selector ui

  this.userInfoUi.onclick = () => {
    window.editor.hide();
    document.getElementById('react-app-wrapper').style.display = 'block';
  };

  this.setUserInfo = function (info) {
    this.userInfoUi.innerText = info.annotator + (info.readonly ? ' : readonly' : '');
  };

  this.updateSceneList = function (sceneDescList) {
    let sceneSelectorStr = '<option>--scene--</option>';
    for (const scene in sceneDescList) {
      if (sceneDescList[scene]) {
        const d = sceneDescList[scene];
        sceneSelectorStr += '<option value=' + scene + '>' + scene + ' - ' + (d.scene ? d.scene : '') + ` (${d.label_files}/${d.frames})</option>`;
      } else { sceneSelectorStr += '<option value=' + scene + '>' + scene + '</option>'; }
    }

    this.ui.querySelector('#scene-selector').innerHTML = sceneSelectorStr;
  };

  this.data.readSceneList().then(sceneDescList => {
    this.updateSceneList(sceneDescList);
  });

  this.ui.querySelector('#btn-reload-scene-list').onclick = (event) => {
    const curentValue = this.sceneSelectorUi.value;
    this.data.readSceneList().then(sceneDescList => {
      this.updateSceneList(sceneDescList);
      this.sceneSelectorUi.value = curentValue;
    });
  };

  this.sceneSelectorUi.onchange = (e) => { this.onSceneChanged(e); };
  this.objectSelectorUi.onchange = (e) => { this.onObjectSelected(e); };
  this.frameSelectorUi.onchange = (e) => { this.onFrameChanged(e); };

  this.setObject = function (id) {
    this.objectSelectorUi.value = id;
  };

  this.clear_box_info = function () {
    this.boxUi.innerHTML = '';
  };

  this.updateBoxInfo = function (box) {
    const scale = box.scale;
    const pos = box.position;
    const rotation = box.rotation;
    const pointsNumber = box.world.lidar.getBoxPointsNumber(box);
    const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y).toFixed(2);

    this.boxUi.innerHTML = '<span>' + box.obj_type + '-' + box.obj_id +
                               (box.annotator ? ("</span> | <span title='annotator'>" + box.annotator) : '') +
                               "</span> | <span title='distance'>" + distance +
                               "</span> | <span title='position'>" + pos.x.toFixed(2) + ' ' + pos.y.toFixed(2) + ' ' + pos.z.toFixed(2) +
                               "</span> | <span title='scale'>" + scale.x.toFixed(2) + ' ' + scale.y.toFixed(2) + ' ' + scale.z.toFixed(2) +
                               "</span> | <span title='rotation'>" +
                                (rotation.x * 180 / Math.PI).toFixed(2) + ' ' + (rotation.y * 180 / Math.PI).toFixed(2) + ' ' + (rotation.z * 180 / Math.PI).toFixed(2) +
                                "</span> | <span title = 'points'>" +
                                pointsNumber + '</span> ';
    if (box.follows) {
      this.boxUi.innerHTML += '| F:' + box.follows.obj_id;
    }
  };

  this.setReferenceObject = function (markedObject) {
    this.refObjUi.innerHTML = '| Ref: ' + markedObject.scene + '/' + markedObject.frame + ': ' + markedObject.ann.obj_type + '-' + markedObject.ann.obj_id;
  };

  this.setCurrentObject = function (id) {
    this.curObjUi.innerHTML = '| Cur: ' + id;
  };
  this.unsetCurrentObject = function () {
    this.curObjUi.innerHTML = '';
  };
  this.set_frame_info = function (scene, frame, onSceneChanged) {
    if (this.sceneSelectorUi.value !== scene) {
      this.sceneSelectorUi.value = scene;
      onSceneChanged(scene);
    }

    this.frameSelectorUi.value = frame;
  };

  this.updateModifiedStatus = function () {
    const frames = this.data.worldList.filter(w => w.annotation.modified);
    if (frames.length > 0) {
      this.ui.querySelector('#changed-mark').className = 'ui-button alarm-mark';
    } else {
      this.ui.querySelector('#changed-mark').className = 'ui-button';
    }
  };

  this.ui.querySelector('#changed-mark').onmouseenter = () => {
    let items = '';
    const frames = this.data.worldList.filter(w => w.annotation.modified).map(w => w.frameInfo);
    frames.forEach(f => {
      items += "<div class='modified-world-item'>" + f.frame + '</div>';
    });

    if (frames.length > 0) {
      this.ui.querySelector('#changed-world-list').innerHTML = items;
      this.ui.querySelector('#changed-world-list-wrapper').style.display = 'inherit';
    }
  };

  this.ui.querySelector('#changed-mark').onmouseleave = () => {
    this.ui.querySelector('#changed-world-list-wrapper').style.display = 'none';
  };

  this.ui.querySelector('#save-button').onclick = () => {
    saveWorldList(this.data.worldList);
  };
};

export { Header };
