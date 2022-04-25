

import {psr_to_xyz} from "./util.js"
import * as THREE from './lib/three.module.js';
import { globalObjectCategory } from "./obj_cfg.js";
class FastToolBox{
    constructor(ui, eventHandler)
    {
        let self = this;
        this.ui = ui;
        this.eventHandler = eventHandler;

        this.installEventHandler();

        this.ui.querySelector("#attr-editor").onmouseenter=function(event){
            if (this.timerId)
            {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            
            event.target.querySelector("#attr-selector").style.display="";

        };


        this.ui.querySelector("#attr-editor").onmouseleave=function(event){
            let ui = event.target.querySelector("#attr-selector");

            this.timerId = setTimeout(()=>{
                ui.style.display="none";
                this.timerId = null;
            },
            200);           

        };
        
        this.ui.querySelector("#label-more").onmouseenter=function(event){
            if (this.timerId)
            {
                clearTimeout(this.timerId);
                this.timerId = null;
            }
            let ui = event.target.querySelector("#object-dropdown-menu");
            ui.style.display="inherit";
            ui.style.top = "100%";
            ui.style.left = "0%";
            ui.style.right = null;
            ui.style.bottom = null;

            let rect = ui.getClientRects()[0];
            if (window.innerHeight < rect.y+rect.height)
            {
                ui.style.top = null;
                ui.style.bottom = "100%";
            }

            if (window.innerWidth < rect.x+rect.width)
            {
                ui.style.left = null;
                ui.style.right = "0%";
            }
            
        };

        this.ui.querySelector("#label-more").onmouseleave=function(event){
            let ui = event.target.querySelector("#object-dropdown-menu");
            this.timerId = setTimeout(()=>{
                ui.style.display="none";
                this.timerId = null;
            },
            200);           
        };


        let dropdownMenu = this.ui.querySelector("#object-dropdown-menu");
        for (let i = 0; i < dropdownMenu.children.length; i++)
        {
            dropdownMenu.children[i].onclick = (event) =>
            {          
                //event.preventDefault();
                event.stopPropagation();

                this.eventHandler(event);                        

                this.ui.querySelector("#object-dropdown-menu").style.display="none";                
            }                   
        }
    }

    hide()
    {
        this.ui.style.display = "none";
    }

    show()
    {
        this.ui.style.display = "inline-block";
        this.ui.querySelector("#attr-selector").style.display="none";
    }


    setValue(obj_type, obj_track_id, obj_attr){
        this.ui.querySelector("#object-category-selector").value = obj_type;

        this.setAttrOptions(obj_type, obj_attr);

        this.ui.querySelector("#object-track-id-editor").value = obj_track_id;

        if (obj_attr)
            this.ui.querySelector("#attr-input").value = obj_attr;
        else
            this.ui.querySelector("#attr-input").value = "";
        
    }

    setPos(pos)
    {
        if (pos)
        {
            this.ui.style.top = pos.top;
            this.ui.style.left = pos.left;
        }
    }

    setAttrOptions(obj_type, obj_attr)
    {
       
        let attrs = ["static"];


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

    installEventHandler(){

        let btns = [
            "#label-del",
            "#label-gen-id",
            "#label-copy",
            "#label-paste",
            "#label-batchedit",
            "#label-trajectory",
            "#label-edit",
            "#label-highlight",
            "#label-rotate",
        ];

        btns.forEach(btn=>{
            this.ui.querySelector(btn).onclick = (event)=>{
                this.eventHandler(event);
            };
        });  

        this.ui.querySelector("#object-category-selector").onchange =  event=>{
            
            //this.ui.querySelector("#attr-input").value="";
            this.setAttrOptions(event.currentTarget.value, this.ui.querySelector("#attr-input").value);
            this.eventHandler(event);
        };


        this.ui.querySelector("#object-track-id-editor").onchange =    event=>this.eventHandler(event);
        this.ui.querySelector("#object-track-id-editor").addEventListener("keydown", e=>e.stopPropagation());
        this.ui.querySelector("#object-track-id-editor").addEventListener("keyup", event=>{
            event.stopPropagation();
            this.eventHandler(event);
        });
        
        this.ui.querySelector("#attr-input").onchange =    event=>this.eventHandler(event);
        this.ui.querySelector("#attr-input").addEventListener("keydown", e=>e.stopPropagation());
        this.ui.querySelector("#attr-input").addEventListener("keyup", event=>{
            event.stopPropagation();
            this.eventHandler(event);
        });
    }
}



class FloatLabelManager {
 
    id_enabled = true;
    category_enabled = true;
    color_scheme = "category";

    constructor(editor_ui, container_div, view, func_on_label_clicked)
    {
        this.view = view;  //access camera by view, since camera is dynamic
        this.editor_ui = editor_ui;
        this.container = container_div;
        this.labelsUi = editor_ui.querySelector("#floating-labels");
        this.floatingUi = editor_ui.querySelector("#floating-things");
        
        
    
        this.style = document.createElement('style');
        this.temp_style = document.createElement('style');
        this.on_label_clicked = func_on_label_clicked;

        document.head.appendChild(this.style);            
        document.head.appendChild(this.temp_style);      

        this.id_enabled = !pointsGlobalConfig.hideId;
        this.category_enabled = !pointsGlobalConfig.hideCategory;
    }

    hide(){
        this.floatingUi.style.display="none";
    }

    show(){
        this.floatingUi.style.display="";
    }


    

    show_id(show){
        
        this.id_enabled = show;

        if (!show){
            this.temp_style.sheet.insertRule(".label-obj-id-text {display: none}");
        }
        else{
            for (let i = this.temp_style.sheet.cssRules.length-1; i >= 0; i--){
                var r = this.temp_style.sheet.cssRules[i];
                if (r.selectorText === ".label-obj-id-text"){
                    this.temp_style.sheet.deleteRule(i);
                }
            }
            
        }

    }

    show_category(show){
        
        this.category_enabled = show;

        if (!show){
            this.temp_style.sheet.insertRule(".label-obj-type-text {display: none}");
            this.temp_style.sheet.insertRule(".label-obj-attr-text {display: none}");
        }
        else{
            for (let i = this.temp_style.sheet.cssRules.length-1; i >= 0; i--){
                var r = this.temp_style.sheet.cssRules[i];
                if (r.selectorText === ".label-obj-type-text" || r.selectorText === ".label-obj-attr-text"){
                    this.temp_style.sheet.deleteRule(i);
                }
            }
        }
        
    }

    // hide all temporarily when zoom in one object.
    hide_all(){
        // if (this.temp_style.sheet.cssRules.length == 0){
        //     this.temp_style.sheet.insertRule(".label-obj-id-text {display: none}");
        //     this.temp_style.sheet.insertRule(".label-obj-type-text {display: none}");
        //     this.temp_style.sheet.insertRule(".label-obj-attr-text {display: none}");
        // }
        this.labelsUi.style.display = "none";
    }

    restore_all(){
        // this.show_category(this.category_enabled);
        // this.show_id(this.id_enabled);   
        this.labelsUi.style.display = "";
    }

    remove_all_labels(){
        
        var _self = this;

        if (this.labelsUi.children.length>0){
            for (var c=this.labelsUi.children.length-1; c >= 0; c--){
                this.labelsUi.children[c].remove();                    
            }
        }
    }

    
    update_all_position(){
        if (this.labelsUi.children.length>0){
            for (var c=0; c < this.labelsUi.children.length; c++){
                var element = this.labelsUi.children[c];
                
                var best_pos = this.compute_best_position(element.vertices);
                var pos = this.coord_to_pixel(best_pos);

                element.style.top = Math.round(pos.y) + 'px';
                element.style.left = Math.round(pos.x) + 'px';


                element.className = element.orgClassName;
                if (pos.out_view){
                    element.className += " label-out-view";                         
                }
                
            }
        }
    }

    getLabelEditorPos(local_id)
    {
        let label = this.editor_ui.querySelector("#obj-local-"+local_id);
        if (label)
        {
            // if label is hidden, we can't use its pos directly.
            let best_pos = this.compute_best_position(label.vertices);
            let pos = this.coord_to_pixel(best_pos);

            
            return {
                top:  Math.round(pos.y) + label.offsetHeight + "px",
                left: Math.round(pos.x) + 30 + "px",
                };
        }
    }

    
    set_object_type(local_id, obj_type){
        var label = this.editor_ui.querySelector("#obj-local-"+local_id);
        if (label){
            label.obj_type = obj_type;
            label.update_text();
            this.update_color(label);
        }
    }

    set_object_attr(local_id, obj_attr){
        var label = this.editor_ui.querySelector("#obj-local-"+local_id);
        if (label){
            label.obj_attr = obj_attr;
            label.update_text();
            this.update_color(label);
        }
    }

    
    set_object_track_id(local_id, track_id){
        var label = this.editor_ui.querySelector("#obj-local-"+local_id);

        if (label){
            label.obj_track_id = track_id;
            label.update_text();   
            this.update_color(label);             
        }
    }

    translate_vertices_to_global(world, vertices) {
        let ret = [];
        for (let i = 0; i< vertices.length; i+=4)
        {
            let p = new THREE.Vector4().fromArray(vertices, i).applyMatrix4(world.webglGroup.matrix);
            ret.push(p.x);
            ret.push(p.y);
            ret.push(p.z);
            ret.push(p.w);
        }

        return ret;
        
    }

    update_position(box, refresh){
        var label = this.editor_ui.querySelector("#obj-local-"+box.obj_local_id);
        
        if (label){
            
            label.vertices = this.translate_vertices_to_global(box.world, psr_to_xyz(box.position, box.scale, box.rotation));

            if (refresh){
                var best_pos = this.compute_best_position(label.vertices);
                var pos = this.coord_to_pixel(best_pos);

                label.style.top = Math.round(pos.y) + 'px';
                label.style.left = Math.round(pos.x) + 'px';

                label.className = label.orgClassName;
                if (pos.out_view){
                    label.className += " label-out-view";                         
                }
            }
        }
    }

    

    remove_box(box){
        var label = this.editor_ui.querySelector("#obj-local-"+box.obj_local_id);

        if (label)
            label.remove();
    }

    set_color_scheme(color_scheme){
        this.color_scheme = color_scheme;
    }
    update_color(label)
    {
        if (this.color_scheme == "id")
        {                
            label.className = "float-label color-"+ (label.obj_track_id % 33);
        }
        else // by id
        {
            label.className = "float-label "+label.obj_type;
        }
        
        label.orgClassName = label.className;
    }

    add_label(box){
        
        var label = document.createElement('div');
        
        

        label.id = "obj-local-"+box.obj_local_id;

        var _self =this;

        label.update_text = function(){
            let label_text = '<div class="label-obj-type-text">';                
            label_text += this.obj_type;
            label_text += '</div>';

            if (this.obj_attr)
            {
                label_text += '<div class="label-obj-attr-text">';                
                label_text += this.obj_attr;
                label_text += '</div>';
            }

            label_text += '<div class="label-obj-id-text">';                
            label_text += this.obj_track_id;                
            label_text += '</div>';
            
            this.innerHTML = label_text; 
        }
        
        label.obj_type = box.obj_type;
        label.obj_local_id = box.obj_local_id;
        label.obj_track_id = box.obj_track_id;
        label.obj_attr = box.obj_attr;
        label.update_text();
        this.update_color(label);

        label.vertices = this.translate_vertices_to_global(box.world, psr_to_xyz(box.position, box.scale, box.rotation));

        var best_pos = this.compute_best_position(label.vertices);
        best_pos = this.coord_to_pixel(best_pos);
        
        var pos = best_pos;
        
        label.style.top = Math.round(pos.y) + 'px';
        label.style.left = Math.round(pos.x) + 'px';

        if (pos.out_view){
            label.className += " label-out-view";
        }

        this.labelsUi.appendChild(label);

        let self = this;
        label.onclick = ()=>{
            this.on_label_clicked(box);
        };
    }


    coord_to_pixel(p){
        var width = this.container.clientWidth, height = this.container.clientHeight;
        var widthHalf = width / 2, heightHalf = height / 2;

        var ret={
            x: ( p.x * widthHalf ) + widthHalf + 10,
            y: - ( p.y * heightHalf ) + heightHalf - 10,
            out_view: p.x>0.9 || p.x<-0.6 || p.y<-0.9 || p.y>0.9 || p.z< -1 || p.z > 1,
            // p.x<-0.6 to prevent it from appearing ontop of sideviews.
        }

        return ret;
    }

    compute_best_position(vertices){
        var _self = this;
        var camera_p = [0,1,2,3,4,5,6,7].map(function(i){
            return new THREE.Vector3(vertices[i*4+0], vertices[i*4+1], vertices[i*4+2]);
        });
        
        camera_p.forEach(function(x){
            x.project(_self.view.camera);
        });
        
        var visible_p = camera_p;

        var best_p = {x:-1, y: -1, z: -2};

        visible_p.forEach(function(p){
            if (p.x > best_p.x){
                best_p.x = p.x;
            }

            if (p.y > best_p.y){
                best_p.y = p.y;
            }

            if (p.z > best_p.z){
                best_p.z = p.z;
            }
        })

        return best_p;
    }
}


export {FloatLabelManager, FastToolBox};