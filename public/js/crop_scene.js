import { PopupDialog } from "./popup_dialog.js";


class CropScene extends PopupDialog{
    



    constructor(ui)
    {
        super(ui);

        this.ui = ui;  //wrapper

        this.contentUi = this.ui.querySelector("#content");
        
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
                //id: this.ui.querySelector("#scene-id").value,
                desc: this.ui.querySelector("#scene-desc").value,
                startTime: this.ui.querySelector("#scene-start-time").value,
                seconds:  this.ui.querySelector("#scene-seconds").value
            };

            xhr.send(JSON.stringify(para));
        }
    }


    frameInfo = {};

    show(frameInfo)
    {
        
        this.frameInfo = frameInfo;
        this.ui.querySelector("#scene-start-time").value=parseInt(frameInfo.frame)-10;
        this.ui.querySelector("#scene-seconds").value=20;
        
        super.show();
    }



}


export {CropScene};