

class RectCtrl{

    constructor(ui, canvas, editor)
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
        this.canvas = canvas;
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

    };

    onRectDragMouseDown = e=>this.onDragMouseDown(e,'rect', 
                                this.rectDragBeginOperation.bind(this),
                                this.rectDragOnOperation.bind(this),
                                this.rectDragEndOperation.bind(this));


    detach(g)
    {
        this.hide();
        if (this.g)
            this.g.removeEventListener('mousedown', this.onRectDragMouseDown);
        this.g = null;
    }

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
    }

    cornerBeginOperation(handleName){
        this.g.data.editingRect = {
            ...this.g.data.rect
        };
    }

    cornerEndOperation(delta, handleName)
    {
        this.cornerOnOperation(delta, handleName);
        this.g.data.rect = this.g.data.editingRect;
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

class RectEditor{
    constructor(ui)
    {
        this.canvas = ui;
        this.canvas.addEventListener("wheel", this.onWheel.bind(this));
        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.canvas.addEventListener("mouseleave", this.onMouseUp.bind(this));

        this.viewBox = {
            x: 0,
            y: 0,
            width: 2048,
            height: 1536
        };

        this.rects = this.canvas.querySelector("#svg-rects");
        this.handles = this.canvas.querySelector("#svg-rect-handles");
        this.lines = {
            x: this.canvas.querySelector("#guide-line-x"),
            y: this.canvas.querySelector("#guide-line-y")
        };

        this.ctrl = new RectCtrl(this.canvas.querySelector("#svg-rect-ctrl"), this.canvas, this);
    }


    onResize()
    {
        let xscale = this.canvas.clientWidth/this.viewBox.width;
        let yscale = this.canvas.clientHeight/this.viewBox.height;

        this.viewScale = {
            x: xscale,
            y: yscale,
        };

    }

    point = {};
    scale = 1.0;
    origin = {x: 0, y: 0};

    WIDTH= 2048;
    HEIGHT = 1536;
    onWheel(e){
        
        let point = this.uiPointToSvgPoint({x: e.offsetX, y:e.offsetY});
        
        let delta = (e.wheelDelta < 0)? 0.1: -0.1;
        
        
        this.viewBox.x += e.offsetX /this.canvas.clientWidth * (this.viewBox.width-this.WIDTH*this.scale*(1+delta));
        this.viewBox.y += e.offsetY /this.canvas.clientHeight * (this.viewBox.height-this.HEIGHT*this.scale*(1+delta));

        // after x/y adj
        this.scale *= (delta + 1);

        // this.scale = Math.max(0.2, Math.min(this.scale, 3.0));

        this.viewBox.width = this.WIDTH * this.scale;
        this.viewBox.height  = this.HEIGHT * this.scale;


        this.updateViewBox();

        console.log(e.wheelDelta, point.x, point.y, e.offsetX, e.offsetY);

    }

    updateViewBox()
    {
        this.canvas.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
    }

    uiPointToSvgPoint(p)
    {
        return    {
            x: p.x/this.canvas.clientWidth*this.viewBox.width + this.viewBox.x,
            y: p.y/this.canvas.clientHeight*this.viewBox.height + this.viewBox.y
        };
    }

    uiVectorToSvgVector(p)
    {
        return    {
            x: p.x/this.canvas.clientWidth*this.viewBox.width,
            y: p.y/this.canvas.clientHeight*this.viewBox.height
        };
    }

    mouseDownPointUi = {};
    mouseDownPointSvg = {};
    mouseDownViewBox = {};
    mouseDown = false;

    editingRectangle = {x1:0, y1:0, x2:0,y2:0};
    editingRectangleSVg = null;

    onMouseDown(e){
        e.preventDefault();


        // cancel selection
        if (e.which == 1){
            this.cancelSelection();
        }

        this.mouseDownPointUi = {x: e.offsetX, y: e.offsetY};//this.uiPointToSvgPoint({x: e.offsetX, y:e.offsetY});

        let p = this.uiPointToSvgPoint({x:e.offsetX, y:e.offsetY});
        this.mouseDownPointSvg = p; //this.uiPointToSvgPoint(this.mouseDownPointUi);

        this.mouseDown = true;
        this.mouseDownViewBox = {...this.viewBox};
        console.log(this.mouseDownPointUi.x, this.mouseDownPointUi.y);

        
        if (e.which == 1) //left
        {
            if (!this.editingRectangleSvg && e.ctrlKey== true){
                this.editingRectangle = {
                    x1: this.mouseDownPointSvg.x,
                    y1: this.mouseDownPointSvg.y,
                    x2: this.mouseDownPointSvg.x,
                    y2: this.mouseDownPointSvg.y,
                }

                this.editingRectangleSvg = this.createRectangle(this.editingRectangle);
                this.rects.appendChild(this.editingRectangleSvg);
            }
            else if (this.editingRectangleSvg)
            {
                this.editingRectangle.x2 = p.x;
                this.editingRectangle.y2 = p.y;
                
                if ((Math.abs(p.x - this.editingRectangle.x1) > 8) && (Math.abs(p.y - this.editingRectangle.y1) > 8))
                {
                    this.modifyRectangle(this.editingRectangleSvg, this.editingRectangle);
                    this.endRectangle(this.editingRectangleSvg,  this.editingRectangle);                  
                }
                else
                {
                    this.editingRectangleSvg.remove();
                }

                this.editingRectangleSvg = null;
            }
        }
    }


    onMouseUp(e){
        if (e.which != 1){
            return;
        }

        this.mouseDown = false;
        e.preventDefault();


        if (this.editingRectangleSvg){
            let p = this.uiPointToSvgPoint({x:e.offsetX, y:e.offsetY});
            
            this.editingRectangle.x2 = p.x;
            this.editingRectangle.y2 = p.y;

            if ((Math.abs(p.x - this.editingRectangle.x1) > 8) && (Math.abs(p.y - this.editingRectangle.y1) > 8))
            {
                this.modifyRectangle(this.editingRectangleSvg, this.editingRectangle);                
                this.endRectangle(this.editingRectangleSvg,  this.editingRectangle);   
                this.editingRectangleSvg = null;
            }
        }
    }


    adjustGuideLines(e)
    {
        let p = this.uiPointToSvgPoint({x:e.offsetX, y:e.offsetY});
        this.lines.x.setAttribute('y1', p.y);
        this.lines.x.setAttribute('y2', p.y);
        this.lines.x.setAttribute('x2', this.WIDTH);

        this.lines.y.setAttribute('x1', p.x);
        this.lines.y.setAttribute('x2', p.x);
        this.lines.y.setAttribute('y2', this.HEIGHT);
    }


    onMouseMove(e){

        if (this.mouseDown && e.which == 3) //right button
        {
            //let point = this.uiPointToSvgPoint({x: e.offsetX, y:e.offsetY});
            this.viewBox.x = this.mouseDownViewBox.x - (e.offsetX - this.mouseDownPointUi.x)/this.canvas.clientWidth*this.viewBox.width;
            this.viewBox.y = this.mouseDownViewBox.y - (e.offsetY - this.mouseDownPointUi.y)/this.canvas.clientHeight*this.viewBox.height;
            this.updateViewBox();            
        }
        else if (this.editingRectangleSvg){
            //drawing rect
            let p = this.uiPointToSvgPoint({x:e.offsetX, y:e.offsetY});
            this.editingRectangle.x2 = p.x;
            this.editingRectangle.y2 = p.y;
            this.modifyRectangle(this.editingRectangleSvg, this.editingRectangle);
        }
        

        this.adjustGuideLines(e);
        

    }


    createRectangle(r)
    {
        let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        let rect =  document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        g.setAttribute("class", "rect-svg");
        g.setAttribute("id",    "rect");
        g.appendChild(rect);

        this.modifyRectangle(g, r);        
        return g;
    }

    modifyRectangle(svg, r)
    {
        let rect = svg.children[0];
        let x1 = Math.min(r.x1, r.x2);
        let y1 = Math.min(r.y1, r.y2);
        let x2 = Math.max(r.x1, r.x2);
        let y2 = Math.max(r.y1, r.y2);

        rect.setAttribute("x", x1);
        rect.setAttribute("y", y1);
        rect.setAttribute("width", x2-x1);
        rect.setAttribute("height", y2-y1);

        let label = svg.querySelector("#label");
        if (label)
        {
            label.setAttribute('x', x1);
            label.setAttribute('y', y1);
        }

    }

    normalizeRect(rect)
    {
        let r =rect;
        let x1 = Math.min(r.x1, r.x2);
        let y1 = Math.min(r.y1, r.y2);
        let x2 = Math.max(r.x1, r.x2);
        let y2 = Math.max(r.y1, r.y2);

        r.x1 = x1;
        r.x2 = x2;
        r.y1 = y1;
        r.y2 = y2;
    }

    endRectangle(svg, rect){

        this.normalizeRect(rect);

        let x = rect.x1;
        let y = rect.y1;

        let p = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject');
        p.setAttribute('id', 'label');
        p.setAttribute("x", x);
        p.setAttribute("y", y);
        // p.setAttribute("width", 200 * this.scale);
        p.setAttribute("font-size", 10+"px");
        p.setAttribute("class",'rect-label');

        let text = document.createElementNS("http://www.w3.org/1999/xhtml", 'div');
        text.textContent = 'object';
        p.appendChild(text);

        svg.appendChild(p);

        svg.data = {
            rect,
            obj_type: 'car',
            obj_id: 0,
        };

        svg.addEventListener("mouseenter", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            console.log("enter rect");
        });

        svg.addEventListener("mouseleave", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            console.log("leave rect");
        });

        svg.addEventListener("mousedown", (e)=>{

            if (e.which == 1)
            {
                console.log("mousedown on rect", e.which);

                this.selectRect(svg, e);

                e.preventDefault();
                e.stopPropagation();
            }
            
        });


        this.selectRect(svg);

    }

    selectRect(rect, e)
    {
        if (this.selectedRect != rect)
        {
            this.cancelSelection();
        }

        if (!this.selectedRect)
        {

            this.selectedRect = rect;

            rect.setAttribute("class", "rect-svg-selected");

            this.ctrl.attachRect(rect);
            
            if (e)
                this.ctrl.onRectDragMouseDown(e);
        }
    }

    cancelSelection()
    {
        if (this.selectedRect){
            this.selectedRect.setAttribute("class", "rect-svg");            
        }
        // this.canvas.querySelectorAll('.rect-svg-selected').forEach(e=>{
        //     e.setAttribute("class", "rect-svg");
        // });

        this.ctrl.detach();
        this.selectedRect = null;
    }

}


export {RectEditor};