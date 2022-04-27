


import { Editor } from "./editor.js";
import { checkScene } from "./error_check.js";
import {logger} from "./log.js"




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


var saveDelayTimer = null;
var pendingSaveList = [];

function saveWorldList(worldList){

    //pendingSaveList = pendingSaveList.concat(worldList);

    worldList.forEach(w=>{
        if (!pendingSaveList.includes(w))
            pendingSaveList.push(w);
    });

    if (saveDelayTimer)
    {
        clearTimeout(saveDelayTimer);
    }
    
    saveDelayTimer = setTimeout(()=>{
            
        logger.log("save delay expired.");

        //pandingSaveList will be cleared soon.
        let scene = pendingSaveList[0].frameInfo.scene;
        

        doSaveWorldList(pendingSaveList, ()=>{
            editor.header.updateModifiedStatus();

            checkScene(scene);
        });

        //reset

        saveDelayTimer = null;
        pendingSaveList = [];

        
    }, 

    500);
}


function doSaveWorldList(worldList, done)
{
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
            
            worldList.forEach(w=>{
                w.annotation.resetModified();
            })

            logger.log(`saved: ${worldList[0].frameInfo.scene}: ${worldList.reduce((a,b)=>a+" "+b.frameInfo.frame, "")}`);

            if(done){
                done();
            }
        }
        else{
            window.editor.infoBox.show("Error", `save failed, status : ${this.status}`);
        }
        
    
        // end of state change: it can be after some time (async)
    };

    var b = JSON.stringify(ann);
    //console.log(b);
    xhr.send(b);
}

// function saveWorld(world, done){
//     if (world.data.cfg.disableLabels){
//         logger.log("labels not loaded, save action is prohibitted.")
//         return;
//     }

//     console.log(world.annotation.boxes.length, "boxes");
//     let bbox_annotations = world.annotation.toBoxAnnotations();

//     var xhr = new XMLHttpRequest();
//     xhr.open("POST", "/saveworld" +"?scene="+world.frameInfo.scene+"&frame="+world.frameInfo.frame, true);
//     xhr.setRequestHeader('Content-Type', 'application/json');

//     xhr.onreadystatechange = function () {
//         if (this.readyState != 4) return;
    
//         if (this.status == 200) {
//             logger.log(`saved: ${world}`);
//             world.annotation.resetModified();

//             //reload obj-ids of the scene
//             //todo: this shall be moved to done
//             //load_obj_ids_of_scene(world.frameInfo.scene);

//             if(done){
//                 done();
//             }

            
            
//         }
    
//         // end of state change: it can be after some time (async)
//     };

//     var b = JSON.stringify(bbox_annotations);
//     //console.log(b);
//     xhr.send(b);
// }


export {saveWorldList, reloadWorldList}