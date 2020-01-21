
import {data} from './data.js'


var header={

    clear_box_info: function(){
        document.getElementById("box").innerHTML = '';
    },
    
    update_box_info: function(box){
        var scale = box.scale;
        var pos = box.position;
        var rotation = box.rotation;
        var points_number = data.world.get_box_points_number(box);

        document.getElementById("box").innerHTML = "| "+pos.x.toFixed(2) +" "+pos.y.toFixed(2) + " " + pos.z.toFixed(2) + " | " +
                                                    scale.x.toFixed(2) +" "+scale.y.toFixed(2) + " " + scale.z.toFixed(2) + " | " +
                                                    (rotation.x*180/Math.PI).toFixed(2)+" "+(rotation.y*180/Math.PI).toFixed(2)+" "+(rotation.z*180/Math.PI).toFixed(2)+" | " +
                                                    points_number + " ";
    },

    set_ref_obj: function(marked_object){
        document.getElementById("ref-obj").innerHTML="| BoxRef: "+marked_object.scene+"/"+marked_object.frame+": "+marked_object.obj_type+"-"+marked_object.obj_track_id;
    },

    set_frame_info: function(scene, frame, on_scene_changed){
        var e = document.getElementById("scene-selector");

        if (e.value != scene){
            document.getElementById("scene-selector").value = scene;
            on_scene_changed(scene);
        }

        document.getElementById("frame-selector").value = frame;
    },

    clear_frame_info: function(scene, frame){

    },
    
    unmark_changed_flag: function(){
        document.getElementById("changed-mark").innerText=" ";
        
    },
    
    mark_changed_flag: function(){
        document.getElementById("changed-mark").innerText="*";
    }
    
}


export {header}