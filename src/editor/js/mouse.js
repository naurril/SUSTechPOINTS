
import * as THREE from 'three';

class Mouse {
  constructor (view, opState, mainUiContainer, parentUi, onLeftClick, onRightClick, onSelectRect) {
    this.view = view;
    this.domElement = mainUiContainer;
    this.parentUi = parentUi;
    this.operationState = opState;

    this.domElement.addEventListener('mousemove', (e) => { this.onMouseMove(e); }, false);
    this.domElement.addEventListener('mousedown', (e) => { this.onMouseDown(e); }, true);

    this.raycaster = new THREE.Raycaster();
    this.onDownPosition = new THREE.Vector2();
    this.onUpPosition = new THREE.Vector2();

    this.handleLeftClick = onLeftClick;
    this.handleRightClick = onRightClick;
    this.handleSelectRect = onSelectRect;

    this.inSelectMode = false;
    this.selectStartPos = null;
    this.selectEndPos = null;
  }

  getMouseLocationInWorld () {
    this.raycaster.setFromCamera(this.onUpPosition, this.view.camera);
    const o = this.raycaster.ray.origin;
    const d = this.raycaster.ray.direction;

    const alpha = -o.z / d.z;
    const x = o.x + d.x * alpha;
    const y = o.y + d.y * alpha;
    return { x, y, z: 0 };
  }

  getScreenLocationInWorld (x, y) {
    const screenPos = new THREE.Vector2();
    screenPos.x = x;
    screenPos.y = y;

    this.raycaster.setFromCamera(screenPos, this.view.camera);
    const o = this.raycaster.ray.origin;
    const d = this.raycaster.ray.direction;

    const alpha = -o.z / d.z;

    return {
      x: o.x + d.x * alpha,
      y: o.y + d.y * alpha,
      z: 0
    };
  }

  getMousePosition (dom, offsetX, offsetY) {
    return [offsetX / dom.clientWidth * 2 - 1, -offsetY / dom.clientHeight * 2 + 1];
  }

  getIntersects (point, objects) {

    if (!objects) {
      return [];
    }

    // mouse is temp var
    const mouse = new THREE.Vector2();
    mouse.set(point.x, point.y);

    this.raycaster.setFromCamera(mouse, this.view.camera);

    return this.raycaster.intersectObjects(objects, false); // 2nd argument: recursive.
  }

  onMouseDown (event) {
    this.inSelectMode = false;

    if (event.which === 3) {
      this.operationState.key_pressed = false;
    } else if (event.which === 1) {
      //console.log('mouse left key down!');
      if (event.ctrlKey || event.shiftKey) {
        event.stopPropagation();
        event.preventDefault();

        this.inSelectMode = true;

        this.selectStartPos = {
          x: event.offsetX,
          y: event.offsetY
        };
      }
    }

    const array = this.getMousePosition(this.domElement, event.offsetX, event.offsetY);
    this.onDownPosition.fromArray(array);
    //console.log('mouse down', array);

    this.on_mouse_up = (e) => { this.onMouseUp(e); };
    this.domElement.addEventListener('mouseup', this.on_mouse_up, false);
  }

  onMouseMove (event) {
    event.preventDefault();

    // console.log(this.getMousePosition(this.domElement, event.offsetX, event.offsetY));

    if (this.inSelectMode) {
      this.selectEndPos = {
        x: event.offsetX,
        y: event.offsetY
      };

      if (event.offsetX !== this.selectStartPos.x || event.offsetY !== this.selectEndPos.y) {
        // draw select box
        const sbox = this.parentUi.querySelector('#select-box');

        sbox.style.display = 'inherit';

        if (this.selectStartPos.x < this.selectEndPos.x) {
          sbox.style.left = this.selectStartPos.x + 'px';
          sbox.style.width = this.selectEndPos.x - this.selectStartPos.x + 'px';
        } else {
          sbox.style.left = this.selectEndPos.x + 'px';
          sbox.style.width = -this.selectEndPos.x + this.selectStartPos.x + 'px';
        }

        if (this.selectStartPos.y < this.selectEndPos.y) {
          sbox.style.top = this.selectStartPos.y + 'px';
          sbox.style.height = this.selectEndPos.y - this.selectStartPos.y + 'px';
        } else {
          sbox.style.top = this.selectEndPos.y + 'px';
          sbox.style.height = -this.selectEndPos.y + this.selectStartPos.y + 'px';
        }
      }
    }
  }

  onMouseUp (event) {
    this.domElement.removeEventListener('mouseup', this.on_mouse_up, false);

    const array = this.getMousePosition(this.domElement, event.offsetX, event.offsetY);
    this.onUpPosition.fromArray(array);

   //console.log('mouse up', array);

    if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
      if (event.which === 3) {
        // right click
        // if no other key pressed, we consider this as a right click
        if (!this.operationState.key_pressed) {
          //console.log('right clicked.');
          this.handleRightClick(event);
        }
      } else {
        // left click
        this.handleLeftClick(event);
      }

      this.inSelectMode = false;
      return;
    }

    if (this.inSelectMode) {
      this.inSelectMode = false;

      const sbox = this.parentUi.querySelector('#select-box');
      sbox.style.display = 'none';

      if (this.handleSelectRect) {
        let x, y, w, h;

        if (this.onDownPosition.x < this.onUpPosition.x) {
          x = this.onDownPosition.x;
          w = this.onUpPosition.x - this.onDownPosition.x;
        } else {
          x = this.onUpPosition.x;
          w = this.onDownPosition.x - this.onUpPosition.x;
        }

        if (this.onDownPosition.y < this.onUpPosition.y) {
          y = this.onDownPosition.y;
          h = this.onUpPosition.y - this.onDownPosition.y;
        } else {
          y = this.onUpPosition.y;
          h = this.onDownPosition.y - this.onUpPosition.y;
        }

        //console.log('select rect', x, y, w, h);
        this.handleSelectRect(x, y, w, h, event.ctrlKey, event.shiftKey);
      }
    }
  }
}

export { Mouse };
