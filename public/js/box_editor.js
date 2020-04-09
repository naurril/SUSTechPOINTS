import {ProjectiveViewOps}  from "./side_view_op.js"
import { FocusImageContext } from "./image.js";
import { save_annotation } from "./save.js";

function BoxEditor(parentUi, boxEditorManager, viewManager, cfg, boxOp, func_on_box_changed, name){
    
    this.boxEditorManager = boxEditorManager;
    this.parentUi = parentUi;
    this.name=name;
    let uiTmpl = document.getElementById("box-editor-ui-template");
    let tmpui = uiTmpl.content.cloneNode(true);  //sub-views
    
    parentUi.appendChild(tmpui);
    this.ui = parentUi.lastElementChild;
    this.boxInfoUi = this.ui.querySelector("#box-info");

    this.viewManager = viewManager;
    this.boxOp = boxOp;
    this.boxView = this.viewManager.addBoxView(this.ui); //this.editorUi.querySelector("#sub-views")
    this.projectiveViewOps = new ProjectiveViewOps(
        this.ui, //this.editorUi.querySelector("#sub-views"),
        cfg,
        this.boxView.views,
        this.boxOp,
        func_on_box_changed,
        ()=>this.update()
    );

    this.projectiveViewOps.init_view_operation();

    this.focusImageContext = new FocusImageContext(this.ui.querySelector("#focuscanvas"));
    
    this.target = {};
    this.setTarget = function(world, objTrackId){
        this.target = {
            world: world,
            objTrackId: objTrackId,
        }

        this.updateInfo();
    };

    this.tryAttach = function(){
        // find target box, attach to me
        if (this.target){
            let box = this.target.world.findBoxByTrackId(this.target.objTrackId);
            if (box){
                this.attachBox(box);
            }
        }
    };
    
    this._setViewZoomRatio = function(viewIndex, ratio){
        this.boxView.views[viewIndex].zoom_ratio = ratio;
    };

    this.updateViewZoomRatio = function(viewIndex, ratio){
        //this.upate();
        this.boxEditorManager.updateViewZoomRatio(viewIndex, ratio);
    };

    this.box = null;
    this.attachBox = function(box){
        this.ui.style.display="inline-block";

        if (this.box){
            this.box.boxEditor=null;
            console.log("detach box editor");
            //todo de-highlight box
        }

        this.box = null;

        if (box){
            box.boxEditor = this;
            this.box=box;
            this.boxOp.highlightBox(box);
            this.boxView.attachBox(box);
            this.projectiveViewOps.activate(box);
            this.focusImageContext.updateFocusedImageContext(box);

            this.updateInfo();

        }

    };

    this.onBoxChanged=function(){
        
        this.projectiveViewOps.update_view_handle();
        this.focusImageContext.updateFocusedImageContext(this.box);
        this.boxView.onBoxChanged();

        // mark
        delete this.box.annotator; // human annotator doesn't need a name
        this.box.changed = true;
        
        // don't mark world's change flag, for it's hard to clear it.
        

        this.updateInfo();
    }


    this.detach = function(hide){
        if (this.box){
            this.box.boxEditor = null;
            //todo de-highlight box
            this.box = null;
        }

        if (hide)
            this.ui.style.display="none";
    };

    this.update = function(dontRender=false){
        if (this.box === null)
            return;

        this.projectiveViewOps.update_view_handle();
        
        if (this.boxView){
            this.boxView.updateCameraRange(this.box);
            this.boxView.updateCameraPose(this.box);

            if (!dontRender) 
                this.viewManager.render();
        }
        
        // this is not needed somtime
        this.focusImageContext.updateFocusedImageContext(this.box); 

        // should we update info?
        this.updateInfo();
    };


    this.refreshAnnotation = function(){
        if (this.target){
            this.target.world.reloadAnnotation(()=>{
                this.tryAttach();
                this.update();
                this.viewManager.render();
            });
        }
    }

    this.updateInfo = function(){
        let info = ""
        if (this.target.world)
            info  += String(this.target.world.frameInfo.frame);
        
        if (this.box && this.box.annotator)
            info += ","+this.box.annotator;

        if (this.box && this.box.changed)
            info += " *";

        this.boxInfoUi.innerHTML = info;
    };

}


//parentUi  #box-editor-wrapper
function BoxEditorManager(parentUi, viewManager, cfg, boxOp, func_on_box_changed){
    this.viewManager = viewManager;
    this.boxOp = boxOp;
    this.activeIndex = 0;
    this.editorList = [];
    this.clear = function(){
        //hide all editors
        
        this.editorList.map((e)=>e.detach());

        this.activeIndex = 0;

    };

    this.editingTarget = {
        scene: "",
        objTrackId: ""
    };
    
    this.edit = function(data, sceneMeta, objTrackId){
        
        let sceneName = sceneMeta.scene;

        this.editingTarget.scene = sceneName;
        this.editingTarget.objTrackId = objTrackId;

        sceneMeta.frames.forEach((frame)=>{
            let world = data.make_new_world(sceneName, frame);
            let editor = this.addEditor();
            editor.setTarget(world, objTrackId);
            
            data.activate_world(world, ()=>{
                editor.tryAttach();
                //
                this.viewManager.render();
            })
        });
    };
    

    this.parentUi = parentUi;
    
    this._addToolBox = function(){
        let template = document.getElementById("batch-editor-tools-template");
        let tool = template.content.cloneNode(true);
        this.parentUi.appendChild(tool);
        return this.parentUi.lastElementChild;
    };


    this.toolbox = this._addToolBox();

    this.refreshAllAnnotation = function(){
        this.editorList.forEach(e=>e.refreshAnnotation());
    }

    // this should follows addToolBox
    this.parentUi.querySelector("#refresh").onclick = (e)=>{
        this.refreshAllAnnotation();
    };

    // this should follows addToolBox
    this.parentUi.querySelector("#transfer").onclick = ()=>{
        this.boxOp.interpolate_selected_object(this.editingTarget.scene, this.editingTarget.objTrackId, "");
    };

    this.parentUi.querySelector("#save").onclick = ()=>{
        this.editorList.forEach(e=>{
            if (e.box && e.box.changed){

                save_annotation(e.box.world, ()=>{
                    e.box.changed=false;
                    e.updateInfo();
                });
            }
        })
    };


    this.updateViewZoomRatio = function(viewIndex, ratio){
        const dontRender=true;
        this.editorList.forEach(e=>{
            e._setViewZoomRatio(viewIndex, ratio);
            e.update(dontRender); 
        })

        // render all
        this.viewManager.render();
    }

    this.addEditor = function(){
        let editor = this.allocateEditor();
        this.activeIndex += 1;
        return editor;
    };

    this.allocateEditor = function(){
        if (this.activeIndex+1 >= this.editorList.length){
            let editor = new BoxEditor(this.parentUi, this, this.viewManager, cfg, this.boxOp, func_on_box_changed, String(this.activeIndex));
            this.editorList.push(editor);
            return editor;
        }else{
            return this.editorList[this.activeIndex];
        }
    };



}
export {BoxEditor, BoxEditorManager};