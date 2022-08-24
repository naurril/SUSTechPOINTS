

import { AttrEditor } from "../common/attr_editor";
import { ObjTypeEditor } from "../common/obj_type_editor";

class RectCtrl{

    constructor(ui, toolBoxUi, canvas, editor)
    {
        this.editor = editor;
        this.handles = {
            topleft: ui.querySelector("#topleft"),
            topright: ui.querySelector("#topright"),
            bottomleft: ui.querySelector("#bottomleft"),
            bottomright: ui.querySelector("#bottomright"),
        }

        Object.keys(this.handles).forEach(k=>{
            let h  = this.handles[k];
            h.addEventListener("mousedown", e=>this.onDragMouseDown(e, k, 
                this.cornerBeginOperation.bind(this),
                this.cornerOnOperation.bind(this),
                this.cornerEndOperation.bind(this),
                ));
        });

        this.ui = ui;
        this.toolBoxUi = toolBoxUi;
        this.canvas = canvas;

        this.toolBoxUi.addEventListener("mousedown", (e)=>{
            e.stopPropagation();
        });

        // this.toolBoxUi.addEventListener("mousedown", (e)=>{
        //     e.stopPropagation();
        //     e.preventDefault();
        // });
        

        this.toolBoxUi.querySelector("#label-del").onclick = (e)=>{
            this.editor.onDel();
        };

        this.toolBoxUi.querySelector("#label-reset-by-3dbox").onclick = (e)=>{
            this.editor.onResetBy3DBox();
        };

        this.objTypeEditor = new ObjTypeEditor(this.toolBoxUi.querySelector("#object-category-selector"));
        this.attrEditor = new AttrEditor(this.toolBoxUi.querySelector("#attr-editor"), this.eventHandler.bind(this));

        this.toolBoxUi.querySelector("#object-category-selector").onchange = (e)=>{
            let category = e.currentTarget.value;
            this.g.data.obj_type = category;
            this.editor.rectUpdated(this.g);
        }

        this.toolBoxUi.querySelector("#attr-input").onchange = (e)=>{
            let category = e.currentTarget.value;
            this.g.data.obj_attr = category;
            this.editor.rectUpdated(this.g);
        }
    }

    eventHandler(e)
    {
        switch (e.currentTarget.id)
        {
            case 'attr-input':
                this.g.data.obj_attr = e.currentTarget.value;
                this.editor.save();
                break;
            default:
                break;
        }
    }


    viewUpdated()
    {
        this.updateFloatingToobBoxPos();   
    }

    updateFloatingToobBoxPos(){
        if (this.toolBoxUi.style.display === 'none')
            return;

        if (this.g)
        {
            let p = this.editor.svgPointToUiPoint({x: this.g.data.rect.x2, y: this.g.data.rect.y1});
            this.toolBoxUi.style.left = p.x + 5 +"px";
            this.toolBoxUi.style.top = p.y + "px";
        }
        
    }

    updateFloatingToolBoxContent(){
       
        
            let b = this.g.data;
            this.toolBoxUi.querySelector("#object-category-selector").value = b.obj_type;
            this.toolBoxUi.querySelector("#object-track-id-editor").value = b.obj_track_id;
            //this.toolBoxUi.querySelector("#attr-input").value = this.g.data.box3d.obj_attr;

            this.attrEditor.setAttrOptions(b.obj_type, b.obj_attr);
        
    }

    showFloatingToolBox(){
        this.toolBoxUi.style.display = 'inherit';
    }
    hideFloatingToolBox(){
        this.toolBoxUi.style.display = 'none';
    }

    HANDLESIZE = 8;

    onScaleChanged(scale)
    {
        Object.keys(this.handles).forEach(k=>{
            let h  = this.handles[k];
            h.setAttribute('r', this.HANDLESIZE/scale.x);
        });
    }


    show(){
        this.ui.style.display = 'inherit';
    }

    hide(){
        this.ui.style.display = 'none';
        this.hideFloatingToolBox();
    }

    attachRect(g)
    {
        if (g == this.g)
            return;

        this.show();
        this.g = g;        
        this.g.addEventListener('mousedown', this.onRectDragMouseDown);


        this.moveHandle(g.data.rect);
        this.showFloatingToolBox();
        this.updateFloatingToobBoxPos();
        this.updateFloatingToolBoxContent();

    };

    rectUpdated()
    {
        this.moveHandle(this.g.data.rect);
        this.updateFloatingToobBoxPos();
        this.updateFloatingToolBoxContent();
    }

    detach(g)
    {
        this.hide();
        if (this.g)
            this.g.removeEventListener('mousedown', this.onRectDragMouseDown);
        this.g = null;
        this.hideFloatingToolBox();
    }
    
    onRectDragMouseDown = e=>this.onDragMouseDown(e,'rect', 
                                this.rectDragBeginOperation.bind(this),
                                this.rectDragOnOperation.bind(this),
                                this.rectDragEndOperation.bind(this));




    moveHandle(rect)
    {
        this.handles.topleft.setAttribute("cx", rect.x1);
        this.handles.topleft.setAttribute("cy", rect.y1);

        this.handles.topright.setAttribute("cx", rect.x2);
        this.handles.topright.setAttribute("cy", rect.y1);

        this.handles.bottomleft.setAttribute("cx", rect.x1);
        this.handles.bottomleft.setAttribute("cy", rect.y2);

        this.handles.bottomright.setAttribute("cx", rect.x2);
        this.handles.bottomright.setAttribute("cy", rect.y2);
    }

    rectDragBeginOperation()
    {
        this.editingRect = {
            ...this.g.data.rect
        };

        this.hideFloatingToolBox();
        this.editor.hideGuideLines();
        this.editor.hideFloatingLabels();
    }


    rectDragOnOperation(delta)
    {
        
        let r =this.g.data.rect;
        let v = this.editor.uiVectorToSvgVector(delta);

        if ((this.editor.cutX(r.x1+v.x) - r.x1) != v.x)
        {
            v.x =  this.editor.cutX(r.x1+v.x) - r.x1;
        }

        if ((this.editor.cutX(r.x2+v.x) - r.x2) != v.x)
        {
            v.x =  this.editor.cutX(r.x2+v.x) - r.x2;
        }


        if ((this.editor.cutY(r.y1+v.y) - r.y1) != v.y)
        {
            v.y =  this.editor.cutY(r.y1+v.y) - r.y1;
        }

        if ((this.editor.cutY(r.y2+v.y) - r.y2) != v.y)
        {
            v.y =  this.editor.cutY(r.y2+v.y) - r.y2;
        }


        
        this.editingRect.x1 = this.g.data.rect.x1 + v.x;
        this.editingRect.y1 = this.g.data.rect.y1 + v.y;
        this.editingRect.x2 = this.g.data.rect.x2 + v.x;
        this.editingRect.y2 = this.g.data.rect.y2 + v.y;

        this.editor.modifyRectangle(this.g, this.editingRect);
            
        this.moveHandle(this.editingRect);

    }

    rectDragEndOperation(delta)
    {
        this.showFloatingToolBox();        
        this.editor.showGuideLines();
        this.editor.showFloatingLabels();
        if (delta.x != 0 || delta.y != 0)
        {
            this.rectDragOnOperation(delta);        
            this.g.data.rect = this.editor.normalizeRect(this.editingRect);
            this.editor.rectUpdated(this.g);
            this.updateFloatingToobBoxPos();
        }


    }

    cornerBeginOperation(handleName){
        this.editingRect = {
            ...this.g.data.rect
        };

        this.hideFloatingToolBox();
        this.editor.hideGuideLines();
        this.editor.hideFloatingLabels();
    }

    cornerEndOperation(delta, handleName)
    {
        this.showFloatingToolBox();
        this.editor.showGuideLines();
        this.editor.showFloatingLabels();

        if (delta.x != 0 || delta.y != 0)
        {
            this.cornerOnOperation(delta, handleName);
        
            this.g.data.rect = this.editor.normalizeRect(this.editingRect);
            this.editor.rectUpdated(this.g);
            this.updateFloatingToobBoxPos();
        }


    }

    cornerOnOperation(delta, handleName)
    {
        if (handleName === 'topleft')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.editingRect.x1 = this.editor.cutX(this.g.data.rect.x1 + p.x);
            this.editingRect.y1 = this.editor.cutY(this.g.data.rect.y1 + p.y);

            this.editor.modifyRectangle(this.g, this.editingRect);
            
            this.moveHandle(this.editingRect);
        }
        else if (handleName === 'topright')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.editingRect.x2 = this.editor.cutX(this.g.data.rect.x2 + p.x);
            this.editingRect.y1 = this.editor.cutY(this.g.data.rect.y1 + p.y);

            this.editor.modifyRectangle(this.g, this.editingRect);
            
            this.moveHandle(this.editingRect);
        }
        else if (handleName === 'bottomleft')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.editingRect.x1 = this.editor.cutX(this.g.data.rect.x1 + p.x);
            this.editingRect.y2 = this.editor.cutY(this.g.data.rect.y2 + p.y);

            this.editor.modifyRectangle(this.g, this.editingRect);
            
            this.moveHandle(this.editingRect);
        }
        else if (handleName === 'bottomright')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.editingRect.x2 = this.editor.cutX(this.g.data.rect.x2 + p.x);
            this.editingRect.y2 = this.editor.cutY(this.g.data.rect.y2 + p.y);

            this.editor.modifyRectangle(this.g, this.editingRect);
            
            this.moveHandle(this.editingRect);
        }
    }

    onDragMouseDown(e, para, beginOp, onOp, endOp)
    {
        if (e.which != 1){
            return;
        }

        let p = {
            x: e.clientX,
            y: e.clientY
        };

        beginOp(para);

        const onMouseUp =  e=>{
            let delta = {
                x: e.clientX - p.x,
                y: e.clientY - p.y,
            }

            
            endOp(delta, para);

            this.canvas.removeEventListener('mouseup', onMouseUp);
            this.canvas.removeEventListener('mousemove', onMouseMove);

        };

        const onMouseMove = e=>{
            let delta = {
                x: e.clientX - p.x,
                y: e.clientY - p.y,
            }
            
            onOp(delta, para);
        };


        this.canvas.addEventListener('mouseup', onMouseUp);
        this.canvas.addEventListener('mousemove', onMouseMove);

        e.stopPropagation();
        e.preventDefault();
    }
}


export {RectCtrl}