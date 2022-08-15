import { RectCtrl } from "./rect_ctrl";



class EditorCfg{
    constructor(cfgUi, editor)
    {
        this.editor = editor;
        this.ui = cfgUi;

        this.ui.querySelector("#show-3d-box").onchange = (e)=>{
            let checked = e.currentTarget.checked;

            this.editor.cfg.show3dBox = checked;
            if (checked)
                this.editor.show3dBox();
            else
                this.editor.hide3dBox();
        };

        this.ui.querySelector("#reset-view").onclick = (e)=>{
            this.editor.resetView();
        };
    }
}


class RectEditor{
    constructor(canvas, parentUi, toolBoxUi, cfgUi)
    {

    
        this.canvas = canvas;
        this.parentUi = parentUi;
        
        this.canvas.addEventListener("wheel", this.onWheel.bind(this));
        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this));
        this.canvas.addEventListener("mouseenter", this.onMouseEnter.bind(this));

        // this.WIDTH = width;
        // this.HEIGHT = height;
        // this.viewBox = {
        //     x: 0,
        //     y: 0,
        //     width: this.WIDTH,
        //     height: this.HEIGHT
        // };

        this.rects = this.canvas.querySelector("#svg-rects");
        this.handles = this.canvas.querySelector("#svg-rect-handles");
        this.lines = {
            x: this.canvas.querySelector("#guide-line-x"),
            y: this.canvas.querySelector("#guide-line-y")
        };

        this.ctrl = new RectCtrl(this.canvas.querySelector("#svg-rect-ctrl"), 
            toolBoxUi,
            this.canvas, this);


       
        this.cfg = {
            show3dBox: true,
        };

        this.cfgUi = cfgUi;
        this.cfgUi = new EditorCfg(this.cfgUi, this);

    }

    cfgChanged(name, value)
    {
        switch(name){
            case 'show-3d-box':
                
                    
                break;

            default:
                console.log("unknown cfg item.");
        }
    }

    onDel()
    {
        if (this.selectedRect)
        {
            let r = this.selectedRect;
            this.cancelSelection();
            r.remove();
        }
    }

    hide3dBox()
    {
        this.canvas.querySelector("#svg-boxes").style.display = 'none';
    }
    show3dBox()
    {
        this.canvas.querySelector("#svg-boxes").style.display = 'inherit';
    }

    resetImage(width, height)
    {
        if (this.WIDTH != width || this.HEIGHT != height)
        {
            this.WIDTH = width;
            this.HEIGHT = height;

            this.viewBox = {
                x: 0,
                y: 0,
                width: this.WIDTH,
                height: this.HEIGHT
            };

            this.updateViewBox();
        }
        
        this.clear();
    }

    clear()
    {
        var rects = this.rects.children;
        
        if (rects.length>0){
            for (var c=rects.length-1; c >= 0; c--){
                rects[c].remove();                    
            }
        }

        this.ctrl.hide();        
    }

    updateViewScale()
    {
        let xscale = this.canvas.clientWidth/this.viewBox.width;
        let yscale = this.canvas.clientHeight/this.viewBox.height;

        this.viewScale = {
            x: xscale,
            y: yscale,
        };
    }
    updateViewBox()
    {
        this.canvas.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);

        this.ctrl.viewUpdated();
    }


    onRescale()
    {
        this.updateViewScale();
        this.ctrl.onScaleChanged(this.viewScale);
        this.canvas.style['stroke-width'] = 1/this.viewScale.x+"px";
    }

    onResize(){

        // canvas height/width
        let contentRect = this.parentUi.getClientRects()[0];
        if (contentRect.width/this.WIDTH < contentRect.height/this.HEIGHT)
        {
            //
            let height = contentRect.height;
            this.canvas.style.height = height + 'px';
            this.canvas.style.width = height*this.WIDTH/this.HEIGHT + 'px';
        }
        else
        {
            let width = contentRect.width;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = width*this.HEIGHT/this.WIDTH + 'px';
        }

        this.onRescale();
    }


    point = {};
    scale = 1.0;
    origin = {x: 0, y: 0};

    onWheel(e){
        
        let point = this.getSvgPoint(e);
        
        let delta = (e.wheelDelta < 0)? 0.1: -0.1;
        
        
        this.viewBox.x += e.offsetX /this.canvas.clientWidth * (this.viewBox.width-this.WIDTH*this.scale*(1+delta));
        this.viewBox.y += e.offsetY /this.canvas.clientHeight * (this.viewBox.height-this.HEIGHT*this.scale*(1+delta));

        // after x/y adj
        this.scale *= (delta + 1);

        // this.scale = Math.max(0.2, Math.min(this.scale, 3.0));

        this.viewBox.width = this.WIDTH * this.scale;
        this.viewBox.height  = this.HEIGHT * this.scale;

        this.updateViewBox();
        this.onRescale();

        console.log(e.wheelDelta, point.x, point.y, e.offsetX, e.offsetY);

    }

    resetView()
    {
        this.scale = 1;
        this.viewBox.x = 0;
        this.viewBox.y = 0;
        this.viewBox.width = this.WIDTH;
        this.viewBox.height  = this.HEIGHT;
        this.updateViewBox();
        this.onRescale();
    }

    uiPointToSvgPoint(p)
    {
        return    {
            x: p.x/this.canvas.clientWidth*this.viewBox.width + this.viewBox.x,
            y: p.y/this.canvas.clientHeight*this.viewBox.height + this.viewBox.y
        };
    }

    svgPointToUiPoint(p)
    {
        return    {
            x: (p.x - this.viewBox.x)*this.canvas.clientWidth/this.viewBox.width,
            y: (p.y - this.viewBox.y)*this.canvas.clientHeight/this.viewBox.height,
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

        this.mouseDownPointUi = {x: e.clientX, y: e.clientY};//this.uiPointToSvgPoint({x: e.offsetX, y:e.offsetY});

        let p = this.getSvgPoint(e);
        this.mouseDownPointSvg = p; //this.uiPointToSvgPoint(this.mouseDownPointUi);

        this.mouseDown = true;
        this.mouseDownViewBox = {...this.viewBox};
        console.log(this.mouseDownPointUi.x, this.mouseDownPointUi.y);

        
        if (e.which == 1) //left
        {
            if (!this.editingRectangleSvg){
                this.editingRectangle = {
                    x1: this.mouseDownPointSvg.x,
                    y1: this.mouseDownPointSvg.y,
                    x2: this.mouseDownPointSvg.x,
                    y2: this.mouseDownPointSvg.y,
                }

                this.editingRectangleSvg = this.createRectangle(this.editingRectangle);
                
            }
            // else if (this.editingRectangleSvg)
            // {
            //     this.editingRectangle.x2 = p.x;
            //     this.editingRectangle.y2 = p.y;
                
            //     if ((Math.abs(p.x - this.editingRectangle.x1) > 8) && (Math.abs(p.y - this.editingRectangle.y1) > 8))
            //     {
            //         this.modifyRectangle(this.editingRectangleSvg, this.editingRectangle);
            //         this.endRectangle(this.editingRectangleSvg,  this.editingRectangle);                  
            //     }
            //     else
            //     {
            //         this.editingRectangleSvg.remove();
            //     }

            //     this.editingRectangleSvg = null;
            // }
        }
    }


    onMouseUp(e){
        if (e.which != 1){
            return;
        }

        this.mouseDown = false;
        e.preventDefault();


        if (this.editingRectangleSvg){
            let p = this.getSvgPoint(e);
            
            this.editingRectangle.x2 = p.x;
            this.editingRectangle.y2 = p.y;

            if ((Math.abs(p.x - this.editingRectangle.x1) > 4) && (Math.abs(p.y - this.editingRectangle.y1) > 4))
            {
                this.modifyRectangle(this.editingRectangleSvg, this.editingRectangle);                
                this.endRectangle(this.editingRectangleSvg,  this.editingRectangle);   
                this.selectRect(this.editingRectangleSvg);
                this.editingRectangleSvg = null;
                
            }
            else
            {
                this.editingRectangleSvg.remove();                
                this.editingRectangleSvg = null;
            }
        }
    }

    onMouseLeave(e){
        this.hideGuildeLines();
    }

    onMouseEnter(e){
        this.showGuideLines();
    }

    getSvgPoint(e)
    {
        let canvasRect = this.canvas.getClientRects()[0];
        
        let p = this.uiPointToSvgPoint({x:e.clientX-canvasRect.x, y:e.clientY - canvasRect.y});

        p.x = Math.min(Math.max(p.x, 0), this.WIDTH);
        p.y = Math.min(Math.max(p.y, 0), this.HEIGHT);

        return p;
    }
    adjustGuideLines(e)
    {
        let p = this.getSvgPoint(e);

        this.lines.x.setAttribute('y1', p.y);
        this.lines.x.setAttribute('y2', p.y);
        this.lines.x.setAttribute('x2', this.WIDTH);

        this.lines.y.setAttribute('x1', p.x);
        this.lines.y.setAttribute('x2', p.x);
        this.lines.y.setAttribute('y2', this.HEIGHT);
    }

    showGuideLines()
    {
        this.canvas.querySelector("#rect-editor-guide-lines").style.display = 'inherit';
    }
    hideGuildeLines()
    {
        this.canvas.querySelector("#rect-editor-guide-lines").style.display = 'none';
    }

    onMouseMove(e){

        if (this.mouseDown && e.which == 3) //right button
        {
            //let point = this.uiPointToSvgPoint({x: e.offsetX, y:e.offsetY});
            let vectorUi = {
                x: e.clientX - this.mouseDownPointUi.x,
                y: e.clientY - this.mouseDownPointUi.y,
            };

            let v = this.uiVectorToSvgVector(vectorUi);
            this.viewBox.x = this.mouseDownViewBox.x - v.x;
            this.viewBox.y = this.mouseDownViewBox.y - v.y;
            this.updateViewBox();            
        }
        else if (this.editingRectangleSvg){
            //drawing rect
            let p = this.getSvgPoint(e);
            this.editingRectangle.x2 = p.x;
            this.editingRectangle.y2 = p.y;
            this.modifyRectangle(this.editingRectangleSvg, this.editingRectangle);
        }
        

        this.adjustGuideLines(e);
        

    }


    addRect(r, data)
    {
        let g = this.createRectangle(r);
        this.endRectangle(g, r, data);
    }

    createRectangle(r)
    {
        let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        let rect =  document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        g.setAttribute("class", "rect-svg");
        g.setAttribute("id",    "rect");
        g.appendChild(rect);

        this.rects.appendChild(g);

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

    updateRectangle(svg, r)
    {
        svg.data.rect = r;
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

    endRectangle(svg, rect, data){

        this.normalizeRect(rect);

        let x = rect.x1;
        let y = rect.y1;

        // let p = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject');
        // p.setAttribute('id', 'label');
        // p.setAttribute("x", x);
        // p.setAttribute("y", y);
        // // p.setAttribute("width", 200 * this.scale);
        // p.setAttribute("font-size", 10+"px");
        // p.setAttribute("class",'rect-label');

        // let text = document.createElementNS("http://www.w3.org/1999/xhtml", 'div');
        // text.textContent = 'object';
        // p.appendChild(text);

        // svg.appendChild(p);

        svg.data = {
            rect,
            ...data,
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
                if (e.ctrlKey === false)
                {
                    this.selectRect(svg);
                    e.preventDefault();
                    e.stopPropagation();
                }
                else
                {
                    this.cancelSelection();
                }
            }
        });
    }

    selectRect(rect)
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
            
            // if (e)
            //     this.ctrl.onRectDragMouseDown(e);
            
            
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