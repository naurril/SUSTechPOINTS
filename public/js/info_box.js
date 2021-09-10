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
            "no":  this.ui.querySelector("#btn-no")
        };

        for (let btn in this.buttons)
        {
            this.buttons[btn].onclick = ()=>{
                this.hide(btn);
            }
        }
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
            return;
        
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


    show(title, content, btnList, onexit, pointerPosition)
    {
        this.showButtons(btnList);

        this.titleUi.innerText = title;
        this.contentUi.innerHTML = content;

        super.show(onexit);

        this.makeVisible(pointerPosition);

    }

}


export {InfoBox};