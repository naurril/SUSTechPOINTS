
import { globalObjectCategory } from "../obj_cfg.js";

class AttrEditor
{
    /*
                                <div id="attr-editor">
									<input title="attribute" id="attr-input" type="text" size="10" placeholder="attribute">
									<div id="attr-selector">									
									</div>
								</div>
    */

    constructor(ui, eventHandler)
    {

        this.ui = ui;
        this.eventHandler = eventHandler;

        ui.querySelector("#attr-selector").style.display="none";

        this.ui.onmouseenter=function(event){
            if (this.timerId)
            {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            
            event.target.querySelector("#attr-selector").style.display="";

        };


        this.ui.onmouseleave=function(event){
            let ui = event.target.querySelector("#attr-selector");

            this.timerId = setTimeout(()=>{
                ui.style.display="none";
                this.timerId = null;
            },
            200);           

        };


        this.ui.querySelector("#attr-input").onchange =    event=>this.eventHandler(event);
        this.ui.querySelector("#attr-input").addEventListener("keydown", e=>e.stopPropagation());
        this.ui.querySelector("#attr-input").addEventListener("keyup", event=>{
            event.stopPropagation();
            this.eventHandler(event);
        });


        this.ui.querySelector("#attr-selector").onclick = (event)=>{

            let attrs = this.ui.querySelector("#attr-input").value;

            let objCurrentAttrs = [];
            if (attrs)
                objCurrentAttrs = attrs.split(",").map(a=>a.trim());
            

            let clickedAttr = event.target.innerText;

            if (objCurrentAttrs.find(x=>x==clickedAttr))
            {
                objCurrentAttrs = objCurrentAttrs.filter(x => x!= clickedAttr);
                event.target.className = 'attr-item';
            }
            else
            {
                objCurrentAttrs.push(clickedAttr);
                event.target.className = 'attr-item attr-selected';
            }

            attrs = "";
            if (objCurrentAttrs.length > 0)
            {
                attrs = objCurrentAttrs.reduce((a,b)=>a+ (a?",":"") + b);
            }

            this.ui.querySelector("#attr-input").value = attrs;

            this.eventHandler({
                currentTarget:{
                    id: "attr-input",
                    value: attrs
                }
            });
            
        }

    }

    setAttrOptions(obj_type, obj_attr)
    {
       
        let attrs = ["static", "occluded"];


        if (globalObjectCategory.obj_type_map[obj_type] && globalObjectCategory.obj_type_map[obj_type].attr)
            attrs = attrs.concat(globalObjectCategory.obj_type_map[obj_type].attr);
        
        // merge attrs
        let objAttrs = [];

        if (obj_attr){
            objAttrs = obj_attr.split(",").map(a=>a.trim());
            objAttrs.forEach(a=>{
                if (!attrs.find(x=>x==a))
                {
                    attrs.push(a);
                }
            })
        }


        let items = ``;

        
        attrs.forEach(a=>{
            if (objAttrs.find(x=>x==a)){
                items+= `<div class='attr-item attr-selected'>${a}</div>`
            }
            else {
                items+= `<div class='attr-item'>${a}</div>`
            }
        });
        
            
        this.ui.querySelector("#attr-selector").innerHTML = items;

        if (obj_attr)
            this.ui.querySelector("#attr-input").value = obj_attr;
        else
            this.ui.querySelector("#attr-input").value = "";
        
    }
}


export {AttrEditor}