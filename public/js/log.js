import { PopupDialog } from "./popup_dialog.js";



class LogWindow extends PopupDialog{
    
    mouseDown = false;
    mouseDwwnPos = {};


    constructor(ui, btn)
    {
        super(ui);
        
        this.btn = btn;
        this.svg = btn.querySelector("#log-svg");

        this.contentUi = this.ui.querySelector("#content");
        this.clearBtn = this.ui.querySelector("#btn-clear");

        this.clearBtn.onclick = ()=>{ this.contentUi.innerHTML = ""; };
        this.log("Welcome!");
    }

    setUi(ui)
    {

    }

    show()
    {
        super.show();
    }

    gettime() {
        let d = new Date();
        return "" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    }

    autoScroll = true;
    updateAutoScrollFlag()
    {
        let div = this.contentUi;
        this.autoScroll = (div.scrollHeight-10 < div.scrollTop + div.clientHeight);
    }

    autoScrollOutput(){
        let div = this.contentUi;
        if (this.autoScroll)
            div.scrollTop = div.scrollHeight;
    }

    isInt(n) {
        return n % 1 === 0;
    }

    buildLogStr(args) {
        let thisstr = "";
        for (let i in args) {
            if (typeof args[i] == "number") {
                thisstr += " <span class='number'>" + (isInt(args[i]) ? args[i] : args[i].toFixed(6)) + "</span>";
            } else if ([".", ",", ":", ";"].find((c) => c == args[i])) {
                thisstr += args[i];
            } else {
                thisstr += " " + args[i];
            }
        }

        return thisstr;
    }

    logcolor(color) {
        this.updateAutoScrollFlag();
        let args = [...arguments];
        console.log(...args.slice(1));
        let old_content = this.contentUi.innerHTML;

        let thisstr = this.gettime() + " ";
        thisstr += this.buildLogStr(args.slice(1));

        this.logid++;

        
        this.contentUi.innerHTML = old_content + "<div id='log-" + this.logid + "'  class='" + color + "'>" + thisstr + "</div>";

        this.autoScrollOutput();
    }


    logid = 0;
    log() {

        this.svg.style.fill= this.logid %2 ? "red" : "green";

        this.updateAutoScrollFlag();
        
        console.log(...arguments);
        let old_content = this.contentUi.innerHTML;

        let thisstr = this.gettime() + " ";
        //let thisstr = "";
        thisstr += this.buildLogStr(arguments);

        this.logid++;
        
        this.contentUi.innerHTML =  old_content + "<div id='log-" + this.logid + "'>" + thisstr + "</div>";
        this.autoScrollOutput();
    }

    logappend() {
        //console.log(...arguments);
        this.updateAutoScrollFlag();
        let thisstr = this.buildLogStr(arguments);
        this.contentUi.querySelector("#log-" + this.logid).innerHTML += thisstr;
        this.autoScrollOutput();
    }

    logappendcolor(color) {
        this.updateAutoScrollFlag();
        let args = [...arguments];
        let thisstr = this.buildLogStr(args.slice(1));
        let div = this.contentUi.querySelector("#log-" + this.logid);
        div.className = color;
        div.innerHTML += thisstr;
        this.autoScrollOutput();
    }

    logonce() {
        this.updateAutoScrollFlag(); 
        let old_content = this.contentUi.innerHTML;

        let thisstr = this.gettime() + " ";
        
        thisstr += this.buildLogStr(arguments);

        let laststr = this.contentUi.querySelector("#log-" + this.logid);
        if (laststr && laststr.innerHTML && thisstr == laststr.innerHTML) 
            return;

        this.logid++;
        this.contentUi.innerHTML = old_content + "<div id='log-" + this.logid + "'>" + thisstr + "</div>";
        this.autoScrollOutput();
    }

}





let logger = null;

function create_logger(ui, btn){
    logger = new LogWindow(ui, btn);
}

export{logger, create_logger};