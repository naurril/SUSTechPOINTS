


class Trajectory{
    constructor(ui)
    {
        this.ui = ui;

        this.ui.onclick = ()=>{
            this.hide();
        };

        this.ui.addEventListener("keydown", (event)=>{

            if (event.key == 'Escape'){
                this.hide();
            }

            event.stopPropagation();
            event.preventDefault();

        });

        this.ui.querySelector("#object-track-view").onclick = function(event){
            event.preventDefault();
            event.stopPropagation();             
        };

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

    
    setObject(objType, objId, tracks)  //tracks is a list of [frameId, x, y, direction], in order
    {
        //console.log(objType, objId, tracks);
        this.ui.querySelector("#object-track-info").innerText = objType + " "+ + objId;
        this.show();
        this.clear();
        this.drawTracks(tracks);
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

        let scale = Math.max(max_x - min_x, max_y - min_y);

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

    drawTracks(tracks)
    {
        let svg = this.ui.querySelector("#svg-arrows");

        let trans = this.calculateCoordinateScale(tracks);

        tracks.filter(x=>x[1]).forEach(track => {

            if (track[1]){
                
                let [x,y] = trans(track[1].psr.position.x, track[1].psr.position.y)
                let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
                g.innerHTML = `<title>${track[0]}</title>`;

                if (track[2])
                {
                    g.setAttribute("class", "object-track-current-frame");
                }

                svg.appendChild(g);

                let p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
                p.setAttribute("cx", x);
                p.setAttribute("cy", y);
                p.setAttribute("r", 10);
                
                g.appendChild(p);


                p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                p.setAttribute("x1", x);
                p.setAttribute("y1", y);
                p.setAttribute("x2", x + 30 * Math.cos(track[1].psr.rotation.z + Math.PI));
                p.setAttribute("y2", y - 30 * Math.sin(track[1].psr.rotation.z + Math.PI));
                g.appendChild(p);

                p = document.createElementNS("http://www.w3.org/2000/svg", 'text');
                p.setAttribute("x", x + 50);
                p.setAttribute("y", y);
                p.textContent = track[0];
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
        p.setAttribute("x1", x-10);
        p.setAttribute("y1", y);
        p.setAttribute("x2", x+10);
        p.setAttribute("y2", y);
        g.appendChild(p);

        p = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        p.setAttribute("x1", x);
        p.setAttribute("y1", y-10);
        p.setAttribute("x2", x);
        p.setAttribute("y2", y+10);
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