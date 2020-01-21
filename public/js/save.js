
import {psr_to_xyz} from "./util.js"
import {data} from "./data.js"
import {load_obj_ids_of_scene} from "./obj_id_list.js"
import {header} from "./header.js"

function save_annotation(done){
    var bbox_annotations=[];
    console.log(data.world.boxes.length, "boxes");
    data.world.boxes.forEach(function(b){
        var vertices = psr_to_xyz(b.position, b.scale, b.rotation);

        var b = {
            psr: {
                position:b.position,
                scale:b.scale,
                rotation:{
                    x:b.rotation.x,
                    y:b.rotation.y,
                    z:b.rotation.z,
                },
            },
            
            /*
            position:b.position,
            scale:b.scale,
            rotation:{
                x:b.rotation.x,
                y:b.rotation.y,
                z:b.rotation.z,
            },
            */
           
            obj_type: b.obj_type,
            obj_id: b.obj_track_id,
            vertices: vertices,
        };

        bbox_annotations.push(b);
        
    });

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/save" +"?scene="+data.world.file_info.scene+"&frame="+data.world.file_info.frame, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            console.log("save annotation finished.");
            if(done){
                done();
            }

            //reload obj-ids of the scene
            load_obj_ids_of_scene(data.world.file_info.scene);
        }
    
        // end of state change: it can be after some time (async)
    };

    var b = JSON.stringify(bbox_annotations);
    //console.log(b);
    xhr.send(b);

    // unmark changed flag
    //document.getElementById("frame").innerHTML = data.world.file_info.scene+"/"+data.world.file_info.frame;
    header.unmark_changed_flag();
}


export {save_annotation}