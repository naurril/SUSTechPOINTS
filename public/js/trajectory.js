


class Trajectory{

    mouseDown = false;
    mouseDwwnPos = {};

    
    constructor(ui)
    {
        this.ui = ui;

        this.ui.onclick = ()=>{
            this.hide();
        };
        
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
                
            this.show();
            this.clear();
            this.updateScale();

            this.drawTracks(this.object);
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

    scale = 1;

    updateScale()  //viewport -> view rect
    {
        let v = this.ui.querySelector("#object-track-view");
        this.scale = Math.max(1000/v.clientHeight, 1000/v.clientWidth);
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
        

        this.show();
        this.clear();
        this.updateScale();

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

    calculateCoordinateScale(tracks)
    {
        tracks = tracks.filter(x=>x[1]);
        let xs = tracks.map(x=> - x[1].psr.position.x);
        let max_x = Math.max(...xs, 0);
        let min_x = Math.min(...xs, 0);
        
        let ys = tracks.map(x=> - x[1].psr.position.y);
        let max_y = Math.max(...ys, 0);
        let min_y = Math.min(...ys, 0);

        let scale = Math.max(max_x - min_x, max_y - min_y);  // world -> viewport

        if (scale == 0)
            scale = 1;
        else
            scale = 800/scale; // svg view is 1000*1000
        
        let center = [min_x, min_y];

        console.log(center, scale);

        return (x,y)=>{
            let ret = [100 + ((-x-center[0])*scale), 
                       900 - (-y-center[1])*scale,
                      ];
            console.log(x,y, ret);
            return ret;
        }
    }

    drawTracks(object)
    {
        this.ui.querySelector("#object-track-info").innerText = object.type + " "+ + object.id;
        let tracks = object.tracks;


        let svg = this.ui.querySelector("#svg-arrows");

        let trans = this.calculateCoordinateScale(tracks);

        tracks.filter(x=>x[1]).forEach(track => {

            if (track[1]){
                
                let [x,y] = trans(track[1].psr.position.x, track[1].psr.position.y)
                let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
                g.innerHTML = `<title>${track[0]}</title>`;
                g.setAttribute("class","one-track");

                if (track[2])
                {
                    g.setAttribute("class", "one-track object-track-current-frame");
                }

                svg.appendChild(g);

                //wrapper circle
                let p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                p.setAttribute("cx", x);
                p.setAttribute("cy", y);
                p.setAttribute("r", 20 * this.scale);
                p.setAttribute("class","track-wrapper");
                
                g.appendChild(p);

                //object
                p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                p.setAttribute("cx", x);
                p.setAttribute("cy", y);
                p.setAttribute("r", 10 * this.scale);
                
                g.appendChild(p);

                //direction
                p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                p.setAttribute("x1", x);
                p.setAttribute("y1", y);
                p.setAttribute("x2", x + 30 * this.scale * Math.cos(track[1].psr.rotation.z + Math.PI));
                p.setAttribute("y2", y - 30  * this.scale* Math.sin(track[1].psr.rotation.z + Math.PI));
                g.appendChild(p);

                // frame
                // p = document.createElementNS("http://www.w3.org/2000/svg", 'text');
                // p.setAttribute("x", x + 50 * this.scale);
                // p.setAttribute("y", y);
                // p.textContent = track[0];
                // g.appendChild(p);

                p = document.createElementNS("http://www.w3.org/2000/svg", 'foreignObject');
                p.setAttribute("x", x + 50 * this.scale);
                p.setAttribute("y", y);
                // p.setAttribute("width", 200 * this.scale);
                p.setAttribute("font-size", 10 * this.scale+"px");
                p.setAttribute("class",'track-label');

                let text = document.createElementNS("http://www.w3.org/1999/xhtml", 'div');
                text.textContent = track[0];
                p.appendChild(text);

                g.appendChild(p);
                

            }
        });

        //ego car
        this.draw_ego_car(...trans(0, 0));        
    }


    draw_ego_car(x,y)
    {
        let svg = this.ui.querySelector("#svg-arrows");

        let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        g.innerHTML = `<title>Ego car</title>`;
        g.setAttribute("id", "track-ego-car");
        svg.appendChild(g);

        let p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", x-10 * this.scale);
        p.setAttribute("y1", y);
        p.setAttribute("x2", x+10 * this.scale);
        p.setAttribute("y2", y);
        g.appendChild(p);

        p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", x);
        p.setAttribute("y1", y-10 * this.scale);
        p.setAttribute("x2", x);
        p.setAttribute("y2", y+10 * this.scale);
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