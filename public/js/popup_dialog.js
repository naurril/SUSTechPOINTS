

class MovableView
{
    mouseDown = false;
    mouseDownPos = null;

    // move starts in dragableUi, 
    // movable in movableUi,
    // the pos of posUi is set.
    constructor(dragableUi, posUi, funcOnMove)
    {

        let movableUi = document.getElementById("move-handle-wrapper");

        dragableUi.addEventListener("mousedown", (event)=>{
            if (event.which == 1 && event.currentTarget == event.target)
            {
                dragableUi.style.cursor = "move";
                this.mouseDown = true;
                this.mouseDownPos = {x: event.clientX, y:event.clientY};

                movableUi.style.display="inherit";
            }
        });

        movableUi.addEventListener("mouseup", (event)=>{
            if (this.mouseDown){
                dragableUi.style.cursor = "";
                event.stopPropagation();
                event.preventDefault();
                this.mouseDown = false;          
                
                movableUi.style.display="none";
            }
        });

        movableUi.addEventListener("mousemove", (event)=>{

            if (this.mouseDown){
                let posDelta = {
                    x: event.clientX - this.mouseDownPos.x,
                    y: event.clientY - this.mouseDownPos.y 
                };
    
                this.mouseDownPos = {x: event.clientX, y:event.clientY};

                let left = posUi.offsetLeft;
                let top  = posUi.offsetTop;

                posUi.style.left = Math.max(0, (left + posDelta.x)) + 'px';
                posUi.style.top = Math.max(0, (top + posDelta.y)) + 'px';

                if (funcOnMove)
                    funcOnMove();
            }

        });
    }
}


class PopupDialog extends MovableView
{
    constructor(ui)
    {
        super(ui.querySelector("#header"), ui.querySelector("#view"));

        this.ui = ui;  //wrapper
        this.viewUi = this.ui.querySelector("#view");
        this.headerUi = this.ui.querySelector("#header");        
        this.titleUi = this.ui.querySelector("#title");
        
        this.ui.onclick = ()=>{
            this.hide();
        };
        
        this.ui.addEventListener("keydown", (event)=>{

            if (event.key == 'Escape'){
                this.hide();
                
                event.preventDefault();
            }
            event.stopPropagation();              
        });

        this.viewUi.onclick = function(event){
            //event.preventDefault();
            event.stopPropagation();             
        };

        this.titleUi.onclick = function(event){
            //event.preventDefault();
            event.stopPropagation();  
        };

        this.titleUi.addEventListener("mousedown", (event)=>{
            //event.preventDefault();
            event.stopPropagation();
        });

        this.titleUi.addEventListener("contextmenu", (event)=>{
            event.stopPropagation();
        })

        // this.viewUi.addEventListener("contextmenu", (e)=>{
        //     e.stopPropagation();
        //     e.preventDefault();
        // });


        



        // this.ui.querySelector("#info-view").onclick = function(event){
        //     event.preventDefault();
        //     event.stopPropagation();             
        // };
        

        this.ui.querySelector("#btn-exit").onclick = (event)=>{
            this.hide();
        }

        this.maximizeButton = this.ui.querySelector("#btn-maximize")

        if (this.maximizeButton)
        {
            this.maximizeButton.onclick = (event)=>{
                let v = this.viewUi;
                v.style.top = "0%";
                v.style.left = "0%";
                v.style.width = "100%";
                v.style.height = "100%";
                v.style["z-index"] = 5;

                event.currentTarget.style.display = 'none';
                this.ui.querySelector("#btn-restore").style.display = "inherit";
            };
        }

        this.restoreButton = this.ui.querySelector("#btn-restore");
        
        if (this.restoreButton) {
            this.restoreButton.onclick = (event)=>{
                let v = this.viewUi;
                v.style.top = "20%";
                v.style.left = "20%";
                v.style.width = "60%";
                v.style.height = "60%";
                event.currentTarget.style.display = 'none';
                this.ui.querySelector("#btn-maximize").style.display = "inherit";
            };
        }

    }



    hide(msg)
    {
        this.ui.style.display = 'none';

        if (this.onExit)
        {
            this.onExit(msg);
        }
    }
    
    show(onexit)
    {
        this.ui.style.display = 'inherit';
        this.onExit = onexit;
        //this.ui.focus();
    }

    
}


export {PopupDialog, MovableView}