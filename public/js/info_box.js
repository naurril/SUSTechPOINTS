import { globalKeyDownManager } from "./keydown_manager.js";
import { PopupDialog } from "./popup_dialog.js";



class InfoBox extends PopupDialog{
    
    mouseDown = false;
    mouseDwwnPos = {};


    constructor(ui)
    {
        super(ui);
        
        this.contentUi = this.ui.querySelector("#info-content");
        
        this.buttons = {
            "yes": this.ui.querySelector("#btn-yes"),
            "no":  this.ui.querySelector("#btn-no"),
            "maximize":  this.ui.querySelector("#btn-maximize"),
            "restore":  this.ui.querySelector("#btn-restore"),
            "exit":  this.ui.querySelector("#btn-exit"),
        };

        for (let btn in this.buttons)
        {
            this.buttons[btn].onclick = ()=>{
                this.hide(btn);
            }
        }

        this.ui.addEventListener("keydown", (ev)=>{  
            //anykey
            if ( ev.shiftKey || ev.ctrlKey || ev.altKey)
            {
                //
            }
            else
            {
                this.hide();
                ev.preventDefault();
                ev.stopPropagation();              
             }
            
        });
    }

    

    showButtons(btns){
        for (let btn in this.buttons)
        {
            this.buttons[btn].style.display = 'none';
        }

        for (let btn in btns)
        {
            this.buttons[btns[btn]].style.display = '';
        }
    }

    makeVisible(pointerPosition)
    {
        if (!pointerPosition)
        {
            
            //default pos
            let parentRect = this.ui.getBoundingClientRect();
            let viewRect = this.viewUi.getBoundingClientRect();

            this.viewUi.style.top = (parentRect.top+parentRect.height/3) + "px";
            this.viewUi.style.left = (parentRect.left+parentRect.width/2-viewRect.width/2) + "px";
        }
        else
        {
            let parentRect = this.ui.getBoundingClientRect();
            let viewRect = this.viewUi.getBoundingClientRect();

            let left = pointerPosition.x - viewRect.width/2;
            if (left < parentRect.left) left = parentRect.left;
            if (left + viewRect.width > parentRect.right)
                left -= left + viewRect.width - parentRect.right;

            let top = pointerPosition.y - viewRect.height/2;
            if (top < parentRect.top)
                top = parentRect.top;
            
            if (top + viewRect.height > parentRect.bottom)
                top -= top + viewRect.height - parentRect.bottom;

            this.viewUi.style.top = top + "px";
            this.viewUi.style.left = left + "px";
        }
    }


    show(title, content, btnList, onexit, pointerPosition)
    {
        this.showButtons(btnList);

        this.titleUi.innerText = title;
        this.contentUi.innerHTML = content;

        super.show(onexit);

        this.makeVisible(pointerPosition);

        this.ui.focus();
    }

}


export {InfoBox};