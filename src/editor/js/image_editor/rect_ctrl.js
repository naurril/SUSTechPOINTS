
import { globalObjectCategory } from "../obj_cfg";


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

        
        this.toolBoxUi.querySelector("#label-del").onclick = ()=>this.editor.onDel();


        let obj_type_map = globalObjectCategory.obj_type_map;

        // obj type selector
        var options = "";
        for (var o in obj_type_map){
            options += '<option value="'+o+'" class="' +o+ '">'+o+ '</option>';        
        }

        this.toolBoxUi.querySelector("#object-category-selector").innerHTML = options;

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
            this.toolBoxUi.style.left = p.x+"px";
            this.toolBoxUi.style.top = p.y - this.toolBoxUi.clientHeight - 5 + "px";
        }
        
    }

    updateFloatingToolBoxContent(){
        if (this.g.data.box3d)
        {
            this.toolBoxUi.querySelector("#object-category-selector").value = this.g.data.box3d.obj_type;
            this.toolBoxUi.querySelector("#object-track-id-editor").value = this.g.data.box3d.obj_track_id;
            this.toolBoxUi.querySelector("#attr-input").value = this.g.data.box3d.obj_attr;
        }
    }

    showFloatingToolBox(){
        this.toolBoxUi.style.display = 'inherit';
    }
    hideFloatingToolBox(){
        this.toolBoxUi.style.display = 'none';
    }


    onScaleChanged(scale)
    {
        Object.keys(this.handles).forEach(k=>{
            let h  = this.handles[k];
            h.setAttribute('r', 5/scale.x);
        });
    }


    show(){
        this.ui.style.display = 'inherit';
    }

    hide(){
        this.ui.style.display = 'none';
    }

    attachRect(g)
    {
        if (g == this.g)
            return;

        this.g = g;
        this.moveHandle(g.data.rect);
        this.show();

        this.g.addEventListener('mousedown', this.onRectDragMouseDown);

        this.showFloatingToolBox();

        this.updateFloatingToobBoxPos();

        this.updateFloatingToolBoxContent();

    };

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
        this.g.data.editingRect = {
            ...this.g.data.rect
        };

        this.hideFloatingToolBox();
    }

    rectDragOnOperation(delta)
    {
        let p = this.editor.uiVectorToSvgVector(delta);
        this.g.data.editingRect.x1 = this.g.data.rect.x1 + p.x;
        this.g.data.editingRect.y1 = this.g.data.rect.y1 + p.y;
        this.g.data.editingRect.x2 = this.g.data.rect.x2 + p.x;
        this.g.data.editingRect.y2 = this.g.data.rect.y2 + p.y;

        this.editor.modifyRectangle(this.g, this.g.data.editingRect);
            
        this.moveHandle(this.g.data.editingRect);

    }

    rectDragEndOperation(delta)
    {
        this.rectDragOnOperation(delta);
        this.g.data.rect = this.g.data.editingRect;
        this.editor.updateRectangle(this.g, this.g.data.editingRect);
        this.showFloatingToolBox();
        this.updateFloatingToobBoxPos();
    }

    cornerBeginOperation(handleName){
        this.g.data.editingRect = {
            ...this.g.data.rect
        };

        this.hideFloatingToolBox();
    }

    cornerEndOperation(delta, handleName)
    {
        this.cornerOnOperation(delta, handleName);
        
        this.editor.updateRectangle(this.g, this.g.data.editingRect);
        this.showFloatingToolBox();
        this.updateFloatingToobBoxPos();
    }

    cornerOnOperation(delta, handleName)
    {
        if (handleName === 'topleft')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.g.data.editingRect.x1 = this.g.data.rect.x1 + p.x;
            this.g.data.editingRect.y1 = this.g.data.rect.y1 + p.y;

            this.editor.modifyRectangle(this.g, this.g.data.editingRect);
            
            this.moveHandle(this.g.data.editingRect);
        }
        else if (handleName === 'topright')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.g.data.editingRect.x2 = this.g.data.rect.x2 + p.x;
            this.g.data.editingRect.y1 = this.g.data.rect.y1 + p.y;

            this.editor.modifyRectangle(this.g, this.g.data.editingRect);
            
            this.moveHandle(this.g.data.editingRect);
        }
        else if (handleName === 'bottomleft')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.g.data.editingRect.x1 = this.g.data.rect.x1 + p.x;
            this.g.data.editingRect.y2 = this.g.data.rect.y2 + p.y;

            this.editor.modifyRectangle(this.g, this.g.data.editingRect);
            
            this.moveHandle(this.g.data.editingRect);
        }
        else if (handleName === 'bottomright')
        {
            let p = this.editor.uiVectorToSvgVector(delta);

            this.g.data.editingRect.x2 = this.g.data.rect.x2 + p.x;
            this.g.data.editingRect.y2 = this.g.data.rect.y2 + p.y;

            this.editor.modifyRectangle(this.g, this.g.data.editingRect);
            
            this.moveHandle(this.g.data.editingRect);
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