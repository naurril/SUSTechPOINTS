
import {get_mouse_location_in_world} from "./mouse.js"
import {data} from "./data.js"
import {header} from "./header.js"
import {save_annotation} from "./save.js"

var marked_object = null;

// mark bbox, which will be used as reference-bbox of an object.
function mark_bbox(box){
    if (box){
        marked_object = {
            frame: data.world.file_info.frame,
            scene: data.world.file_info.scene,
            obj_type: box.obj_type,
            obj_track_id: box.obj_track_id,
            position: box.position,  //todo, copy x,y,z, not object
            scale: box.scale,
            rotation: box.rotation,
        }

        console.log(marked_object);

        header.set_ref_obj(marked_object);
    }
}

function paste_bbox(pos, add_box_on_pos){

    if (!pos)
       pos = marked_object.position;
    else
       pos.z = marked_object.position.z;

    return  add_box_on_pos(pos);    
}


function auto_adjust_bbox(box, done, on_box_changed){

    save_annotation(function(){
        do_adjust(box, on_box_changed);
    });

    function do_adjust(box, on_box_changed){
        console.log("auto adjust highlighted bbox");

        var xhr = new XMLHttpRequest();
        // we defined the xhr
        var _self = this;
        xhr.onreadystatechange = function () {
            if (this.readyState != 4) return;
        
            if (this.status == 200) {
                console.log(this.responseText)
                console.log(box.position);
                console.log(box.rotation);


                var trans_mat = JSON.parse(this.responseText);

                var rotation = Math.atan2(trans_mat[4], trans_mat[0]) + box.rotation.z;
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


                box.position.x += new_pos.x;
                box.position.y += new_pos.y;
                box.position.z += new_pos.z;
                
                

                box.scale.x = marked_object.scale.x;
                box.scale.y = marked_object.scale.y;
                box.scale.z = marked_object.scale.z;

                box.rotation.z -= Math.atan2(trans_mat[4], trans_mat[0]);

                console.log(box.position);
                console.log(box.rotation);

                on_box_changed(box);
        
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

function smart_paste(selected_box, add_box_on_pos, save_annotation, on_box_changed){
    var box = selected_box;
    if (!box){
        box = paste_bbox(get_mouse_location_in_world(), add_box_on_pos);
    }
    
    auto_adjust_bbox(box,
            function(){save_annotation();},
            on_box_changed);

    header.mark_changed_flag();
}


export {mark_bbox, paste_bbox, auto_adjust_bbox, smart_paste}