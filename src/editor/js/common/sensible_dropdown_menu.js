class DropdownMenu{
 
    constructor(button, menu, parentUi)
    {
        this.button = button;
        this.menu = menu;

        
        this.parentUi = parentUi;

        this.button.onmouseenter=(event)=>{
            if (this.timerId)
            {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            let ui = this.menu;
            ui.style.display="inherit";
            ui.style.top = "100%";
            ui.style.left = "0%";
            ui.style.right = null;
            ui.style.bottom = null;

            let rect = ui.getClientRects()[0];

            let maxHeight = window.innerHeight;
            let maxWidth = window.innerWidth;

            if (this.parentUi)
            {
                let r = this.parentUi.getClientRects()[0];
                maxHeight = r.height;
                maxWidth = r.width;
            }

            if (maxHeight < rect.y+rect.height)
            {
                ui.style.top = null;
                ui.style.bottom = "100%";
            }

            if (maxWidth < rect.x+rect.width)
            {
                ui.style.left = null;
                ui.style.right = "0%";
            }
            
        };

        this.button.onmouseleave=(event)=>{
            
            this.timerId = setTimeout(()=>{
                this.menu.style.display="none";
                this.timerId = null;
            },
            200);           
        };
    }
}


export {DropdownMenu}