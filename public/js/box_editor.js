import {ProjectiveViewOps}  from "./side_view_op.js"
import { FocusImageContext } from "./image.js";

function BoxEditor(parentUi, data, viewManager, cfg, boxOp, func_on_box_changed){
    
    this.parentUi = parentUi;

    let uiTmpl = document.getElementById("box-editor-ui-template");
    let tmpui = uiTmpl.content.cloneNode(true);  //sub-views
    
    parentUi.appendChild(tmpui);
    this.ui = parentUi.lastElementChild;

    this.data = data,
    this.viewManager = viewManager;
    this.boxOp = boxOp;
    this.boxView = this.viewManager.addBoxView(this.ui); //this.editorUi.querySelector("#sub-views")
    this.projectiveViewOps = new ProjectiveViewOps(
        this.ui, //this.editorUi.querySelector("#sub-views"),
        cfg,
        this.data,
        this.boxView.views,
        this.boxOp,
        func_on_box_changed,
        ()=>this.udpate()
    );

    this.projectiveViewOps.init_view_operation();

    this.focusImageContext = new FocusImageContext(this.data,
        this.ui.querySelector("#focuscanvas"));
    
    
    this.box = null;
    this.attachBox = function(box){
        this.ui.style.display="block";

        if (this.box){
            this.box.boxEditor=null;
            console.log("detach box editor");
        }

        box.boxEditor = this;
        this.box=box;

        this.boxView.attachBox(box);
        this.projectiveViewOps.activate(box);
        this.focusImageContext.updateFocusedImageContext(box);

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
            //this.boxView.render();
        }            
    };

}


export {BoxEditor};