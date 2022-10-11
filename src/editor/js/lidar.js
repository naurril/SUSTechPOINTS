
import * as THREE from 'three'
import { matmul, eulerAngleToRotationMatrix, transpose, pxrToXyz, arrayAsVectorRange, vector_range } from './util.js'
// import { PCDLoader } from './lib/PCDLoader.js'
import { globalObjectCategory } from './obj_cfg.js'

import { settings } from './settings.js'
import { loadfile } from './jsonrpc.js'
import { pointcloudReader } from './lib/pointcloud_reader'

function Lidar (sceneMeta, world, frameInfo) {
  this.world = world
  this.data = world.data
  this.frameInfo = frameInfo
  this.sceneMeta = sceneMeta

  this.points = null
  this.points_load_time = 0

  this.remove_high_ponts = function (pcd, z) {
    const position = []
    const color = []
    const normal = []
    const intensity = []
    // 3, 3, 3, 1

    for (let i = 0; i < pcd.position.length / 3; i++) {
      if (pcd.position[i * 3 + 2] < z) {
        position.push(pcd.position[i * 3 + 0])
        position.push(pcd.position[i * 3 + 1])
        position.push(pcd.position[i * 3 + 2])

        if (pcd.color.length > 0) {
          color.push(pcd.color[i * 3 + 0])
          color.push(pcd.color[i * 3 + 1])
          color.push(pcd.color[i * 3 + 2])
        }

        if (pcd.normal.length > 0) {
          normal.push(pcd.normal[i * 3 + 0])
          normal.push(pcd.normal[i * 3 + 1])
          normal.push(pcd.normal[i * 3 + 2])
        }

        if (pcd.intensity) {
          intensity.push(pcd.intensity[i])
        }
      }
    }

    pcd.position = position
    pcd.intensity = intensity
    pcd.color = color
    pcd.normal = normal

    return pcd
  }

  this.processPcd = function (pcd) {
    this.points_parse_time = new Date().getTime()
    // console.log(this.points_load_time, this.frameInfo.scene, this.frameInfo.frame, "parse pionts ", this.points_parse_time - this.create_time, "ms");

    // if (this.frameInfo.transform_matrix){

    //     var arr = position;
    //     var num = position.length;
    //     var ni = 3;

    //     for (var i=0; i<num/ni; i++){
    //         var np = this.frameInfo.transform_point(this.frameInfo.transform_matrix, arr[i*ni+0], arr[i*ni+1], arr[i*ni+2]);
    //         arr[i*ni+0]=np[0];
    //         arr[i*ni+1]=np[1];
    //         arr[i*ni+2]=np[2];
    //     }

    //     //points.geometry.computeBoundingSphere();
    // }

    if (this.data.cfg.enableFilterPoints)// do some filtering work here
    {
      pcd = this.remove_high_ponts(pcd, this.data.cfg.filterPointsZ)
    }

    const position = pcd.position

    // build geometry
    this.world.data.dbg.alloc('lidar')
    const geometry = new THREE.BufferGeometry()
    if (position.length > 0) { geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)) }

    const normal = pcd.normal
    // normal and colore are note used in av scenes.
    if (normal.length > 0) { geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3)) }

    let color = pcd.color
    if (color.length === 0) {
      color = []

      // by default we set all points to same color
      for (let i = 0; i < position.length; ++i) {
        color.push(this.data.cfg.point_brightness)
      }

      // if enabled intensity we color points by intensity.
      if (this.data.cfg.color_points === 'intensity' && pcd.intensity.length > 0) {
        // map intensity to color
        for (let i = 0; i < pcd.intensity.length; ++i) {
          let intensity = pcd.intensity[i]
          intensity *= 8

          if (intensity > 1) { intensity = 1.0 }

          // color.push( 2 * Math.abs(0.5-intensity));

          color[i * 3] = intensity
          color[i * 3 + 1] = intensity
          color[i * 3 + 2] = 1 - intensity
        }
      }

      // save color, in case color needs to be restored.
      pcd.color = color
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3))

    geometry.computeBoundingSphere()
    // build material

    const material = new THREE.PointsMaterial({ size: this.data.cfg.point_size, vertexColors: THREE.VertexColors })

    /*

        if ( color.length > 0 ) {
            material.vertexColors = color;
        } else {
            //material.color.setHex(0xffffff);
            material.color.r = 0.6;
            material.color.g = 0.6;
            material.color.b = 0.6;
        }
        */

    // material.size = 2;
    material.sizeAttenuation = false

    // build mesh

    const mesh = new THREE.Points(geometry, material)
    mesh.name = 'pcd'

    // return mesh;
    // add to parent.
    this.world.webglGroup.add(mesh)

    this.points = mesh
    this.pcd = pcd
    // this.points_backup = mesh;

    this.build_points_index()
    this.points_load_time = new Date().getTime()

    // console.log(this.points_load_time, this.frameInfo.scene, this.frameInfo.frame, "loaded pionts ", this.points_load_time - this.create_time, "ms");

    this._afterPreload()
  }

  this.preload = function (onPreloadFinished) {
    this.onPreloadFinished = onPreloadFinished

    const url = this.frameInfo.get_pcd_path()
    loadfile(url).then(buffer => {
      if (this.destroyed) {
        console.error('received pcd after world been destroyed.')
        return
      }

      const pcd = pointcloudReader.parse(buffer, url)
      this.processPcd(pcd)
    })
  }

  // this.preload_pcdloader = function (onPreloadFinished) {
  //   this.onPreloadFinished = onPreloadFinished

  //   const loader = new PCDLoader()

  //   const _self = this
  //   loader.load(this.frameInfo.get_pcd_path(),
  //     // ok
  //     function (pcd) {
  //       _self.processPcd(pcd)
  //     },

  //     // on progress,
  //     function () {},

  //     // on error
  //     function () {
  //       // error
  //       console.log('load pcd failed.')
  //       _self._afterPreload()
  //     },

  //     // on file loaded
  //     function () {
  //       _self.points_readfile_time = new Date().getTime()
  //       console.log(_self.points_load_time, _self.frameInfo.scene, _self.frameInfo.frame, 'read file ', _self.points_readfile_time - _self.create_time, 'ms')
  //     }
  //   )
  // }

  this._afterPreload = function () {
    this.preloaded = true
    // console.log("lidar preloaded");
    // go ahead, may load picture
    if (this.onPreloadFinished) {
      this.onPreloadFinished()
    }
    if (this.goCmdReceived) {
      this.go(this.webglScene, this.onGoFinished)
    }
  }

  this.loaded = false
  this.webglScene = null
  this.goCmdReceived = false
  this.onGoFinished = null

  this.go = function (webglScene, onGoFinished) {
    this.webglScene = webglScene

    if (this.preloaded) {
      if (!this.world.data.cfg.show_background) {
        this.hide_background()
      }

      if (this.data.cfg.color_obj !== 'no') {
        this.color_objects()
      }

      if (onGoFinished) { onGoFinished() }
    } else {
      this.goCmdReceived = true
      this.onGoFinished = onGoFinished
    }
  }

  this.unload = function () {
    this.cancel_highlight()

    if (this.points) {
      // this.world.webglGroup.remove(this.points);

      // if (this.points.points_backup){
      //     let backup = this.points.points_backup;
      //     this.points.points_backup = null;
      //     this.removeAllPoints();
      //     this.points = backup;

      // }
    }
  }

  this.deleteAll = function () {
    this.removeAllPoints()
    this.destroyed = true
  }

  this.set_point_size = function (v) {
    if (this.points) {
      this.points.material.size = v

      // this could happen if the points are still loading
      if (this.points.points_backup) {
        this.points.points_backup.material.size = v

        if (this.points.points_backup.points_backup) {
          this.points.points_backup.points_backup.material.size = v
        }
      }
    }
  }

  this.color_objects = function () {
    if (this.data.cfg.color_obj !== 'no') {
      this.world.annotation.boxes.forEach((b) => {
        if (!b.annotator) {
          this.setBoxPointsColor(b)
        }
      })
    }
  }

  // color points according to object category
  this.color_points = function () {
    // color all points inside these boxes
    const color = this.points.geometry.getAttribute('color').array

    // step 1, color all points.
    if (this.data.cfg.color_points === 'intensity' && this.pcd.intensity.length > 0) {
      // by intensity
      for (let i = 0; i < this.pcd.intensity.length; ++i) {
        let intensity = this.pcd.intensity[i]
        intensity *= 8

        if (intensity > 1) { intensity = 1.0 }

        // color.push( 2 * Math.abs(0.5-intensity));

        color[i * 3] = intensity
        color[i * 3 + 1] = intensity
        color[i * 3 + 2] = 1 - intensity
      }
    } else {
      // mono color
      for (let i = 0; i < this.pcd.position.length; ++i) {
        color[i] = this.data.cfg.point_brightness
      }
    }

    // step 2 color objects
    this.color_objects()

    // this.updatePointsColor();
  }

  this.transformPointsByEgoPose = function (points) {
    if (!this.world.transLidar) { return points }

    const newPoints = []
    for (let i = 0; i < points.length; i += 3) {
      const p = matmul(this.world.transLidar, [points[i], points[i + 1], points[i + 2], 1], 4)
      newPoints.push(p[0])
      newPoints.push(p[1])
      newPoints.push(p[2])
    }
    return newPoints
  }

  this.get_all_points = function () {
    return this.points.geometry.getAttribute('position').array
  }

  this.get_all_colors = function () {
    return this.points.geometry.getAttribute('color').array
  }

  this.computeCenter = function () {
    if (!this.center) {
      const position = this.points.geometry.getAttribute('position')
      // computer center position
      const center = { x: 0, y: 0, z: 0 }
      for (let i = 0; i < position.count; i++) {
        center.x += position.array[i * 3]
        center.y += position.array[i * 3 + 1]
        center.z += position.array[i * 3 + 2]
      }

      center.x /= position.count
      center.y /= position.count
      center.z /= position.count

      this.center = center
    }

    return this.center
  }

  this.build_points_index = function () {
    const ps = this.points.geometry.getAttribute('position')
    const points_index = {}

    if (ps) { // points may be empty
      for (let i = 0; i < ps.count; i++) {
        let k = this.get_position_key(ps.array[i * 3], ps.array[i * 3 + 1], ps.array[i * 3 + 2])
        k = this.key_to_str(k)

        if (points_index[k]) {
          points_index[k].push(i)
        } else {
          points_index[k] = [i]
        }
      }
    }

    this.points.points_index = points_index
  }

  this.points_index_grid_size = 1

  this.get_position_key = function (x, y, z) {
    return [Math.floor(x / this.points_index_grid_size),
      Math.floor(y / this.points_index_grid_size),
      Math.floor(z / this.points_index_grid_size)]
  }
  this.key_to_str = function (k) {
    return k[0] + ',' + k[1] + ',' + k[2]
  }

  // candidate pionts, covering the box(center, scale), but larger.
  this.get_covering_position_indices = function (points, center, scale, rotation, scale_ratio) {
    /*
        var ck = this.get_position_key(center.x, center.y, center.z);
        var radius = Math.sqrt(scale.x*scale.x + scale.y*scale.y + scale.z*scale.z)/2;
        var radius_grid = Math.ceil(radius/this.points_index_grid_size);// + 1;

        var indices = [];
        for(var x = -radius_grid; x <= radius_grid; x++){
            for(var y = -radius_grid; y <= radius_grid; y++){
                for(var z = -radius_grid; z <= radius_grid; z++){
                    var temp = points.points_index[this.key_to_str([ck[0]+x, ck[1]+y, ck[2]+z])];
                    if (temp)
                        indices = indices.concat(temp);
                }
            }
        }

        console.log("found indices 1: " + indices.length);
        //return indices;
        */

    if (typeof (scale_ratio) === 'number') {
      scale_ratio = {
        x: scale_ratio,
        y: scale_ratio,
        z: scale_ratio
      }
    };

    const scaled_scale = {
      x: scale.x * scale_ratio.x,
      y: scale.y * scale_ratio.y,
      z: scale.z * scale_ratio.z
    }

    const box_corners = pxrToXyz(center, scaled_scale, rotation)
    const extreme = arrayAsVectorRange(box_corners, 4)

    let indices = []
    for (let x = Math.floor(extreme.min[0] / this.points_index_grid_size); x <= Math.floor(extreme.max[0] / this.points_index_grid_size); x++) {
      for (let y = Math.floor(extreme.min[1] / this.points_index_grid_size); y <= Math.floor(extreme.max[1] / this.points_index_grid_size); y++) {
        for (let z = Math.floor(extreme.min[2] / this.points_index_grid_size); z <= Math.floor(extreme.max[2] / this.points_index_grid_size); z++) {
          const temp = points.points_index[this.key_to_str([x, y, z])]
          if (temp) { indices = indices.concat(temp) }
        }
      }
    }

    // console.log("found indices 2: " + indices.length);
    return indices
  }

  this.toggle_background = function () {
    if (this.points.points_backup) { // cannot differentiate highlighted-scene and no-background-whole-scene
      this.cancel_highlight()
    } else {
      this.hide_background()
    }
  }

  // hide all points not inside any box
  this.hide_background = function () {
    if (this.points.points_backup) {
      // already hidden, or in highlight mode
      return
    }

    const _self = this
    const pos = this.points.geometry.getAttribute('position')
    const color = this.points.geometry.getAttribute('color')

    const hl_point = []
    const hl_color = []
    let highlight_point_indices = []
    this.world.annotation.boxes.forEach(function (box) {
      const indices = _self.getPointIndicesOfBox(_self.points, box, 1)

      indices.forEach(function (i) {
        hl_point.push(pos.array[i * 3])
        hl_point.push(pos.array[i * 3 + 1])
        hl_point.push(pos.array[i * 3 + 2])

        hl_color.push(color.array[i * 3])
        hl_color.push(color.array[i * 3 + 1])
        hl_color.push(color.array[i * 3 + 2])
      })

      highlight_point_indices = highlight_point_indices.concat(indices)
    })

    // build new geometry
    this.world.data.dbg.alloc('lidar')
    const geometry = new THREE.BufferGeometry()

    if (hl_point.length > 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(hl_point, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(hl_color, 3))
    }

    geometry.computeBoundingSphere()

    const material = new THREE.PointsMaterial({ size: _self.data.cfg.point_size, vertexColors: THREE.VertexColors })

    material.sizeAttenuation = false

    const mesh = new THREE.Points(geometry, material)
    mesh.name = 'pcd'
    mesh.points_backup = this.points
    mesh.highlight_point_indices = highlight_point_indices

    // swith geometry
    this.world.webglGroup.remove(this.points)

    this.points = mesh
    this.build_points_index()
    this.world.webglGroup.add(mesh)
  }

  this.cancel_highlight = function (box) {
    if (this.points && this.points.points_backup) {
      this.world.annotation.set_box_opacity(this.data.cfg.box_opacity)

      // copy colors, maybe changed.
      if (this.data.cfg.color_obj !== 'no') {
        const highlight_point_color = this.points.geometry.getAttribute('color')
        const backup_point_color = this.points.points_backup.geometry.getAttribute('color')

        this.points.highlight_point_indices.forEach(function (n, i) {
          backup_point_color.array[n * 3] = highlight_point_color.array[i * 3]
          backup_point_color.array[n * 3 + 1] = highlight_point_color.array[i * 3 + 1]
          backup_point_color.array[n * 3 + 2] = highlight_point_color.array[i * 3 + 2]
        })
      }

      // switch
      const points_backup = this.points.points_backup
      this.points.points_backup = null

      this.world.webglGroup.remove(this.points)
      this.removeAllPoints() // this.points is null now
      this.points = points_backup

      if (box) {
        // in highlighted mode, the box my be moved outof the highlighted area, so
        // we need to color them again.
        if (this.data.cfg.color_obj !== 'no') { this.setBoxPointsColor(box) }
      }

      if (this.data.cfg.color_obj !== 'no') { this.updatePointsColor() }

      this.world.webglGroup.add(this.points)
    }
  }

  this.reset_points = function (points) { // coordinates of points
    this.world.data.dbg.alloc('lidar')
    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geometry.computeBoundingSphere()

    const material = new THREE.PointsMaterial({ size: this.data.cfg.point_size })

    material.sizeAttenuation = false

    const mesh = new THREE.Points(geometry, material)
    mesh.name = 'pcd'

    // swith geometry
    this.world.webglGroup.remove(this.points)
    this.removeAllPoints()

    this.points = mesh
    this.world.webglGroup.add(mesh)
  }

  this.highlight_box_points = function (box) {
    if (this.points.highlighted_box) {
      // already highlighted.
      return
    }

    // hide all other boxes
    this.world.annotation.set_box_opacity(0)

    // keep myself
    box.material.opacity = 1

    const _self = this
    const pos = this.points.geometry.getAttribute('position')
    const color = this.points.geometry.getAttribute('color')

    const hl_point = []
    const hl_color = []

    const highlight_point_indices = this.getPointIndicesOfBox(this.points, box, 3)

    highlight_point_indices.forEach(function (i) {
      hl_point.push(pos.array[i * 3])
      hl_point.push(pos.array[i * 3 + 1])
      hl_point.push(pos.array[i * 3 + 2])

      hl_color.push(color.array[i * 3])
      hl_color.push(color.array[i * 3 + 1])
      hl_color.push(color.array[i * 3 + 2])
    })

    // build new geometry
    this.world.data.dbg.alloc('lidar')
    const geometry = new THREE.BufferGeometry()

    if (hl_point.length > 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(hl_point, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(hl_color, 3))
    }

    geometry.computeBoundingSphere()

    const material = new THREE.PointsMaterial({ size: _self.data.cfg.point_size, vertexColors: THREE.VertexColors })

    material.sizeAttenuation = false

    const mesh = new THREE.Points(geometry, material)
    mesh.name = 'highlighted_pcd'

    // swith geometry
    this.world.webglGroup.remove(this.points)

    mesh.points_backup = this.points
    mesh.highlight_point_indices = highlight_point_indices
    mesh.highlighted_box = box

    this.points = mesh
    this.build_points_index()
    this.world.webglGroup.add(mesh)
  }

  this.get_points_indices_of_box = function (box) {
    return this.getPointsOfBoxInternal(this.points, box, 1).index
  }

  this.get_points_of_box_in_box_coord = function (box) {
    return this.getPointsOfBoxInternal(this.points, box, 1).position
  }

  // IMPORTANT
  // ground plane affects auto-adjustment
  // we don't count in the ponits of lowest part to reduce the affection.
  // note how the 'lower part' is defined, we count
  // lowest_part_type has two options: lowest_point, or lowest_box
  this.getPointsDimensionOfBox = function (box, useBoxBottomAsLimit) {
    let p = this.getPointsOfBoxInternal(this.points, box, 1).position // position is relative to box coordinates

    let lowest_limit = -box.scale.z / 2

    if (!useBoxBottomAsLimit) {
      const extreme1 = vector_range(p, 3)
      lowest_limit = extreme1.min[2]
    }

    // filter out lowest part
    p = p.filter(function (x) {
      return x[2] - settings.ground_filter_height > lowest_limit
    })

    // compute range again.
    const extreme2 = vector_range(p, 3)

    return {
      max: {
        x: extreme2.max[0],
        y: extreme2.max[1],
        z: extreme2.max[2]
      },
      min: {
        x: extreme2.min[0],
        y: extreme2.min[1],
        z: lowest_limit
      }
    }
  }

  // given points and box, calculate new box scale
  // if the box size is fixed, and if corner align for z-axis aligns top,
  // we should filter ground points by the box bottom after aligned.
  this.get_dimension_of_points = function (indices, box) {
    let p = this.getPointsOfBoxInternal(this.points, box, 1, indices).position
    const extreme1 = vector_range(p, 3)

    // filter out lowest part, to calculate x-y size.
    p = p.filter(function (x) {
      return x[2] - settings.ground_filter_height > extreme1.min[2]
    })

    // compute range again.
    const extreme2 = vector_range(p, 3)

    return {
      max: {
        x: extreme2.max[0],
        y: extreme2.max[1],
        z: extreme1.max[2] // orignal extreme.
      },
      min: {
        x: extreme2.min[0],
        y: extreme2.min[1],
        z: extreme1.min[2]
      }
    }
  }

  // centered, but without rotation
  this.getPointsRelativeCoordinatesOfBoxWithoutRotation = function (box, scale_ratio) {
    return this.getPointsOfBoxInternal(this.points, box, scale_ratio).positionWithoutRotation
  }

  this.getPointsInBox = function (box, scale_ratio) {
    return this.getPointsOfBoxInternal(this.points, box, scale_ratio)
  }

  this.getPointsOfBoxInWorldCoordinates = function (box, scale_ratio) {
    const posArray = this.points.geometry.getAttribute('position').array
    const { index, position } = this.getPointsOfBoxInternal(this.points, box, scale_ratio)
    const ptsTopPart = []
    const ptsGroundPart = []

    // const groundHeight = Math.min(0.5, box.scale.z * 0.2)

    index.forEach((v, i) => {
      if (position[i][2] < -box.scale.z / 2 + 0.3) {
        ptsGroundPart.push(posArray[v * 3])
        ptsGroundPart.push(posArray[v * 3 + 1])
        ptsGroundPart.push(posArray[v * 3 + 2])
      } else {
        ptsTopPart.push(posArray[v * 3])
        ptsTopPart.push(posArray[v * 3 + 1])
        ptsTopPart.push(posArray[v * 3 + 2])
      }
    })

    return [ptsTopPart, ptsGroundPart]
  }

  this.getPointRelativeCoordinatesOfBox = function (box, scale_ratio) {
    const ret = this.getPointsOfBoxInternal(this.points, box, scale_ratio)
    return ret.position
  }

  this.getPointIndicesOfBox = function (points, box, scale_ratio) {
    return this.getPointsOfBoxInternal(points, box, scale_ratio).index
  }

  // this
  this.getPointsOfBoxInternal = function (points, box, scale_ratio, point_indices) {
    if (!scale_ratio) {
      scale_ratio = 1
    }
    const posArray = points.geometry.getAttribute('position').array

    const relative_position = []
    const relative_position_wo_rotation = []

    const r = box.rotation
    const trans = transpose(eulerAngleToRotationMatrix(r, { x: 0, y: 0, z: 0 }), 4)

    const indices = []
    let candPointIndices = point_indices
    if (!point_indices) {
      candPointIndices = this.get_covering_position_indices(points, box.position, box.scale, box.rotation, scale_ratio)
    }

    candPointIndices.forEach(function (i) {
      // for (var i  = 0; i < pos.count; i++){
      const x = posArray[i * 3]
      const y = posArray[i * 3 + 1]
      const z = posArray[i * 3 + 2]

      const p = [x - box.position.x, y - box.position.y, z - box.position.z, 1]

      const tp = matmul(trans, p, 4)

      if (!point_indices) {
        // if indices is provided by caller, don't filter
        if ((Math.abs(tp[0]) > box.scale.x / 2 * scale_ratio + 0.01) ||
                    (Math.abs(tp[1]) > box.scale.y / 2 * scale_ratio + 0.01) ||
                    (Math.abs(tp[2]) > box.scale.z / 2 * scale_ratio + 0.01)) {
          return
        }

        indices.push(i)
      }

      relative_position.push([tp[0], tp[1], tp[2]])
      relative_position_wo_rotation.push([p[0], p[1], p[2]])
    })

    // console.log("found indices: " + indices.length);

    return {
      index: indices,
      position: relative_position,
      positionWithoutRotation: relative_position_wo_rotation
    }
  }

  this.findTop = function (box, init_scale_ratio) {
    const points = this.points
    const posArray = points.geometry.getAttribute('position').array

    const trans = transpose(eulerAngleToRotationMatrix(box.rotation, { x: 0, y: 0, z: 0 }), 4)

    const candPointIndices = this.get_covering_position_indices(points, box.position, box.scale, box.rotation, init_scale_ratio)
    // all cand points are translated into box coordinates

    const translatedCandPoints = candPointIndices.map(function (i) {
      const x = posArray[i * 3]
      const y = posArray[i * 3 + 1]
      const z = posArray[i * 3 + 2]

      const p = [x - box.position.x, y - box.position.y, z - box.position.z, 1]
      const tp = matmul(trans, p, 4)
      return tp
    })

    let maxZ = -1000

    translatedCandPoints.forEach((tp, i) => {
      if (Math.abs(tp[0]) < box.scale.x * init_scale_ratio.x / 2 &&
                Math.abs(tp[1]) < box.scale.y * init_scale_ratio.y / 2 &&
                Math.abs(tp[2]) < box.scale.z * init_scale_ratio.z / 2) {
        if (tp[2] > maxZ) { maxZ = tp[2] }
      }
    })

    return maxZ
  }

  // find bottom and top points, in range of init_scale_ratio
  this.findBottom = function (box, init_scale_ratio) {
    const points = this.points
    const posArray = points.geometry.getAttribute('position').array

    const trans = transpose(eulerAngleToRotationMatrix(box.rotation, { x: 0, y: 0, z: 0 }), 4)

    const candPointIndices = this.get_covering_position_indices(points, box.position, box.scale, box.rotation, init_scale_ratio)
    // all cand points are translated into box coordinates

    const translatedCandPoints = candPointIndices.map(function (i) {
      const x = posArray[i * 3]
      const y = posArray[i * 3 + 1]
      const z = posArray[i * 3 + 2]

      const p = [x - box.position.x, y - box.position.y, z - box.position.z, 1]
      const tp = matmul(trans, p, 4)
      return tp
    })

    let minZ = 1000

    translatedCandPoints.forEach((tp, i) => {
      if (Math.abs(tp[0]) < box.scale.x * init_scale_ratio.x / 2 &&
                Math.abs(tp[1]) < box.scale.y * init_scale_ratio.y / 2 &&
                Math.abs(tp[2]) < box.scale.z * init_scale_ratio.z / 2) {
        if (tp[2] < minZ) { minZ = tp[2] }
      }
    })

    return minZ
  }

  this.growBox = function (box, minDistance, init_scale_ratio) {
    console.log('grow box, minDistance', minDistance, box.scale, init_scale_ratio)
    // const start_time = new Date().getTime()
    const points = this.points
    const posArray = points.geometry.getAttribute('position').array

    const trans = transpose(eulerAngleToRotationMatrix(box.rotation, { x: 0, y: 0, z: 0 }), 4)

    const candPointIndices = this.get_covering_position_indices(points, box.position, box.scale, box.rotation, init_scale_ratio)

    // todo: different definition.
    let groundLevel = 0.3

    if (this.data.cfg.enableDynamicGroundLevel) {
      groundLevel = Math.min(box.scale.z / 3, Math.max(0.2, box.scale.x / 10, box.scale.y / 10))
      console.log('ground level', groundLevel, box.scale)
    }

    // all cand points are translated into box coordinates

    const translatedCandPoints = candPointIndices.map(function (i) {
      const x = posArray[i * 3]
      const y = posArray[i * 3 + 1]
      const z = posArray[i * 3 + 2]

      const p = [x - box.position.x, y - box.position.y, z - box.position.z, 1]
      const tp = matmul(trans, p, 4)
      return tp
    })

    const extreme = {
      max: {
        x: -100000,
        y: -100000,
        z: -100000
      },

      min: {
        x: 1000000,
        y: 1000000,
        z: 1000000
      }
    }

    let inside_points = 0
    translatedCandPoints.forEach((tp, i) => {
      if ((Math.abs(tp[0]) > box.scale.x / 2 + 0.01) ||
                (Math.abs(tp[1]) > box.scale.y / 2 + 0.01) ||
                (Math.abs(tp[2]) > box.scale.z / 2 + 0.01)) {

      } else {
        if ((box.scale.z < 0.6) || ((box.scale.z > 0.6) && (tp[2] > -box.scale.z / 2 + groundLevel))) {
          inside_points += 1

          if (tp[0] > extreme.max.x) {
            extreme.max.x = tp[0]
          }

          if (tp[0] < extreme.min.x) {
            extreme.min.x = tp[0]
          }

          if (tp[1] > extreme.max.y) {
            extreme.max.y = tp[1]
          }

          if (tp[1] < extreme.min.y) {
            extreme.min.y = tp[1]
          }
        }

        if (tp[2] > extreme.max.z) {
          extreme.max.z = tp[2]
        }

        if (tp[2] < extreme.min.z) {
          extreme.min.z = tp[2]
        }
      }
    })

    if (inside_points < 10) // too few points, give up.
    {
      return {
        max: {
          x: box.scale.x / 2,
          y: box.scale.y / 2,
          z: box.scale.z / 2
        },
        min: {
          x: -box.scale.x / 2,
          y: -box.scale.y / 2,
          z: -box.scale.z / 2
        }
      }
    }

    // let translated_cand_points_with_ground = translatedCandPoints;

    // filter ground points
    // translatedCandPoints = translatedCandPoints.filter(function(tp, i){
    //     return tp[2] > -box.scale.z/2 + groundLevel;
    // });

    let extremeAdjusted = true
    let loop_count = 0
    while (extremeAdjusted) {
      loop_count++
      if (loop_count > 100000) {
        console.log('deep loops in growBox')
        break
      }

      extremeAdjusted = false

      // x+
      let foundPonts = translatedCandPoints.find(tp => {
        return tp[0] > extreme.max.x && tp[0] < extreme.max.x + minDistance / 2 &&
                        tp[1] < extreme.max.y && tp[1] > extreme.min.y &&
                        tp[2] < extreme.max.z && tp[2] > extreme.min.z + groundLevel
      })

      if (foundPonts) {
        extreme.max.x += minDistance / 2
        extremeAdjusted = true
      }

      // x -
      foundPonts = translatedCandPoints.find(tp => {
        return tp[0] < extreme.min.x && tp[0] > extreme.min.x - minDistance / 2 &&
                       tp[1] < extreme.max.y && tp[1] > extreme.min.y &&
                       tp[2] < extreme.max.z && tp[2] > extreme.min.z + groundLevel
      })

      if (foundPonts) {
        extreme.min.x -= minDistance / 2
        extremeAdjusted = true
      }

      // y+
      foundPonts = translatedCandPoints.find(tp => {
        return tp[1] > extreme.max.y && tp[1] < extreme.max.y + minDistance / 2 &&
                       tp[0] < extreme.max.x && tp[0] > extreme.min.x &&
                       tp[2] < extreme.max.z && tp[2] > extreme.min.z + groundLevel
      })

      if (foundPonts) {
        extreme.max.y += minDistance / 2
        extremeAdjusted = true
      }

      // y -
      foundPonts = translatedCandPoints.find(tp => {
        return tp[1] < extreme.min.y && tp[1] > extreme.min.y - minDistance / 2 &&
                       tp[0] < extreme.max.x && tp[0] > extreme.min.x &&
                       tp[2] < extreme.max.z && tp[2] > extreme.min.z + groundLevel
      })

      if (foundPonts) {
        extreme.min.y -= minDistance / 2
        extremeAdjusted = true
      }

      // z+
      foundPonts = translatedCandPoints.find(tp => {
        return tp[0] < extreme.max.x && tp[0] > extreme.min.x &&
                       tp[1] < extreme.max.y && tp[1] > extreme.min.y &&
                       tp[2] > extreme.max.z && tp[2] < extreme.max.z + minDistance / 2
      })

      if (foundPonts) {
        extreme.max.z += minDistance / 2
        extremeAdjusted = true
      }

      // z-
      foundPonts = translatedCandPoints.find(tp => {
        return tp[0] < extreme.max.x && tp[0] > extreme.min.x &&
                       tp[1] < extreme.max.y && tp[1] > extreme.min.y &&
                       tp[2] < extreme.min.z && tp[2] > extreme.min.z - minDistance / 2
      })

      if (foundPonts) {
        extreme.min.z -= minDistance / 2
        extremeAdjusted = true
      }
    }

    // refine extreme values
    // 1 set initial value
    const refinedExtremes = {
      max: {
        x: extreme.max.x - minDistance / 2,
        y: extreme.max.y - minDistance / 2,
        z: extreme.max.z - minDistance / 2
      },

      min: {
        x: extreme.min.x + minDistance / 2,
        y: extreme.min.y + minDistance / 2,
        z: extreme.min.z + minDistance / 2
      }
    }

    // 2  find refined values.
    translatedCandPoints.forEach(tp => {
      if (tp[0] > extreme.max.x || tp[0] < extreme.min.x ||
                tp[1] > extreme.max.y || tp[1] < extreme.min.y ||
                tp[2] > extreme.max.z || tp[2] < extreme.min.z) {

      } else {
        if (tp[0] > refinedExtremes.max.x && tp[2] > extreme.min.z + groundLevel) {
          refinedExtremes.max.x = tp[0]
        }

        if (tp[0] < refinedExtremes.min.x && tp[2] > extreme.min.z + groundLevel) {
          refinedExtremes.min.x = tp[0]
        }

        if (tp[1] > refinedExtremes.max.y && tp[2] > extreme.min.z + groundLevel) {
          refinedExtremes.max.y = tp[1]
        }

        if (tp[1] < refinedExtremes.min.y && tp[2] > extreme.min.z + groundLevel) {
          refinedExtremes.min.y = tp[1]
        }

        if (tp[2] > refinedExtremes.max.z) {
          refinedExtremes.max.z = tp[2]
        }

        if (tp[2] < refinedExtremes.min.z) {
          refinedExtremes.min.z = tp[2]
        }
      }
    })

    refinedExtremes.min.z -= groundLevel
    console.log('refined extreme', JSON.stringify(refinedExtremes))
    return refinedExtremes
  }

  this.getBoxPointsNumber = function (box) {
    const indices = this.getPointIndicesOfBox(this.points, box, 1.0)
    return indices.length
  }

  this.resetBoxPointsColor = function (box) {
    const color = this.points.geometry.getAttribute('color').array
    const indices = this.getPointIndicesOfBox(this.points, box, 1.0)
    if (this.data.cfg.color_points === 'intensity') {
      indices.forEach((i) => {
        let intensity = this.pcd.intensity[i]
        intensity *= 8

        if (intensity > 1) { intensity = 1.0 }

        color[i * 3] = intensity
        color[i * 3 + 1] = intensity
        color[i * 3 + 2] = 1 - intensity
      })
    } else {
      indices.forEach((i) => {
        color[i * 3] = this.data.cfg.point_brightness
        color[i * 3 + 1] = this.data.cfg.point_brightness
        color[i * 3 + 2] = this.data.cfg.point_brightness
      })
    }
  }

  this.setBoxPointsColor = function (box, target_color) {
    // var pos = this.points.geometry.getAttribute("position");
    const color = this.points.geometry.getAttribute('color')

    if (!target_color) {
      if (this.data.cfg.color_obj === 'category') {
        target_color = globalObjectCategory.get_color_by_category(box.obj_type)
      } else if (this.data.cfg.color_obj === 'id')// by id
      {
        const idx = (box.obj_track_id) ? parseInt(box.obj_track_id) : box.obj_local_id
        target_color = globalObjectCategory.get_color_by_id(idx)
      } else // no color
      {

      }
    }

    if (target_color) {
      const indices = this.getPointIndicesOfBox(this.points, box, 1.0)
      indices.forEach(function (i) {
        color.array[i * 3] = target_color.x
        color.array[i * 3 + 1] = target_color.y
        color.array[i * 3 + 2] = target_color.z
      })
    }
  }

  this.setSpecPontsColor = function (point_indices, target_color) {
    // var pos = this.points.geometry.getAttribute("position");
    const color = this.points.geometry.getAttribute('color')

    point_indices.forEach(function (i) {
      color.array[i * 3] = target_color.x
      color.array[i * 3 + 1] = target_color.y
      color.array[i * 3 + 2] = target_color.z
    })
  }

  // this is used when pointbrightness is updated.
  this.recolorAllPoints = function () {
    this.set_points_color({
      x: this.data.cfg.point_brightness,
      y: this.data.cfg.point_brightness,
      z: this.data.cfg.point_brightness
    })
    this.color_points()
    this.updatePointsColor()
  }

  // set all points to specified color
  this.set_points_color = function (target_color) {
    const color = this.points.geometry.getAttribute('color')
    for (let i = 0; i < color.count; i++) {
      color.array[i * 3] = target_color.x
      color.array[i * 3 + 1] = target_color.y
      color.array[i * 3 + 2] = target_color.z
    }
  }

  this.updatePointsColor = function () {
    if (this.points) { // some time points may fail to load.
      this.points.geometry.getAttribute('color').needsUpdate = true
      // this.points.geometry.removeAttribute("color");
      // this.points.geometry.setAttribute("color", new THREE.Float32BufferAttribute(color.array, 3 ));
    }
  }

  this.removeAllPoints = function () {
    if (this.points) {
      this.world.data.dbg.free('lidar')
      this.points.geometry.dispose()
      this.points.material.dispose()

      if (this.points.points_backup) {
        this.world.data.dbg.free('lidar')
        this.points.points_backup.geometry.dispose()
        this.points.points_backup.material.dispose()

        if (this.points.points_backup.points_backup) {
          this.world.data.dbg.free('lidar')
          this.points.points_backup.points_backup.geometry.dispose()
          this.points.points_backup.points_backup.material.dispose()
          this.points.points_backup.points_backup = null
        }

        this.points.points_backup = null
      }

      this.points = null
    } else {
      console.error('destroy empty world!')
    }
  }

  this.selectPointsByViewRect = function (x, y, w, h, camera) {
    const posArray = this.points.geometry.getAttribute('position').array

    const indices = []
    const points = []
    let p = new THREE.Vector3()

    for (let i = 0; i < posArray.length / 3; i++) {
      p.set(posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2])
      p = this.world.lidarPosToScene(p)
      p.project(camera)
      // p.x = p.x/p.z;
      // p.y = p.y/p.z;
      // console.log(p);
      if ((p.x >= x) && (p.x <= x + w) && (p.y >= y) && (p.y <= y + h) && (p.z > 0)) {
        indices.push(i)
        points.push([posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]])
      }
    }

    console.log('select rect points', indices.length)

    // this.setSpecPontsColor(indices, {x:1,y:0,z:0});
    // this.updatePointsColor();

    return points
  }

  this.getCentroid = function (point_indices) {
    const points = this.points
    const posArray = points.geometry.getAttribute('position').array

    const center = {
      x: 0, y: 0, z: 0
    }

    point_indices.forEach(i => {
      center.x += posArray[i * 3]
      center.y += posArray[i * 3 + 1]
      center.z += posArray[i * 3 + 2]
    })

    center.x /= point_indices.length
    center.y /= point_indices.length
    center.z /= point_indices.length

    return center
  }

  this.createBoxByPoints = function (point_indices, camera) {
    const indices = point_indices
    const points = this.points
    const posArray = points.geometry.getAttribute('position').array

    // todo: copied the following code from next function. refactor it!
    console.log('select rect points', indices.length)

    // compute center, no need to tranform to box coordinates, and can't do it in this stage.
    /*
        var extreme = arrayAsVectorIndexRange(posArray, 3, indices);

        var center = {
            x: (extreme.max[0]+extreme.min[0])/2,
            y: (extreme.max[1]+extreme.min[1])/2,
            z: (extreme.max[2]+extreme.min[2])/2,
        };
        */
    const rotation_z = camera.rotation.z + Math.PI / 2
    const trans = transpose(eulerAngleToRotationMatrix({ x: 0, y: 0, z: rotation_z }, { x: 0, y: 0, z: 0 }), 4)

    const center = {
      x: 0, y: 0, z: 0
    }

    point_indices.forEach(i => {
      center.x += posArray[i * 3]
      center.y += posArray[i * 3 + 1]
      center.z += posArray[i * 3 + 2]
    })

    center.x /= point_indices.length
    center.y /= point_indices.length
    center.z /= point_indices.length
    center.z = 0

    const relative_position = []
    indices.forEach(function (i) {
      // for (var i  = 0; i < pos.count; i++){
      const x = posArray[i * 3]
      const y = posArray[i * 3 + 1]
      const z = posArray[i * 3 + 2]
      const p = [x - center.x, y - center.y, z - center.z, 1]
      const tp = matmul(trans, p, 4)
      relative_position.push([tp[0], tp[1], tp[2]])
    })

    const relative_extreme = vector_range(relative_position)
    const scale = {
      x: relative_extreme.max[0] - relative_extreme.min[0],
      y: relative_extreme.max[1] - relative_extreme.min[1],
      z: relative_extreme.max[2] - relative_extreme.min[2]
    }

    // enlarge scale a little

    // adjust center
    this.world.annotation.translate_box_position(center, rotation_z, 'x', relative_extreme.min[0] + scale.x / 2)
    this.world.annotation.translate_box_position(center, rotation_z, 'y', relative_extreme.min[1] + scale.y / 2)
    this.world.annotation.translate_box_position(center, rotation_z, 'z', relative_extreme.min[2] + scale.z / 2)

    scale.x += 0.02
    scale.y += 0.02
    scale.z += 0.02

    return this.world.annotation.add_box(center, scale, { x: 0, y: 0, z: rotation_z }, 'Unknown', '')
  }
}

export { Lidar }
