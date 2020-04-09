

import {load_obj_ids_of_scene} from "./obj_id_list.js"

function reloadWorldList(worldList, done){
    var xhr = new XMLHttpRequest();
        // we defined the xhr
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            done(JSON.parse(this.responseText));
        }
    
        // end of state change: it can be after some time (async)
    };
    
    xhr.open('POST', "/loadworldlist", true);

    let para = worldList.map(w=>{
        return {
            //todo: we could add an id, so as to associate world easily
            scene: w.frameInfo.scene, 
            frame: w.frameInfo.frame,
        };
    });

    xhr.send(JSON.stringify(para));
}


function saveWorldList(worldList, done){
    console.log(worldList.length, "frames");
    let ann = worldList.map(w=>{
        return {
            scene: w.frameInfo.scene,
            frame: w.frameInfo.frame,
            annotation: w.toBoxAnnotations(),
        };
    })

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/saveworldlist", true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            console.log("save worldlist finished.");
            if(done){
                done();
            }
        }
    
        // end of state change: it can be after some time (async)
    };

    var b = JSON.stringify(ann);
    //console.log(b);
    xhr.send(b);
}


function saveWorld(world, done){
    console.log(world.boxes.length, "boxes");
    let bbox_annotations = world.toBoxAnnotations();

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/saveworld" +"?scene="+world.frameInfo.scene+"&frame="+world.frameInfo.frame, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            console.log("save annotation finished.");
            if(done){
                done();
            }

            //reload obj-ids of the scene
            //this shall be moved to done
            load_obj_ids_of_scene(world.frameInfo.scene);
        }
    
        // end of state change: it can be after some time (async)
    };

    var b = JSON.stringify(bbox_annotations);
    //console.log(b);
    xhr.send(b);
}


export {saveWorld, saveWorldList, reloadWorldList}