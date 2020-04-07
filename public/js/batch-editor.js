
import {Editor} from "./editor.js"


function BatchEditor(N, editorTemplate, parentDiv, metaData){
    this.parentDiv = parentDiv;
    this.metaData = metaData;
    this.template = editorTemplate;

    this.wrapperTemplate = document.getElementById("template-subeditor-wrapper");

    this.editors = [];

    this.subEditorCfg={
        disableSceneSelector: true,
        //disableFrameSelector: true,
        disableCameraSelector: true,
        disableFastToolbox: true,
        disableMainView: true,
        disableMainImageContext: true,
        disableGrid:true,
        disableRangeCircle:true,
        disableMainViewKeyDown:true
    };
    

    this.start = function(sceneName, objTrackId, startFrame, frameNumber){

        let scene = this.metaData.getScene(sceneName);

        let N = scene.frames.length;
        if (N>15) N=15;  // number of wegbl contexts is limited to 16 by mozilla browsers.
        while (this.editors.length < N){
            let wrapper = this.wrapperTemplate.content.cloneNode(true);
            let editor_ui = this.template.content.cloneNode(true);
            
            parentDiv.appendChild(wrapper); // input parameter is changed after `append`
            parentDiv.lastElementChild.appendChild(editor_ui);        
            let editor = new Editor(parentDiv.lastElementChild.lastElementChild, this.subEditorCfg, metaData)
            editor.run();        
            this.editors.push(editor);
        }


        scene.frames.forEach((f, i)=>{
            if (i < N){
                this.editors[i].load_world(sceneName,f);
                this.editors[i].view_state.autoLock(objTrackId);
            }
        });
        
    }


}


export {BatchEditor}