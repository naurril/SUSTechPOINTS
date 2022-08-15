import { DropdownMenu } from "../common/sensible_dropdown_menu";
import { jsonrpc } from "../jsonrpc";
import { RectCtrl } from "./rect_ctrl";



class RectEditor{
    constructor(canvas, parentUi, toolBoxUi, cfgUi, image)
    {

        
        this.cfgUi = cfgUi;
        this.ui = canvas;
        this.canvas = canvas;
        this.parentUi = parentUi;
        this.image = image;
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


        
        this.dropdownMenu = new DropdownMenu(this.cfgUi.querySelector("#rect-editor-cfg-btn"),
            this.cfgUi.querySelector("#object-dropdown-menu"), 
            this.canvas);
            
        this.cfgUi.querySelector("#show-3d-box").onchange = (e)=>{
            let checked = e.currentTarget.checked;

            this.cfg.show3dBox = checked;
            if (checked)
                this.show3dBox();
            else
                this.hide3dBox();
        };

        this.cfgUi.querySelector("#reset-view").onclick = (e)=>{
            this.resetView();
        };

        this.cfgUi.querySelector("#generate-by-3d-boxes").onclick = (e)=>{
            let rects = this.image.generate2dRects();
            rects.forEach(r=>{

                let existedRect = this.findRectById(r.obj_track_id);

                if (!existedRect || existedRect.annotator==='3dbox')
                {
                    this.addRect(r.rect,
                        {
                            obj_track_id: r.obj_track_id,
                            obj_type: r.obj_type,
                            obj_attr: r.obj_attr,
                            annotator: '3dbox'
                        });
                }
            });

            this.save();
        };        

    }

    findRectById(id)
    {
        return Array.from(this.rects.children).find(x=>x.data.obj_track_id == id);
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

            this.save();
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

    resetImage(width, height, scene, frame, cameraType, cameraName)
    {
        this.scene = scene;
        this.frame = frame;
        this.cameraType = cameraType;
        this.cameraName = cameraName;


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

        this.load();
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
                this.save();
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
        this.hideGuideLines();
    }

    onMouseEnter(e){
        this.showGuideLines();
    }

    cutX(x)
    {
        return Math.min(Math.max(x, 0), this.WIDTH);
    }

    cutY(y)
    {
        return Math.min(Math.max(y, 0), this.HEIGHT);
    }

    getSvgPoint(e)
    {
        let canvasRect = this.canvas.getClientRects()[0];
        
        let p = this.uiPointToSvgPoint({x:e.clientX-canvasRect.x, y:e.clientY - canvasRect.y});

        p.x = this.cutX(p.x);
        p.y = this.cutY(p.y);

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
    hideGuideLines()
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

    save()
    {
        let data={
            scene: this.scene,
            frame: this.frame,
            cameraType: this.cameraType, 
            cameraName: this.cameraName,
        };

        data.objs = Array.from(this.rects.children).map(svg=>svg.data);
        
        jsonrpc('/api/save_image_annotation', 'POST', data).then(ret=>{
            console.log("saved", ret);
        }).catch(e=>{
            window.editor.infoBox.show("Error", "save failed");
        });
        
    }

    load()
    {
        jsonrpc(`/api/load_image_annotation?scene=${this.scene}&frame=${this.frame}&camera_type=${this.cameraType}&camera_name=${this.cameraName}`).then(ret=>{
           ret.objs.forEach(r=>{
                this.addRect(r.rect,
                    {
                        obj_track_id: r.obj_track_id,
                        obj_type: r.obj_type,
                        obj_attr: r.obj_attr,
                        annotator: r.annotator,
                    });
           })
        }).catch(e=>{
            window.editor.infoBox.show("Error", "load failed");
        });
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

        r = this.normalizeRect(r);

        rect.setAttribute("x", r.x1);
        rect.setAttribute("y", r.y1);
        rect.setAttribute("width", r.x2-r.x1);
        rect.setAttribute("height", r.y2-r.y1);

        // let label = svg.querySelector("#label");
        // if (label)
        // {
        //     label.setAttribute('x', x1);
        //     label.setAttribute('y', y1);
        // }
    }

    updateRectangle(svg, r)
    {
        svg.data.rect = r;
        delete svg.data.annotator;
        this.save();
    }




    normalizeRect(r)
    {
        let x1 = Math.min(r.x1, r.x2);
        let y1 = Math.min(r.y1, r.y2);
        let x2 = Math.max(r.x1, r.x2);
        let y2 = Math.max(r.y1, r.y2);

        return {x1, y1, x2, y2};
    }

    endRectangle(svg, rect, data){

        rect = this.normalizeRect(rect);

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
            rect: rect,
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