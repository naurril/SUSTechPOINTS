
import { vector4to3, vector3Nomalize, pxrToXyz, matmul } from './util';
import { globalObjectCategory } from './obj_cfg';
import { ResizableMoveableView } from './common/popup_dialog';
import { RectEditor } from './image_editor/rect_editor';


// localized imagecontext
function BoxImageContext (ui) {
  this.ui = ui;

  // draw highlighted box
  this.updateFocusedImageContext = function (box) {
    const world = box.world;

    const bestImage = chooseBestCameraForPoint(
      world,
      box.position);

    if (!bestImage) {
      return;
    }

    const [cameraType, cameraName] = bestImage.split(':');
    const calib = world.calib.getCalib(cameraType, cameraName);
    if (!calib) {
      return;
    }

    if (calib) {
      const img = box.world[cameraType].getImageByName(cameraName);
      if (img && (img.naturalWidth > 0)) {
        this.clearCanvas();

        let imgfinal = boxTo2dPoints(box, calib);

        if (imgfinal != null) { // if projection is out of range of the image, stop drawing.
          const ctx = this.ui.getContext('2d');
          ctx.lineWidth = 0.5;

          // note: 320*240 should be adjustable
          const cropArea = cropImage(img.naturalWidth, img.naturalHeight, ctx.canvas.width, ctx.canvas.height, imgfinal);

          ctx.drawImage(img, cropArea[0], cropArea[1], cropArea[2], cropArea[3], 0, 0, ctx.canvas.width, ctx.canvas.height);// ctx.canvas.clientHeight);
          // ctx.drawImage(img, 0,0,img.naturalWidth, img.naturalHeight, 0, 0, 320, 180);// ctx.canvas.clientHeight);
          imgfinal = vectorsub(imgfinal, [cropArea[0], cropArea[1]]);
          const transRatio = {
            x: ctx.canvas.height / cropArea[3],
            y: ctx.canvas.height / cropArea[3]
          };

          drawBoxOnImage(ctx, box, imgfinal, transRatio, true);
        }
      }
    }
  };

  this.clearCanvas = function () {
    const c = this.ui;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
  };

  function vectorsub (vs, v) {
    const ret = [];
    const vl = v.length;

    for (let i = 0; i < vs.length / vl; i++) {
      for (let j = 0; j < vl; j++) { ret[i * vl + j] = vs[i * vl + j] - v[j]; }
    }

    return ret;
  }

  function cropImage (imgWidth, imgHeight, clientWidth, clientHeight, corners) {
    let maxx = 0; let maxy = 0; let minx = imgWidth; let miny = imgHeight;

    for (let i = 0; i < corners.length / 2; i++) {
      const x = corners[i * 2];
      const y = corners[i * 2 + 1];

      if (x > maxx) maxx = x;
      else if (x < minx) minx = x;

      if (y > maxy) maxy = y;
      else if (y < miny) miny = y;
    }

    let targetWidth = (maxx - minx) * 1.5;
    let targetHeight = (maxy - miny) * 1.5;

    if (targetWidth / targetHeight > clientWidth / clientHeight) {
      // increate height
      targetHeight = targetWidth * clientHeight / clientWidth;
    } else {
      targetWidth = targetHeight * clientWidth / clientHeight;
    }

    const centerx = (maxx + minx) / 2;
    const centery = (maxy + miny) / 2;

    return [
      centerx - targetWidth / 2,
      centery - targetHeight / 2,
      targetWidth,
      targetHeight
    ];
  }

  function drawBoxOnImage (ctx, box, boxCorners, transRatio, selected) {
    const imgfinal = boxCorners;

    if (!selected) {
      let targetColor = null;
      if (box.world.data.cfg.colorObject === 'category') {
        targetColor = globalObjectCategory.getColorByType(box.obj_type);
      } else { // by id
        const idx = (box.obj_id) ? parseInt(box.obj_id) : box.objLocalId;
        targetColor = globalObjectCategory.getColorById(idx);
      }

      // ctx.strokeStyle = getObjCfgByType(box.obj_type).color;

      // var c = getObjCfgByType(box.obj_type).color;
      const r = '0x' + (targetColor.x * 256).toString(16);
      const g = '0x' + (targetColor.y * 256).toString(16);
      const b = '0x' + (targetColor.z * 256).toString(16);

      ctx.fillStyle = 'rgba(' + parseInt(r) + ',' + parseInt(g) + ',' + parseInt(b) + ',0.2)';
    } else {
      ctx.strokeStyle = '#ff00ff';
      ctx.fillStyle = 'rgba(255,0,255,0.2)';
    }

    // front panel
    ctx.beginPath();
    ctx.moveTo(imgfinal[3 * 2] * transRatio.x, imgfinal[3 * 2 + 1] * transRatio.y);

    for (let i = 0; i < imgfinal.length / 2 / 2; i++) {
      ctx.lineTo(imgfinal[i * 2 + 0] * transRatio.x, imgfinal[i * 2 + 1] * transRatio.y);
    }

    ctx.closePath();
    ctx.fill();

    // frame
    ctx.beginPath();

    ctx.moveTo(imgfinal[3 * 2] * transRatio.x, imgfinal[3 * 2 + 1] * transRatio.y);

    for (let i = 0; i < imgfinal.length / 2 / 2; i++) {
      ctx.lineTo(imgfinal[i * 2 + 0] * transRatio.x, imgfinal[i * 2 + 1] * transRatio.y);
    }
    // ctx.stroke();

    // ctx.strokeStyle="#ff00ff";
    // ctx.beginPath();

    ctx.moveTo(imgfinal[7 * 2] * transRatio.x, imgfinal[7 * 2 + 1] * transRatio.y);

    for (let i = 4; i < imgfinal.length / 2; i++) {
      ctx.lineTo(imgfinal[i * 2 + 0] * transRatio.x, imgfinal[i * 2 + 1] * transRatio.y);
    }

    ctx.moveTo(imgfinal[0 * 2] * transRatio.x, imgfinal[0 * 2 + 1] * transRatio.y);
    ctx.lineTo(imgfinal[4 * 2 + 0] * transRatio.x, imgfinal[4 * 2 + 1] * transRatio.y);
    ctx.moveTo(imgfinal[1 * 2] * transRatio.x, imgfinal[1 * 2 + 1] * transRatio.y);
    ctx.lineTo(imgfinal[5 * 2 + 0] * transRatio.x, imgfinal[5 * 2 + 1] * transRatio.y);
    ctx.moveTo(imgfinal[2 * 2] * transRatio.x, imgfinal[2 * 2 + 1] * transRatio.y);
    ctx.lineTo(imgfinal[6 * 2 + 0] * transRatio.x, imgfinal[6 * 2 + 1] * transRatio.y);
    ctx.moveTo(imgfinal[3 * 2] * transRatio.x, imgfinal[3 * 2 + 1] * transRatio.y);
    ctx.lineTo(imgfinal[7 * 2 + 0] * transRatio.x, imgfinal[7 * 2 + 1] * transRatio.y);

    ctx.stroke();
  }
}

class ImageContext extends ResizableMoveableView {
  constructor (parentUi, manager, name, autoSwitch, cfg, onImgClick) {
    // create ui
    const template = document.getElementById('image-wrapper-template');
    const tool = template.content.cloneNode(true);
    // this.boxEditorHeaderUi.appendChild(tool);
    // return this.boxEditorHeaderUi.lastElementChild;

    parentUi.appendChild(tool);
    const ui = parentUi.lastElementChild;

    super(ui);
    this.ui = ui;
    this.cfg = cfg;
    this.onImgClick = onImgClick;
    this.autoSwitch = autoSwitch;
    this.manager = manager;
    this.setImageName(name);

    // this.ui.addEventListener("mouseup", (event)=>{
    //     this.manager.bringUpMe(this);
    //     //return true;
    // });

    this.ui.addEventListener('contextmenu', e => e.preventDefault());
    this.contentUi.addEventListener('click', e=>this.manager.bringUpMe(this));
    this.canvas = this.ui.querySelector('#maincanvas-svg');

    this.rectEditor = new RectEditor(this.canvas,
      this.ui.querySelector('#rect-editor-floating-labels'),
      this.contentUi,
      this.ui.querySelector('#rect-editor-floating-toolbox'),
      this.ui.querySelector('#rect-editor-cfg'),
      this,
      this.cfg
    );

    this.onResize = () => this.rectEditor.onResize();

    this.ui.querySelector('#btn-exit').onclick = (event) => {
      this.manager.removeImage(this);
    };

    this.getSelectedBox = null;

    this.world = null;
    this.img = null;

    this.drawing = false;
    this.points = [];
    this.polyline = null;

    this.all_lines = [];
    this.img_lidar_point_map = {};
    this.lidar_pts = null;
    this.lidar_pts_color = null;

    this.WIDTH = 2048;
    this.HEIGHT = 1536;

    this.boxManager = {
      displayImage: () => {
        if (!this.cfg.disableMainImageContext) { this.render2dImage(); }
      },

      addBox: (box) => {
        const calib = this.getCalib();
        if (!calib || !calib.extrinsic || !calib.intrinsic) {
          return;
        }
        const transRatio = this.getTransRatio();
        if (transRatio) {
          let imgfinal = boxTo2dPoints(box, calib);
          if (imgfinal) {
            imgfinal = imgfinal.map(function (x, i) {
              if (i % 2 === 0) {
                return Math.round(x * transRatio.x);
              } else {
                return Math.round(x * transRatio.y);
              }
            });

            const svgBox = this.boxToSvg(box, imgfinal, transRatio);
            const svg = this.ui.querySelector('#svg-boxes');
            if (svgBox) { svg.appendChild(svgBox); }
          }
        }
      },

      onBoxSelected: (boxObjLocalId, objType, objTrackId) => {
        const b = this.ui.querySelector('#svg-box-local-' + boxObjLocalId);
        if (b) {
          b.setAttribute('class', 'svg-selected svg-box');
        }

        this.rectEditor.selectRectById(objTrackId);
      },

      onBoxUnselected: (boxObjLocalId, objType) => {
        const b = this.ui.querySelector('#svg-box-local-' + boxObjLocalId);

        if (b) { b.setAttribute('class', objType + ' svg-box'); }
      },

      removeBox: (boxObjLocalId) => {
        const b = this.ui.querySelector('#svg-box-local-' + boxObjLocalId);

        if (b) { b.remove(); }
      },

      // update_obj_type: (boxObjLocalId, obj_type)=>{
      //     this.onBoxSelected(boxObjLocalId, obj_type);
      // },

      update_box: (box) => {
        const b = this.ui.querySelector('#svg-box-local-' + box.objLocalId);
        if (!b) {
          return;
        }

        const calib = this.getCalib();
        if (!calib) {
          return;
        }

        const transRatio = this.getTransRatio();
        let imgfinal = boxTo2dPoints(box, calib);

        if (!imgfinal) {
          // box may go out of image
          return;
        }
        imgfinal = imgfinal.map(function (x, i) {
          if (i % 2 === 0) {
            return Math.round(x * transRatio.x);
          } else {
            return Math.round(x * transRatio.y);
          }
        });

        if (imgfinal) {
          this.boxToSvg(box, imgfinal, transRatio, null, b);
        }
      }
    };
  }
  
  remove () {
    this.ui.remove();
  }


  onDragableUiMouseDown () {
    this.manager.bringUpMe(this);
  }

  addCssClass (className) {
    if (this.ui.className.split(' ').find(x => x === className)) {
      // nothing
    } else {
      this.ui.className = this.ui.className + ' ' + className;
    }
  }

  removeCssClass (className) {
    this.ui.className = this.ui.className.split(' ').filter(x => x !== className);
  }



  setImageName (name) {
    const [cameraType, cameraName] = name.split(':');

    if (this.name !== name) {
      this.cameraType = cameraType;
      this.cameraName = cameraName;

      this.name = name;
      this.ui.querySelector('#title').innerText = (this.autoSwitch ? 'auto-' : '') + name;
      return true;
    }

    return false;
  }

  initImageOp (funcGetSelectedBox) {
    // this.ui.onclick = (e)=>this.on_click(e);
    this.getSelectedBox = funcGetSelectedBox;
    // var h = parentUi.querySelector("#resize-handle");
    // h.onmousedown = resize_mouse_down;

    // c.onresize = on_resize;
  }

  clearMainCanvas () {
    const boxes = this.ui.querySelector('#svg-boxes').children;

    if (boxes.length > 0) {
      for (let c = boxes.length - 1; c >= 0; c--) {
        boxes[c].remove();
      }
    }

    const points = this.ui.querySelector('#svg-points').children;

    if (points.length > 0) {
      for (let c = points.length - 1; c >= 0; c--) {
        points[c].remove();
      }
    }
  }

  attachWorld (world) {
    this.world = world;
  }

  hide () {
    this.ui.style.display = 'none';
  }

  hidden () {
    return this.ui.style.display === 'none';
  }

  show () {
    this.ui.style.display = '';
  }

  distanceToColor (z) {
    let distance = z;

    if (distance > 60.0) { distance = 60.0; }

    let color = this.valueToColor(distance / 60.0);

    color += '40'; // transparency
    return color;
  }

  valueToColor (v) {
    const color = [1 - v, v, (v < 0.5) ? (v * 2) : ((1 - v) * 2)];

    const toHex = (c) => {
      let hex = Math.floor(c * 255).toString(16);
      if (hex.length === 1) { hex = '0' + hex; }
      return hex;
    };

    return color.map(toHex).reduce((a, b) => a + b, '#');
  }

  intensityToColor (intensity) {
    let color = this.valueToColor(intensity);
    color += '40'; // transparency
    return color;
  }

  // toPolylineAttr (points) {
  //   return points.reduce(function (x, y) {
  //     return String(x) + ',' + y;
  //   }
  //   );
  // }

  // toViewboxCoord (x, y) {
  //   const div = this.ui.querySelector('#maincanvas-svg');

  //   x = Math.round(x * this.WIDTH / div.clientWidth);
  //   y = Math.round(y * this.HEIGHT / div.clientHeight);
  //   return [x, y];
  // }

  // on_click (e) {
  //   const p = this.to_viewbox_coord(e.layerX, e.layerY);
  //   const x = p[0];
  //   const y = p[1];

  //   console.log('clicked', x, y);

  //   if (!this.drawing) {
  //     if (e.ctrlKey) {
  //       this.drawing = true;
  //       const svg = this.ui.querySelector('#maincanvas-svg');
  //       // svg.style.position = "absolute";

  //       this.polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  //       svg.appendChild(this.polyline);
  //       this.points.push(x);
  //       this.points.push(y);

  //       this.polyline.setAttribute('class', 'maincanvas-line');
  //       this.polyline.setAttribute('points', this.to_polyline_attr(this.points));

  //       const c = this.ui;
  //       c.onmousemove = on_move;
  //       c.ondblclick = on_dblclick;
  //       c.onkeydown = on_key;
  //     } else {
  //       // not drawing
  //       // this is a test
  //       // if (false) {
  //       //   let nearest_x = 100000;
  //       //   let nearest_y = 100000;
  //       //   const selected_pts = [];

  //       //   for (let i = x - 100; i < x + 100; i++) {
  //       //     if (i < 0 || i >= this.img.width) { continue; }

  //       //     for (let j = y - 100; j < y + 100; j++) {
  //       //       if (j < 0 || j >= this.img.height) { continue; }

  //       //       const lidarpoint = this.img_lidar_point_map[j * this.img.width + i];
  //       //       if (lidarpoint) {
  //       //         // console.log(i,j, lidarpoint);
  //       //         selected_pts.push(lidarpoint); // index of lidar point

  //       //         if (((i - x) * (i - x) + (j - y) * (j - y)) < ((nearest_x - x) * (nearest_x - x) + (nearest_y - y) * (nearest_y - y))) {
  //       //           nearest_x = i;
  //       //           nearest_y = j;
  //       //         }
  //       //       }
  //       //     }
  //       //   }

  //         console.log('nearest', nearest_x, nearest_y);
  //         this.draw_point(nearest_x, nearest_y);
  //         if (nearest_x < 100000) {
  //           this.onImgClick([this.img_lidar_point_map[nearest_y * this.img.width + nearest_x][0]]);
  //         }
  //       }
  //     }
  //   } else {
  //     if (this.points[this.points.length - 2] != x || this.points[this.points.length - 1] != y) {
  //       this.points.push(x);
  //       this.points.push(y);
  //       this.polyline.setAttribute('points', this.to_polyline_attr(this.points));
  //     }
  //   }

  //   function on_move (e) {
  //     const p = this.to_viewbox_coord(e.layerX, e.layerY);
  //     const x = p[0];
  //     const y = p[1];

  //     console.log(x, y);
  //     this.polyline.setAttribute('points', this.to_polyline_attr(this.points) + ',' + x + ',' + y);
  //   }

  //   function on_dblclick (e) {
  //     this.points.push(this.points[0]);
  //     this.points.push(this.points[1]);

  //     this.polyline.setAttribute('points', this.to_polyline_attr(this.points));
  //     console.log(this.points);

  //     this.all_lines.push(this.points);

  //     this.drawing = false;
  //     this.points = [];

  //     const c = this.ui;
  //     c.onmousemove = null;
  //     c.ondblclick = null;
  //     c.onkeypress = null;
  //     c.blur();
  //   }

  //   function cancel () {
  //     this.polyline.remove();

  //     this.drawing = false;
  //     this.points = [];
  //     const c = this.ui;
  //     c.onmousemove = null;
  //     c.ondblclick = null;
  //     c.onkeypress = null;

  //     c.blur();
  //   }

  //   function on_key (e) {
  //     if (e.key === 'Escape') {
  //       cancel();
  //     }
  //   }
  // }

  // all boxes

  getCalib () {
    const calib = this.world.calib.getCalib(this.cameraType, this.cameraName);
    return calib;
  }

  getTransRatio () {
    const img = this.world[this.cameraType].getImageByName(this.cameraName);

    if (!img || img.width === 0) {
      return null;
    }

    const clientWidth = this.WIDTH;
    const clientHeight = this.HEIGHT;

    const transRatio = {
      x: clientWidth / img.naturalWidth,
      y: clientHeight / img.naturalHeight
    };

    return transRatio;
  }

  onImageLoaded (scene, frame, cameraType, cameraName) {
    const img = this.world[cameraType].getImageByName(cameraName);

    // this.canvas.setAttribute('viewBox', `0 0 ${img.naturalWidth} ${img.naturalHeight}`);
    this.WIDTH = img.naturalWidth;
    this.HEIGHT = img.naturalHeight;

    this.drawSvg();

    this.rectEditor.resetImageSize(this.WIDTH, this.HEIGHT);

    this.rectEditor.resetImage(this.WIDTH, this.HEIGHT, scene, frame,
      cameraType, cameraName,
      {
        save: (data) => this.world.imageRectAnnotation.save(cameraType, cameraName, data),
        load: () => this.world.imageRectAnnotation.load(cameraType, cameraName)
      });
  }

  showImage () {
    const svgimage = this.ui.querySelector('#svg-image');

    if (!this.world[this.cameraType]) { return; }

    this.rectEditor.clear(0);

    // active img is set by global, it's not set sometimes.
    const img = this.world[this.cameraType].getImageByName(this.cameraName);
    if (img) {
      this.img = img;
      svgimage.onload = () => {
        this.onImageLoaded(this.world.frameInfo.scene,
          this.world.frameInfo.frame,
          this.cameraType,
          this.cameraName
        );
      };
      svgimage.setAttribute('xlink:href', img.src);
    }
  }

  pointsToSvg (points, transRatio, cssclass, radius = 1, pointsColor) {
    const ptsFinal = points.map(function (x, i) {
      if (i % 2 === 0) {
        return Math.round(x * transRatio.x);
      } else {
        return Math.round(x * transRatio.y);
      }
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    if (cssclass) {
      svg.setAttribute('class', cssclass);
    }

    for (let i = 0; i < ptsFinal.length; i += 2) {
      const x = ptsFinal[i];
      const y = ptsFinal[i + 1];

      const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      p.setAttribute('cx', x);
      p.setAttribute('cy', y);
      p.setAttribute('r', 1);
      // p.setAttribute("stroke-width", "1");

      if (pointsColor) {
        p.setAttribute('stroke', pointsColor[i / 2]);
        p.setAttribute('fill', pointsColor[i / 2]);
      }

      svg.appendChild(p);
    }

    return svg;
  }

  drawPoint (x, y) {
    const transRatio = this.getTransRatio();
    const svg = this.ui.querySelector('#svg-points');
    const pointsSvg = this.pointsToSvg([x, y], transRatio, 'radar-points');
    svg.appendChild(pointsSvg);
  }

  render2dImage () {
    if (this.cfg.disableMainImageContext) { return; }
    this.clearMainCanvas();

    this.showImage();
  }

  hideCanvas () {
    // document.getElementsByClassName("ui-wrapper")[0].style.display="none";
    this.ui.style.display = 'none';
  }

  showCanvas () {
    this.ui.style.display = 'inline';
  }

  find2dPointsRange (pts) {
    let minx = pts[0]; let miny = pts[1]; let maxx = pts[0]; let maxy = pts[1];

    pts.forEach((p, i) => {
      if (i % 2 === 0) {
        if (p > maxx) maxx = p;
        if (p < minx) minx = p;
      } else {
        if (p > maxy) maxy = p;
        if (p < miny) miny = p;
      }
    });

    return {
      minx, miny, maxx, maxy
    };
  }

  generate2dRects () {
    const calib = this.getCalib();
    if (!calib) {
      return [];
    }

    const img = this.world[this.cameraType].getImageByName(this.cameraName);

    if (!img || img.width === 0) {
      return [];
    }

    const rects = this.world.annotation.boxes
    .map((box) => {
      return {
        obj_id: box.obj_id,
        byPoints: this.generateRectByPoints(box, img, calib),
        byCorners: this.generateRectByCorners(box, img, calib),
      }
    })
    .filter(x => !!x.byPoints || !!x.byCorners);
    
   
    return rects;
  }



  generate2dRectByPointsById (id) {
    const calib = this.getCalib();
    if (!calib) {
      return [];
    }

    const img = this.world[this.cameraType].getImageByName(this.cameraName);

    if (!img || img.width === 0) {
      return [];
    }

    const box = this.world.annotation.boxes.find(b => b.obj_id === id);

    if (box) {
      return this.generateRectByPoints(box, img, calib);
    }

    return null;
  }

  generateRectByPoints(box, img, calib) {
    // better remove ground before we calculate the width of the objects.
    // we assume the objects are all upward.      

    const [points3dTopPart, points3dGroundPart] = this.world.lidar.getPointsOfBoxInWorldCoordinates(box);

      const ptsTopPartOnImg = points3dToImage2d(points3dTopPart, calib, true, null, img.width, img.height);
      const ptsGroundPartOnImg = points3dToImage2d(points3dGroundPart, calib, true, null, img.width, img.height);

      

      if (ptsTopPartOnImg && ptsTopPartOnImg.length > 3) {
        const range = this.find2dPointsRange(ptsTopPartOnImg);
        const rangeGrd = this.find2dPointsRange(ptsGroundPartOnImg);

        let rect = { 
          x1: range.minx, 
          y1: range.miny, 
          x2: range.maxx, 
          y2: rangeGrd.maxy ? rangeGrd.maxy : range.maxy 
        };

        if ((rect.x2 - rect.x1 < 3) ||  (rect.y2 - rect.y1 < 3)) {
          return null;
        }

        return {
          rect: rect,
          obj_id: box.obj_id,
          obj_type: box.obj_type,
          obj_attr: box.obj_attr,
          annotator: '3dbox'
        };
      }

      return null;
  }

  generate2dRectByPointsByIdByRemoveGroundPoints (id) {
    const calib = this.getCalib();
    if (!calib) {
      return null;
    }

    const img = this.world[this.cameraType].getImageByName(this.cameraName);

    if (!img || img.width === 0) {
      return null;
    }

    const box = this.world.annotation.boxes.find(b => b.obj_id === id);

    if (box) {
      window.editor.removeGroundPoints(box);
      return this.generateRectByPoints(box, img, calib);
    } else {
      return null;
    }
  }


  generate2dRectByBoxById (id) {
    const calib = this.getCalib();
    if (!calib) {
      return [];
    }

    const img = this.world[this.cameraType].getImageByName(this.cameraName);

    if (!img || img.width === 0) {
      return [];
    }

    const box = this.world.annotation.boxes.find(b => b.obj_id === id);

    if (box) {
      return this.generateRectByCorners(box, img, calib);
    }

    return null;
  }


  generateRectByCorners(box, img, calib) {
    const corners4d = pxrToXyz(box.position, box.scale, box.rotation)
    const corners = vector4to3(corners4d)
    const cornersOnImg = points3dToImage2d(corners, calib, true, null, img.width, img.height);

    if (cornersOnImg.length > 3) {
      const range = this.find2dPointsRange(cornersOnImg);

      let rect = { 
        x1: range.minx, 
        y1: range.miny, 
        x2: range.maxx, 
        y2: range.maxy,
      };

      if ((rect.x2 - rect.x1 < 3) ||  (rect.y2 - rect.y1 < 3)) {
        return null;
      }

      return {
        rect: rect,
        obj_id: box.obj_id,
        obj_type: box.obj_type,
        obj_attr: box.obj_attr,
        annotator: 'corners'
      };
    }

    return null;
  }

  drawSvg () {
    // draw picture
    if (!this.world[this.cameraType]) { return; }

    const img = this.world[this.cameraType].getImageByName(this.cameraName);

    if (!img || img.width === 0) {
      this.hideCanvas();
      return;
    }

    this.showCanvas();

    const transRatio = this.getTransRatio();

    const calib = this.getCalib();
    if (!calib) {
      return;
    }

    if (this.cfg.projectBoxesToImage) {
      // draw boxes
      const svg = this.ui.querySelector('#svg-boxes');
      this.world.annotation.boxes.forEach((box) => {
        const imgfinal = boxTo2dPoints(box, calib);
        if (imgfinal) {
          const boxSvg = this.boxToSvg(box, imgfinal, transRatio, this.getSelectedBox() === box);
          if (boxSvg) { svg.appendChild(boxSvg); }
        }
      });
    }

    // draw radar points
    if (this.cfg.projectRadarToImage) {
      const svg = this.ui.querySelector('#svg-points');
      this.world.radars.radarList.forEach(radar => {
        const pts = radar.getUnOffsetRadarPoints();
        const ptsOnImg = points3dToImage2d(pts, calib);

        // there may be none after projecting
        if (ptsOnImg && ptsOnImg.length > 0) {
          const pointsSvg = this.pointsToSvg(ptsOnImg, transRatio, radar.cssStyleSelector);
          svg.appendChild(pointsSvg);
        }
      });
    }

    // project lidar points onto camera image
    if (this.cfg.projectLidarToImage) {
      const svg = this.ui.querySelector('#svg-points');

      const lidarPoints = this.world.lidar.getAllPoints();
      const lidarPointsColor = this.world.lidar.getAllColors();

      const imageLidarPointMap = [];
      const ptsOnImg = points3dToImage2d(lidarPoints, calib, true, imageLidarPointMap, img.width, img.height);

      // build color
      const imagePointsColor = [];

      if (this.cfg.colorPoints === 'intensity') {
        // by intensity
        // by depth
        for (let i = 0; i < ptsOnImg.length / 2; i++) {
          const x = ptsOnImg[i * 2];
          const y = ptsOnImg[i * 2 + 1];

          const lidarPointIndex = imageLidarPointMap[y * this.img.width + x][0];
          const intensity = lidarPointsColor[lidarPointIndex * 3];

          imagePointsColor[i] = this.intensityToColor(intensity);
        }
      } else {
        // by depth
        for (let i = 0; i < ptsOnImg.length / 2; i++) {
          const x = ptsOnImg[i * 2];
          const y = ptsOnImg[i * 2 + 1];

          imagePointsColor[i] = this.distanceToColor(imageLidarPointMap[y * this.img.width + x][3]);
        }
      }

      // there may be none after projecting
      if (ptsOnImg && ptsOnImg.length > 0) {
        const ptsSvg = this.pointsToSvg(ptsOnImg, transRatio, 'svg-points-lidar' /* css */, 1 /* size */, imagePointsColor);
        svg.appendChild(ptsSvg);
      }
    }
  }

  boxToSvg (box, boxCorners, transRatio, selected, svg) {
    const imgfinal = boxCorners.map(function (x, i) {
      if (i % 2 === 0) {
        return Math.round(x * transRatio.x);
      } else {
        return Math.round(x * transRatio.y);
      }
    });

    if (!imgfinal || imgfinal.length === 0) {
      if (svg) { svg.remove(); }
      return null;
    }

    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      svg.setAttribute('id', 'svg-box-local-' + box.objLocalId);

      if (selected) {
        svg.setAttribute('class', box.obj_type + ' svg-box svg-selected');
      } else {
        if (box.world.data.cfg.colorObject === 'id') {
          svg.setAttribute('class', 'color-' + box.obj_id % 33 + ' svg-box');
        } else { // by id
          svg.setAttribute('class', box.obj_type + ' svg-box');
        }
      }
    } else {
      // remove children
      svg.innerHTML = '';
    }

    function createPanel (pts, className) {
      const panel = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      panel.setAttribute('points',
        pts.reduce(function (x, y) {
          return String(x) + ',' + y;
        })
      );

      panel.setAttribute('class', className);
      return panel;
    }

    let pts = imgfinal.slice(0, 4 * 2);
    const frontPanel = createPanel(pts, 'box-front-panel');
    svg.appendChild(frontPanel);

    pts = imgfinal.slice(4 * 2, 4 * 2 + 4 * 2);
    const rearPannel = createPanel(pts, 'nofill');
    svg.appendChild(rearPannel);

    // left panel
    pts = [imgfinal[0], imgfinal[1], imgfinal[6], imgfinal[7], imgfinal[14], imgfinal[15], imgfinal[8], imgfinal[9]];
    const leftPannel = createPanel(pts, 'nofill');
    svg.appendChild(leftPannel);

    // right panel
    pts = [imgfinal[2], imgfinal[3], imgfinal[4], imgfinal[5], imgfinal[12], imgfinal[13], imgfinal[10], imgfinal[11]];
    const rightPanel = createPanel(pts, 'nofill');
    svg.appendChild(rightPanel);

    // top panel
    pts = [imgfinal[4], imgfinal[5], imgfinal[6], imgfinal[7], imgfinal[14], imgfinal[15], imgfinal[12], imgfinal[13]];
    const topPanel = createPanel(pts, 'nofill');
    svg.appendChild(topPanel);

    // bottom panel

    /*
        let back_panel =  document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
        svg.appendChild(back_panel);
        back_panel.setAttribute("points",
            imgfinal.slice(4*2).reduce(function(x,y){
                return String(x)+","+y;
            })
        )
        */

    // for (let i = 0; i<4; ++i){
    //     let line =  document.createElementNS("http://www.w3.org/2000/svg", 'line');
    //     svg.appendChild(line);
    //     line.setAttribute("x1", imgfinal[(4+i)*2]);
    //     line.setAttribute("y1", imgfinal[(4+i)*2+1]);
    //     line.setAttribute("x2", imgfinal[(4+(i+1)%4)*2]);
    //     line.setAttribute("y2", imgfinal[(4+(i+1)%4)*2+1]);
    // }

    // for (let i = 0; i<4; ++i){
    //     let line =  document.createElementNS("http://www.w3.org/2000/svg", 'line');
    //     svg.appendChild(line);
    //     line.setAttribute("x1", imgfinal[i*2]);
    //     line.setAttribute("y1", imgfinal[i*2+1]);
    //     line.setAttribute("x2", imgfinal[(i+4)*2]);
    //     line.setAttribute("y2", imgfinal[(i+4)*2+1]);
    // }

    svg.data = {
      obj_id: box.obj_id
    };

    svg.onclick = (e) => this.onBoxClicked(e);

    return svg;
  }

  onBoxClicked (e) {
    if (e.currentTarget.data.obj_id) {
      window.editor.makeVisible(e.currentTarget.data.obj_id);
    }
  }
}

class ImageContextManager {
  constructor (parentUi, selectorUi, cfg, onImgClick) {
    this.parentUi = parentUi;
    this.selectorUi = selectorUi;
    this.cfg = cfg;
    this.onImgClick = onImgClick;

    this.images = [];

    this.addImage('', true);

    this.selectorUi.onmouseenter = function (event) {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }

      event.target.querySelector('#camera-list').style.display = '';
    };

    this.selectorUi.onmouseleave = function (event) {
      const ui = event.target.querySelector('#camera-list');

      this.timerId = setTimeout(() => {
        ui.style.display = 'none';
        this.timerId = null;
      },
      200);
    };

    this.selectorUi.querySelector('#camera-list').onclick = (event) => {
      const cameraName = event.target.cameraName;

      if (cameraName === 'auto') {
        const existed = this.images.find(x => x.autoSwitch);

        if (existed) {
          this.removeImage(existed);
        } else {
          this.addImage('', true);
        }
      } else {
        const existed = this.images.find(x => !x.autoSwitch && x.name === cameraName);

        if (existed) {
          this.removeImage(existed);
        } else {
          this.addImage(cameraName);
        }
      }
    };

    this.chooseBestCameraForPoint = chooseBestCameraForPoint;

    this.boxManager = {

      displayImage: () => {
        if (!this.cfg.disableMainImageContext) { this.render2dImage(); }
      },

      addBox: (box) => {
        this.images.forEach(i => i.boxManager.addBox(box));
      },

      onBoxSelected: (boxObjLocalId, objType, objId) => {
        this.images.forEach(i => i.boxManager.onBoxSelected(boxObjLocalId, objType, objId));
      },

      onBoxUnselected: (boxObjLocalId, objType) => {
        this.images.forEach(i => i.boxManager.onBoxUnselected(boxObjLocalId, objType));
      },

      removeBox: (boxObjLocalId) => {
        this.images.forEach(i => i.boxManager.removeBox(boxObjLocalId));
      },

      // update_obj_type: (boxObjLocalId, obj_type)=>{
      //     this.images.forEach(i=>i.boxManager.update_obj_type(boxObjLocalId, obj_type));
      // },

      update_box: (box) => {
        this.images.forEach(i => i.boxManager.update_box(box));
      }
    };
  }

  updateCameraList (cameras) {
    let autoCamera = '<div class="camera-item" id="camera-item-auto">auto</div>';

    if (this.images.find(i => i.autoSwitch)) {
      autoCamera = '<div class="camera-item camera-selected" id="camera-item-auto">auto</div>';
    }

    const cameraSelectorStr = cameras.map(c => {
      const cameraId = c.replace(':', '-');

      const existed = this.images.find(i => i.name === c && !i.autoSwitch);
      const className = existed ? 'camera-item camera-selected' : 'camera-item';

      return `<div class="${className}" id="camera-item-${cameraId}">${c}</div>`;
    }).reduce((x, y) => x + y, autoCamera);

    const ui = this.selectorUi.querySelector('#camera-list');
    ui.innerHTML = cameraSelectorStr;
    ui.style.display = 'none';

    cameras.forEach(n => {
      ui.querySelector('#camera-item-' + n.replace(':', '-')).cameraName = n;
    });

    ui.querySelector('#camera-item-auto').cameraName = 'auto';

    this.setDefaultBestCamera(cameras[0]);
  }

  setDefaultBestCamera (c) {
    if (!this.bestCamera) {
      const existed = this.images.find(x => x.autoSwitch);
      if (existed) {
        existed.setImageName(c);
      }

      this.bestCamera = c;
    }
  }

  addImage (name, autoSwitch) {
    if (autoSwitch && this.bestCamera && !name) {
      name = this.bestCamera;
    }

    const image = new ImageContext(this.parentUi, this, name, autoSwitch, this.cfg, this.onImgClick);

    this.images.push(image);

    const selectorName = autoSwitch ? 'auto' : name;
    const ui = this.selectorUi.querySelector('#camera-item-' + selectorName.replace(':', '-'));
    if (ui) { ui.className = 'camera-item camera-selected'; }

    if (this.init_image_op_para) {
      image.initImageOp(this.init_image_op_para);
    }

    if (this.world) {
      image.attachWorld(this.world);
      image.render2dImage();
    }

    return image;
  }

  bringUpMe (image) {
    this.parentUi.appendChild(image.ui);
  }

  removeImage (image) {
    const selectorName = image.autoSwitch ? 'auto' : image.name;
    const item = this.selectorUi.querySelector('#camera-item-' + selectorName.replace(':', '-'))
    
    if (item) {
      item.className = 'camera-item';
    }

    this.images = this.images.filter(x => x !== image);
    image.remove();
  }

  setBestCamera (camera) {
    this.images.filter(i => i.autoSwitch).forEach(i => {
      const changedCamera = i.setImageName(camera);
      if (changedCamera) { i.boxManager.displayImage(); }
    });

    this.bestCamera = camera;
  }

  render2dImage () {
    this.images.forEach(i => i.render2dImage());
  }

  attachWorld (world) {
    this.world = world;
    this.images.forEach(i => i.attachWorld(world));
  }

  hide () {
    this.images.forEach(i => i.hide());
  }

  show () {
    this.images.forEach(i => i.show());
  }

  clearMainCanvas () {
    this.images.forEach(i => i.clearMainCanvas());
  }

  initImageOp (op) {
    this.init_image_op_para = op;
    this.images.forEach(i => i.initImageOp(op));
  }

  hidden () {
    return false;
  }

  buildCssStyle () {
    console.log(window.document.styleSheets.length, 'sheets');
    const sheet = window.document.styleSheets[1];

    const objTypeMap = globalObjectCategory.objTypeMap;

    for (const o in objTypeMap) {
      const rule = '.' + o + '{color:' + objTypeMap[o].color + '; stroke:' +
                                objTypeMap[o].color + ';fill:' +
                                objTypeMap[o].color + '22;' +
                                '}';

      sheet.insertRule(rule, sheet.cssRules.length);
    }

    function colorStr (v) {
      const c = Math.round(v * 255);
      if (c < 16) { return '0' + c.toString(16); } else { return c.toString(16); }
    }

    for (let idx = 0; idx <= 32; idx++) {
      const c = globalObjectCategory.getColorById(idx);
      const color = '#' + colorStr(c.x) + colorStr(c.y) + colorStr(c.z);

      const rule = `.color-${idx} {color: ${color}; stroke: ${color}; fill: ${color}22;}`;
      sheet.insertRule(rule, sheet.cssRules.length);
    }

    // sheet.insertRule('.rect-svg:hover {stroke: #0000ffaa; fill: #0000ff22;}', sheet.cssRules.length);
    sheet.insertRule('.svg-select-pending {stroke: #0000ffaa; fill: #0000ff11;}', sheet.cssRules.length);
    sheet.insertRule('.svg-selected {stroke: #ff00ff88; fill: #ff00ff22;}', sheet.cssRules.length);
    sheet.insertRule('.svg-rect-selected {stroke: #ff00ff88; fill: #00000000;}', sheet.cssRules.length);
    // sheet.insertRule('.svg-selected:hover {stroke: #ff00ff88; fill: #ff00ff22;}', sheet.cssRules.length);
    sheet.insertRule('.label-select-pending {color: var(--font-color);text-shadow: 0px 0px 5px var(--background-color);}', sheet.cssRules.length);
    sheet.insertRule('.nofill {fill:#00000000}', sheet.cssRules.length);
  }
}

function boxTo2dPoints (box, calib) {
  const scale = box.scale;
  const pos = box.position;
  const rotation = box.rotation;

  let box3d = pxrToXyz(pos, scale, rotation);

  // console.log(box.obj_id, box3d.slice(8*4));

  box3d = box3d.slice(0, 8 * 4);
  return points3dHomoToImage2d(box3d, calib);
}

// points3d is length 4 row vector, homogeneous coordinates
// returns 2d row vectors
function points3dHomoToImage2d (points3d, calib, acceptPartial = false, saveMap, imageDx, imageDy) {

  if (!calib || !calib.extrinsic) {
    return null;
  }
  
  let imgpos = matmul(calib.extrinsic, points3d, 4);
  const posInCameraSpace = imgpos;

  // rect matrix shall be applied here, for kitti
  if (calib.rect) {
    imgpos = matmul(calib.rect, imgpos, 4);
  }

  const imgpos3 = vector4to3(imgpos);

  let imgpos2;
  if (calib.intrinsic.length > 9) {
    imgpos2 = matmul(calib.intrinsic, imgpos, 4);
  } else { imgpos2 = matmul(calib.intrinsic, imgpos3, 3); }

  let imgfinal = vector3Nomalize(imgpos2);
  const imageFinalFiltered = [];

  if (acceptPartial) {
    const p = imgpos3;
    for (let i = 0; i < p.length / 3; i++) {
      if (p[i * 3 + 2] > 0) {
        let x = imgfinal[i * 2];
        let y = imgfinal[i * 2 + 1];

        // x = Math.round(x);
        // y = Math.round(y);
        if (x >= 0 && x < imageDx && y >= 0 && y < imageDy) {
          if (saveMap) {
            saveMap[imageDx * y + x] = [i, posInCameraSpace[i * 4 + 0], posInCameraSpace[i * 4 + 1], posInCameraSpace[i * 4 + 2]]; // save index? a little dangerous! //[points3d[i*4+0], points3d[i*4+1], points3d[i*4+2]];
          }

          imageFinalFiltered.push(x);
          imageFinalFiltered.push(y);
        } else {
          // console.log("points outside of image",x,y);
        }
      }
    }

    imgfinal = imageFinalFiltered;
    // warning: what if calib.intrinsic.length
    // todo: this function need clearance
    // imgpos2 = matmul(calib.intrinsic, temppos, 3);
  } else if (!acceptPartial && !allPointsInImageRange(imgpos3)) {
    return null;
  }

  return imgfinal;
}

function point3dToHomo (points) {
  const homo = [];
  for (let i = 0; i < points.length; i += 3) {
    homo.push(points[i]);
    homo.push(points[i + 1]);
    homo.push(points[i + 2]);
    homo.push(1);
  }

  return homo;
}
function points3dToImage2d (points, calib, acceptPartial = false, saveMap, imageDx, imageDy) {
  //
  return points3dHomoToImage2d(point3dToHomo(points), calib, acceptPartial, saveMap, imageDx, imageDy);
}

function allPointsInImageRange (p) {
  for (let i = 0; i < p.length / 3; i++) {
    if (p[i * 3 + 2] < 0) {
      return false;
    }
  }

  return true;
}

// function any_points_in_image_range (p) {
//   for (let i = 0; i < p.length / 3; i++) {
//     if (p[i * 3 + 2] > 0) {
//       return true
//     }
//   }

//   return false
// }

function chooseBestCameraForPoint (world, center) {
  // choose best camera only in main cameras. (dont consider aux_camera)
  const projPos = [];
  world.sceneMeta.camera.forEach((cameraName) => {
    const cameraGroup = world.data.cfg.cameraGroupForContext;
    const calib = world.calib.getCalib(cameraGroup, cameraName)
    if (calib && calib.extrinsic) {
      const imgpos = matmul(calib.extrinsic, [center.x, center.y, center.z, 1], 4);
      projPos.push({ camera: cameraGroup + ':' + cameraName, pos: vector4to3(imgpos) });
    }    
  });

  if (projPos.length === 0) {
    return null;
  }

  const validProjPos = projPos.filter(function (p) {
    return allPointsInImageRange(p.pos);
  });

  validProjPos.forEach(function (p) {
    p.distToCenter = p.pos[0] * p.pos[0] + p.pos[1] * p.pos[1];
  });

  validProjPos.sort(function (x, y) {
    return x.distToCenter - y.distToCenter;
  });

  // console.log(validProjPos);

  if (validProjPos.length > 0) {
    return validProjPos[0].camera;
  }

  return null;
}

export { ImageContextManager, BoxImageContext };
