

import {load_obj_ids_of_scene} from "./obj_id_list.js"
import {log} from "./log.js"

function reloadWorldList(worldList, done){
    var xhr = new XMLHttpRequest();
        // we defined the xhr
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            let anns = JSON.parse(this.responseText);
        
            // load annotations
            anns.forEach(a=>{
                let world = worldList.find(w=>{
                    return (w.frameInfo.scene == a.scene && 
                            w.frameInfo.frame == a.frame);
                    });
                if (world){
                    world.annotation.reapplyAnnotation(a.annotation);
                }
                else{
                    console.error("bug?");
                }
                
            });

            if (done)
                done();
        }
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

    if (worldList.length>0){
        if (worldList[0].data.cfg.disableLabels){
            console.log("labels not loaded, save action is prohibitted.")
            return;
        }
    }


    console.log(worldList.length, "frames");
    let ann = worldList.map(w=>{
        return {
            scene: w.frameInfo.scene,
            frame: w.frameInfo.frame,
            annotation: w.annotation.toBoxAnnotations(),
        };
    })

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/saveworldlist", true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            
            log.println(`save annotation finished: ${worldList[0].frameInfo.scene}: ${worldList.reduce((a,b)=>a+" "+b.frameInfo.frame, "")}`);

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
    if (world.data.cfg.disableLabels){
        log.println("labels not loaded, save action is prohibitted.")
        return;
    }

    console.log(world.annotation.boxes.length, "boxes");
    let bbox_annotations = world.annotation.toBoxAnnotations();

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/saveworld" +"?scene="+world.frameInfo.scene+"&frame="+world.frameInfo.frame, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            log.println(`save annotation finished: ${world}`);
            if(done){
                done();
            }

            //reload obj-ids of the scene
            //todo: this shall be moved to done
            load_obj_ids_of_scene(world.frameInfo.scene);
        }
    
        // end of state change: it can be after some time (async)
    };

    var b = JSON.stringify(bbox_annotations);
    //console.log(b);
    xhr.send(b);
}


export {saveWorld, saveWorldList, reloadWorldList}