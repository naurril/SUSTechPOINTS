

import * as THREE from './lib/three.module.js';
import { PCDLoader } from './lib/PCDLoader.js';
import { matmul, euler_angle_to_rotate_matrix_3by3} from "./util.js"
import { get_obj_cfg_by_type } from './obj_cfg.js';

function Annotation(sceneMeta, world, frameInfo){
    this.world = world;
    this.data = this.world.data;
    this.coordinatesOffset = this.world.coordinatesOffset;
    this.boxes_load_time = 0;
    this.frameInfo = frameInfo;


    this.modified = false;
    this.setModified = function(){this.modified=true;};
    this.resetModified = function(){this.modified=false;};


    this.sort_boxes = function(){
        this.boxes = this.boxes.sort(function(x,y){
            return x.position.y - y.position.y;
        });
    };
    this.findBoxByTrackId = function(id){
        if (this.boxes){
            let box = this.boxes.find(function(x){
                return x.obj_track_id == id;
            });
            return box;
        }

        return null;
    };


    this.preload = function(on_preload_finished){
        this.on_preload_finished = on_preload_finished;
        this.load_annotation((boxes)=>this.proc_annotation(boxes));
    };

    

    this.loaded = false;
    this.go_cmd_received = false;
    this.webglScene = null;
    this.on_go_finished = null;
    this.go = function(webglScene, on_go_finished){
        this.webglScene = webglScene;

        if (this.preloaded){

            this.boxes.forEach(b=>this.webglScene.add(b));
            this.loaded = true;

            if (on_go_finished)
                on_go_finished();
        } else {
            this.go_cmd_received = true;
            this.on_go_finished = on_go_finished;
        }
    };


    // internal funcs below
    this._afterPreload = function(){
        this.preloaded = true;
        console.log("annotation preloaded");

        if (this.on_preload_finished){
            this.on_preload_finished();
        }                
        if (this.go_cmd_received){
            this.go(this.webglScene, this.on_go_finished);
        }
    };


    this.unload = function(){
        if (this.boxes){
            this.boxes.forEach((b)=>{
                this.webglScene.remove(b);

                if (b.boxEditor)
                    b.boxEditor.detach();
            });
        }
    };

    this.deleteAll = function(){
        this.remove_all_boxes();
    };
    this.toBoxAnnotations = function(){
        return this.boxes.map(function(b){
            //var vertices = psr_to_xyz(b.position, b.scale, b.rotation);
            let ann = {
                psr: {
                    position:b.getTruePosition(),
                    scale:b.scale,
                    rotation:{
                        x:b.rotation.x,
                        y:b.rotation.y,
                        z:b.rotation.z,
                    },
                },
                obj_type: b.obj_type,
                obj_id: String(b.obj_track_id),
                //vertices: vertices,
            };

            if (b.annotator)
                ann.annotator = b.annotator;

            if (b.follows)
                ann.follows = b.follows;
            return ann;
        });
    };


    this.ann_to_vector = function(box){
        let pos = box.getTruePosition();
        return [
            pos.x,
            pos.y,
            pos.z,
            box.rotation.x,
            box.rotation.y,
            box.rotation.z,

            box.scale.x,
            box.scale.y,
            box.scale.z,
        ];
    };

    this.vector_to_ann = function(v){
        return {
            position:{
                x:v[0] + this.coordinatesOffset[0],
                y:v[1] + this.coordinatesOffset[1],
                z:v[2] + this.coordinatesOffset[2],
            },

           
            rotation:{
                x:v[3],
                y:v[4],
                z:v[5],
            },

            scale:{
                x:v[6],
                y:v[7],
                z:v[8],
            },

        };
    };

    this.remove_all_boxes = function(){
        if (this.boxes){
            this.boxes.forEach((b)=>{
                //this.webglScene.remove(b);
                this.world.data.dbg.free();
                b.geometry.dispose();
                b.material.dispose();
                b.world = null;
                b.boxEditor = null;
            });

            this.boxes = [];
        }
        else{
            console.error("destroy empty world!")
        }
    };

    this.new_bbox_cube=function(color){

        var h = 0.5;
        
        var body = [
            //top
            -h,h,h,  h,h,h,
            h,h,h,   h,-h,h,
            h,-h,h,  -h,-h,h,
            -h,-h,h, -h, h, h, 

            //botom
            -h,h,-h,  h,h,-h,
            h,h,-h,   h,-h,-h,
            h,-h,-h,  -h,-h,-h,
            -h,-h,-h, -h, h, -h, 

            // vertical lines
            -h,h,h, -h,h,-h,
            h,h,h,   h,h,-h,
            h,-h,h,  h,-h,-h,
            -h,-h,h, -h,-h,-h,

            //direction
            0,   0,  h+0.1,  h, 0, h+0.1,
            h/2, -h, h+0.1,  h, 0, h+0.1,
            h/2,  h, h+0.1,  h, 0, h+0.1,

            //side direction
            // h, h/2, h,  h, h, 0,
            // h, h/2, -h,  h, h, 0,
            // h, 0, 0,  h, h, 0,
            
        ];
        

        this.world.data.dbg.alloc();

        var bbox = new THREE.BufferGeometry();
        bbox.addAttribute( 'position', new THREE.Float32BufferAttribute(body, 3 ) );
        
        if (!color){
            color = 0x00ff00;
        }

        /*
        https://threejs.org/docs/index.html#api/en/materials/LineBasicMaterial
        linewidth is 1, regardless of set value.
        */

        
        var material = new THREE.LineBasicMaterial( { color: color, linewidth: 1, opacity: this.data.config.box_opacity, transparent: true } );
        var box = new THREE.LineSegments( bbox, material );
        
        box.scale.x=1.8;
        box.scale.y=4.5;
        box.scale.z=1.5;
        box.name="bbox";
        box.obj_type="car";                

        //box.computeLineDistances();
        


        return box;
    };

    this.createCuboid = function(pos, scale, rotation, obj_type, track_id){
        let mesh = this.new_bbox_cube(parseInt("0x"+get_obj_cfg_by_type(obj_type).color.slice(1)));
        mesh.position.x = pos.x;
        mesh.position.y = pos.y;
        mesh.position.z = pos.z;

        mesh.scale.x = scale.x;
        mesh.scale.y = scale.y;
        mesh.scale.z = scale.z;

        mesh.rotation.x = rotation.x;
        mesh.rotation.y = rotation.y;
        mesh.rotation.z = rotation.z;

        mesh.obj_track_id = track_id;  //tracking id
        mesh.obj_type = obj_type;

        mesh.obj_local_id =  this.get_new_box_local_id();

        mesh.world = this.world;
        mesh.getTruePosition = function(){
            return {
                x: this.position.x-this.world.coordinatesOffset[0],
                y: this.position.y-this.world.coordinatesOffset[1],
                z: this.position.z-this.world.coordinatesOffset[2]
            };
        };

        return mesh;
    };
    /*
     pos:  offset position, after transformed
    */

    this.add_box=function(pos, scale, rotation, obj_type, track_id){

        let mesh = this.createCuboid(pos, scale, rotation, obj_type, track_id)

        this.boxes.push(mesh);
        this.sort_boxes();
        return mesh;
    };

    this.load_box = function(box){
        if (this.everythingDone)
            this.webglScene.add(box);
    };

    this.unload_box = function(box){
        if (this.everythingDone)
            this.webglScene.remove(box);
    };

    this.remove_box=function(box){
        this.world.data.dbg.free();
        box.geometry.dispose();
        box.material.dispose();
        //selected_box.dispose();
        this.boxes = this.boxes.filter(function(x){return x !=box;});
    };

    this.set_box_opacity=function(box_opacity){
        this.boxes.forEach(function(x){
            x.material.opacity = box_opacity;
        });
    };

    this.translate_box_position=function(pos, theta, axis, delta){
        switch (axis){
            case 'x':
                pos.x += delta*Math.cos(theta);
                pos.y += delta*Math.sin(theta);
                break;
            case 'y':
                pos.x += delta*Math.cos(Math.PI/2 + theta);
                pos.y += delta*Math.sin(Math.PI/2 + theta);  
                break;
            case 'z':
                pos.z += delta;
                break;
    
        }
    };

    


    this.proc_annotation = function(boxes){
        
        let ret = this.transformBoxesByOffset(boxes);
        //var boxes = JSON.parse(this.responseText);
        //console.log(ret);
        this.boxes = this.createBoxes(ret);  //create in future world                        

        this.boxes_load_time = new Date().getTime();
        console.log(this.boxes_load_time, this.frameInfo.scene, this.frameInfo.frame, "loaded boxes ", this.boxes_load_time - this.create_time, "ms");
        
        this.sort_boxes();

        this._afterPreload();
    };

    this.load_annotation=function(on_load){
        if (this.data.cfg.disableLabels){
            on_load([]);
        }else {
            var xhr = new XMLHttpRequest();
            // we defined the xhr
            var _self = this;
            xhr.onreadystatechange = function () {
                if (this.readyState != 4) return;
            
                if (this.status == 200) {
                    let ann = _self.frameInfo.anno_to_boxes(this.responseText);
                    on_load(ann);
                }
            
                // end of state change: it can be after some time (async)
            };
            
            xhr.open('GET', "/load_annotation"+"?scene="+this.frameInfo.scene+"&frame="+this.frameInfo.frame, true);
            xhr.send();
        }
    };

    this.reloadAnnotation=function(done){
        this.load_annotation(ann=>{
            this.reapplyAnnotation(ann, done);
        });
    };

    
    this.reapplyAnnotation = function(boxes, done){
            // these boxes haven't attached a world
            boxes = this.transformBoxesByOffset(boxes);

            // mark all old boxes
            this.boxes.forEach(b=>{b.delete=true;});

            let pendingBoxList=[];

            boxes.forEach(nb=>{  // nb is annotation format, not a true box
                let old_box = this.boxes.find(function(x){
                    return x.obj_track_id == nb.obj_id;
                });

                if (old_box){
                    // found
                    // update psr
                    delete old_box.delete;  // unmark delete flag
                    old_box.position.set(nb.psr.position.x, nb.psr.position.y, nb.psr.position.z);
                    old_box.scale.set(nb.psr.scale.x, nb.psr.scale.y, nb.psr.scale.z);
                    old_box.rotation.set(nb.psr.rotation.x, nb.psr.rotation.y, nb.psr.rotation.z); 
                    
                    old_box.annotator = nb.annotator;
                    old_box.changed=false; // clearn changed flag.
                    
                }else{
                    // not found
                    let box=this.createOneBoxByAnn(nb);
                    pendingBoxList.push(box);
                }
            });

            // delete removed
            let toBeDelBoxes = this.boxes.filter(b=>b.delete);
            toBeDelBoxes.forEach(b=>{
                if (b.boxEditor)
                    b.boxEditor.detach();

                if (this.loaded)
                    this.webglScene.remove(b);
                this.remove_box(b);
            })

            pendingBoxList.forEach(b=>{
                this.boxes.push(b);                
            })


            //todo, restore point color
            //todo, update imagecontext, selected box, ...
            //refer to normal delete operation
            // re-color again
            this.world.lidar.recolor_all_points(); 

            // add to scene if current world is active.
            if (this.loaded){
                // add new boxes
                pendingBoxList.forEach(b=>{
                    this.webglScene.add(b);                    
                })
            }

            if (done)
                done();
            
        }

    this.createOneBoxByAnn = function(annotation){
        let b = annotation;
        
        let mesh = this.createCuboid(b.psr.position,
            b.psr.scale, 
            b.psr.rotation,
            b.obj_type,
            b.obj_id);

        if (b.annotator){
            mesh.annotator = b.annotator;
        }

        if (b.follows)
            mesh.follows = b.follows;
        
        return mesh;  
    };

    this.createBoxes = function(annotations){
        return annotations.map((b)=>{
            return this.createOneBoxByAnn(b);
        });
    };

    this.transformBoxesByOffset = function(boxes){
        boxes.forEach((b)=>{
            b.psr.position.x += this.coordinatesOffset[0];
            b.psr.position.y += this.coordinatesOffset[1];
            b.psr.position.z += this.coordinatesOffset[2];
        })
        return boxes;
    };

    this.box_local_id = 0;
    this.get_new_box_local_id=function(){
        var ret = this.box_local_id;
        this.box_local_id+=1;
        return ret;
    };
}


export{Annotation}