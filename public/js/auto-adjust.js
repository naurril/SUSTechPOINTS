
import {selected_box, on_box_changed, select_bbox, scene, floatLabelManager} from "./main.js"
import {get_mouse_location_in_world} from "./mouse.js"
import {data} from "./data.js"
import {header} from "./header.js"
import {save_annotation} from "./save.js"

var marked_object = null;

// mark bbox, which will be used as reference-bbox of an object.
function mark_bbox(){
    if (selected_box){
        marked_object = {
            frame: data.world.file_info.frame,
            scene: data.world.file_info.scene,
            obj_type: selected_box.obj_type,
            obj_track_id: selected_box.obj_track_id,
            position: selected_box.position,  //todo, copy x,y,z, not object
            scale: selected_box.scale,
            rotation: selected_box.rotation,
        }

        console.log(marked_object);

        header.set_ref_obj(marked_object);
    }
}

function paste_bbox(pos){

    if (!pos)
       pos = marked_object.position;
    else
       pos.z = marked_object.position.z;

    var box = data.world.add_box(pos, marked_object.scale, marked_object.rotation, marked_object.obj_type, marked_object.obj_track_id);

    scene.add(box);

    floatLabelManager.add_label(box, function(){select_bbox(box);});
    
    select_bbox(box);
    
    return box;
}


function auto_adjust_bbox(done){

    save_annotation(function(){
        do_adjust();
    });

    function do_adjust(){
        console.log("auto adjust highlighted bbox");

        var xhr = new XMLHttpRequest();
        // we defined the xhr
        var _self = this;
        xhr.onreadystatechange = function () {
            if (this.readyState != 4) return;
        
            if (this.status == 200) {
                console.log(this.responseText)
                console.log(selected_box.position);
                console.log(selected_box.rotation);


                var trans_mat = JSON.parse(this.responseText);

                var rotation = Math.atan2(trans_mat[4], trans_mat[0]) + selected_box.rotation.z;
                var transform = {
                    x: -trans_mat[3],
                    y: -trans_mat[7],
                    z: -trans_mat[11],
                }

                
                
                /*
                cos  sin    x 
                -sin cos    y 
                */
                var new_pos = {
                    x: Math.cos(-rotation) * transform.x + Math.sin(-rotation) * transform.y,
                    y: -Math.sin(-rotation) * transform.x + Math.cos(-rotation) * transform.y,
                    z: transform.z,
                };


                selected_box.position.x += new_pos.x;
                selected_box.position.y += new_pos.y;
                selected_box.position.z += new_pos.z;
                
                

                selected_box.scale.x = marked_object.scale.x;
                selected_box.scale.y = marked_object.scale.y;
                selected_box.scale.z = marked_object.scale.z;

                selected_box.rotation.z -= Math.atan2(trans_mat[4], trans_mat[0]);

                console.log(selected_box.position);
                console.log(selected_box.rotation);

                on_box_changed(selected_box);
        
                header.mark_changed_flag();

                if (done){
                    done();
                }
            }
        
            // end of state change: it can be after some time (async)
        };
        
        xhr.open('GET', 
                "/auto_adjust"+"?scene="+marked_object.scene + "&"+
                            "ref_frame=" + marked_object.frame + "&" +
                            "object_id=" + marked_object.obj_track_id + "&" +                           
                            "adj_frame=" + data.world.file_info.frame, 
                true);
        xhr.send();
    }
}

function smart_paste(){
    if (!selected_box){
        paste_bbox(get_mouse_location_in_world());
        auto_adjust_bbox(function(){
            save_annotation();
        });
    }
    else{
        auto_adjust_bbox(function(){
            save_annotation();
        });
    }

    header.mark_changed_flag();
}


export {mark_bbox, paste_bbox, auto_adjust_bbox, smart_paste}