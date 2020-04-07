import {ProjectiveViewOps}  from "./side_view_op.js"
import { FocusImageContext } from "./image.js";

function BoxEditor(parentUi, viewManager, cfg, boxOp, func_on_box_changed, name){
    
    this.parentUi = parentUi;
    this.name=name;
    let uiTmpl = document.getElementById("box-editor-ui-template");
    let tmpui = uiTmpl.content.cloneNode(true);  //sub-views
    
    parentUi.appendChild(tmpui);
    this.ui = parentUi.lastElementChild;

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
    
    
    this.box = null;
    this.attachBox = function(box){
        this.ui.style.display="inline-block";

        if (this.box){
            this.box.boxEditor=null;
            console.log("detach box editor");
        }

        this.box = null;

        if (box){
            box.boxEditor = this;
            this.box=box;

            this.boxView.attachBox(box);
            this.projectiveViewOps.activate(box);
            this.focusImageContext.updateFocusedImageContext(box);
        }

    };

    this.onBoxChanged=function(){
        
        this.projectiveViewOps.update_view_handle();
        this.focusImageContext.updateFocusedImageContext(this.box);
        this.boxView.onBoxChanged();
    }

    this.detach = function(){
        if (this.box){
            this.box.boxEditor = null;
            this.box = null;
        }

        this.ui.style.display="none";
    };

    this.update = function(){
        if (this.box === null)
            return;

        this.projectiveViewOps.update_view_handle();
        
        if (this.boxView){
            this.boxView.updateCameraRange(this.box);
            this.viewManager.render();
        }            
    };

}

function BoxEditorManager(parentUi, viewManager, cfg, boxOp, func_on_box_changed){
    this.activeIndex = 0;
    this.editorList = [];
    this.clear = function(){
        //hide all editors
        
        this.editorList.map((e)=>e.detach());

        this.activeIndex = 0;

    };
    

    this._addToolBox = function(){
        let template = document.getElementById("batch-editor-tools-template");
        let tool = template.content.cloneNode(true);
        parentUi.appendChild(tool);
        return parentUi.lastElementChild;
    };

    this.toolbox = this._addToolBox();
    
    this.addBox = function(box){
        let editor = this.allocateEditor();
        this.activeIndex += 1;
        editor.attachBox(box);
    };

    this.allocateEditor = function(){
        if (this.activeIndex+1 >= this.editorList.length){
            let editor = new BoxEditor(parentUi, viewManager, cfg, boxOp, func_on_box_changed, String(this.activeIndex));
            this.editorList.push(editor);
            return editor;
        }else{
            return this.editorList[this.activeIndex];
        }
    };
}
export {BoxEditor, BoxEditorManager};