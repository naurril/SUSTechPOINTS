



import { checkScene } from "./error_check.js";
import { jsonrpc } from "./jsonrpc.js";
import {logger} from "./log.js"


var saveDelayTimer = null;
var pendingSaveList = [];


function reloadWorldList(worldList, done){

    // delay 500ms, since saving may be in progress.
    setTimeout(()=>{

        let para = worldList.map(w=>{
            return {
                //todo: we could add an id, so as to associate world easily
                scene: w.frameInfo.scene, 
                frame: w.frameInfo.frame,
            };
        });    
        jsonrpc("/api/loadworldlist", 'POST', para).then(anns=>{
            // load annotations
            anns.forEach(a=>{
                let world = worldList.find(w=>{
                    return (w.frameInfo.scene === a.scene && 
                            w.frameInfo.frame === a.frame);
                    });
                if (world){

                    world.annotation.reapplyAnnotation(a.annotation.objs?a.annotation.objs:a.annotation);
                }
                else{
                    console.error("bug?");
                }
                
            });

            if (done)
                done();
        });
    }, 

    500);

}



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
            
        //pandingSaveList will be cleared soon.
        let scene = pendingSaveList[0].frameInfo.scene;
        

        doSaveWorldList(pendingSaveList, ()=>{
            window.editor.header.updateModifiedStatus();

            if (window.editor.editorCfg.autoCheckScene){
                checkScene(scene);
            }
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
            objs: w.annotation.toBoxAnnotations(),
        };
    })

    jsonrpc("/api/saveworldlist", 'POST', ann).then(ret=>{
        worldList.forEach(w=>{
            w.annotation.resetModified();
        })

        logger.log(`saved: ${worldList[0].frameInfo.scene}: ${worldList.reduce((a,b)=>a+" "+b.frameInfo.frame, "")}`);

        if(done){
            done();
        }

        return true;
    }).catch(e=>{
        window.editor.infoBox.show("Error", "save failed");
    });
    
}


export {saveWorldList, reloadWorldList}