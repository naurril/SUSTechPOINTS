

import {load_obj_ids_of_scene} from "./obj_id_list.js"


function save_annotation(world, done){
    var bbox_annotations=[];
    console.log(world.boxes.length, "boxes");
    world.boxes.forEach(function(b){
        //var vertices = psr_to_xyz(b.position, b.scale, b.rotation);

        var b = {
            psr: {
                position:b.getTruePosition(),
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
            obj_id: String(b.obj_track_id),
            //vertices: vertices,
        };

        bbox_annotations.push(b);
        
    });

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/save" +"?scene="+world.frameInfo.scene+"&frame="+world.frameInfo.frame, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            console.log("save annotation finished.");
            if(done){
                done();
            }

            //reload obj-ids of the scene
            load_obj_ids_of_scene(world.frameInfo.scene);
        }
    
        // end of state change: it can be after some time (async)
    };

    var b = JSON.stringify(bbox_annotations);
    //console.log(b);
    xhr.send(b);
}


export {save_annotation}