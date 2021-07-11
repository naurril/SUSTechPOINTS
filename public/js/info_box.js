import { PopupDialog } from "./popup_dialog.js";



class InfoBox extends PopupDialog{
    
    mouseDown = false;
    mouseDwwnPos = {};


    constructor(ui)
    {
        super(ui);
        
        this.contentUi = this.ui.querySelector("#info-content");
        
    }


    show(title, content)
    {
        
        this.titleUi.innerText = title;
        this.contentUi.innerText = content;

        super.show();
    }

}


export {InfoBox};