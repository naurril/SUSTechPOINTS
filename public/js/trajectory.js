import { PopupDialog } from "./popup_dialog.js";



class Trajectory extends PopupDialog{
    
    mouseDown = false;


    constructor(ui)
    {
        super(ui);
        this.ui = ui;


        this.ui.addEventListener("keydown", (event)=>{  //anykey

            if (!event.ctrlKey && !event.shiftKey && !event.altKey)
            {
                this.hide();
                event.preventDefault();
                event.stopPropagation();              
            }
        });


        this.tracksUi = this.ui.querySelector("#svg-arrows");

        this.svgUi = this.ui.querySelector("#object-track-svg");

        this.svgUi.addEventListener("wheel", (event)=>{
            console.log("wheel", event.wheelDelta);


            let scaleRatio = event.wheelDelta/2400;

            if (event.ctrlKey)
            {
                this.objScale *= 1 + (scaleRatio);
            }
            else
            {
                let clientLength = Math.min(this.svgUi.clientWidth, this.svgUi.clientHeight);

                let currentTargetRect = event.currentTarget.getBoundingClientRect();
                let eventOffsetX = event.pageX - currentTargetRect.left;
                let eventOffsetY = event.pageY - currentTargetRect.top;
    
                let x = eventOffsetX/clientLength*1000;
                let y = eventOffsetY/clientLength*1000;
    
                this.posTrans.x = x - (x-this.posTrans.x) * (1+scaleRatio);
                this.posTrans.y = y - (y-this.posTrans.y) * (1+scaleRatio);
    
    
                this.posScale *= 1 + (scaleRatio);
            }


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
        

        this.resizeObserver = new ResizeObserver(elements=>{

            if (elements[0].contentRect.height == 0)
                return;                
            this.redrawAll();

        });

        this.resizeObserver.observe(this.viewUi);

    }

    viewScale = 1;
    objScale = 1;

    updateObjectScale()
    {
        let v = this.viewUi;
        this.viewScale = Math.max(1000/v.clientHeight, 1000/v.clientWidth);
    }
    
    object = {};


    setObject(objType, objId, tracks, funcOnExit)  //tracks is a list of [frameId, x, y, direction], in order
    {

        this.object  = {
            type: objType,
            id: objId,
            tracks:tracks
        };

        this.funcOnExit = funcOnExit;
        //console.log(objType, objId, tracks);
        this.calculateCoordinateTransform(this.object.tracks);
        this.redrawAll();

        this.ui.focus();
    }

    redrawAll()
    {
        this.show();
        this.clear();
        this.updateObjectScale();
        
        this.drawTracks(this.object);

        this.drawScaler();
    }


    clear(){

        let arrows = this.ui.querySelector("#svg-arrows").children;
        
        if (arrows.length>0){
            for (var c=arrows.length-1; c >= 0; c--){
                arrows[c].remove();                    
            }
        }


        let scaler = this.ui.querySelector("#svg-scaler").children;
        
        if (scaler.length>0){
            for (var c=scaler.length-1; c >= 0; c--){
                scaler[c].remove();                    
            }
        }
    }

    /*
    the viewbox is 1000 by 1000
    the drawing area is [100,900] by [100,900]

    viewbox coordinate system
    x goes right
    y goes down

    utm coordinate system
    x goes east (right)
    y goes north (up)
    
    */
    calculateCoordinateTransform(tracks)
    {
        tracks = tracks.filter(x=>x[1]);
        let xs = tracks.map(x=> x[1].psr.position.x);
        let max_x = Math.max(...xs);//, 0);
        let min_x = Math.min(...xs);//, 0);
        
        let ys = tracks.map(x=> x[1].psr.position.y);
        let max_y = Math.max(...ys);//, 0);
        let min_y = Math.min(...ys);//, 0);

        let scale = Math.max(max_x - min_x, max_y - min_y);
        
        if (scale == 0)
            scale = 1;
        else
            scale = 800/scale; // svg view is 1000*1000
        
        this.posScale = scale;
        this.posTrans = {
            x:  - min_x * this.posScale + 100,
            y:    max_y * this.posScale + 100
        };
    }

    transform(x,y,theta,label, highlight)
    {
        return [
            x * this.posScale + this.posTrans.x,
            - y * this.posScale + this.posTrans.y,
             x,
             y,
            theta ,
            label,
            highlight
        ];
    }

    drawOneTrace(x, y, orgX, orgY, theta, label, highlight)
    {
                let svg = this.ui.querySelector("#svg-arrows");
        
                let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
                g.innerHTML = `<title>${label}</title>`;
                g.setAttribute("class","one-track");

                g.ondblclick = (e)=>{
                    if (this.funcOnExit){
                        this.hide();
                        this.funcOnExit(label);
                    }
                };

                if (highlight)
                {
                    g.setAttribute("class", "one-track object-track-current-frame");
                }

                svg.appendChild(g);

                let r = 5 * this.objScale;
                let d = 25 * this.objScale;
                let a = 5 * this.objScale;

                //wrapper circle
                let p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                p.setAttribute("cx", x + (d-r)/2 * this.viewScale * Math.cos(theta));
                p.setAttribute("cy", y - (d-r)/2  * this.viewScale* Math.sin(theta));
                p.setAttribute("r", (d+2*r)/2 * this.viewScale);
                p.setAttribute("class","track-wrapper");
                
                g.appendChild(p);

                //object
                p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                p.setAttribute("cx", x);
                p.setAttribute("cy", y);
                p.setAttribute("r", r * this.viewScale);
                
                g.appendChild(p);

                // //arrow head
                // p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                // p.setAttribute("x1", x + d * this.viewScale * Math.cos(theta));
                // p.setAttribute("y1", y - d * this.viewScale* Math.sin(theta));

                // p.setAttribute("x2", x + d * this.viewScale * Math.cos(theta) - a * this.viewScale * Math.cos(Math.PI/6+theta));
                // p.setAttribute("y2", y - d * this.viewScale * Math.sin(theta) + a * this.viewScale * Math.sin(Math.PI/6+theta));
                // g.appendChild(p);

                // p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                // p.setAttribute("x1", x + d * this.viewScale * Math.cos(theta));
                // p.setAttribute("y1", y - d * this.viewScale * Math.sin(theta));

                // p.setAttribute("x2", x + d * this.viewScale * Math.cos(theta) - a * this.viewScale * Math.cos(-Math.PI/6+theta));
                // p.setAttribute("y2", y - d * this.viewScale * Math.sin(theta) + a * this.viewScale * Math.sin(-Math.PI/6+theta));
                // g.appendChild(p);


                // direction
                p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                p.setAttribute("x1", x + r  * this.viewScale * Math.cos(theta));
                p.setAttribute("y1", y - r  * this.viewScale* Math.sin(theta));

                p.setAttribute("x2", x + d  * this.viewScale * Math.cos(theta));
                p.setAttribute("y2", y - d  * this.viewScale* Math.sin(theta));
                g.appendChild(p);

                // frame
                // p = document.createElementNS("http://www.w3.org/2000/svg", 'text');
                // p.setAttribute("x", x + 50 * this.scale);
                // p.setAttribute("y", y);
                // p.textContent = track[0];
                // g.appendChild(p);

                p = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject');
                p.setAttribute("x", x + 50 * this.viewScale);
                p.setAttribute("y", y);
                // p.setAttribute("width", 200 * this.scale);
                p.setAttribute("font-size", 10 * this.viewScale+"px");
                p.setAttribute("class",'track-label');

                let text = document.createElementNS("http://www.w3.org/1999/xhtml", 'div');
                text.textContent = label;
                p.appendChild(text);

                g.appendChild(p);
    }

    calculateScalerUnit()
    {
        let x = 100/this.posScale;
        let e = 0;
            
        while (x >= 10 || x < 1)
        {
            if (x >= 10)
            {
                e += 1;
                x /= 10;
            }
            else if (x < 1)
            {
                e -= 1;
                x *= 10;            
            }
        }

        x = 10 * Math.pow(10, e);

        return x;
    }

    drawScaler()
    {       
        let x = this.calculateScalerUnit();
        let lineLen = x * this.posScale;

        let svg = this.ui.querySelector("#svg-scaler");
        let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        svg.appendChild(g);

        //direction
        let p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", 100);
        p.setAttribute("y1", 900);
        p.setAttribute("x2", 100+lineLen);
        p.setAttribute("y2", 900);
        g.appendChild(p);

        p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", 100);
        p.setAttribute("y1", 900);
        p.setAttribute("x2", 100);
        p.setAttribute("y2", 900-lineLen);
        g.appendChild(p);

        
        p = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject');
        p.setAttribute("x", 105);
        p.setAttribute("y", 875);
        // p.setAttribute("width", 200 * this.scale);
        p.setAttribute("font-size", 10 * this.viewScale+"px");
        p.setAttribute("class",'scaler-label');
        let text = document.createElementNS("http://www.w3.org/1999/xhtml", 'div');
        text.textContent = x.toString() + 'm';
        p.appendChild(text);

        g.appendChild(p);


    }


    drawTracks(object)
    {
        this.titleUi.innerText = object.type + " "+ + object.id;
        let tracks = object.tracks;


        tracks.filter(x=>x[1])
              .map(track=>[track[1].psr.position.x, track[1].psr.position.y, track[1].psr.rotation.z, track[0], track[2]])
              .map(x=>this.transform(...x))
              .forEach(x=>this.drawOneTrace(...x));
        
        //ego car
        //this.draw_ego_car(...this.transform(0,0,0,"",false).slice(0,2));
    }


    draw_ego_car(x,y)
    {
        let svg = this.ui.querySelector("#svg-arrows");

        let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        g.innerHTML = `<title>Ego car</title>`;
        g.setAttribute("id", "track-ego-car");
        svg.appendChild(g);

        let p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", x-10 * this.viewScale);
        p.setAttribute("y1", y);
        p.setAttribute("x2", x+10 * this.viewScale);
        p.setAttribute("y2", y);
        g.appendChild(p);

        p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", x);
        p.setAttribute("y1", y-10 * this.viewScale);
        p.setAttribute("x2", x);
        p.setAttribute("y2", y+10 * this.viewScale);
        g.appendChild(p);
    }


}


export {Trajectory};