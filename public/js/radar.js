import * as THREE from './lib/three.module.js';
import { PCDLoader } from './lib/PCDLoader.js';
import { matmul, euler_angle_to_rotate_matrix_3by3} from "./util.js"

function Radar(sceneMeta, world, frameInfo, radarName){
    this.world = world;
    this.frameInfo = frameInfo;    
    this.name = radarName;
    this.sceneMeta = sceneMeta;
    this.coordinatesOffset = world.coordinatesOffset;

    this.showPointsOnly = false;
    this.showRadarBoxFlag = false;
    this.cssStyleSelector = this.sceneMeta.calib.radar[this.name].cssstyleselector;
    this.color = this.sceneMeta.calib.radar[this.name].color;
    this.velocityScale = 0.3;

    if (!this.color){
        this.color = [1.0, 0.0, 0.0];
    }

    this._radar_points_raw = null;  // read from file, centered at 0
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

                if (!this.showPointsOnly)
                    this.elements.arrows.forEach(a=>this.webglScene.add(a));

                if (this.showRadarBoxFlag)
                    this.webglScene.add(this.radar_box);
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

    this.showRadarBox = function(){
        this.showRadarBoxFlag = true;
        this.webglScene.add(this.radar_box);
    };

    this.hideRadarBox = function(){
        this.showRadarBoxFlag = false;
        this.webglScene.remove(this.radar_box);
    };

    this.get_unoffset_radar_points = function(){
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
                this.webglScene.remove(this.radar_box);
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

        if (!keep_box && this.radar_box){
            this.world.data.dbg.free();
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
                //var velocity = pcd.velocity;
                // velocity is a vector anchored at position, 
                // we translate them into position of the vector head
                var velocity = position.map((p,i)=>pcd.velocity[i]+pcd.position[i]);

                // scale velocity
                // velocity = velocity.map(v=>v*_self.velocityScale);

                //_self.points_parse_time = new Date().getTime();
                //console.log(_self.points_load_time, _self.frameInfo.scene, _self.frameInfo.frame, "parse pionts ", _self.points_parse_time - _self.create_time, "ms");
                _self._radar_points_raw = position;
                _self._radar_velocity_raw = velocity;

                // add one box to calibrate radar with lidar
                _self.radar_box = _self.createRadarBox();

                // install callback for box changing
                _self.radar_box.on_box_changed = ()=>{
                    _self.move_radar(_self.radar_box);
                };

                //position = _self.transformPointsByOffset(position);
                position = _self.move_radar_points(_self.radar_box);
                velocity = _self.move_radar_velocity(_self.radar_box);
                let elements = _self.buildRadarGeometry(position, velocity);
                
                _self.elements = elements;
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
        let pointSize = this.sceneMeta.calib.radar[this.name].point_size;
        if (!pointSize)
            pointSize = 2;

        let material = new THREE.PointsMaterial( { size: pointSize, vertexColors: THREE.VertexColors } );
        //material.size = 2;
        material.sizeAttenuation = false;

        // build mesh
        let mesh = new THREE.Points( geometry, material );                        
        mesh.name = "radar";

        return mesh;
    };

    this.buildArrow = function(position, velocity){
        var h = 0.5;
        
        let p=position;
        let v=velocity;

        var body = [
            p[0],p[1],p[2],
            v[0],v[1],v[2],
        ];
        

        this.world.data.dbg.alloc();
        var geo = new THREE.BufferGeometry();
        geo.addAttribute( 'position', new THREE.Float32BufferAttribute(body, 3 ) );
        

        let color = this.color.map(c=>Math.round(c*255)).reduce((a,b)=>a*256+b, 0);

        var material = new THREE.LineBasicMaterial( { color: color, linewidth: 1, opacity: 1, transparent: true } );
        var arrow = new THREE.LineSegments( geo, material );
        return arrow;
    }

    this.buildRadarGeometry = function(position, velocity){
        let points = this.buildPoints(position);

        let arrows = [];
        
        if (!this.showPointsOnly)
        {
            for (let i = 0; i<position.length/3; i++)
            {
                let arr = this.buildArrow(position.slice(i*3, i*3+3), velocity.slice(i*3, i*3+3));
                arrows.push(arr);
            }
        }
        
        return {
            points: points, 
            arrows: arrows
        };
    };

    this.move_points = function(points, box){
        let trans = euler_angle_to_rotate_matrix_3by3(box.rotation);        
        let rotated_points = matmul(trans, points, 3);
        let translation=[box.position.x, box.position.y, box.position.z];
        let translated_points = rotated_points.map((p,i)=>{
            return p + translation[i % 3];
        });
        return translated_points;
    };

    this.move_radar_points = function(box){        
        return this.move_points(this._radar_points_raw, box);
    };

    this.move_radar_velocity = function(box){
        return this.move_points(this._radar_velocity_raw, box);
    }

    this.move_radar= function(box){

        let translated_points = this.move_radar_points(box);
        let translated_velocity = this.move_radar_velocity(box);

        let elements = this.buildRadarGeometry(translated_points, translated_velocity);
        
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

function RadarManager(sceneMeta, world, frameInfo){
    this.radarList = [];

    if (world.data.cfg.enableRadar && sceneMeta.radar){
        let radars = [];
        
        for (let r in sceneMeta.calib.radar){
            if (!sceneMeta.calib.radar[r].disable)
                radars.push(r);
        }

        this.radarList = radars.map(name=>{
            return new Radar(sceneMeta, world, frameInfo, name);
        });
    }

    this.getAllBoxes = function()
    {
        if (this.showRadarBoxFlag)
        {
            return this.radarList.map(r=>r.radar_box);
        }
        else
        {
            return [];
        }
    };

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
    };

    this.showRadarBoxFlag = false;
    this.showRadarBox = function(){
        this.showRadarBoxFlag = true;
        this.radarList.forEach(r=>r.showRadarBox());
    };

    this.hideRadarBox = function(){
        this.showRadarBoxFlag = false;
        this.radarList.forEach(r=>r.hideRadarBox());
    }
};


export {RadarManager}