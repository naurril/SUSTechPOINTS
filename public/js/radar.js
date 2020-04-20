import * as THREE from './lib/three.module.js';
import { PCDLoader } from './lib/PCDLoader.js';
import { matmul, euler_angle_to_rotate_matrix_3by3} from "./util.js"

function Radar(sceneMeta, world, frameInfo, radarName){
    this.world = world;
    this.frameInfo = frameInfo;    
    this.name = radarName;
    this.sceneMeta = sceneMeta;
    this.coordinatesOffset = world.coordinatesOffset;

    this.cssStyleSelector = this.sceneMeta.calib.radar[this.name].cssstyleselector;

    this._radar_points_raw = null;  // read from file, centered at 0
    this.radar_points = null;   // geometry points

    this.preloaded = false;
    this.loaded = false;


    this.go_cmd_received = false;
    this.webglScene = null;
    this.on_go_finished = null;
    this.go = function(webglScene, on_go_finished){
        this.webglScene = webglScene;

        if (this.preloaded){
            this.webglScene.add(this.radar_points);
            this.webglScene.add(this.radar_box);
            this.loaded = true;
            if (on_go_finished)
                on_go_finished();
        } else {
            this.go_cmd_received = true;
            this.on_go_finished = on_go_finished;
        }
    };

    this.get_unoffset_radar_points = function(){
        if (this.radar_points){
            let pts = this.radar_points.geometry.getAttribute("position").array;
            return pts.map((p,i)=>p-this.world.coordinatesOffset[i %3]);
        }
        else{
            return [];
        }
    };

    // todo: what if it's not preloaded yet
    this.unload = function(){
        this.webglScene.remove(this.radar_points);
        this.webglScene.remove(this.radar_box);
        this.loaded = false;
    };

    // todo: its possible to remove points before preloading,
    this.removeAllPoints = function(){
        if (this.loaded){
            this.unload();
        }

        if (this.radar_points){
            //this.scene.remove(this.points);
            this.radar_points.geometry.dispose();
            this.radar_points.material.dispose();
            this.radar_points = null;
        }

        if (this.radar_box){
            this.radar_box.geometry.dispose();
            this.radar_box.material.dispose();
            this.radar_box = null;
        }
    };


    this.preload = function(on_preload_finished){
        var loader = new PCDLoader();

        var _self = this;
        loader.load( this.frameInfo.get_radar_path(this.name), 
            //ok
            function ( pcd ) {
                var position = pcd.position;

                //_self.points_parse_time = new Date().getTime();
                //console.log(_self.points_load_time, _self.frameInfo.scene, _self.frameInfo.frame, "parse pionts ", _self.points_parse_time - _self.create_time, "ms");
                _self._radar_points_raw = position;

                // add one box to calibrate radar with lidar
                _self.radar_box = _self.createRadarBox();

                // install callback for box changing
                _self.radar_box.on_box_changed = ()=>{
                    _self.move_radar(_self.radar_box);
                };

                //position = _self.transformPointsByOffset(position);
                position = _self.move_radar_points(_self.radar_box);
                let mesh = _self.buildRadarPointsGeometry(position);
                _self.radar_points = mesh;
                //_self.points_backup = mesh;

                _self._afterPreload();

            },

            // on progress,
            function(){},

            // on error
            function(){
                //error
                console.log("load radar failed.");
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
        console.log(`radar ${this.radarname} preloaded`);
        if (this.on_preload_finished){
            this.on_preload_finished();
        }                
        if (this.go_cmd_received){
            this.go(this.webglScene, this.on_go_finished);
        }
    };

    this.createRadarBox = function(){
        if (this.sceneMeta.calib.radar && this.sceneMeta.calib.radar[this.name]){
            return this.world.annotation.createCuboid(
                {
                    x: this.sceneMeta.calib.radar[this.name].translation[0] + this.coordinatesOffset[0],
                    y: this.sceneMeta.calib.radar[this.name].translation[1] + this.coordinatesOffset[1],
                    z: this.sceneMeta.calib.radar[this.name].translation[2] + this.coordinatesOffset[2],
                }, 
                {x:1,y:1, z:1}, 
                {
                    x: this.sceneMeta.calib.radar[this.name].rotation[0],
                    y: this.sceneMeta.calib.radar[this.name].rotation[1],
                    z: this.sceneMeta.calib.radar[this.name].rotation[2],
                }, 
                "radar", 
                this.name);
        
        }else {
            return this.world.annotation.createCuboid(
                {x: this.coordinatesOffset[0],
                 y: this.coordinatesOffset[1],
                 z: this.coordinatesOffset[2]}, 
                {x:1,y:1, z:1}, 
                {x:0,y:0,z:0}, 
                "radar", 
                this.name);
        }
    };

    this.buildRadarPointsGeometry = function(position){
        // build geometry
        let geometry = new THREE.BufferGeometry();
        if ( position.length > 0 ) 
            geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
        
        let pointColor = [1.0, 0.0, 0.0];
        if (this.sceneMeta.calib.radar && this.sceneMeta.calib.radar[this.name] && this.sceneMeta.calib.radar[this.name].color){
            pointColor = this.sceneMeta.calib.radar[this.name].color;
        }
        
        let color=[];
        for (var i =0; i< position.length; i+=3){

            color.push(pointColor[0]);
            color.push(pointColor[1]);
            color.push(pointColor[2]);
        }

        geometry.addAttribute( 'color', new THREE.Float32BufferAttribute(color, 3 ) );

        geometry.computeBoundingSphere();
        // build material
        let material = new THREE.PointsMaterial( { size: 4, vertexColors: THREE.VertexColors } );
        //material.size = 2;
        material.sizeAttenuation = false;

        // build mesh

        let mesh = new THREE.Points( geometry, material );                        
        mesh.name = "radar";
        return mesh;
    };


    this.move_radar_points = function(box){
        let trans = euler_angle_to_rotate_matrix_3by3(box.rotation);
        let points = this._radar_points_raw;
        let rotated_points = matmul(trans, points, 3);
        let translation=[box.position.x, box.position.y, box.position.z];
        let translated_points = rotated_points.map((p,i)=>{
            return p + translation[i % 3];
        });
        return translated_points;
    };

    this.move_radar= function(box){

        let translated_points = this.move_radar_points(box);

        let geometry = this.buildRadarPointsGeometry(translated_points);
        
        // remove old points
        this.unload();
        this.removeAllPoints();

        
        this.radar_points = geometry;
        this.golive(this.webglScene);
    };

    this.onRadarBoxChanged = function(){

    };
}

function RadarManager(sceneMeta, world, frameInfo){
    this.radarList = [];

    if (sceneMeta.radar){
        this.radarList = sceneMeta.radar.map(name=>{
            return new Radar(sceneMeta, world, frameInfo, name);
        });
    }

    this.preloaded = function(){
        for (let r in this.radarList){
            if (!this.radarList[r].preloaded)
                return false;
        }
        return true;
    };

    this.go = function(webglScene, on_go_finished){
        this.radarList.forEach(r=>r.go(webglScene, on_go_finished));
    };

    this.preload = function(on_preload_finished){
        this.radarList.forEach(r=>r.preload(on_preload_finished));
    };

    this.unload = function(){
        this.radarList.forEach(r=>r.unload());
    };

    this.deleteAll = function(){
        this.radarList.forEach(r=>r.deleteAll());
    };

    this.getOperableObjects = function(){
        return this.radarList.flatMap(r=>r.getOperableObjects());
    }
};


export {RadarManager}