import * as THREE from './lib/three.module.js';
import { PCDLoader } from './lib/PCDLoader.js';
import { matmul, euler_angle_to_rotate_matrix_3by3} from "./util.js"


//todo: clean arrows

function AuxLidar(sceneMeta, world, frameInfo, auxLidarName){
    this.world = world;
    this.frameInfo = frameInfo;    
    this.name = auxLidarName;
    this.sceneMeta = sceneMeta;
    this.coordinatesOffset = world.coordinatesOffset;

    this.showPointsOnly = true;
    this.showCalibBox = false;
    //this.cssStyleSelector = this.sceneMeta.calib.aux_lidar[this.name].cssstyleselector;
    this.color = this.sceneMeta.calib.aux_lidar[this.name].color;
    

    if (!this.color)    
    {
        this.color = [
            this.world.data.cfg.point_brightness, 
            this.world.data.cfg.point_brightness, 
            this.world.data.cfg.point_brightness, 
        ];
    }

    this.lidar_points = null;  // read from file, centered at 0
    this.elements = null;   // geometry points

    this.preloaded = false;
    this.loaded = false;


    this.go_cmd_received = false;
    this.webglScene = null;
    this.on_go_finished = null;
    this.go = function(webglScene, on_go_finished){
        this.webglScene = webglScene;

        if (this.preloaded){
            if (this.elements){
                this.webglScene.add(this.elements.points);

                

                if (this.showCalibBox)
                    this.webglScene.add(this.calib_box);
            }

            this.loaded = true;
            if (on_go_finished)
                on_go_finished();
        }
        
        //anyway we save go cmd 
        {
            this.go_cmd_received = true;
            this.on_go_finished = on_go_finished;
        }
    };

    this.showCalibBox = function(){
        this.showCalibBox = true;
        this.webglScene.add(this.calib_box);
    };

    this.hideCalibBox = function(){
        this.showCalibBox = false;
        this.webglScene.remove(this.calib_box);
    };

    this.get_unoffset_lidar_points = function(){
        if (this.elements){
            let pts = this.elements.points.geometry.getAttribute("position").array;
            return pts.map((p,i)=>p-this.world.coordinatesOffset[i %3]);
        }
        else{
            return [];
        }
    };

    // todo: what if it's not preloaded yet
    this.unload = function(keep_box){
        if (this.elements){
            this.webglScene.remove(this.elements.points);
            if (!this.showPointsOnly)
                this.elements.arrows.forEach(a=>this.webglScene.remove(a));
            
            if (!keep_box)
                this.webglScene.remove(this.calib_box);
        }
        this.loaded = false;
    };

    // todo: its possible to remove points before preloading,
    this.deleteAll = function(keep_box){
        if (this.loaded){
            this.unload();
        }

        if (this.elements){
            //this.scene.remove(this.points);
            this.world.data.dbg.free();

            if (this.elements.points)
            {
                this.elements.points.geometry.dispose();
                this.elements.points.material.dispose();
            }

            if (this.elements.arrows)
            {
                this.elements.arrows.forEach(a=>{
                    this.world.data.dbg.free();
                    a.geometry.dispose();
                    a.material.dispose();
                })
            }

            this.elements = null;
        }

        if (!keep_box && this.calib_box){
            this.world.data.dbg.free();
            this.calib_box.geometry.dispose();
            this.calib_box.material.dispose();
            this.calib_box = null;
        }
    };

    this.filterPoints = function(position){
        let filtered_position = [];

        if (pointsGlobalConfig.enableFilterPoints)
        {
            for(let i = 0; i <= position.length; i+=3)
            {
                if (position[i+2] <= pointsGlobalConfig.filterPointsZ)
                {
                    filtered_position.push(position[i]);
                    filtered_position.push(position[i+1]);
                    filtered_position.push(position[i+2]);

                }
            }
        }

        return filtered_position;
    };

    this.preload = function(on_preload_finished){

        this.on_preload_finished = on_preload_finished;
        
        var loader = new PCDLoader();

        var _self = this;
        loader.load( this.frameInfo.get_aux_lidar_path(this.name), 
            //ok
            function ( pcd ) {
                var position = pcd.position;
                
                
                //_self.points_parse_time = new Date().getTime();
                //console.log(_self.points_load_time, _self.frameInfo.scene, _self.frameInfo.frame, "parse pionts ", _self.points_parse_time - _self.create_time, "ms");
                _self.lidar_points = position;
                
                // add one box to calibrate lidar with lidar
                _self.calib_box = _self.createCalibBox();

                // install callback for box changing
                _self.calib_box.on_box_changed = ()=>{
                    _self.move_lidar(_self.calib_box);
                };

                //position = _self.transformPointsByOffset(position);
                position = _self.move_points(_self.calib_box);       
                
                

                let elements = _self.buildGeometry(position);
                
                _self.elements = elements;
                //_self.points_backup = mesh;

                _self._afterPreload();

            },

            // on progress,
            function(){},

            // on error
            function(){
                //error
                console.log("load lidar failed.");
                _self._afterPreload();
            },

            // on file loaded
            function(){
                //_self.points_readfile_time = new Date().getTime();
                //console.log(_self.points_load_time, _self.frameInfo.scene, _self.frameInfo.frame, "read file ", _self.points_readfile_time - _self.create_time, "ms");
            }
        );
    };

    // internal funcs below
    this._afterPreload = function(){
        this.preloaded = true;
        console.log(`lidar ${this.auxLidarName} preloaded`);
        if (this.on_preload_finished){
            this.on_preload_finished();
        }                
        if (this.go_cmd_received){
            this.go(this.webglScene, this.on_go_finished);
        }
    };

    this.createCalibBox = function(){
        if (this.sceneMeta.calib.aux_lidar && this.sceneMeta.calib.aux_lidar[this.name]){
            return this.world.annotation.createCuboid(
                {
                    x: this.sceneMeta.calib.aux_lidar[this.name].translation[0] + this.coordinatesOffset[0],
                    y: this.sceneMeta.calib.aux_lidar[this.name].translation[1] + this.coordinatesOffset[1],
                    z: this.sceneMeta.calib.aux_lidar[this.name].translation[2] + this.coordinatesOffset[2],
                }, 
                {x:0.5, y:0.5, z:0.5}, 
                {
                    x: this.sceneMeta.calib.aux_lidar[this.name].rotation[0],
                    y: this.sceneMeta.calib.aux_lidar[this.name].rotation[1],
                    z: this.sceneMeta.calib.aux_lidar[this.name].rotation[2],
                }, 
                "lidar", 
                this.name);
        
        }else {
            return this.world.annotation.createCuboid(
                {x: this.coordinatesOffset[0],
                 y: this.coordinatesOffset[1],
                 z: this.coordinatesOffset[2]}, 
                {x:0.5, y:0.5, z:0.5}, 
                {x:0,y:0,z:0}, 
                "lidar", 
                this.name);
        }
    };

    this.buildPoints = function(position){
        // build geometry
        this.world.data.dbg.alloc();
        let geometry = new THREE.BufferGeometry();
        if ( position.length > 0 ) 
            geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
        
        
        let pointColor = this.color;
        let color=[];
        for (var i =0; i< position.length; i+=3){

            color.push(pointColor[0]);
            color.push(pointColor[1]);
            color.push(pointColor[2]);
        }

        geometry.addAttribute( 'color', new THREE.Float32BufferAttribute(color, 3 ) );

        geometry.computeBoundingSphere();
        
        // build material
        let pointSize = this.sceneMeta.calib.aux_lidar[this.name].point_size;
        if (!pointSize)
            pointSize = 1;

        let material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );
        //material.size = 2;
        material.sizeAttenuation = false;

        // build mesh
        let mesh = new THREE.Points( geometry, material );                        
        mesh.name = "lidar";

        return mesh;
    };


    this.buildGeometry = function(position){
        let points = this.buildPoints(position);
       
        return {
            points: points,         
        };
    };

    this.move_points = function(box){
        let points = this.lidar_points;
        let trans = euler_angle_to_rotate_matrix_3by3(box.rotation);        
        let rotated_points = matmul(trans, points, 3);
        let translation=[box.position.x, box.position.y, box.position.z];
        let translated_points = rotated_points.map((p,i)=>{
            return p + translation[i % 3];
        });

        let filtered_position = this.filterPoints(translated_points);
        return filtered_position;
    };



    this.move_lidar= function(box){

        let translated_points = this.move_points(box);

        let elements = this.buildGeometry(translated_points);
        
        // remove old points
        this.unload(true);
        this.deleteAll(true);

        this.elements = elements;
        //_self.points_backup = mesh;
        if (this.go_cmd_received)  // this should be always true
        {
            this.webglScene.add(this.elements.points);
            if (!this.showPointsOnly)
                this.elements.arrows.forEach(a=>this.webglScene.add(a));
        }
    };
}

function AuxLidarManager(sceneMeta, world, frameInfo){
    this.lidarList = [];

    if (world.data.cfg.enableAuxLidar && sceneMeta.aux_lidar){
        let lidars = [];
        
        for (let r in sceneMeta.calib.aux_lidar){
            if (!sceneMeta.calib.aux_lidar[r].disable)
                lidars.push(r);
        }

        this.lidarList = lidars.map(name=>{
            return new AuxLidar(sceneMeta, world, frameInfo, name);
        });
    }

    this.getAllBoxes = function()
    {
        if (this.showCalibBox)
        {
            return this.lidarList.map(r=>r.calib_box);
        }
        else
        {
            return [];
        }
    };

    this.preloaded = function(){
        for (let r in this.lidarList){
            if (!this.lidarList[r].preloaded)
                return false;
        }
        return true;
    };

    this.go = function(webglScene, on_go_finished){
        this.lidarList.forEach(r=>r.go(webglScene, on_go_finished));
    };

    this.preload = function(on_preload_finished){
        this.lidarList.forEach(r=>r.preload(on_preload_finished));
    };

    this.unload = function(){
        this.lidarList.forEach(r=>r.unload());
    };

    this.deleteAll = function(){
        this.lidarList.forEach(r=>r.deleteAll());
    };

    this.getOperableObjects = function(){
        return this.lidarList.flatMap(r=>r.getOperableObjects());
    };

    this.showCalibBox = false;
    this.showCalibBox = function(){
        this.showCalibBox = true;
        this.lidarList.forEach(r=>r.showCalibBox());
    };

    this.hideCalibBox = function(){
        this.showCalibBox = false;
        this.lidarList.forEach(r=>r.hideCalibBox());
    }
};


export {AuxLidarManager}