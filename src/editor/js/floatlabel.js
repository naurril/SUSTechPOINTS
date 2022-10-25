
import { pxrToXyz } from './util.js';
import * as THREE from 'three';

import { AttrEditor } from './common/attr_editor.js';
import { DropdownMenu } from './common/sensible_dropdown_menu.js';
import { ObjTypeEditor } from './common/obj_type_editor.js';

class FastToolBox {
  constructor (ui, eventHandler) {
    this.ui = ui;
    this.eventHandler = eventHandler;

    this.installEventHandler();

    this.attrEditor = new AttrEditor(this.ui.querySelector('#attr-editor'), eventHandler);

    this.objTypeEditor = new ObjTypeEditor(this.ui.querySelector('#object-category-selector'));

    this.dropdownMenu = new DropdownMenu(this.ui.querySelector('#label-more'),
      this.ui.querySelector('#object-dropdown-menu'));

    const dropdownMenu = this.ui.querySelector('#object-dropdown-menu');
    for (let i = 0; i < dropdownMenu.children.length; i++) {
      dropdownMenu.children[i].onclick = (event) => {
        // event.preventDefault();
        event.stopPropagation();

        this.eventHandler(event);

        this.ui.querySelector('#object-dropdown-menu').style.display = 'none';
      };
    }
  }

  hide () {
    this.ui.style.display = 'none';
  }

  show () {
    this.ui.style.display = 'inline-block';
    this.ui.querySelector('#attr-selector').style.display = 'none';
  }

  setValue (objType, objTrackId, objAttr) {
    this.objTypeEditor.setValue(objType);

    this.attrEditor.setAttrOptions(objType, objAttr);

    this.ui.querySelector('#object-track-id-editor').value = objTrackId;
  }

  setPos (pos) {
    if (pos) {
      this.ui.style.top = pos.top;
      this.ui.style.left = pos.left;
    }
  }

  installEventHandler () {
    const btns = [
      '#label-del',
      '#label-gen-id',
      '#label-copy',
      '#label-paste',
      '#label-batchedit',
      '#label-trajectory',
      '#label-edit',
      '#label-highlight',
      '#label-rotate'
    ];

    btns.forEach(btn => {
      this.ui.querySelector(btn).onclick = (event) => {
        this.eventHandler(event);
      };
    });

    this.ui.querySelector('#object-category-selector').onchange = event => {
      // this.ui.querySelector("#attr-input").value="";
      this.attrEditor.setAttrOptions(event.currentTarget.value, this.ui.querySelector('#attr-input').value);
      this.eventHandler(event);
    };

    this.ui.querySelector('#object-track-id-editor').onchange = event => this.eventHandler(event);
    this.ui.querySelector('#object-track-id-editor').addEventListener('keydown', e => e.stopPropagation());
    this.ui.querySelector('#object-track-id-editor').addEventListener('keyup', event => {
      event.stopPropagation();
      this.eventHandler(event);
    });

    // this.ui.querySelector("#attr-input").onchange =    event=>this.eventHandler(event);
    // this.ui.querySelector("#attr-input").addEventListener("keydown", e=>e.stopPropagation());
    // this.ui.querySelector("#attr-input").addEventListener("keyup", event=>{
    //     event.stopPropagation();
    //     this.eventHandler(event);
    // });
  }
}

class FloatLabelManager {
  constructor (editorUi, containerDiv, view, funcOnLabelClicked) {
    this.view = view; // access camera by view, since camera is dynamic
    this.editorUi = editorUi;
    this.container = containerDiv;
    this.labelsUi = editorUi.querySelector('#floating-labels');
    this.floatingUi = editorUi.querySelector('#floating-things');

    this.style = document.createElement('style');
    this.temp_style = document.createElement('style');
    this.on_label_clicked = funcOnLabelClicked;

    this.id_enabled = true;
    this.category_enabled = true;
    this.colorScheme = 'category';

    document.head.appendChild(this.style);
    document.head.appendChild(this.temp_style);

    this.id_enabled = !window.pointsGlobalConfig.hideId;
    this.category_enabled = !window.pointsGlobalConfig.hideCategory;
  }

  hide () {
    this.floatingUi.style.display = 'none';
  }

  show () {
    this.floatingUi.style.display = '';
  }

  showId (show) {
    this.id_enabled = show;

    if (!show) {
      this.temp_style.sheet.insertRule('.label-obj-id-text {display: none}');
    } else {
      for (let i = this.temp_style.sheet.cssRules.length - 1; i >= 0; i--) {
        const r = this.temp_style.sheet.cssRules[i];
        if (r.selectorText === '.label-obj-id-text') {
          this.temp_style.sheet.deleteRule(i);
        }
      }
    }
  }

  showCategory (show) {
    this.category_enabled = show;

    if (!show) {
      this.temp_style.sheet.insertRule('.label-obj-type-text {display: none}');
      this.temp_style.sheet.insertRule('.label-obj-attr-text {display: none}');
    } else {
      for (let i = this.temp_style.sheet.cssRules.length - 1; i >= 0; i--) {
        const r = this.temp_style.sheet.cssRules[i];
        if (r.selectorText === '.label-obj-type-text' || r.selectorText === '.label-obj-attr-text') {
          this.temp_style.sheet.deleteRule(i);
        }
      }
    }
  }

  // hide all temporarily when zoom in one object.
  hideAll () {
    // if (this.temp_style.sheet.cssRules.length == 0){
    //     this.temp_style.sheet.insertRule(".label-obj-id-text {display: none}");
    //     this.temp_style.sheet.insertRule(".label-obj-type-text {display: none}");
    //     this.temp_style.sheet.insertRule(".label-obj-attr-text {display: none}");
    // }
    this.labelsUi.style.display = 'none';
  }

  restoreAll () {
    // this.showCategory(this.category_enabled);
    // this.showId(this.id_enabled);
    this.labelsUi.style.display = '';
  }

  removeAllLabels () {
    if (this.labelsUi.children.length > 0) {
      for (let c = this.labelsUi.children.length - 1; c >= 0; c--) {
        this.labelsUi.children[c].remove();
      }
    }
  }

  updateAllPosition () {
    if (this.labelsUi.children.length > 0) {
      for (let c = 0; c < this.labelsUi.children.length; c++) {
        const element = this.labelsUi.children[c];

        const bestPos = this.computeBestPosition(element.vertices);
        const pos = this.coordToPixel(bestPos);

        element.style.top = Math.round(pos.y) + 'px';
        element.style.left = Math.round(pos.x) + 'px';

        element.className = element.orgClassName;
        if (pos.out_view) {
          element.className += ' label-out-view';
        }
      }
    }
  }

  getLabelEditorPos (localId) {
    const label = this.editorUi.querySelector('#obj-local-' + localId);
    if (label) {
      // if label is hidden, we can't use its pos directly.
      const bestPos = this.computeBestPosition(label.vertices);
      const pos = this.coordToPixel(bestPos);

      return {
        top: Math.round(pos.y) + label.offsetHeight + 'px',
        left: Math.round(pos.x) + 30 + 'px'
      };
    }
  }

  setObjectType (localId, objType) {
    const label = this.editorUi.querySelector('#obj-local-' + localId);
    if (label) {
      label.obj_type = objType;
      label.updateText();
      this.updateColor(label);
    }
  }

  setObjectAttr (localId, objAttr) {
    const label = this.editorUi.querySelector('#obj-local-' + localId);
    if (label) {
      label.obj_attr = objAttr;
      label.updateText();
      this.updateColor(label);
    }
  }

  setObjectTrackId (localId, trackId) {
    const label = this.editorUi.querySelector('#obj-local-' + localId);

    if (label) {
      label.obj_id = trackId;
      label.updateText();
      this.updateColor(label);
    }
  }

  translateVerticesToGlobal (world, vertices) {
    const ret = [];
    for (let i = 0; i < vertices.length; i += 4) {
      const p = new THREE.Vector4().fromArray(vertices, i).applyMatrix4(world.webglGroup.matrix);
      ret.push(p.x);
      ret.push(p.y);
      ret.push(p.z);
      ret.push(p.w);
    }

    return ret;
  }

  updatePosition (box, refresh) {
    const label = this.editorUi.querySelector('#obj-local-' + box.objLocalId);

    if (label) {
      label.vertices = this.translateVerticesToGlobal(box.world, pxrToXyz(box.position, box.scale, box.rotation));

      if (refresh) {
        const bestPos = this.computeBestPosition(label.vertices);
        const pos = this.coordToPixel(bestPos);

        label.style.top = Math.round(pos.y) + 'px';
        label.style.left = Math.round(pos.x) + 'px';

        label.className = label.orgClassName;
        if (pos.out_view) {
          label.className += ' label-out-view';
        }
      }
    }
  }

  removeBox (box) {
    const label = this.editorUi.querySelector('#obj-local-' + box.objLocalId);

    if (label) { label.remove(); }
  }

  setColorScheme (colorScheme) {
    this.colorScheme = colorScheme;
  }

  updateColor (label) {
    if (this.colorScheme === 'id') {
      label.className = 'float-label color-' + (label.obj_id % 33);
    } else { // by id
      label.className = 'float-label ' + label.obj_type;
    }

    label.orgClassName = label.className;
  }

  addLabel (box) {
    const label = document.createElement('div');

    label.id = 'obj-local-' + box.objLocalId;

    label.updateText = function () {
      let labelText = '<div class="label-obj-type-text">';
      labelText += this.obj_type;
      labelText += '</div>';

      if (this.obj_attr) {
        labelText += '<div class="label-obj-attr-text">';
        labelText += this.obj_attr;
        labelText += '</div>';
      }

      labelText += '<div class="label-obj-id-text">';
      labelText += this.obj_id;
      labelText += '</div>';

      this.innerHTML = labelText;
    };

    label.obj_type = box.obj_type;
    label.objLocalId = box.objLocalId;
    label.obj_id = box.obj_id;
    label.obj_attr = box.obj_attr;
    label.updateText();
    this.updateColor(label);

    label.vertices = this.translateVerticesToGlobal(box.world, pxrToXyz(box.position, box.scale, box.rotation));

    let bestPos = this.computeBestPosition(label.vertices);
    bestPos = this.coordToPixel(bestPos);

    const pos = bestPos;

    label.style.top = Math.round(pos.y) + 'px';
    label.style.left = Math.round(pos.x) + 'px';

    if (pos.out_view) {
      label.className += ' label-out-view';
    }

    this.labelsUi.appendChild(label);

    label.onclick = () => {
      this.on_label_clicked(box);
    };
  }

  coordToPixel (p) {
    const width = this.container.clientWidth; const height = this.container.clientHeight;
    const widthHalf = width / 2; const heightHalf = height / 2;

    const ret = {
      x: (p.x * widthHalf) + widthHalf + 10,
      y: -(p.y * heightHalf) + heightHalf - 10,
      out_view: p.x > 0.9 || p.x < -0.6 || p.y < -0.9 || p.y > 0.9 || p.z < -1 || p.z > 1
      // p.x<-0.6 to prevent it from appearing ontop of sideviews.
    };

    return ret;
  }

  computeBestPosition (vertices) {
    const _self = this;
    const cameraPos = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
      return new THREE.Vector3(vertices[i * 4 + 0], vertices[i * 4 + 1], vertices[i * 4 + 2]);
    });

    cameraPos.forEach(function (x) {
      x.project(_self.view.camera);
    });

    const visiblePos = cameraPos;

    const bestPos = { x: -1, y: -1, z: -2 };

    visiblePos.forEach(function (p) {
      if (p.x > bestPos.x) {
        bestPos.x = p.x;
      }

      if (p.y > bestPos.y) {
        bestPos.y = p.y;
      }

      if (p.z > bestPos.z) {
        bestPos.z = p.z;
      }
    });

    return bestPos;
  }
}

export { FloatLabelManager, FastToolBox };
