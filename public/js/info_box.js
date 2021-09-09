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

    show(title, content, btnList, onexit)
    {
        this.showButtons(btnList);

        this.titleUi.innerText = title;
        this.contentUi.innerHTML = content;

        super.show(onexit);
    }

}


export {InfoBox};