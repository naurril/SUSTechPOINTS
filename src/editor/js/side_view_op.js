
import { matmul2 } from './util.js'

class ProjectiveView {
  constructor (ui,
    cfg,
    onEdgeChanged,
    onDirectionChanged,
    onAutoShrink,
    onMoved,
    onScale,
    onWheel,
    onFitSize,
    onAutoRotate,
    onResetRotate,
    onFocus,
    onBoxRemove,
    fnIsActive) {
    this.ui = ui
    this.cfg = cfg
    this.onEdgeChanged = onEdgeChanged
    this.onDirectionChanged = onDirectionChanged
    this.onAutoShrink = onAutoShrink
    this.onMoved = onMoved
    this.onScale = onScale
    this.onWheel = onWheel
    this.onFitSize = onFitSize
    this.onAutoRotate = onAutoRotate
    this.onResetRotate = onResetRotate
    this.onFocus = onFocus
    this.onBoxRemove = onBoxRemove
    this.isActive = fnIsActive

    this.lines = {
      top: ui.querySelector('#line-top'),
      bottom: ui.querySelector('#line-bottom'),
      left: ui.querySelector('#line-left'),
      right: ui.querySelector('#line-right'),
      direction: ui.querySelector('#line-direction')
    }

    this.orgPointInd = ui.querySelector('#origin-point-indicator')

    this.svg = ui.querySelector('#view-svg')

    this.handles = {

      top: ui.querySelector('#line-top-handle'),
      bottom: ui.querySelector('#line-bottom-handle'),
      left: ui.querySelector('#line-left-handle'),
      right: ui.querySelector('#line-right-handle'),
      direction: ui.querySelector('#line-direction-handle'),

      topleft: ui.querySelector('#top-left-handle'),
      topright: ui.querySelector('#top-right-handle'),
      bottomleft: ui.querySelector('#bottom-left-handle'),
      bottomright: ui.querySelector('#bottom-right-handle'),

      move: ui.querySelector('#move-handle')
    }

    this.buttons = {
      fitPosition: ui.querySelector('#v-fit-position'),
      fitSize: ui.querySelector('#v-fit-size'),
      fitRotation: ui.querySelector('#v-fit-rotation'),
      fitAll: ui.querySelector('#v-fit-all'),
      resetRotation: ui.querySelector('#v-reset-rotation'),
      fitMovingDirection: ui.querySelector('#v-fit-moving-direction')
    }

    ui.onkeydown = this.onKeyDown.bind(this)
    ui.onmouseenter = (event) => {
      if (this.isActive()) {
        ui.focus()

        ui.querySelector('#v-buttons').style.display = 'inherit'

        if (this.onFocus) { this.onFocus() }
      }
    }
    ui.onmouseleave = (event) => {
      if (this.showButtonsTimer) { clearTimeout(this.showButtonsTimer) }

      this.hideButtons()

      ui.blur()
    }

    ui.onwheel = event => {
      event.stopPropagation()
      event.preventDefault()
      this.onWheel(event.deltaY)
    }

    this.installEdgeHandler('left', this.handles.left, this.lines, { x: -1, y: 0 })
    this.installEdgeHandler('right', this.handles.right, this.lines, { x: 1, y: 0 })
    this.installEdgeHandler('top', this.handles.top, this.lines, { x: 0, y: 1 })
    this.installEdgeHandler('bottom', this.handles.bottom, this.lines, { x: 0, y: -1 })
    this.installEdgeHandler('top,left', this.handles.topleft, this.lines, { x: -1, y: 1 })
    this.installEdgeHandler('top,right', this.handles.topright, this.lines, { x: 1, y: 1 })
    this.installEdgeHandler('bottom,left', this.handles.bottomleft, this.lines, { x: -1, y: -1 })
    this.installEdgeHandler('bottom,right', this.handles.bottomright, this.lines, { x: 1, y: -1 })
    this.installEdgeHandler('left,right,top,bottom', this.handles.move, this.lines, null)

    if (this.onDirectionChanged) {
      this.installDirectionHandler('line-direction')
    }

    this.installButtons()
  }

  mouseStartPosition = null

  viewHandleDimension = { // dimension of the enclosed box
    x: 0, // width
    y: 0 // height
  }

  viewCenter = {
    x: 0,
    y: 0
  }

  line (name) {
    return this.lines[name]
  }

  show_lines () {
    const theme = document.documentElement.className

    let lineColor = 'yellow'
    if (theme === 'theme-light') { lineColor = 'red' }

    for (const l in this.lines) {
      this.lines[l].style.stroke = lineColor
    };
  }

  hide_lines () {
    for (const l in this.lines) {
      this.lines[l].style.stroke = '#00000000'
    }
  };

  highlightLine (line) {
    const theme = document.documentElement.className

    let lineColor = 'red'
    if (theme === 'theme-light') { lineColor = 'blue' }

    line.style.stroke = lineColor
  }

  disableHandleExcept (exclude) {
    for (const h in this.handles) {
      if (this.handles[h] !== exclude) { this.handles[h].style.display = 'none' }
    }
  }

  enableHandles () {
    for (const h in this.handles) {
      this.handles[h].style.display = 'inherit'
    }
  }

  moveLines (delta, direction) {
    let x1 = this.viewCenter.x - this.viewHandleDimension.x / 2
    let y1 = this.viewCenter.y - this.viewHandleDimension.y / 2
    let x2 = this.viewCenter.x + this.viewHandleDimension.x / 2
    let y2 = this.viewCenter.y + this.viewHandleDimension.y / 2

    if (direction) {
      if (direction.x === 1) { // right
        x2 += delta.x
      } else if (direction.x === -1) { // left
        x1 += delta.x
      }

      if (direction.y === -1) { // bottom
        y2 += delta.y
      } else if (direction.y === 1) { // top
        y1 += delta.y
      }
    } else {
      x1 += delta.x
      y1 += delta.y
      x2 += delta.x
      y2 += delta.y
    }

    this.set_line_pos(Math.ceil(x1), Math.ceil(x2), Math.ceil(y1), Math.ceil(y2))
  }

  set_line_pos (x1, x2, y1, y2) {
    this.lines.top.setAttribute('x1', '0%')
    this.lines.top.setAttribute('y1', y1)
    this.lines.top.setAttribute('x2', '100%')
    this.lines.top.setAttribute('y2', y1)

    this.lines.bottom.setAttribute('x1', '0%')
    this.lines.bottom.setAttribute('y1', y2)
    this.lines.bottom.setAttribute('x2', '100%')
    this.lines.bottom.setAttribute('y2', y2)

    this.lines.left.setAttribute('x1', x1)
    this.lines.left.setAttribute('y1', '0%')
    this.lines.left.setAttribute('x2', x1)
    this.lines.left.setAttribute('y2', '100%')

    this.lines.right.setAttribute('x1', x2)
    this.lines.right.setAttribute('y1', '0%')
    this.lines.right.setAttribute('x2', x2)
    this.lines.right.setAttribute('y2', '100%')
  }

  set_org_point_ind_pos (viewWidth, viewHeight, objPos, objRot) {
    /*
        cos -sin
        sin  cos
        *
        objPos.x
        objPos.y

        */
    const c = Math.cos(objRot) // for topview, x goes upward, so we add pi/2
    const s = Math.sin(objRot)

    const relx = c * (-objPos.x) + s * (-objPos.y)
    const rely = -s * (-objPos.x) + c * (-objPos.y)

    const radius = Math.sqrt(viewWidth * viewWidth / 4 + viewHeight * viewHeight / 4)
    const distToRog = Math.sqrt(relx * relx + rely * rely)

    const indPosX3d = relx * radius / distToRog
    const indPosY3d = rely * radius / distToRog

    let indPosX = -indPosY3d
    let indPosY = -indPosX3d

    const dotRelPos = 0.8
    // now its pixel coordinates, x goes right, y goes down
    if (indPosX > viewWidth / 2 * dotRelPos) {
      const shrinkRatio = viewWidth / 2 * dotRelPos / indPosX

      indPosX = viewWidth / 2 * dotRelPos
      indPosY = indPosY * shrinkRatio
    }

    if (indPosX < -viewWidth / 2 * dotRelPos) {
      const shrinkRatio = -viewWidth / 2 * dotRelPos / indPosX

      indPosX = -viewWidth / 2 * dotRelPos
      indPosY = indPosY * shrinkRatio
    }

    if (indPosY > viewHeight / 2 * dotRelPos) {
      const shrinkRatio = viewHeight / 2 * dotRelPos / indPosY

      indPosY = viewHeight / 2 * dotRelPos
      indPosX = indPosX * shrinkRatio
    }

    if (indPosY < -viewHeight / 2 * dotRelPos) {
      const shrinkRatio = -viewHeight / 2 * dotRelPos / indPosY

      indPosY = -viewHeight / 2 * dotRelPos
      indPosX = indPosX * shrinkRatio
    }

    this.orgPointInd.setAttribute('cx', viewWidth / 2 + indPosX)
    this.orgPointInd.setAttribute('cy', viewHeight / 2 + indPosY)
  }

  // when direction handler is draging
  rotate_lines (theta) {
    console.log(theta)
    theta = -theta - Math.PI / 2
    console.log(theta)
    // we use rotation matrix
    const transMatrix = [
      Math.cos(theta), Math.sin(theta), this.viewCenter.x,
      -Math.sin(theta), Math.cos(theta), this.viewCenter.y,
      0, 0, 1
    ]

    let points = [
      0,
      -this.viewCenter.y,
      1
    ]

    let transPoints = matmul2(transMatrix, points, 3)
    this.lines.direction.setAttribute('x2', Math.ceil(transPoints[0]))
    this.lines.direction.setAttribute('y2', Math.ceil(transPoints[1]))

    points = [
      -this.viewCenter.x, this.viewCenter.x, // -viewHandleDimension.x/2, viewHandleDimension.x/2,
      -this.viewHandleDimension.y / 2, -this.viewHandleDimension.y / 2,
      1, 1
    ]

    transPoints = matmul2(transMatrix, points, 3)

    this.lines.top.setAttribute('x1', Math.ceil(transPoints[0]))
    this.lines.top.setAttribute('y1', Math.ceil(transPoints[0 + 2]))
    this.lines.top.setAttribute('x2', Math.ceil(transPoints[1]))
    this.lines.top.setAttribute('y2', Math.ceil(transPoints[1 + 2]))

    points = [
      -this.viewHandleDimension.x / 2, -this.viewHandleDimension.x / 2,
      -this.viewCenter.y, this.viewCenter.y,
      1, 1
    ]
    transPoints = matmul2(transMatrix, points, 3)

    this.lines.left.setAttribute('x1', Math.ceil(transPoints[0]))
    this.lines.left.setAttribute('y1', Math.ceil(transPoints[0 + 2]))
    this.lines.left.setAttribute('x2', Math.ceil(transPoints[1]))
    this.lines.left.setAttribute('y2', Math.ceil(transPoints[1 + 2]))

    points = [
      this.viewCenter.x, -this.viewCenter.x,
      this.viewHandleDimension.y / 2, this.viewHandleDimension.y / 2,
      1, 1
    ]
    transPoints = matmul2(transMatrix, points, 3)
    this.lines.bottom.setAttribute('x1', Math.ceil(transPoints[1]))
    this.lines.bottom.setAttribute('y1', Math.ceil(transPoints[1 + 2]))
    this.lines.bottom.setAttribute('x2', Math.ceil(transPoints[0]))
    this.lines.bottom.setAttribute('y2', Math.ceil(transPoints[0 + 2]))

    points = [
      this.viewHandleDimension.x / 2, this.viewHandleDimension.x / 2,
      -this.viewCenter.y, this.viewCenter.y,
      1, 1
    ]
    transPoints = matmul2(transMatrix, points, 3)

    this.lines.right.setAttribute('x1', Math.ceil(transPoints[0]))
    this.lines.right.setAttribute('y1', Math.ceil(transPoints[0 + 2]))
    this.lines.right.setAttribute('x2', Math.ceil(transPoints[1]))
    this.lines.right.setAttribute('y2', Math.ceil(transPoints[1 + 2]))
  }

  updateViewHandle (viewport, objectDimension, objectPosition, objectRotation) {
    const viewport_ratio = viewport.width / viewport.height
    const boxRatio = objectDimension.x / objectDimension.y

    let width = 0
    let height = 0

    if (boxRatio > viewport_ratio) {
      // handle width is viewport.width*2/3
      width = viewport.width * (2 / 3) / viewport.zoomRatio
      height = width / boxRatio
    } else {
      // handle height is viewport.height*2/3
      height = viewport.height * 2 / 3 / viewport.zoomRatio
      width = height * boxRatio
    }

    this.viewHandleDimension.x = width
    this.viewHandleDimension.y = height

    // viewport width/height is position-irrelavent
    // so x and y is relative value.
    const x = viewport.width / 2// viewport.left + viewport.width/2;
    const y = viewport.height / 2// viewport.bottom - viewport.height/2;

    const left = x - width / 2
    const right = x + width / 2
    const top = y - height / 2
    const bottom = y + height / 2

    this.viewCenter.x = x
    this.viewCenter.y = y

    this.set_line_pos(left, right, top, bottom)

    if (objectPosition && objectRotation) {
      this.set_org_point_ind_pos(viewport.width, viewport.height, objectPosition, objectRotation)
    }

    // note when the object is too thin, the height/width value may be negative,
    // this causes error reporting, but we just let it be.
    let de = this.handles.left
    de.setAttribute('x', Math.ceil(left - 10))
    de.setAttribute('y', '0%') // Math.ceil(top+10));
    de.setAttribute('height', '100%')// Math.ceil(bottom-top-20));
    de.setAttribute('width', 20)

    de = this.handles.right
    de.setAttribute('x', Math.ceil(right - 10))
    de.setAttribute('y', '0%')// Math.ceil(top+10));
    de.setAttribute('height', '100%')// Math.ceil(bottom-top-20));
    de.setAttribute('width', 20)

    de = this.handles.top
    de.setAttribute('x', '0%')// Math.ceil(left+10));
    de.setAttribute('y', Math.ceil(top - 10))
    de.setAttribute('width', '100%')// Math.ceil(right-left-20));
    de.setAttribute('height', 20)

    de = this.handles.bottom
    de.setAttribute('x', '0%')// Math.ceil(left+10));
    de.setAttribute('y', Math.ceil(bottom - 10))
    de.setAttribute('width', '100%')// Math.ceil(right-left-20));
    de.setAttribute('height', 20)

    de = this.handles.topleft
    de.setAttribute('x', Math.ceil(left - 10))
    de.setAttribute('y', Math.ceil(top - 10))

    de = this.handles.topright
    de.setAttribute('x', Math.ceil(right - 10))
    de.setAttribute('y', Math.ceil(top - 10))

    de = this.handles.bottomleft
    de.setAttribute('x', Math.ceil(left - 10))
    de.setAttribute('y', Math.ceil(bottom - 10))

    de = this.handles.bottomright
    de.setAttribute('x', Math.ceil(right - 10))
    de.setAttribute('y', Math.ceil(bottom - 10))

    // direction
    if (this.onDirectionChanged) {
      de = this.lines.direction
      de.setAttribute('x1', Math.ceil((left + right) / 2))
      de.setAttribute('y1', Math.ceil((top + bottom) / 2))
      de.setAttribute('x2', Math.ceil((left + right) / 2))
      de.setAttribute('y2', Math.ceil(0))

      de = this.handles.direction
      de.setAttribute('x', Math.ceil((left + right) / 2 - 10))
      de.setAttribute('y', 0)// Math.ceil(top+10));
      de.setAttribute('height', Math.ceil((bottom - top) / 2 - 10 + top))
    } else {
      de = this.lines.direction
      de.style.display = 'none'

      de = this.handles.direction
      de.style.display = 'none'
    }

    // move handle
    de = this.ui.querySelector('#move-handle')
    de.setAttribute('x', Math.ceil((left + right) / 2 - 10))
    de.setAttribute('y', Math.ceil((top + bottom) / 2 - 10))
  }

  showButtonsTimer = null
  hideButtons (delay) {
    this.ui.querySelector('#v-buttons').style.display = 'none'

    if (delay) {
      if (this.showButtonsTimer) {
        clearTimeout(this.showButtonsTimer)
      }

      this.showButtonsTimer = setTimeout(() => {
        this.ui.querySelector('#v-buttons').style.display = 'inherit'
      }, 200)
    }
  }

  hide () {
    this.hide_lines(this.lines)
  };
  // install_move_handler();

  installEdgeHandler (name, handle, lines, direction) {
    handle.onmouseenter = () => {
      if (this.isActive()) {
        this.show_lines()

        if (name) { name.split(',').forEach(n => this.highlightLine(lines[n])) }

        this.ui.onmouseenter()
      }
    }
    handle.onmouseleave = () => this.hide()

    // handle.onmouseup = event=>{
    //     if (event.which!=1)
    //         return;

    //     //line.style["stroke-dasharray"]="none";
    //     //hide();
    //     handle.onmouseleave = hide;
    // };

    handle.ondblclick = (event) => {
      if (event.which !== 1) { return }
      event.stopPropagation()
      event.preventDefault()
      this.onAutoShrink(direction) // if double click on 'move' handler, the directoin is null
    }

    handle.onmousedown = (event) => {
      if (event.which !== 1) { return }

      const svg = this.svg

      //
      event.stopPropagation()
      event.preventDefault()

      this.disableHandleExcept(handle)
      this.hideButtons()

      handle.onmouseleave = null

      this.mouseStartPosition = { x: event.layerX, y: event.layerY }
      let mouseCurrentPosition = { x: this.mouseStartPosition.x, y: this.mouseStartPosition.y }

      console.log(this.mouseStartPosition)

      svg.onmouseup = (event) => {
        svg.onmousemove = null
        svg.onmouseup = null
        this.enableHandles()
        // restore color
        // hide();
        handle.onmouseleave = this.hide.bind(this)

        this.ui.querySelector('#v-buttons').style.display = 'inherit'

        const handle_delta = {
          x: mouseCurrentPosition.x - this.mouseStartPosition.x,
          y: -(mouseCurrentPosition.y - this.mouseStartPosition.y) // reverse since it'll be used by 3d-coord system
        }

        console.log('delta', handle_delta)
        if (handle_delta.x === 0 && handle_delta.y === 0 && !event.ctrlKey && !event.shiftKey) {
          return
        }

        const ratio_delta = {
          x: handle_delta.x / this.viewHandleDimension.x,
          y: handle_delta.y / this.viewHandleDimension.y
        }

        if (direction) {
          this.onEdgeChanged(ratio_delta, direction, event.ctrlKey, event.shiftKey)

          // if (event.ctrlKey){
          //     this.onAutoShrink(direction);
          // }
        } else {
          // when intall handler for mover, the direcion is left null
          this.onMoved(ratio_delta)
        }
      }

      svg.onmousemove = (event) => {
        if (event.which !== 1) { return }

        mouseCurrentPosition = { x: event.layerX, y: event.layerY }

        const handle_delta = {
          x: mouseCurrentPosition.x - this.mouseStartPosition.x,
          y: mouseCurrentPosition.y - this.mouseStartPosition.y // don't reverse direction
        }

        this.moveLines(handle_delta, direction)
      }
    }
  }

  installDirectionHandler (linename) {
    const handle = this.ui.querySelector('#' + linename + '-handle')
    const line = this.ui.querySelector('#' + linename)
    const svg = this.svg

    handle.onmouseenter = (event) => {
      if (this.isActive()) {
        this.show_lines()
        this.highlightLine(line)
      }
    }

    handle.onmouseleave = () => this.hide()

    handle.ondblclick = (event) => {
      event.stopPropagation()
      event.preventDefault()
      // transform_bbox(this_axis+"_rotate_reverse");
      this.onDirectionChanged(Math.PI)
    }

    // function hide(event){
    //     line.style.stroke="#00000000";
    // };

    // handle.onmouseup = event=>{
    //     if (event.which!=1)
    //         return;
    //     //line.style["stroke-dasharray"]="none";
    //     //line.style.stroke="#00000000";
    //     handle.onmouseleave = hide;
    // };

    handle.onmousedown = (event) => {
      if (event.which !== 1) { return }

      event.stopPropagation()
      event.preventDefault()

      // line.style.stroke="yellow";
      handle.onmouseleave = null
      // show_lines(lines);

      this.disableHandleExcept(handle)

      this.hideButtons()

      const handle_center = {
        x: parseInt(line.getAttribute('x1'))
      }

      this.mouseStartPosition = {
        x: event.layerX,
        y: event.layerY,

        handle_offset_x: handle_center.x - event.layerX
      }

      let mouseCurrentPosition = { x: this.mouseStartPosition.x, y: this.mouseStartPosition.y }

      console.log(this.mouseStartPosition)

      let theta = 0

      svg.onmousemove = (event) => {
        mouseCurrentPosition = { x: event.layerX, y: event.layerY }

        const handle_center_cur_pos = {
          x: mouseCurrentPosition.x + this.mouseStartPosition.handle_offset_x,
          y: mouseCurrentPosition.y
        }

        theta = Math.atan2(
          handle_center_cur_pos.y - this.viewCenter.y,
          handle_center_cur_pos.x - this.viewCenter.x)
        console.log(theta)

        this.rotate_lines(theta)
      }

      svg.onmouseup = event => {
        svg.onmousemove = null
        svg.onmouseup = null

        // restore color
        // line.style.stroke="#00000000";
        this.enableHandles()
        handle.onmouseleave = this.hide.bind(this)

        this.ui.querySelector('#v-buttons').style.display = 'inherit'

        if (theta === 0) {
          return
        }

        this.onDirectionChanged(-theta - Math.PI / 2, event.ctrlKey)
      }
    }
  }

  getMoveStep (event) {
    if (event.repeat) {
      return this.cfg.moveStep * this.cfg.speedUpForRepeatedOp
    } else {
      return this.cfg.moveStep
    }
  }

  getRotateStep (event) {
    if (event.repeat) {
      return this.cfg.rotateStep * this.cfg.speedUpForRepeatedOp
    } else {
      return this.cfg.rotateStep
    }
  }

  onKeyDown (event) {
    switch (event.key) {
      case 'e':
        event.preventDefault()
        event.stopPropagation()
        this.onDirectionChanged(-this.getRotateStep(event), event.ctrlKey)
        this.hideButtons(true)
        return true
      case 'q':
        event.preventDefault()
        event.stopPropagation()
        this.onDirectionChanged(this.getRotateStep(event), event.ctrlKey)
        this.hideButtons(true)
        break
      case 'f':
        event.preventDefault()
        event.stopPropagation()
        this.onDirectionChanged(-this.getRotateStep(event), true)
        this.hideButtons(true)
        break
      case 'r':
        event.preventDefault()
        event.stopPropagation()
        this.onDirectionChanged(this.getRotateStep(event), true)
        this.hideButtons(true)
        break
      case 'g':
        event.preventDefault()
        event.stopPropagation()
        this.onDirectionChanged(Math.PI, false)
        break
      case 'w':
      case 'ArrowUp':
        event.preventDefault()
        event.stopPropagation()
        this.onMoved({ x: 0, y: this.getMoveStep(event) })
        this.hideButtons(true)
        break
      case 's':
        if (!event.ctrlKey) {
          event.preventDefault()
          event.stopPropagation()
          this.onMoved({ x: 0, y: -this.getMoveStep(event) })
          this.hideButtons(true)
          break
        } else {
          console.log('ctrl+s')
        }
        break
      case 'ArrowDown':
        event.preventDefault()
        event.stopPropagation()
        this.onMoved({ x: 0, y: -this.getMoveStep(event) })
        this.hideButtons(true)
        break
      case 'a':
        if (event.ctrlKey) {
          break
        }
        // fall through
      case 'ArrowLeft':
        event.preventDefault()
        event.stopPropagation()
        this.onMoved({ x: -this.getMoveStep(event), y: 0 })
        this.hideButtons(true)
        break
      case 'd':
        if (event.ctrlKey) {
          console.log('ctrl+d')
          this.onBoxRemove()
          break
        }
        // fall through
      case 'ArrowRight':
        event.preventDefault()
        event.stopPropagation()
        this.onMoved({ x: this.getMoveStep(event), y: 0 })
        this.hideButtons(true)
        break
      case 'Delete':
        this.onBoxRemove()
        break
      default:
        break
    }
  }

  installButtons () {
    const buttons = this.buttons
    const ignoreLeftMouseDown = (event) => {
      if (event.which === 1) {
        event.stopPropagation()
      }
    }

    if (buttons.fitRotation) {
      buttons.fitRotation.onmousedown = ignoreLeftMouseDown
      buttons.fitRotation.onclick = event => {
        this.onAutoRotate('noscaling')
      }
    }

    if (buttons.fitPosition && this.onFitSize) {
      buttons.fitPosition.onmousedown = ignoreLeftMouseDown
      buttons.fitPosition.onclick = event => {
        this.onFitSize('noscaling')
      }
    }

    if (buttons.fitSize && this.onFitSize) {
      buttons.fitSize.onmousedown = ignoreLeftMouseDown
      buttons.fitSize.onclick = event => {
        this.onFitSize()
      }
    }

    buttons.fitAll.onmousedown = ignoreLeftMouseDown
    buttons.fitAll.onclick = event => {
      // console.log("auto rotate button clicked.");
      this.onAutoRotate()
      // event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
    }

    if (buttons.resetRotation) {
      buttons.resetRotation.onmousedown = ignoreLeftMouseDown

      buttons.resetRotation.onclick = event => {
        // console.log("auto rotate button clicked.");
        this.onResetRotate()
        // event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
      }
    }

    if (buttons.fitMovingDirection) {
      buttons.fitMovingDirection.onmousedown = ignoreLeftMouseDown
      buttons.fitMovingDirection.onclick = event => {
        // console.log("auto rotate button clicked.");
        this.onAutoRotate('noscaling', 'moving-direction')
        // event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
      }
    }
  }
}

class ProjectiveViewOps {
  constructor (ui, editorCfg, boxEditor, views, boxOp, funcOnBoxChanged, funcOnBoxRemoved) {
    this.ui = ui
    this.cfg = editorCfg
    this.onBoxChanged = funcOnBoxChanged
    this.views = views
    this.boxOp = boxOp
    this.boxEditor = boxEditor
    // internals
    const scope = this

    function defaultOnDel () {
      if (scope.box) {
        funcOnBoxRemoved(scope.box)
      }
    }

    function defaultOnFocus () {
      // this is a long chain!
      if (scope.box && scope.box.boxEditor.boxEditorManager) { scope.box.boxEditor.boxEditorManager.globalHeader.updateBoxInfo(scope.box) }
    }

    // direction: 1, -1
    // axis: x,y,z

    function autoShrink (extreme, direction) {
      for (const axis in direction) {
        if (direction[axis] !== 0) {
          let end = 'max'
          if (direction[axis] === -1) {
            end = 'min'
          }

          const delta = direction[axis] * extreme[end][axis] - scope.box.scale[axis] / 2

          console.log(extreme, delta)
          scope.boxOp.translateBox(scope.box, axis, direction[axis] * delta / 2)
          scope.box.scale[axis] += delta
        }
      }
    }

    // direction is in 3d
    function autoStick (delta, direction, useBoxBottomAsLimit) {
      // let old_dim = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, true);
      // let old_scale = scope.box.scale;

      const virtbox = {
        position: {
          x: scope.box.position.x,
          y: scope.box.position.y,
          z: scope.box.position.z
        },
        scale: {
          x: scope.box.scale.x,
          y: scope.box.scale.y,
          z: scope.box.scale.z
        },
        rotation: {
          x: scope.box.rotation.x,
          y: scope.box.rotation.y,
          z: scope.box.rotation.z
        }
      }

      scope.boxOp.translateBox(virtbox, 'x', delta.x / 2 * direction.x)
      scope.boxOp.translateBox(virtbox, 'y', delta.y / 2 * direction.y)
      scope.boxOp.translateBox(virtbox, 'z', delta.z / 2 * direction.z)

      virtbox.scale.x += delta.x
      virtbox.scale.y += delta.y
      virtbox.scale.z += delta.z

      // note dim is the relative value
      const new_dim = scope.box.world.lidar.getPointsDimensionOfBox(virtbox, useBoxBottomAsLimit)

      for (const axis in direction) {
        if (direction[axis] !== 0) {
          let end = 'max'
          if (direction[axis] === -1) {
            end = 'min'
          }

          // scope.box.scale[axis]/2 - direction[axis]*extreme[end][axis];
          const truedelta = delta[axis] / 2 + direction[axis] * new_dim[end][axis] - scope.box.scale[axis] / 2

          console.log(new_dim, delta)
          scope.boxOp.translateBox(scope.box, axis, direction[axis] * truedelta)
          // scope.box.scale[axis] -= delta;
        }
      }

      scope.onBoxChanged(scope.box)
    }

    function onEdgeChanged (delta, direction) {
      console.log(delta)

      scope.boxOp.translateBox(scope.box, 'x', delta.x / 2 * direction.x)
      scope.boxOp.translateBox(scope.box, 'y', delta.y / 2 * direction.y)
      scope.boxOp.translateBox(scope.box, 'z', delta.z / 2 * direction.z)

      scope.box.scale.x += delta.x
      scope.box.scale.y += delta.y
      scope.box.scale.z += delta.z
      scope.onBoxChanged(scope.box)
    }

    function getWheelMultiplier (wheelDirection) {
      let multiplier = 1.0
      if (wheelDirection > 0) {
        multiplier = 1.1
      } else {
        multiplier = 0.9
      }
      return multiplier
    }

    /// ////////////////////////////////////////////////////////////////////////////////
    // direction is null if triggered by dbclick on 'move' handler
    function onZAutoShrink (direction) {
      const extreme = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, true)

      if (!direction) {
        ['x', 'y'].forEach(function (axis) {
          scope.boxOp.translateBox(scope.box, axis, (extreme.max[axis] + extreme.min[axis]) / 2)
          scope.box.scale[axis] = extreme.max[axis] - extreme.min[axis]
        })
      } else {
        direction = {
          x: direction.y,
          y: -direction.x,
          z: 0
        }

        autoShrink(extreme, direction)
      }

      scope.onBoxChanged(scope.box)
    }

    function onZEdgeChanged (ratio, direction2d, autoShrink, lockScale) {
      const delta = {
        x: scope.box.scale.x * ratio.y * direction2d.y,
        y: scope.box.scale.y * ratio.x * direction2d.x,
        z: 0
      }

      const direction3d = {
        x: direction2d.y,
        y: -direction2d.x,
        z: 0
      }

      if (!autoShrink && !lockScale) {
        onEdgeChanged(delta, direction3d)
      } else if (autoShrink) {
        onEdgeChanged(delta, direction3d)
        onZAutoShrink(direction2d)
      } else if (lockScale) {
        autoStick(delta, direction3d, true)
      }
    }

    function onZDirectionChanged (theta, sticky) {
      // points indices shall be obtained before rotation.
      const box = scope.box
      scope.boxOp.rotate_z(box, theta, sticky)
      scope.onBoxChanged(box)
    }

    // ratio.y  vertical
    // ratio.x  horizental
    // box.x  vertical
    // box.y  horizental

    function limitMoveStep (v, min_abs_v) {
      if (v < 0) { return Math.min(v, -min_abs_v) } else if (v > 0) { return Math.max(v, min_abs_v) } else { return v }
    }

    function onZMoved (ratio) {
      const delta = {
        x: scope.box.scale.x * ratio.y,
        y: -scope.box.scale.y * ratio.x
      }

      delta.x = limitMoveStep(delta.x, 0.02)
      delta.y = limitMoveStep(delta.y, 0.02)

      // scope.boxOp.translateBox(scope.box, "x", delta.x);
      // scope.boxOp.translateBox(scope.box, "y", delta.y);

      // scope.onBoxChanged(scope.box);
      scope.boxEditor.onOpCmd({
        op: 'translate',
        params: {
          delta
        }
      })
    }

    function onZScaled (ratio) {
      ratio = {
        x: ratio.y,
        y: ratio.x,
        z: 0
      }

      for (const axis in ratio) {
        if (ratio[axis] !== 0) {
          scope.box.scale[axis] *= 1 + ratio[axis]
        }
      }

      scope.onBoxChanged(scope.box)
    }

    function onZWheel (wheelDirection) {
      const multiplier = getWheelMultiplier(wheelDirection)
      const newRatio = scope.views[0].zoomRatio *= multiplier
      scope.boxEditor.updateViewZoomRatio(0, newRatio)
      // zViewHandle.updateViewHandle(scope.views[0].getViewPort(), {x: scope.box.scale.y, y:scope.box.scale.x});
    }

    function onZFitSize (noscaling) {
      if (noscaling) {
        // fit position only
        scope.boxOp.auto_rotate_xyz(scope.box, null,
          { x: true, y: true, z: false },
          scope.onBoxChanged, noscaling, 'dontrotate')
      } else {
        scope.boxOp.fitSize(scope.box, ['x', 'y'])
        scope.onBoxChanged(scope.box)
      }
    }

    function onZAutoRotate (noscaling, rotate_method) {
      if (rotate_method === 'moving-direction') {
        const estimatedRot = scope.boxOp.estimate_rotation_by_moving_direciton(scope.box)

        if (estimatedRot) {
          scope.box.rotation.z = estimatedRot.z
          scope.onBoxChanged(scope.box)
        }
      } else {
        scope.boxOp.auto_rotate_xyz(scope.box, null,
          noscaling ? null : { x: false, y: false, z: true },
          scope.onBoxChanged, noscaling)
      }
    }

    function onZResetRotate () {
      scope.box.rotation.z = 0
      scope.onBoxChanged(scope.box)
    }

    this.zViewHandle = new ProjectiveView(scope.ui.querySelector('#z-view-manipulator'),
      editorCfg,
      onZEdgeChanged,
      onZDirectionChanged,
      onZAutoShrink,
      onZMoved,
      onZScaled,
      onZWheel,
      onZFitSize,
      onZAutoRotate,
      onZResetRotate,
      defaultOnFocus,
      defaultOnDel,
      this.isActive.bind(this))

    /// ////////////////////////////////////////////////////////////////////////////////

    function onYEdgeChanged (ratio, direction2d, autoShrink, lockScale) {
      const delta = {
        x: scope.box.scale.x * ratio.x * direction2d.x,
        z: scope.box.scale.z * ratio.y * direction2d.y,
        y: 0
      }

      const direction3d = {
        x: direction2d.x,
        z: direction2d.y,
        y: 0
      }

      if (!autoShrink && !lockScale) {
        onEdgeChanged(delta, direction3d)
      } else if (autoShrink) {
        onEdgeChanged(delta, direction3d)
        onYAutoShrink(direction2d)
      } else if (lockScale) {
        autoStick(delta, direction3d, direction2d.y === 0)
      }
    }

    function onYAutoShrink (direction) {
      if (!direction) {
        const extreme = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, false);
        ['x', 'z'].forEach(function (axis) {
          scope.boxOp.translateBox(scope.box, axis, (extreme.max[axis] + extreme.min[axis]) / 2)
          scope.box.scale[axis] = extreme.max[axis] - extreme.min[axis]
        })
      } else {
        direction = {
          x: direction.x,
          y: 0,
          z: direction.y
        }

        if (direction.z !== 0) {
          const extreme = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, false)
          autoShrink(extreme, direction)
        } else {
          const extreme = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, true)
          autoShrink(extreme, direction)
        }
      }

      scope.onBoxChanged(scope.box)
    }

    function onYMoved (ratio) {
      const delta = {
        x: limitMoveStep(scope.box.scale.x * ratio.x, 0.02),
        z: limitMoveStep(scope.box.scale.z * ratio.y, 0.02)
      }

      // scope.boxOp.translateBox(scope.box, "x", delta.x);
      // scope.boxOp.translateBox(scope.box, "z", delta.z);

      // scope.onBoxChanged(scope.box);
      scope.boxEditor.onOpCmd({
        op: 'translate',
        params: {
          delta
        }
      })
    }

    function onTDirectionChanged (theta, sticky) {
      scope.boxOp.change_rotation_y(scope.box, theta, sticky, scope.onBoxChanged)
    }

    function onYScaled (ratio) {
      ratio = {
        x: ratio.x,
        y: 0,
        z: ratio.y
      }

      for (const axis in ratio) {
        if (ratio[axis] !== 0) {
          scope.box.scale[axis] *= 1 + ratio[axis]
        }
      }

      scope.onBoxChanged(scope.box)
    }

    function onYWheel (wheelDirection) {
      const multiplier = getWheelMultiplier(wheelDirection)
      const newRatio = scope.views[1].zoomRatio *= multiplier
      scope.boxEditor.updateViewZoomRatio(1, newRatio)
    }

    function onYResetRotate () {
      scope.box.rotation.y = 0
      scope.onBoxChanged(scope.box)
    }

    function onYAutoRotate () {
      scope.boxOp.auto_rotate_y(scope.box, scope.onBoxChanged)
    }

    this.yViewHandle = new ProjectiveView(scope.ui.querySelector('#y-view-manipulator'),
      editorCfg,
      onYEdgeChanged,
      onTDirectionChanged,
      onYAutoShrink,
      onYMoved,
      onYScaled,
      onYWheel,
      null,
      onYAutoRotate,
      onYResetRotate,
      defaultOnFocus,
      defaultOnDel,
      this.isActive.bind(this))

    /// ////////////////////////////////////////////////////////////////////////////////

    function onXEdgeChanged (ratio, direction2d, autoShrink, lockScale) {
      const delta = {
        y: scope.box.scale.y * ratio.x * direction2d.x,
        z: scope.box.scale.z * ratio.y * direction2d.y,
        x: 0
      }

      const direction3d = {
        y: -direction2d.x,
        z: direction2d.y,
        x: 0
      }

      if (!autoShrink && !lockScale) {
        onEdgeChanged(delta, direction3d)
      } else if (autoShrink) {
        onEdgeChanged(delta, direction3d)
        onXAutoShrink(direction2d)
      } else if (lockScale) {
        autoStick(delta, direction3d, direction2d.y === 0)
      }
    }

    function onXAutoShrink (direction) {
      if (!direction) {
        const extreme = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, false);

        ['y', 'z'].forEach(function (axis) {
          scope.boxOp.translateBox(scope.box, axis, (extreme.max[axis] + extreme.min[axis]) / 2)
          scope.box.scale[axis] = extreme.max[axis] - extreme.min[axis]
        })
      } else {
        direction = {
          x: 0,
          y: -direction.x,
          z: direction.y
        }

        if (direction.z !== 0) {
          const extreme = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, false)
          autoShrink(extreme, direction)
        } else {
          const extreme = scope.box.world.lidar.getPointsDimensionOfBox(scope.box, true)
          autoShrink(extreme, direction)
        }
      }

      scope.onBoxChanged(scope.box)
    }

    function onXMoved (ratio) {
      const delta = {
        y: limitMoveStep(scope.box.scale.y * (-ratio.x), 0.02),
        z: limitMoveStep(scope.box.scale.z * ratio.y, 0.02)
      }

      // scope.boxOp.translateBox(scope.box, "y", delta.y);
      // scope.boxOp.translateBox(scope.box, "z", delta.z);

      // scope.onBoxChanged(scope.box);

      scope.boxEditor.onOpCmd({
        op: 'translate',
        params: {
          delta
        }
      })
    }

    function onXDirectionChanged (theta, sticky) {
      scope.boxOp.change_rotation_x(scope.box, -theta, sticky, scope.onBoxChanged)
    }

    function onXScaled (ratio) {
      ratio = {
        y: ratio.x,
        z: ratio.y
      }

      for (const axis in ratio) {
        if (ratio[axis] !== 0) {
          scope.box.scale[axis] *= 1 + ratio[axis]
        }
      }

      scope.onBoxChanged(scope.box)
    }

    function onXWheel (wheelDirection) {
      const multiplier = getWheelMultiplier(wheelDirection)
      const newRatio = scope.views[2].zoomRatio *= multiplier
      scope.boxEditor.updateViewZoomRatio(2, newRatio)
    }

    function onXResetRotate () {
      scope.box.rotation.x = 0
      scope.onBoxChanged(scope.box)
    }

    function onXAutoRotate () {
      scope.boxOp.auto_rotate_x(scope.box, scope.onBoxChanged)
    }

    this.xViewHandle = new ProjectiveView(scope.ui.querySelector('#x-view-manipulator'),
      editorCfg,
      onXEdgeChanged,
      onXDirectionChanged,
      onXAutoShrink,
      onXMoved,
      onXScaled,
      onXWheel,
      null,
      onXAutoRotate,
      onXResetRotate,
      defaultOnFocus,
      defaultOnDel,
      this.isActive.bind(this))
  } // end of constructor

  // exports

  hideAllHandlers () {
    this.ui.querySelectorAll('.subview-svg').forEach(ui => ui.style.display = 'none')
    // this.ui.querySelectorAll(".v-buttons-wrapper").forEach(ui=>ui.style.display="none");
  };

  showAllHandlers () {
    this.ui.querySelectorAll('.subview-svg').forEach(ui => ui.style.display = '')
    // this.ui.querySelectorAll(".v-buttons-wrapper").forEach(ui=>ui.style.display="");
  };

  isActive () {
    return !!this.box
  }

  /// /////////////////////////////////////////////////////////////////////////////////////
  // public interface

  box = undefined
  attachBox (box) {
    this.box = box
    // this.show();
    this.showAllHandlers()
    this.updateViewHandle(box)
  };

  detach (box) {
    this.box = null
    this.hideAllHandlers()
  };

  updateViewHandle () {
    if (this.box) {
      const boxPos = this.box.position

      this.zViewHandle.updateViewHandle(this.views[0].getViewPort(), { x: this.box.scale.y, y: this.box.scale.x }, { x: boxPos.x, y: boxPos.y }, this.box.rotation.z)
      this.yViewHandle.updateViewHandle(this.views[1].getViewPort(), { x: this.box.scale.x, y: this.box.scale.z })
      this.xViewHandle.updateViewHandle(this.views[2].getViewPort(), { x: this.box.scale.y, y: this.box.scale.z })
    }
  };
};

export { ProjectiveViewOps }
