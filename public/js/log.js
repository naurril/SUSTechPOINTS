import { PopupDialog } from "./popup_dialog.js";




class LogWindow extends PopupDialog{
    
    mouseDown = false;
    mouseDwwnPos = {};


    constructor(ui, btn)
    {
        super(ui);
        
        this.btn = btn;
        this.svg = btn.querySelector("#log-svg");

        this.logsContentUi = this.ui.querySelector("#content-logs");
        this.errorsContentUi = this.ui.querySelector("#content-errors");
        this.clearBtn = this.ui.querySelector("#btn-clear");

        this.clearBtn.onclick = ()=>{ this.logsContentUi.innerHTML = ""; };
        this.log("Welcome!");

        this.logBtn = this.ui.querySelector("#tab-log");
        this.errorBtn = this.ui.querySelector("#tab-error");

        this.logBtn.onclick= ()=>{
            this.logBtn.className = "tab-button tab-selected";
            this.errorBtn.className = "tab-button";

            this.logsContentUi.style.display = 'inherit';
            this.errorsContentUi.style.display = 'none';
        }

        this.errorBtn.onclick= ()=>{
            this.errorBtn.className = "tab-button tab-selected";
            this.logBtn.className = "tab-button";

            this.logsContentUi.style.display = 'none';
            this.errorsContentUi.style.display = 'inherit';
        }
    }

    setErrorsContent(errors)
    {
        let summary = `${errors.length} warnings.<br>`;
        let text = errors.map(r=>`<a class='log-object-frame-id'>${r.frame_id},${r.obj_id}</a>, ${r.desc}<br>`).reduce((a,b)=>a+b, summary);
        this.errorsContentUi.innerHTML = text;

        this.errorsContentUi.querySelectorAll(".log-object-frame-id").forEach(ele=>{
            ele.onclick = (event)=>{
                let obj = event.currentTarget.innerHTML.split(",");
                console.log("click", obj);
                window.editor.currentMainEditor.gotoObjectFrame(...obj); //frameid, objid
            }
        });
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
        let div = this.logsContentUi;
        this.autoScroll = (div.scrollHeight-10 < div.scrollTop + div.clientHeight);
    }

    autoScrollOutput(){
        let div = this.logsContentUi;
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
        let old_content = this.logsContentUi.innerHTML;

        let thisstr = this.gettime() + " ";
        thisstr += this.buildLogStr(args.slice(1));

        this.logid++;

        
        this.logsContentUi.innerHTML = old_content + "<div id='log-" + this.logid + "'  class='" + color + "'>" + thisstr + "</div>";

        this.autoScrollOutput();
    }


    logid = 0;
    maxLogLength = 10000; // stringLength;
    log() {

        this.svg.style.fill= this.logid %2 ? "red" : "green";

        this.updateAutoScrollFlag();
        
        console.log(...arguments);
        let old_content = this.logsContentUi.innerHTML;

        let thisstr = this.gettime() + " ";
        //let thisstr = "";
        thisstr += this.buildLogStr(arguments);

        this.logid++;
        
        if (old_content.length > this.maxLogLength)
        {
            old_content = old_content.slice(old_content.length-this.maxLogLength);
            let firstLogPos = old_content.search("<div id=");
            old_content = old_content.slice(firstLogPos);
        }

        this.logsContentUi.innerHTML =  old_content + "<div id='log-" + this.logid + "'>" + thisstr + "</div>";
        this.autoScrollOutput();
    }

    logappend() {
        //console.log(...arguments);
        this.updateAutoScrollFlag();
        let thisstr = this.buildLogStr(arguments);
        this.logsContentUi.querySelector("#log-" + this.logid).innerHTML += thisstr;
        this.autoScrollOutput();
    }

    logappendcolor(color) {
        this.updateAutoScrollFlag();
        let args = [...arguments];
        let thisstr = this.buildLogStr(args.slice(1));
        let div = this.logsContentUi.querySelector("#log-" + this.logid);
        div.className = color;
        div.innerHTML += thisstr;
        this.autoScrollOutput();
    }

    logonce() {
        this.updateAutoScrollFlag(); 
        let old_content = this.logsContentUi.innerHTML;

        let thisstr = this.gettime() + " ";
        
        thisstr += this.buildLogStr(arguments);

        let laststr = this.logsContentUi.querySelector("#log-" + this.logid);
        if (laststr && laststr.innerHTML && thisstr == laststr.innerHTML) 
            return;

        this.logid++;
        this.logsContentUi.innerHTML = old_content + "<div id='log-" + this.logid + "'>" + thisstr + "</div>";
        this.autoScrollOutput();
    }

}





let logger = null;

function create_logger(ui, btn){
    logger = new LogWindow(ui, btn);
}

export{logger, create_logger};