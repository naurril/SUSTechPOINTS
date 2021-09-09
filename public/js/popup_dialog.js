class PopupDialog
{
    mouseDown = false;


    constructor(ui)
    {
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


        this.headerUi.addEventListener("mousedown", (event)=>{
            if (event.which == 1)
            {
                this.headerUi.style.cursor = "move";
                this.mouseDown = true;
                this.mouseDownPos = {x: event.clientX, y:event.clientY};

                this.savedUiSize = {
                    width: this.ui.style.width,
                    height: this.ui.style.height,
                };

                this.ui.style.width = "100%";
                this.ui.style.height = "100%";
            }
        });

        this.ui.addEventListener("mouseup", (event)=>{
            if (this.mouseDown){
                this.headerUi.style.cursor = "";
                event.stopPropagation();
                event.preventDefault();
                this.mouseDown = false;          
                
                this.ui.style.width = this.savedUiSize.width;
                this.ui.style.height = this.savedUiSize.height;

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


export {PopupDialog}