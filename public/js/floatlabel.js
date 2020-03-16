

import {vector4to3, vector3_nomalize, psr_to_xyz, matmul, matmul2, euler_angle_to_rotate_matrix, rotation_matrix_to_euler_angle} from "./util.js"
import {
	Vector3, Int8Attribute
} from "./lib/three.module.js";


function createFloatLabelManager(view) {

    var manager = 
    {
        view : view,  //access camera by view, since camera is dynamic
        
        id_enabled: true,
        category_enabled: true,
        html_labels: document.getElementById("2Dlabels"),

        style: document.createElement('style'),
        temp_style: document.createElement('style'),

        init: function(){
            document.head.appendChild(this.style);            
            document.head.appendChild(this.temp_style);            
        },

        toggle_id: function(){
            
            if (this.id_enabled){
                this.style.sheet.insertRule(".label-obj-id-text {display: none}");
            }
            else{
                for (var i in this.style.sheet.cssRules){
                    var r = this.style.sheet.cssRules[i];
                    if (r.selectorText === ".label-obj-id-text"){
                        this.style.sheet.deleteRule(i);
                    }
                }
                
            }

            this.id_enabled = !this.id_enabled;
            
        },

        toggle_category: function(){
            
            if (this.category_enabled){
                this.style.sheet.insertRule(".label-obj-type-text {display: none}");
            }
            else{
                for (var i in this.style.sheet.cssRules){
                    var r = this.style.sheet.cssRules[i];
                    if (r.selectorText === ".label-obj-type-text"){
                        this.style.sheet.deleteRule(i);
                    }
                }
            }

            this.category_enabled = !this.category_enabled;
            
        },

        hide_all: function(){
            if (this.temp_style.sheet.cssRules.length == 0){
                this.temp_style.sheet.insertRule(".label-obj-id-text {display: none}");
                this.temp_style.sheet.insertRule(".label-obj-type-text {display: none}");
            }
        },

        restore_all: function(){
            if (this.temp_style.sheet.cssRules.length>0){
                this.temp_style.sheet.deleteRule(0);
                this.temp_style.sheet.deleteRule(0);    
            }    
        },

        remove_all_labels: function(){
            
            var _self = this;

            if (this.html_labels.children.length>0){
                for (var c=this.html_labels.children.length-1; c >= 0; c--){
                    this.html_labels.children[c].remove();                    
                }
            }
        },

        
        update_all_position: function(){
            if (this.html_labels.children.length>0){
                for (var c=0; c < this.html_labels.children.length; c++){
                    var element = this.html_labels.children[c];
                    
                    var best_pos = this.compute_best_position(element.vertices);
                    var pos = this.coord_to_pixel(best_pos);

                    element.style.top = Math.round(pos.y) + 'px';
                    element.style.left = Math.round(pos.x) + 'px';


                    element.className = "float-label "+element.obj_type;
                    if (pos.out_view){
                        element.className += " label-out-view";                         
                    }
                }
            }
        },

        update_obj_editor_position: function(local_id){
            var label = document.getElementById("obj-local-"+local_id);
            
            if (label){
                document.getElementById("obj-editor").style.top = label.style.top;
                document.getElementById("obj-editor").style.left = label.style.left;
            }
        },

        select_box: function(local_id){
            var label = document.getElementById("obj-local-"+local_id);

            
            if (label){                
                if (!label.selected){
                    label.className = "selected-float-label";
                    label.hidden = true;
                    label.selected = true;                
                    
                    document.getElementById("obj-editor").style.display = "inline-block";

                    document.getElementById("category-id-editor").style.display = "inherit";//"none";
                    document.getElementById("obj-label").style.display = "none";
                    document.getElementById("obj-label").innerText = label.innerText;
                    
                }
            }
        },

        unselect_box: function(local_id){
            var label = document.getElementById("obj-local-"+local_id);
            if (label){                
                label.className = "float-label" + " " + label.obj_type;
                label.hidden = false;
                label.selected = false;
                document.getElementById("obj-editor").style.display = "none";
            }
        },

        update_label_editor: function(obj_type, obj_track_id){
            document.getElementById("object-category-selector").value = obj_type;
            document.getElementById("object-track-id-editor").value = obj_track_id;
        },
        
        set_object_type: function(local_id, obj_type){
            var label = document.getElementById("obj-local-"+local_id);
            if (label){
                label.obj_type = obj_type;
                label.update_text();
            }
        },

        
        set_object_track_id: function(local_id, track_id){
            var label = document.getElementById("obj-local-"+local_id);

            if (label){
                label.obj_track_id = track_id;
                label.update_text();
            }
        },

        update_position: function(box, refresh){
            var label = document.getElementById("obj-local-"+box.obj_local_id);
            
            if (label){
               label.vertices = psr_to_xyz(box.position, box.scale, box.rotation);  //vector 4

               if (refresh){
                    var best_pos = this.compute_best_position(label.vertices);
                    var pos = this.coord_to_pixel(best_pos);

                    label.style.top = Math.round(pos.y) + 'px';
                    label.style.left = Math.round(pos.x) + 'px';

                    label.className = "float-label "+label.obj_type;
                    if (pos.out_view){
                        label.className += " label-out-view";                         
                    }
               }
            }
        },

        remove_box: function(box){
            var label = document.getElementById("obj-local-"+box.obj_local_id);

            if (label)
                label.remove();
        },

        add_label: function(box, on_click){
            
            var label = document.createElement('div');
            label.className = "float-label "+box.obj_type;
            label.id = "obj-local-"+box.obj_local_id;

            var _self =this;

            label.update_text = function(){
                var label_text = '<div class="label-obj-type-text">';                
                label_text += this.obj_type;
                label_text += '</div>';

                label_text += '<div class="label-obj-id-text">';                
                label_text += this.obj_track_id;                
                label_text += '</div>';
                
                this.innerHTML = label_text; 
            }
            
            label.obj_type = box.obj_type;
            label.obj_local_id = box.obj_local_id;
            label.obj_track_id = box.obj_track_id;
            label.update_text();

            label.vertices = psr_to_xyz(box.position, box.scale, box.rotation);  //vector 4

            var best_pos = this.compute_best_position(label.vertices);
            best_pos = this.coord_to_pixel(best_pos);
            
            var pos = best_pos;
            
            label.style.top = Math.round(pos.y) + 'px';
            label.style.left = Math.round(pos.x) + 'px';

            if (pos.out_view){
                label.className += " label-out-view";
            }

            label.selected = false;

            document.getElementById("2Dlabels").appendChild(label);
            label.onclick = function(){
                on_click();
            };
        },


        coord_to_pixel: function(p){
            var width = window.innerWidth, height = window.innerHeight;
            var widthHalf = width / 2, heightHalf = height / 2;

            var ret={
                x: ( p.x * widthHalf ) + widthHalf + 10,
                y: - ( p.y * heightHalf ) + heightHalf - 10,
                out_view: p.x>0.9 || p.x<-0.6 || p.y<-0.9 || p.y>0.9 || p.z< -1 || p.z > 1,
                // p.x<-0.6 to prevent it from appearing ontop of sideviews.
            }

            return ret;
        },

        compute_best_position: function(vertices){
            var _self = this;
            var camera_p = [0,1,2,3,4,5,6,7].map(function(i){
                return new Vector3(vertices[i*4+0], vertices[i*4+1], vertices[i*4+2]);
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
        },

    };

    manager.init();

    return manager;
}


export {createFloatLabelManager};