


class CropScene{
    
    mouseDown = false;
    mouseDwwnPos = {};


    constructor(ui)
    {
        this.ui = ui;  //wrapper
        this.viewUi = this.ui.querySelector("#crop-scene-view");
        this.headerUi = this.ui.querySelector("#crop-scene-header");
        this.contentUi = this.ui.querySelector("#crop-scene-content");
        this.titleUi = this.ui.querySelector("#crop-scene-title");
        

        this.ui.onclick = ()=>{
            this.hide();
        };
        
        this.ui.addEventListener("keydown", (event)=>{

            if (event.key == 'Escape'){
                this.hide();
                event.stopPropagation();
                event.preventDefault();
            }            
        });

        this.viewUi.onclick = function(event){
            event.preventDefault();
            event.stopPropagation();             
        };

        this.titleUi.onclick = function(event){
            event.preventDefault();
            event.stopPropagation();             
        };

        // this.viewUi.addEventListener("contextmenu", (e)=>{
        //     e.stopPropagation();
        //     e.preventDefault();
        // });


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



        // this.ui.querySelector("#info-view").onclick = function(event){
        //     event.preventDefault();
        //     event.stopPropagation();             
        // };
        

        this.ui.querySelector("#btn-exit").onclick = (event)=>{
            this.hide();
        }

        this.ui.querySelector("#btn-maximize").onclick = (event)=>{
            let v = this.viewUi;
            v.style.top = "0%";
            v.style.left = "0%";
            v.style.width = "100%";
            v.style.height = "100%";
            v.style["z-index"] = 5;

            event.target.style.display = 'none';
            this.ui.querySelector("#btn-restore").style.display = "inherit";
        }

        this.ui.querySelector("#btn-restore").onclick = (event)=>{
            let v = this.viewUi;
            v.style.top = "20%";
            v.style.left = "20%";
            v.style.width = "60%";
            v.style.height = "60%";
            event.target.style.display = 'none';
            this.ui.querySelector("#btn-maximize").style.display = "inherit";
        }


        this.ui.querySelector("#btn-generate").onclick = (event)=>{
            var xhr = new XMLHttpRequest();
                // we defined the xhr
            xhr.onreadystatechange = function () {
                if (this.readyState != 4) return;
            
                if (this.status == 200) {
                    console.log("crop scene finished.");
                }
            };
            
            xhr.open('POST', "/cropscene", true);

            let para={
                rawSceneId: this.frameInfo.scene,
                id: this.ui.querySelector("#scene-id").value,
                desc: this.ui.querySelector("#scene-desc").value,
                startTime: this.ui.querySelector("#scene-start-time").value,
                seconds:  this.ui.querySelector("#scene-seconds").value
            };

            xhr.send(JSON.stringify(para));
        }
    }

    hide()
    {
        this.ui.style.display = 'none';
    }

    frameInfo = {};

    show(frameInfo)
    {
        this.frameInfo = frameInfo;
        this.ui.querySelector("#scene-start-time").value=parseInt(frameInfo.frame)-10;
        this.ui.querySelector("#scene-seconds").value=20;
        
        this.ui.style.display = 'inherit';
        //this.ui.focus();
    }



}


export {CropScene};