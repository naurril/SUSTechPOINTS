


class Trajectory{
    
    mouseDown = false;
    mouseDwwnPos = {};


    constructor(ui)
    {
        this.ui = ui;

        this.tracksUi = this.ui.querySelector("#svg-arrows");

        this.ui.onclick = ()=>{
            this.hide();
        };

        this.ui.querySelector("#object-track-view").onclick = function(event){
            event.preventDefault();
            event.stopPropagation();             
        };

        this.ui.querySelector("#object-track-view").addEventListener("contextmenu", (e)=>{
            e.stopPropagation();
            e.preventDefault();
        });


        this.svgUi = this.ui.querySelector("#object-track-svg");

        this.svgUi.addEventListener("wheel", (event)=>{
            console.log("wheel", event.wheelDelta);

            let scaleRatio = event.wheelDelta/2400;

            

            let clientLength = Math.min(this.svgUi.clientWidth, this.svgUi.clientHeight);

            let currentTargetRect = event.currentTarget.getBoundingClientRect();
            let eventOffsetX = event.pageX - currentTargetRect.left;
            let eventOffsetY = event.pageY - currentTargetRect.top;

            let x = eventOffsetX/clientLength*1000;
            let y = eventOffsetY/clientLength*1000;

            this.posTrans.x = x - (x-this.posTrans.x) * (1+scaleRatio);
            this.posTrans.y = y - (y-this.posTrans.y) * (1+scaleRatio);


            this.posScale *= 1 + (scaleRatio);

            this.redrawAll();

            event.preventDefault();
            event.stopPropagation();    

            return false;
        });

        this.inMovingCanvas = false;
        this.startPosForMovingCanvas = {};
        this.svgUi.addEventListener("mousedown", (event)=>{
            this.inMovingCanvas = true;
            this.startPosForMovingCanvas = {x: event.pageX, y:event.pageY};
        });
        this.svgUi.addEventListener("mouseup", (event)=>{
            this.inMovingCanvas = false;
        });
        this.svgUi.addEventListener("mousemove", (event)=>{
            if (this.inMovingCanvas)
            {
                let delta = {
                    x: event.pageX - this.startPosForMovingCanvas.x,
                    y: event.pageY - this.startPosForMovingCanvas.y
                };

                let clientLength = Math.min(this.svgUi.clientWidth, this.svgUi.clientHeight);

                this.posTrans.x += delta.x / clientLength * 1000;
                this.posTrans.y += delta.y / clientLength * 1000;

                this.startPosForMovingCanvas = {x: event.pageX, y:event.pageY};

                this.redrawAll();
            }
        });
        


        this.viewUi = this.ui.querySelector("#object-track-view");
        this.headerUi = this.ui.querySelector("#object-track-header");



        this.headerUi.addEventListener("mousedown", (event)=>{
            this.headerUi.style.cursor = "move";
            this.mouseDown = true;
            this.mouseDownPos = {x: event.clientX, y:event.clientY};
        });

        this.ui.addEventListener("mouseup", (event)=>{
            if (this.mouseDown){
                this.headerUi.style.cursor = "";
                event.stopPropagation();
                event.preventDefault();
                this.mouseDown = false;            
            }
        });

        this.ui.addEventListener("mousemove", (event)=>{

            if (this.mouseDown){
                let posDelta = {
                    x: event.clientX - this.mouseDownPos.x,
                    y: event.clientY - this.mouseDownPos.y 
                };
    
                this.mouseDownPos = {x: event.clientX, y:event.clientY};

                let left = this.viewUi.offsetLeft;
                let top  = this.viewUi.offsetTop;

                this.viewUi.style.left = (left + posDelta.x) + 'px';
                this.viewUi.style.top = (top + posDelta.y) + 'px';
            }

        });

        this.ui.addEventListener("keydown", (event)=>{

            if (event.key == 'Escape'){
                this.hide();
                event.stopPropagation();
                event.preventDefault();
            }
        });

        this.ui.querySelector("#object-track-view").onclick = function(event){
            event.preventDefault();
            event.stopPropagation();             
        };
        

        this.resizeObserver = new ResizeObserver(elements=>{

            if (elements[0].contentRect.height == 0)
                return;                
            this.redrawAll();

        });

        this.resizeObserver.observe(ui.querySelector("#object-track-view"));

        this.ui.querySelector("#btn-exit").onclick = (event)=>{
            this.hide();
        }

        this.ui.querySelector("#btn-maximize").onclick = (event)=>{
            let v = this.ui.querySelector("#object-track-view");
            v.style.top = "0%";
            v.style.left = "0%";
            v.style.width = "100%";
            v.style.height = "100%";
            v.style["z-index"] = 4;

            event.target.style.display = 'none';
            this.ui.querySelector("#btn-restore").style.display = "inherit";
        }

        this.ui.querySelector("#btn-restore").onclick = (event)=>{
            let v = this.ui.querySelector("#object-track-view");
            v.style.top = "20%";
            v.style.left = "20%";
            v.style.width = "60%";
            v.style.height = "60%";
            event.target.style.display = 'none';
            this.ui.querySelector("#btn-maximize").style.display = "inherit";
        }
    }

    objScale = 1;

    updateObjectScale()
    {
        let v = this.ui.querySelector("#object-track-view");
        this.objScale = Math.max(1000/v.clientHeight, 1000/v.clientWidth);
    }
    
    object = {};


    setObject(objType, objId, tracks)  //tracks is a list of [frameId, x, y, direction], in order
    {

        this.object  = {
            type: objType,
            id: objId,
            tracks:tracks
        };

        //console.log(objType, objId, tracks);
        this.calculateCoordinateTransform(this.object.tracks);
        this.redrawAll();
        
    }

    redrawAll()
    {
        this.show();
        this.clear();
        this.updateObjectScale();
        
        this.drawTracks(this.object);
    }


    clear(){

        var arrows = this.ui.querySelector("#svg-arrows").children;
        
        if (arrows.length>0){
            for (var c=arrows.length-1; c >= 0; c--){
                arrows[c].remove();                    
            }
        }
    }

    calculateCoordinateTransform(tracks)
    {
        tracks = tracks.filter(x=>x[1]);
        let xs = tracks.map(x=> x[1].psr.position.x);
        let max_x = Math.max(...xs, 0);
        let min_x = Math.min(...xs, 0);
        
        let ys = tracks.map(x=> x[1].psr.position.y);
        let max_y = Math.max(...ys, 0);
        let min_y = Math.min(...ys, 0);

        let scale = Math.max(max_x - min_x, max_y - min_y);
        
        if (scale == 0)
            scale = 1;
        else
            scale = 800/scale; // svg view is 1000*1000
        
        this.posScale = scale;
        this.posTrans = {
            x:    max_x * this.posScale + 100,
            y:  - min_y * this.posScale + 100
        };
    }

    transform(x,y,theta,label, highlight)
    {
        return [
            -x * this.posScale + this.posTrans.x,
             y * this.posScale + this.posTrans.y,
            (theta + Math.PI),
            label,
            highlight
        ];
    }

    drawOneTrace(x, y, theta, label, highlight)
    {
                let svg = this.ui.querySelector("#svg-arrows");
        
                let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
                g.innerHTML = `<title>${label}</title>`;
                g.setAttribute("class","one-track");

                if (highlight)
                {
                    g.setAttribute("class", "one-track object-track-current-frame");
                }

                svg.appendChild(g);

                //wrapper circle
                let p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                p.setAttribute("cx", x);
                p.setAttribute("cy", y);
                p.setAttribute("r", 20 * this.objScale);
                p.setAttribute("class","track-wrapper");
                
                g.appendChild(p);

                //object
                p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                p.setAttribute("cx", x);
                p.setAttribute("cy", y);
                p.setAttribute("r", 10 * this.objScale);
                
                g.appendChild(p);

                //direction
                p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                p.setAttribute("x1", x);
                p.setAttribute("y1", y);
                p.setAttribute("x2", x + 30 * this.objScale * Math.cos(theta));
                p.setAttribute("y2", y - 30  * this.objScale* Math.sin(theta));
                g.appendChild(p);

                // frame
                // p = document.createElementNS("http://www.w3.org/2000/svg", 'text');
                // p.setAttribute("x", x + 50 * this.scale);
                // p.setAttribute("y", y);
                // p.textContent = track[0];
                // g.appendChild(p);

                p = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject');
                p.setAttribute("x", x + 50 * this.objScale);
                p.setAttribute("y", y);
                // p.setAttribute("width", 200 * this.scale);
                p.setAttribute("font-size", 10 * this.objScale+"px");
                p.setAttribute("class",'track-label');

                let text = document.createElementNS("http://www.w3.org/1999/xhtml", 'div');
                text.textContent = label;
                p.appendChild(text);

                g.appendChild(p);
    }

    drawTracks(object)
    {
        this.ui.querySelector("#object-track-info").innerText = object.type + " "+ + object.id;
        let tracks = object.tracks;


        tracks.filter(x=>x[1])
              .map(track=>[track[1].psr.position.x, track[1].psr.position.y, track[1].psr.rotation.z, track[0], track[2]])
              .map(x=>this.transform(...x))
              .forEach(x=>this.drawOneTrace(...x));
        
        //ego car
        this.draw_ego_car(...this.transform(0,0,0,"",false).slice(0,2));
    }


    draw_ego_car(x,y)
    {
        let svg = this.ui.querySelector("#svg-arrows");

        let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        g.innerHTML = `<title>Ego car</title>`;
        g.setAttribute("id", "track-ego-car");
        svg.appendChild(g);

        let p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", x-10 * this.objScale);
        p.setAttribute("y1", y);
        p.setAttribute("x2", x+10 * this.objScale);
        p.setAttribute("y2", y);
        g.appendChild(p);

        p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", x);
        p.setAttribute("y1", y-10 * this.objScale);
        p.setAttribute("x2", x);
        p.setAttribute("y2", y+10 * this.objScale);
        g.appendChild(p);
    }

    hide()
    {
        this.ui.style.display = 'none';
    }

    show()
    {
        this.ui.style.display = 'inherit';
        this.ui.focus();
    }

}


export {Trajectory};