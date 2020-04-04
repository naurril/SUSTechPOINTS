
import {data} from './data.js'


var Header=function(parentUi){
    
    this.boxUi = parentUi.querySelector("#box");
    this.refObjUi = parentUi.querySelector("#ref-obj");
    this.sceneSelectorUi = parentUi.querySelector("#scene-selector");
    this.frameSelectorUi = parentUi.querySelector("#frame-selector");
    this.changedMarkUi = parentUi.querySelector("#changed-mark");

    this.clear_box_info = function(){
        this.boxUi.innerHTML = '';
    };
    
    this.update_box_info = function(box){
        var scale = box.scale;
        var pos = box.position;
        var rotation = box.rotation;
        var points_number = data.world.get_box_points_number(box);

        this.boxUi.innerHTML = "| "+pos.x.toFixed(2) +" "+pos.y.toFixed(2) + " " + pos.z.toFixed(2) + " | " +
                                                    scale.x.toFixed(2) +" "+scale.y.toFixed(2) + " " + scale.z.toFixed(2) + " | " +
                                                    (rotation.x*180/Math.PI).toFixed(2)+" "+(rotation.y*180/Math.PI).toFixed(2)+" "+(rotation.z*180/Math.PI).toFixed(2)+" | " +
                                                    points_number + " ";
    },

    this.set_ref_obj = function(marked_object){
        this.refObjUi.innerHTML="| BoxRef: "+marked_object.scene+"/"+marked_object.frame+": "+marked_object.obj_type+"-"+marked_object.obj_track_id;
    },

    this.set_frame_info =function(scene, frame, on_scene_changed){
        
        if (this.sceneSelectorUi.value != scene){
            this.sceneSelectorUi.value = scene;
            on_scene_changed(scene);
        }

        this.sceneSelectorUi.value = frame;
    },

    this.clear_frame_info = function(scene, frame){

    },
    
    this.unmark_changed_flag = function(){
        this.changedMarkUi.innerText=" ";
        
    },
    
    this.mark_changed_flag = function(){
        this.changedMarkUi.innerText="*";
    }
};


export {Header}