import { DropdownMenu } from "../common/sensible_dropdown_menu";
import { jsonrpc } from "../jsonrpc";
import { RectCtrl } from "./rect_ctrl";



class RectEditor{
    constructor(canvas, floatingLabelsUi, parentUi, toolBoxUi, cfgUi, image )
    {

        //parentUi is content
        this.cfgUi = cfgUi;
        this.canvas = canvas;
        this.floatingLabelsUi = floatingLabelsUi;
        this.parentUi = parentUi;
        this.image = image;
        this.parentUi.addEventListener("wheel", this.onWheel.bind(this));
        this.parentUi.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.parentUi.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.parentUi.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.parentUi.addEventListener("mouseleave", this.onMouseLeave.bind(this));
        this.parentUi.addEventListener("mouseenter", this.onMouseEnter.bind(this));

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
            selectInLidar: true,
        };


        this.dropdownMenu = new DropdownMenu(this.cfgUi.querySelector("#rect-editor-cfg-btn"),
            this.cfgUi.querySelector("#object-dropdown-menu"), 
            this.parentUi);
            
        this.cfgUi.querySelector("#show-3d-box").checked = true;
        this.cfgUi.querySelector("#show-3d-box").onchange = (e)=>{
            let checked = e.currentTarget.checked;

            this.cfg.show3dBox = checked;
            if (checked)
                this.show3dBox();
            else
                this.hide3dBox();
        };


        this.cfgUi.querySelector("#show-2d-box").checked = true;
        this.cfgUi.querySelector("#show-2d-box").onchange = (e)=>{
            let checked = e.currentTarget.checked;

            this.cfg.show2dBox = checked;
            if (checked)
                this.show2dBox();
            else
                this.hide2dBox();
        };


        this.cfgUi.querySelector("#reset-view").onclick = (e)=>{
            this.resetView();
        };

        this.cfgUi.querySelector("#generate-by-3d-boxes").onclick = (e)=>{
            let rects = this.image.generate2dRects();

            // delete all generated and not modified boxes.

            Array.from(this.rects.children).forEach(r=>{
                if (r.data.annotator == '3dbox'){
                    this.removeRect(r);
                }
            });

            // insert new
            rects.forEach(r=>{

                let existedRect = this.findRectById(r.obj_id);

                if (!existedRect)
                {
                    this.addRect(r.rect,
                        {
                            obj_id: r.obj_id,
                            obj_type: r.obj_type,
                            obj_attr: r.obj_attr,
                            annotator: '3dbox'
                        });
                }
                else if (existedRect.data.annotator==='3dbox')
                {
                    this.addRect(r.rect,
                        {
                            obj_id: r.obj_id,
                            obj_type: r.obj_type,
                            obj_attr: r.obj_attr,
                            annotator: '3dbox'
                        });
                }
            });

            this.save();
        };        

        console.log("image created.");

    }

    
    findRectById(id)
    {
        return Array.from(this.rects.children).find(x=>x.data.obj_id == id);
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


    
    removeRect(rect)
    {
        rect.divLabel.remove();
        rect.remove();
    }

    onDel()
    {
        if (this.selectedRect)
        {
            let r = this.selectedRect;
            this.cancelSelection();
           
            this.removeRect(r);

            this.save();
        }
    }

    onResetBy3DBox()
    {
        if (this.selectedRect)
        {
            let rect = this.image.generate2dRectById(this.selectedRect.data.obj_id);
            if (rect)
            {
                this.modifyRectangle(this.selectedRect, rect.rect);
                this.selectedRect.data.rect = rect.rect;
                this.selectedRect.data.obj_id = rect.obj_id;
                this.selectedRect.data.obj_type = rect.obj_type;
                this.selectedRect.data.obj_attr = rect.obj_attr;
                this.ctrl.rectUpdated();
                this.save();
            }
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

    hide2dBox()
    {
        this.canvas.querySelector("#svg-rects").style.display = 'none';
        this.hideFloatingLabels();
    }
    show2dBox()
    {
        this.canvas.querySelector("#svg-rects").style.display = 'inherit';
        this.showFloatingLabels();
    }

    resetImageSize(width, height)
    {
        if (this.WIDTH != width || this.HEIGHT != height)
        {
            console.log("image size reset");
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
    }

    resetImage(width, height, scene, frame, cameraType, cameraName, store)
    {
        this.scene = scene;
        this.frame = frame;
        this.cameraType = cameraType;
        this.cameraName = cameraName;

        console.log("image reset");
        this.store = store;
        this.clear();
        this.resetImageSize(width, height);
        this.load();
    }

    clear()
    {
        var rects = this.rects.children;
        
        if (rects.length>0){
            for (var c=rects.length-1; c >= 0; c--){
                this.removeRect(rects[c]);            
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

        if (this.viewScale.x < 0.2)
            this.hideFloatingLabels();
        else
            this.showFloatingLabels();

        this.updateFloatingLabels();
    }

    onResize(){

        // canvas height/width
        let contentRect = this.parentUi;
        if (contentRect.width/this.WIDTH < contentRect.height/this.HEIGHT)
        {
            //
            let height = contentRect.clientHeight;
            this.canvas.style.height = height + 'px';
            this.canvas.style.width = height*this.WIDTH/this.HEIGHT + 'px';
        }
        else
        {
            let width = contentRect.clientWidth;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = width*this.HEIGHT/this.WIDTH + 'px';
        }

        this.onRescale();
    }


    point = {};
    scale = 1.0;
    origin = {x: 0, y: 0};

    onWheel(e){
        
        let p = this.getCanvasOffset(e);
        
        let delta = (e.wheelDelta < 0)? 0.1: -0.1;
        
        
        this.viewBox.x += p.x /this.canvas.clientWidth * (this.viewBox.width-this.WIDTH*this.scale*(1+delta));
        this.viewBox.y += p.y /this.canvas.clientHeight * (this.viewBox.height-this.HEIGHT*this.scale*(1+delta));

        // after x/y adj
        this.scale *= (delta + 1);

        // this.scale = Math.max(0.2, Math.min(this.scale, 3.0));

        this.viewBox.width = this.WIDTH * this.scale;
        this.viewBox.height  = this.HEIGHT * this.scale;

        this.updateViewBox();
        this.onRescale();

        //console.log(e.wheelDelta, point.x, point.y, e.offsetX, e.offsetY);

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



        this.mouseDownPointUi = {x: e.clientX, y: e.clientY};//this.uiPointToSvgPoint({x: e.offsetX, y:e.offsetY});

        let p = this.getSvgPoint(e);
        this.mouseDownPointSvg = p; //this.uiPointToSvgPoint(this.mouseDownPointUi);

        this.mouseDown = true;
        this.mouseDownViewBox = {...this.viewBox};
        
        if (e.which == 1) //left
        {
            if (this.selectedRect)
            {
                this.cancelSelection();
                return;
            }

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

            if ((Math.abs(p.x - this.editingRectangle.x1) > 4) || (Math.abs(p.y - this.editingRectangle.y1) > 4))
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

    getCanvasOffset(e)
    {
        let canvasRect = this.canvas.getClientRects()[0];
        return {x:e.clientX-canvasRect.x, y:e.clientY - canvasRect.y}
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
            this.updateFloatingLabels();
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
        g.classList.add(g.data.obj_type);
    }

    save()
    {
        let data={
            scene: this.scene,
            frame: this.frame,
            cameraType: this.cameraType, 
            cameraName: this.cameraName,
        };

        let objs = Array.from(this.rects.children).map(svg=>svg.data);
        data.objs = objs;

        //jsonrpc('/api/save_image_annotation', 'POST', data).then(ret=>{
        let ret = this.store.save(data);
        console.log("saved", ret);
    }

    load()
    {
        //jsonrpc(`/api/load_image_annotation?scene=${this.scene}&frame=${this.frame}&camera_type=${this.cameraType}&camera_name=${this.cameraName}`).then(ret=>{
        let ret = this.store.load()
        if (!ret || !ret.objs || ret.objs.length ==0)
        {
            console.log("no annotation. ignored.");
            return;
        }

        if (ret.scene != this.scene || ret.frame != this.frame || ret.cameraType != this.cameraType || ret.cameraName != this.cameraName)
        {
            console.log("lagged data. ignored.");
            return;
        }

        ret.objs.forEach(r=>{
                this.addRect(r.rect,
                    {
                        obj_id: r.obj_id,
                        obj_type: r.obj_type,
                        obj_attr: r.obj_attr,
                        annotator: r.annotator,
                    });
        });

    }

    createRectangle(r)
    {
        let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        let rect =  document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        g.setAttribute("class", "svg-rect nofill");
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

    rectUpdated(svg, r)
    {
        delete svg.data.annotator;
        svg.classList.add(svg.data.obj_type);
        this.updateDivLabel(svg);

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

    updateFloatingLabels()
    {
        Array.from(this.rects.children).forEach(svg=>this.updateDivLabel(svg));
    }

    hideFloatingLabels()
    {
        this.floatingLabelsUi.style.display = 'none';
    }

    showFloatingLabels()
    {
        this.floatingLabelsUi.style.display = 'inherit';
    }

    updateDivLabel(svg)
    {
        svg.divLabel.className = "float-label "+ svg.data.obj_type;
        svg.divLabel.innerText = svg.data.obj_type+(svg.data.obj_attr?(","+svg.data.obj_attr):"")+
            (svg.data.obj_id?(","+svg.data.obj_id):'');

        let p = this.svgPointToUiPoint({x: svg.data.rect.x1, y: svg.data.rect.y1});

        let height = svg.divLabel.clientHeight;
        svg.divLabel.style.left = p.x + 1 + "px"
        svg.divLabel.style.top = p.y - height - 1 +"px"
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

        svg.divLabel = document.createElement('div');
        svg.divLabel.svg = svg;
        svg.divLabel.onclick = (e)=>this.selectRect(e.currentTarget.svg);
        svg.divLabel.onmouseenter = (e)=>e.currentTarget.svg.classList.add("svg-select-pending");
        svg.divLabel.onmouseleave = (e)=>e.currentTarget.svg.classList.remove("svg-select-pending");

        this.floatingLabelsUi.appendChild(svg.divLabel);
        this.updateDivLabel(svg);
        

        svg.addEventListener("mouseenter", (e)=>{
            e.currentTarget.divLabel.classList.add('label-select-pending');
            e.currentTarget.classList.add('svg-select-pending');
            // e.preventDefault();
            // e.stopPropagation();            
        });

        svg.addEventListener("mouseleave", (e)=>{
            e.currentTarget.divLabel.classList.remove('label-select-pending');
            e.currentTarget.classList.remove('svg-select-pending');
            // e.preventDefault();
            // e.stopPropagation();            
        });

        svg.addEventListener('mousedown', (e)=>{

            if (e.which == 1)
            {
                if (e.ctrlKey === false)
                {
                    this.selectRect(e.currentTarget);
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

            rect.classList.add("svg-rect-selected");

            this.ctrl.attachRect(rect);
            
            // if (e)
            //     this.ctrl.onRectDragMouseDown(e);
            
            if (this.cfg.selectInLidar && rect.data.obj_id)
            {
                window.editor.makeVisible(rect.data.obj_id);
            }
            
        }
    }

    cancelSelection()
    {
        if (this.selectedRect){
            this.selectedRect.classList.remove("svg-rect-selected");            
        }
        // this.canvas.querySelectorAll('.rect-svg-selected').forEach(e=>{
        //     e.setAttribute("class", "rect-svg");
        // });

        this.ctrl.detach();
        this.selectedRect = null;
    }

}


export {RectEditor};