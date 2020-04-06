import * as THREE from './lib/three.module.js';
import { GUI } from './lib/dat.gui.module.js';

import {ViewManager} from "./view.js"
import {createFloatLabelManager} from "./floatlabel.js"
import {Mouse} from "./mouse.js"
import {ProjectiveViewOps}  from "./side_view_op.js"
import {ImageContext} from "./image.js"
import {get_obj_cfg_by_type, obj_type_map, get_next_obj_type_name, guess_obj_type_by_dimension} from "./obj_cfg.js"
import {Data} from './data.js'
import {load_obj_ids_of_scene, generate_new_unique_id} from "./obj_id_list.js"
import {Header} from "./header.js"
import {matmul2, euler_angle_to_rotate_matrix, dotproduct, linalg_std} from "./util.js"
import {BoxOp} from './box_op.js';
import {AutoAdjust} from "./auto-adjust.js"
import {PlayControl} from "./play.js"
import {save_annotation} from "./save.js"

function Editor(editorUi, editorCfg, metaData){

    this.editorCfg = editorCfg;
    this.sideview_enabled = true;
    this.editorUi = editorUi;
    this.container = null;

    this.data = null;
    this.scene = null;
    this.renderer = null;
    this.selected_box = null;
    this.windowWidth = null;
    this.windowHeight= null;
    this.floatLabelManager = null;
    this.operation_state = {
            mouse_right_down : false,
            key_pressed : false,
            box_navigate_index:0,
        };
    this.view_state = {
        lock_obj_track_id : "",
        lock_obj_in_highlight : false,  // focus mode
        autoLock: function(trackid, focus){
            this.lock_obj_track_id = trackid;
            this.lock_obj_in_highlight = focus;
        }
    };

    this.header = null;
    this.imageContext = null;
    this.boxOp = null;
    
    this.init = function(editorUi) {
    
        let self = this;
        this.editorUi = editorUi;
        this.data = new Data(metaData);
        this.playControl = new PlayControl(this.data);
        this.header = new Header(editorUi.querySelector("#info"), this.data, this.editorCfg,
            (e)=>{
                this.scene_changed(e.currentTarget.value);
                //event.currentTarget.blur();
            },        
            (e)=>{this.frame_changed(e)},
            (e)=>{this.camera_changed(e)}        
        );
        this.scene = new THREE.Scene();

        
        this.data.set_webgl_scene(this.scene);
        this.boxOp = new BoxOp(this.data);

        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        
        this.container = editorUi.querySelector("#container");
        this.container.appendChild( this.renderer.domElement );        

        this.viewManager = new ViewManager(this.container, this.scene, this.renderer, 
            function(){self.render();}, 
            function(box){self.on_box_changed(box)},
            this.editorCfg);
        this.views = this.viewManager.views;

        this.imageContext = new ImageContext(this.data, this.editorUi, this.editorCfg);

        if (!this.editorCfg.disableRangeCircle)
            this.addRangeCircle();
    
        this.floatLabelManager = createFloatLabelManager(this.editorUi, this.container, this.views[0],function(box){self.select_bbox(box);});
    
        //this.init_gui();
        
        this.scene.add( new THREE.AxesHelper( 1 ) );
    
        this.onWindowResize();
    
        window.addEventListener( 'resize', function(){self.onWindowResize();}, false );
        

        if (!this.editorCfg.disableMainViewKeyDown){
            this.container.onmouseenter = (event)=>{
                this.container.focus();
            };

            this.container.onmouseleave = (event)=>{
                this.container.blur();                
            };

            this.container.addEventListener( 'keydown', function(e){self.keydown(e);} );
        }

        this.mouse = new Mouse(
                this.views,
                this.operation_state,
                this.container, 
                this.editorUi,
                function(ev){self.handleLeftClick(ev);}, 
                function(ev){self.handleRightClick(ev);}, 
                function(x,y,w,h){self.handleSelectRect(x,y,w,h);});
    
        this.autoAdjust=new AutoAdjust(this.mouse);

        this.editorUi.querySelector("#object-category-selector").onchange = function(ev){self.object_category_changed(ev);};
        this.editorUi.querySelector("#object-track-id-editor").onchange = function(ev){self.object_track_id_changed(ev);};
        this.editorUi.querySelector("#object-track-id-editor").addEventListener("keydown", function(e){
            e.stopPropagation();});
        
        this.editorUi.querySelector("#object-track-id-editor").addEventListener("keyup", function(e){
            e.stopPropagation();
    
            if (this.selected_box){
                this.selected_box.obj_track_id = this.value;
                this.floatLabelManager.set_object_track_id(this.selected_box.obj_local_id, this.selected_box.obj_track_id);
            }
        });


    
        this.projectiveViewOps = new ProjectiveViewOps(
            this.editorUi.querySelector("#sub-views"),
            this.editorCfg,
            this.data,
            this.views,
            this.boxOp,
            function(){return self.selected_box;},
            function(b){return self.on_box_changed(b);},
            function(b){return self.updateSubviewRangeByWindowResize(b);}
        );

        this.install_fast_tool();
    
        this.install_context_menu();
    
        this.projectiveViewOps.init_view_operation();
        //this.projectiveViewOps.hide();
    
        if (!this.editorCfg.disableGrid)
            this.installGridLines()
    
        window.onbeforeunload = function() {
            return "Exit?";
            //if we return nothing here (just calling return;) then there will be no pop-up question at all
            //return;
        };
        
    };

    this.run = function(){
        //this.animate();
        this.render();
        //$( "#maincanvas" ).resizable();
        
        let self = this;
        this.imageContext.init_image_op(function(){
            return self.selected_box;
        });

        this.add_global_obj_type();
    };


    this.addRangeCircle= function(){
        
        var h = 1;
                        
        var body = [
        ];
        
        var segments=64;
        for (var i = 0; i<segments; i++){
            var theta1 = (2*Math.PI/segments) * i;
            var x1 = Math.cos(theta1);
            var y1 = Math.sin(theta1);

            var theta2 = 2*Math.PI/segments * ((i+1)%segments);
            var x2 = Math.cos(theta2);
            var y2 = Math.sin(theta2);

            body.push(x1,y1,h,x2,y2,h);
        }

        var bbox = new THREE.BufferGeometry();
        bbox.addAttribute( 'position', new THREE.Float32BufferAttribute(body, 3 ) );
        
        var box = new THREE.LineSegments( bbox, new THREE.LineBasicMaterial( { color: 0x444444, linewidth: 1 } ) );    
        
        box.scale.x=50;
        box.scale.y=50;
        box.scale.z=-3;
        box.position.x=0;
        box.position.y=0;
        box.position.z=0;
        box.computeLineDistances();

        this.scene.add(box);
    };

    this.installGridLines= function(){
        
        var svg = this.editorUi.querySelector("#grid-lines-wrapper");

        for (var i=1; i<10; i++){
            const line = document. createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "0%");
            line.setAttribute("y1", String(i*10)+"%");
            line.setAttribute("x2", "100%");
            line.setAttribute("y2", String(i*10)+"%");
            line.setAttribute("class", "grid-line");
            svg.appendChild(line);
        }

        for (var i=1; i<10; i++){
            const line = document. createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("y1", "0%");
            line.setAttribute("x1", String(i*10)+"%");
            line.setAttribute("y2", "100%");
            line.setAttribute("x2", String(i*10)+"%");
            line.setAttribute("class", "grid-line");
            svg.appendChild(line);
        }
        
    };

    this.install_fast_tool= function(){
        let self=this;
        this.editorUi.querySelector("#label-del").onclick = function(){
            self.remove_selected_box();
            self.header.mark_changed_flag();
            //event.currentTarget.blur();
        };

        this.editorUi.querySelector("#label-copy").onclick = function(event){
            mark_bbox(self.selected_box, self.header);
            //event.currentTarget.blur();
        }

        this.editorUi.querySelector("#label-paste").onclick = (event)=>{
            this.autoAdjust.smart_paste(self.selected_box);
            //event.currentTarget.blur();
        }

        this.editorUi.querySelector("#label-edit").onclick = function(event){
            event.currentTarget.blur();
            self.select_bbox(self.selected_box);
        }

        this.editorUi.querySelector("#label-reset").onclick = function(event){
            event.currentTarget.blur();
            if (self.selected_box){
                //switch_bbox_type(this.selected_box.obj_type);
                self.transform_bbox("reset");
            }        
        }

        this.editorUi.querySelector("#label-highlight").onclick = function(event){
            event.currentTarget.blur();
            if (self.selected_box.in_highlight){
                self.cancelFocus(self.selected_box);
                self.view_state.lock_obj_in_highlight = false
            }
            else {
                self.focusOnSelectedBox(self.selected_box);
            }
        }

        this.editorUi.querySelector("#label-rotate").onclick = function(event){
            event.currentTarget.blur();
            self.transform_bbox("z_rotate_reverse");        
        }
    };

    this.cancelFocus= function(box){
        
        box.in_highlight = false;
        //view_state.lock_obj_in_highlight = false; // when user unhighlight explicitly, set it to false
        this.data.world.cancel_highlight(box);
        this.floatLabelManager.restore_all();
        this.views[0].save_orbit_state(box.scale);
        this.views[0].orbit.reset();
    };

    this.focusOnSelectedBox= function(box){
        if (this.editorCfg.disableMainView)
            return;

        if (box){
            this.data.world.highlight_box_points(box);
            
            this.floatLabelManager.hide_all();
            this.views[0].orbit.saveState();

            //this.views[0].camera.position.set(this.selected_box.position.x+this.selected_box.scale.x*3, this.selected_box.position.y+this.selected_box.scale.y*3, this.selected_box.position.z+this.selected_box.scale.z*3);

            this.views[0].orbit.target.x = box.position.x;
            this.views[0].orbit.target.y = box.position.y;
            this.views[0].orbit.target.z = box.position.z;

            this.views[0].restore_relative_orbit_state(box.scale);


            this.views[0].orbit.update();

            this.render();
            box.in_highlight=true;
            this.view_state.lock_obj_in_highlight = true;
        }
    };

    this.install_context_menu= function(){

        var self=this;
        this.editorUi.querySelector("#context-menu-wrapper").onclick = function(event){
            event.currentTarget.style.display="none"; 
            event.preventDefault();
            event.stopPropagation();             
        };

        this.editorUi.querySelector("#context-menu-wrapper").oncontextmenu = function(event){
            event.currentTarget.style.display="none"; 
            event.preventDefault();
            event.stopPropagation();
        };
        
        /*    
        this.editorUi.querySelector("#context-menu").onclick = function(enabled){
            // some items clicked
            this.editorUi.querySelector("#context-menu-wrapper").style.display = "none";
            event.preventDefault();
            event.stopPropagation();
        };

        this.editorUi.querySelector("#new-submenu").onclick = function(enabled){
            // some items clicked
            this.editorUi.querySelector("#context-menu-wrapper").style.display = "none";
            event.preventDefault();
            event.stopPropagation();
        };
        */

        this.editorUi.querySelector("#cm-new").onclick = function(event){
            //add_bbox();
            //header.mark_changed_flag();

            // all submenus of `new' will forward click event to here
            // since they are children of `new'
            // so we should 
            event.preventDefault();
            event.stopPropagation();


        };

        this.editorUi.querySelector("#cm-new").onmouseenter = function(event){
            var item = self.editorUi.querySelector("#new-submenu");
            item.style.display="inherit";
        };

        this.editorUi.querySelector("#cm-new").onmouseleave = function(event){
            self.editorUi.querySelector("#new-submenu").style.display="none";
            //console.log("leave  new item");
        };


        this.editorUi.querySelector("#new-submenu").onmouseenter=function(event){
            var item = self.editorUi.querySelector("#new-submenu");
            item.style.display="block";
        }

        this.editorUi.querySelector("#new-submenu").onmouseleave=function(event){
            var item = self.editorUi.querySelector("#new-submenu");
            item.style.display="none";
        }



        self.editorUi.querySelector("#cm-paste").onclick = (event)=>{
            this.autoAdjust.smart_paste(self.selected_box);
        };

        self.editorUi.querySelector("#cm-prev-frame").onclick = function(event){      
            self.previous_frame();
        };

        self.editorUi.querySelector("#cm-next-frame").onclick = function(event){      
            self.next_frame();
        };

        self.editorUi.querySelector("#cm-save").onclick = function(event){      
            save_annotation(self.data, function(){
                self.header.unmark_changed_flag();
            });
        };


        self.editorUi.querySelector("#cm-play").onclick = function(event){      
            self.playControl.play_current_scene_with_buffer(false,
                function(s,f){
                    self.on_load_world_finished(s,f)
                });
        };
        self.editorUi.querySelector("#cm-stop").onclick = function(event){      
            self.playControl.stop_play();
        };
        self.editorUi.querySelector("#cm-pause").onclick = function(event){      
            self.playControl.pause_resume_play();
        };


        self.editorUi.querySelector("#cm-prev-object").onclick = function(event){      
            self.select_previous_object();
        };

        self.editorUi.querySelector("#cm-next-object").onclick = function(event){      
            self.select_previous_object();
        };

        self.editorUi.querySelector("#cm-delete").onclick = function(event){      
            self.remove_selected_box();
            self.header.mark_changed_flag();
        };

        self.editorUi.querySelector("#cm-interpolate").onclick = function(event){      
            self.interpolate_selected_object();
            self.header.mark_changed_flag();
        };
        
        
    };


    this.animate= function() {
        let self=this;
        requestAnimationFrame( function(){self.animate();} );
        this.views[0].orbit_orth.update();
    };



    this.render= function(){

        this.views.forEach(v=>v.render());

        this.floatLabelManager.update_all_position();
        if (this.selected_box){
            this.floatLabelManager.update_obj_editor_position(this.selected_box.obj_local_id);
        }

    };

    

    this.scene_changed= function(scene_name){
        
        //var scene_name = event.currentTarget.value;

        if (scene_name.length == 0){
            return;
        }
        
        console.log("choose scene_name " + scene_name);
        var meta = this.data.get_meta_by_scene_name(scene_name);

        var frame_selector_str = meta.frames.map(function(f){
            return "<option value="+f+">"+f + "</option>";
        }).reduce(function(x,y){return x+y;}, "<option>--frame--</option>");

        this.editorUi.querySelector("#frame-selector").innerHTML = frame_selector_str;
        
        
        if (meta.image){
            var camera_selector_str = meta.image.map(function(c){
                return '<option value="'+c+'">'+c+'</option>';
            }).reduce(function(x,y){return x+y;}, "<option>--camera--</option>");
            this.editorUi.querySelector("#camera-selector").innerHTML = camera_selector_str;
        }

        load_obj_ids_of_scene(scene_name);
    };

    this.frame_changed= function(event){
        var scene_name = this.editorUi.querySelector("#scene-selector").value;

        if (scene_name.length == 0){
            return;
        }

        var frame =  event.currentTarget.value;
        console.log(scene_name, frame);
        this.load_world(scene_name, frame);

        event.currentTarget.blur();
    };

    this.camera_changed= function(event){
        var camera_name = event.currentTarget.value;

        this.data.set_active_image(camera_name);
        this.imageContext.render_2d_image();

        event.currentTarget.blur();
    };

    this.install_view_menu= function(gui){
        var self=this;
        var cfgFolder = gui.addFolder( 'View' );

        params["toggle side views"] = function(){
            sideview_enabled = !sideview_enabled;
            self.render();
        };  

        params["bird's eye view"] = false;
        params["hide image"] = false;
            
        params["toggle id"] = function(){
            self.floatLabelManager.toggle_id();
            
        };
        params["toggle category"] = function(){
            self.floatLabelManager.toggle_category();
            
        };

        params["toggle background"] = function(){
            self.data.toggle_background();
            self.render();
        };

        // params["test2"] = function(){
        //     grow_box(0.2, {x:1, y:1, z:3});
        //     on_box_changed(this.selected_box);
        // };
        
        params["reset main view"] = function(){
            this.views[0].reset_camera();
            this.views[0].reset_birdseye();
            //render();
        };

        params["rotate bird's eye view"] = function(){
            this.views[0].rotate_birdseye();
            this.render();
        };
        
        //params["side view width"] = 0.2;

        params["point size+"] = function(){
            self.data.scale_point_size(1.2);
            self.render();
        };
        
        params["point size-"] = function(){
            self.data.scale_point_size(0.8);
            self.render();
        };

        params["point brightness+"] = function(){
            self.data.scale_point_brightness(1.2);
            load_world(self.data.world.frameInfo.scene, self.data.world.frameInfo.frame);
        };
        
        params["point brightness-"] = function(){
            self.data.scale_point_brightness(0.8);
            load_world(self.data.world.frameInfo.scene, self.data.world.frameInfo.frame);
        };

        params["toggle box"] = function(){
            self.data.toggle_box_opacity();
            if (self.selected_box){
                self.selected_box.material.opacity = 1;                
            }

            self.render();
        }

        params["toggle obj color"] = function(){
            self.data.toggle_color_obj();
            self.render();
        }

        cfgFolder.add( params, "point size+");
        cfgFolder.add( params, "point size-");
        cfgFolder.add( params, "point brightness+");
        cfgFolder.add( params, "point brightness-");

        //cfgFolder.add( params, "test2");

        cfgFolder.add( params, "toggle side views");
        //cfgFolder.add( params, "side view width");
        cfgFolder.add( params, "bird's eye view");
        cfgFolder.add( params, "hide image");

        cfgFolder.add( params, "toggle background");
        cfgFolder.add( params, "toggle box");
        cfgFolder.add( params, "toggle obj color");
        cfgFolder.add( params, "toggle id");
        cfgFolder.add( params, "toggle category");

        cfgFolder.add( params, "reset main view");
        cfgFolder.add( params, "rotate bird's eye view");


        params["play"] = function(){
            play_current_scene_with_buffer(flase, function(s,f){self.on_load_world_finished(s,f)});
        }
        params["stop"] = stop_play;
        params["previous frame"] = previous_frame;
        params["next frame"] = next_frame;

        cfgFolder.add( params, "play");
        cfgFolder.add( params, "stop");
        cfgFolder.add( params, "previous frame");
        cfgFolder.add( params, "next frame");
    };

    this.init_gui= function(){
        var gui = new GUI();

        // view
        install_view_menu(gui);

        //edit
        // var editFolder = gui.addFolder( 'Edit' );
        // params['select-ref-bbox'] = function () {
        //     mark_bbox();
        // };
        
        // params['auto-adjust'] = function () {
        //     auto_adjust_bbox();
        // };

        // params['paste'] = function () {
        //     paste_bbox();
        // };

        // params['smart-paste'] = function () {
        //     if (!this.selected_box)
        //         paste_bbox();
        //     auto_adjust_bbox(function(){
        //         save_annotation();
        //     });
            
        // };
        
        // editFolder.add( params, 'select-ref-bbox');
        // editFolder.add( params, 'paste');
        // editFolder.add( params, 'auto-adjust');
        // editFolder.add( params, 'smart-paste');


        

        //file
        var fileFolder = gui.addFolder( 'File' );
        params['save'] = ()=> {
            save_annotation(this.data);
        };
        fileFolder.add( params, 'save');

        
        // params['reload'] = function () {
        //     load_world(data.world.frameInfo.scene, data.world.frameInfo.frame);
        // };

        // fileFolder.add( params, 'reload');

        // params['clear'] = function () {
        //     clear();
        // };
        // fileFolder.add( params, 'clear');


        //fileFolder.open();

        //var dataFolder = gui.addFolder( 'Data' );
        //load_data_meta(dataFolder);


        var toolsFolder = gui.addFolder( 'Experimental Tools' );

        install_calib_menu(toolsFolder);

        // params['calibrate_axes'] = function () {
        //     ml.calibrate_axes(data.world.get_all_pionts());
        //     render();
        // };
        // toolsFolder.add( params, 'calibrate_axes');

        // params['l-shape fit'] = function () {
        //     let points = data.world.get_points_relative_coordinates_of_box(this.selected_box, 1.0);
        //     points = points.map(function(p){
        //         return [p[0],p[1]];
        //     });

        //     var angle = ml.l_shape_fit(points);
        //     this.selected_box.rotation.z += angle;
        //     on_box_changed(this.selected_box);
            
        // };
        // toolsFolder.add( params, 'l-shape fit');


        // params['predict rotation'] = function () {
        //     if (this.selected_box)
        //         auto_direction_predict(this.selected_box);
        // };

        // toolsFolder.add( params, 'predict rotation');


        // var calAxisFolder = toolsFolder.addFolder( 'calibarate axis');
        // params['axis x +'] = function () {
        //     ml.calibrate_axes(data.world.get_all_pionts());
        //     render();
        // };
        // calAxisFolder.add( params, 'axis x +');

        // params['axis x -'] = function () {
        //     ml.calibrate_axes(data.world.get_all_pionts());
        //     render();
        // };
        // calAxisFolder.add( params, 'axis x -');

        // params['axis y +'] = function () {
        //     ml.calibrate_axes(data.world.get_all_pionts());
        //     render();
        // };
        // calAxisFolder.add( params, 'axis y +');

        // params['axis y -'] = function () {
        //     ml.calibrate_axes(data.world.get_all_pionts());
        //     render();
        // };
        // calAxisFolder.add( params, 'axis y -');


        gui.open();
    };

    this.object_category_changed= function(event){
        if (this.selected_box){
            
            this.selected_box.obj_type = event.currentTarget.value;
            this.floatLabelManager.set_object_type(this.selected_box.obj_local_id, this.selected_box.obj_type);
            this.header.mark_changed_flag();
            this.updateBoxPointsColor(this.selected_box);
            this.imageContext.image_manager.update_obj_type(this.selected_box.obj_local_id, this.selected_box.obj_type);
        }
    };

    this.object_track_id_changed= function(event){
        if (this.selected_box){
            var id = event.currentTarget.value;


            if (id == "auto"){
                id = generate_new_unique_id();
                this.floatLabelManager.update_label_editor(this.selected_box.obj_type, id);
            }

            this.selected_box.obj_track_id = id;
            this.floatLabelManager.set_object_track_id(this.selected_box.obj_local_id, this.selected_box.obj_track_id);
            this.header.mark_changed_flag();
        }
    };

    this.updateSubviewRangeByWindowResize= function(box){

        if (box === null)
            return;

        this.projectiveViewOps.update_view_handle(this.selected_box);
        
        this.views[1].updateCameraRange(box);
        this.views[2].updateCameraRange(box);
        this.views[3].updateCameraRange(box);

        this.render();
    };

    this.updateSubviewByBox= function(box){
        var p = box.position;
        var r = box.rotation;
        //console.log(r);
        //
        this.views[1].camera.rotation.x= r.x;
        this.views[1].camera.rotation.y= r.y;
        this.views[1].camera.rotation.z= r.z-Math.PI/2;

        this.views[1].camera.position.x= p.x;
        this.views[1].camera.position.y= p.y;
        this.views[1].camera.position.z= p.z;
        this.views[1].camera.updateProjectionMatrix();
        this.views[1].cameraHelper.update(); 
        

        var trans_matrix = euler_angle_to_rotate_matrix(r, p);


        this.views[2].camera.position.x= p.x;
        this.views[2].camera.position.y= p.y;
        this.views[2].camera.position.z= p.z;

        var up = matmul2(trans_matrix, [0, 0, 1, 0], 4);
        this.views[2].camera.up.set( up[0], up[1], up[2]);
        var at = matmul2(trans_matrix, [0, 1, 0, 1], 4);
        this.views[2].camera.lookAt( at[0], at[1], at[2] );
        
        
        this.views[2].camera.updateProjectionMatrix();
        this.views[2].cameraHelper.update();
        

        this.views[3].camera.position.x= p.x;
        this.views[3].camera.position.y= p.y;
        this.views[3].camera.position.z= p.z;

        var up3 = matmul2(trans_matrix, [0, 0, 1, 0], 4);
        this.views[3].camera.up.set( up3[0], up3[1], up3[2]);
        var at3 = matmul2(trans_matrix, [-1, 0, 0, 1], 4);
        this.views[3].camera.lookAt( at3[0], at3[1], at3[2] );
        

        this.views[3].camera.updateProjectionMatrix();
        this.views[3].cameraHelper.update();        

        this.updateSubviewRangeByWindowResize(box);  // render() is called inside this func
    };

    this.handleRightClick= function(event){

        // select new object

        if (!this.data.world){
            return;
        }


        var intersects = this.mouse.getIntersects( this.mouse.onUpPosition, this.data.world.boxes );
        if ( intersects.length > 0 ) {
            //var object = intersects[ 0 ].object;
            var object = intersects[ 0 ].object;
            let target_obj = object.userData.object;
            if ( target_obj == undefined ) {
                // helper
                target_obj = object;
            }

            if (target_obj != this.selected_box){
                this.select_bbox(target_obj);
            }

            this.hide_world_context_menu();
            this.show_object_context_menu(event.layerX, event.layerY);

        } else {
            // if no object is selected, popup context menu
            //var pos = getMousePosition(renderer.domElement, event.clientX, event.clientY );
            this.hide_object_context_menu();
            this.show_world_context_menu(event.layerX, event.layerY);
        }
    };

    this.show_world_context_menu= function(posX, posY){
        let menu = this.editorUi.querySelector("#context-menu");
        menu.style.display = "inherit";
        menu.style.left = posX+"px";
        menu.style.top = posY+"px";
        this.editorUi.querySelector("#context-menu-wrapper").style.display = "block";
    };

    this.hide_world_context_menu= function(){
        let menu = this.editorUi.querySelector("#context-menu");
        menu.style.display = "none";
    };

    this.show_object_context_menu= function(posX, posY){
        let menu = this.editorUi.querySelector("#object-context-menu");
        menu.style.display = "inherit";
        menu.style.left = posX+"px";
        menu.style.top = posY+"px";
        this.editorUi.querySelector("#context-menu-wrapper").style.display = "block";
    };

    this.hide_object_context_menu= function(){
        let menu = this.editorUi.querySelector("#object-context-menu");
        menu.style.display = "none";
    };

    this.handleSelectRect= function(x,y,w,h){
        y = y+h;
        x = x*2-1;
        y = -y*2+1;
        w *= 2;
        h *= 2;
        
        /*
        console.log("main select rect", x,y,w,h);

        this.views[0].camera.updateProjectionMatrix();
        this.data.world.select_points_by_view_rect(x,y,w,h, this.views[0].camera);
        render();
        render_2d_image();
        */

        var self=this;
        var center_pos = this.mouse.get_screen_location_in_world(x+w/2, y+h/2);
        
        var box = this.data.world.create_box_by_view_rect(x,y,w,h, this.views[0].camera, center_pos);
        this.scene.add(box);
        
        this.imageContext.image_manager.add_box(box);
        
        this.auto_shrink_box(box);
        
        // guess obj type here
        
        box.obj_type = guess_obj_type_by_dimension(box.scale);
        
        this.floatLabelManager.add_label(box);

        this.select_bbox(box);
        this.on_box_changed(box);

        this.boxOp.auto_rotate_xyz(box, function(){
            box.obj_type = guess_obj_type_by_dimension(box.scale);
            self.floatLabelManager.set_object_type(box.obj_local_id, box.obj_type);
            self.floatLabelManager.update_label_editor(box.obj_type, box.obj_track_id);
            self.on_box_changed(box);
        });

        
        
        //floatLabelManager.add_label(box);

        

        
    };

    this.handleLeftClick= function(event) {

            if (event.ctrlKey){
                //Ctrl+left click to smart paste!
                //smart_paste();
            }
            else{
                //select box /unselect box
                if (!this.data.world || !this.data.world.boxes){
                    return;
                }
            
            
                var intersects = this.mouse.getIntersects( this.mouse.onUpPosition, this.data.world.boxes );

                if ( intersects.length > 0 ) {

                    //var object = intersects[ 0 ].object;
                    var object = intersects[ 0 ].object;

                    if ( object.userData.object !== undefined ) {
                        // helper
                        this.select_bbox( object.userData.object );

                    } else {

                        this.select_bbox( object );
                    }
                } else {

                    this.unselect_bbox(null);
                }

                //render();
            }
        

    };

    this.select_locked_object= function(){
        var self=this;
        if (this.view_state.lock_obj_track_id != ""){
            var box = this.data.world.boxes.find(function(x){
                return x.obj_track_id == self.view_state.lock_obj_track_id;
            })

            if (box){
                this.select_bbox(box);

                if (self.view_state.lock_obj_in_highlight){
                    this.focusOnSelectedBox(box);
                }
            }
        }
    };

    // new_object
    this.unselect_bbox= function(new_object, keep_lock){

        if (new_object==null){
            if (this.views[0] && this.views[0].transform_control.visible)
            {
                //unselect first time
                this.views[0].transform_control.detach();
            }else{
                //unselect second time
                if (this.selected_box){
                    
                    
                    
                    // restore from highlight
                    if (this.selected_box.in_highlight){
                        this.cancelFocus(this.selected_box);    

                        if (!keep_lock){
                            this.view_state.lock_obj_in_highlight = false;
                        }
                    } else{

                        // unselected finally
                        this.selected_box.material.color = new THREE.Color(parseInt("0x"+get_obj_cfg_by_type(this.selected_box.obj_type).color.slice(1)));
                        this.selected_box.material.opacity = this.data.config.box_opacity;
                        this.floatLabelManager.unselect_box(this.selected_box.obj_local_id, this.selected_box.obj_type);
                        this.floatLabelManager.update_position(this.selected_box, true);

                        if (!keep_lock){
                            this.view_state.lock_obj_track_id = "";
                        }

                        this.imageContext.image_manager.unselect_bbox(this.selected_box.obj_local_id, this.selected_box.obj_type);
                        this.selected_box = null;
                        this.projectiveViewOps.hide();

                        this.onSelectedBoxChanged(null);
                    }
                }

                
                
            }
        }
        else{
            // selected other box
            //unselect all
            this.views[0].transform_control.detach();

            
            if (this.selected_box){
                
                // restore from highlight
                
                if (this.selected_box.in_highlight){
                    this.cancelFocus(this.selected_box); 
                    if (!keep_lock){
                        view_state.lock_obj_in_highlight = false;
                    }
                }

                this.selected_box.material.color = new THREE.Color(parseInt("0x"+get_obj_cfg_by_type(this.selected_box.obj_type).color.slice(1)));
                this.selected_box.material.opacity = this.data.config.box_opacity;                
                this.floatLabelManager.unselect_box(this.selected_box.obj_local_id);
                this.floatLabelManager.update_position(this.selected_box, true);
                this.imageContext.image_manager.unselect_bbox(this.selected_box.obj_local_id, this.selected_box.obj_type);

                this.selected_box = null;
                this.projectiveViewOps.hide();
                if (!keep_lock)
                    this.view_state.lock_obj_track_id = "";
            }
        }



        this.render();

    };

    this.select_bbox= function(object){

        if (this.selected_box != object){
            // unselect old bbox
            

            var in_highlight = false;

            if (this.selected_box){
                in_highlight = this.selected_box.in_highlight;
                this.unselect_bbox(this.selected_box);
            }

            // select me, the first time
            this.selected_box = object;

            var best_iamge = this.imageContext.choose_best_camera_for_point(
                this.selected_box.getTruePosition());

            if (best_iamge){
                
                var image_changed = this.data.set_active_image(best_iamge);

                if (image_changed){
                    this.editorUi.querySelector("#camera-selector").value=best_iamge;
                    this.imageContext.image_manager.display_image();
                }
            }

            this.view_state.lock_obj_track_id = object.obj_track_id;

            this.floatLabelManager.select_box(this.selected_box.obj_local_id);
            this.floatLabelManager.update_label_editor(object.obj_type, object.obj_track_id);

            this.selected_box.material.color.r=1;
            this.selected_box.material.color.g=0;
            this.selected_box.material.color.b=1;
            this.selected_box.material.opacity=1;

            if (in_highlight){
                this.focusOnSelectedBox(this.selected_box);
            }
            
            
        }
        else {
            //reselect the same box
            if (this.views[0].transform_control.visible){
                this.change_transform_control_view();
            }
            else{
                //select me the second time
                this.views[0].transform_control.attach( object );
            }
        }

        this.save_box_info(object); // this is needed since when a frame is loaded, all box haven't saved anything.
                            // we could move this to when a frame is loaded.

        this.projectiveViewOps.show();
        this.onSelectedBoxChanged(object);

        
    };

    this.onWindowResize= function() {

        // use clientwidth and clientheight to resize container
        // but use scrollwidth/height to place other things.
        if ( this.windowWidth != this.container.clientWidth || this.windowHeight != this.container.clientHeight ) {

            //update_mainview();
            if (this.views[0])
                this.views[0].onWindowResize();

            if (this.selected_box){
                this.updateSubviewRangeByWindowResize(this.selected_box);
            }

            this.windowWidth = this.container.clientWidth;
            this.windowHeight = this.container.clientHeight;
            this.renderer.setSize( this.windowWidth, this.windowHeight );

            //this.viewManager.updateViewPort();

            // update sideview svg if there exists selected box
            // the following update is called in updateSubviewRangeByWindowResize
            // if (this.selected_box){
            //     this.projectiveViewOps.update_view_handle(this.selected_box);
            // }
        }
        
        this.render();
    };

    this.change_transform_control_view= function(){
        if (this.views[0].transform_control.mode=="scale"){
            this.views[0].transform_control.setMode( "translate" );
            this.views[0].transform_control.showY=true;
            this.views[0].transform_control.showX=true;
            this.views[0].transform_control.showz=true;
        }else if (this.views[0].transform_control.mode=="translate"){
            this.views[0].transform_control.setMode( "rotate" );
            this.views[0].transform_control.showY=false;
            this.views[0].transform_control.showX=false;
            this.views[0].transform_control.showz=true;
        }else if (this.views[0].transform_control.mode=="rotate"){
            this.views[0].transform_control.setMode( "scale" );
            this.views[0].transform_control.showY=true;
            this.views[0].transform_control.showX=true;
            this.views[0].transform_control.showz=true;
        }
    };

    this.add_box_on_mouse_pos= function(obj_type){
        // todo: move to this.data.world
        var pos = this.mouse.get_mouse_location_in_world();
        var rotation = {x:0, y:0, z:this.views[0].camera.rotation.z+Math.PI/2};

        var obj_cfg = get_obj_cfg_by_type(obj_type);
        var scale = {   
            x: obj_cfg.size[0],
            y: obj_cfg.size[1],
            z: obj_cfg.size[2]
        };

        this.add_box(pos, scale, rotation, obj_type, "");
        
        return box;
    };

    this.add_box= function(pos, scale, rotation, obj_type, obj_track_id){
        var box = this.data.world.add_box(pos, scale, rotation, obj_type, obj_track_id);

        this.scene.add(box);

        this.floatLabelManager.add_label(box);
        
        this.imageContext.image_manager.add_box(box);

        this.select_bbox(box);
    };

    this.save_box_info= function(box){
        box.last_info = {
            //obj_type: box.obj_type,
            position: {
                x: box.position.x,
                y: box.position.y,
                z: box.position.z,
            },
            rotation: {
                x: box.rotation.x,
                y: box.rotation.y,
                z: box.rotation.z,
            },
            scale: {
                x: box.scale.x,
                y: box.scale.y,
                z: box.scale.z,
            }
        }
    };


    // axix, xyz, action: scale, move, direction, up/down
    this.transform_bbox= function(command){
        if (!this.selected_box)
            return;
        
        switch (command){
            case 'x_move_up':
                this.boxOp.translate_box(this.selected_box, 'x', 0.05);
                break;
            case 'x_move_down':
                this.boxOp.translate_box(this.selected_box, 'x', -0.05);
                break;
            case 'x_scale_up':
                this.selected_box.scale.x *= 1.01;    
                break;
            case 'x_scale_down':
                this.selected_box.scale.x /= 1.01;
                break;
            
            case 'y_move_up':
                this.boxOp.translate_box(this.selected_box, 'y', 0.05);
                break;
            case 'y_move_down':        
                this.boxOp.translate_box(this.selected_box, 'y', -0.05);            
                break;
            case 'y_scale_up':
                this.selected_box.scale.y *= 1.01;    
                break;
            case 'y_scale_down':
                this.selected_box.scale.y /= 1.01;
                break;
            
            case 'z_move_up':
                this.selected_box.position.z += 0.05;
                break;
            case 'z_move_down':        
                this.selected_box.position.z -= 0.05;
                break;
            case 'z_scale_up':
                this.selected_box.scale.z *= 1.01;    
                break;
            case 'z_scale_down':
                this.selected_box.scale.z /= 1.01;
                break;
            
            case 'z_rotate_left':
                this.selected_box.rotation.z += 0.01;
                break;
            case 'z_rotate_right':
                this.selected_box.rotation.z -= 0.01;
                break;
            
            case 'z_rotate_reverse':        
                if (this.selected_box.rotation.z > 0){
                    this.selected_box.rotation.z -= Math.PI;
                }else{
                    this.selected_box.rotation.z += Math.PI;
                }    
                break;
            case 'reset':
                this.selected_box.rotation.x = 0;
                this.selected_box.rotation.y = 0;
                this.selected_box.rotation.z = 0;
                this.selected_box.position.z = 0;
                break;

        }

        this.on_box_changed(this.selected_box);    
        
    };


    // function switch_bbox_type(target_type){
    //     if (!this.selected_box)
    //         return;

    //     if (!target_type){
    //         target_type = get_next_obj_type_name(this.selected_box.obj_type);
    //     }

    //     this.selected_box.obj_type = target_type;
    //     var obj_cfg = get_obj_cfg_by_type(target_type);
    //     this.selected_box.scale.x=obj_cfg.size[0];
    //     this.selected_box.scale.y=obj_cfg.size[1];
    //     this.selected_box.scale.z=obj_cfg.size[2];           

        
    //     this.floatLabelManager.set_object_type(this.selected_box.obj_local_id, this.selected_box.obj_type);
    //     this.floatLabelManager.update_label_editor(this.selected_box.obj_type, this.selected_box.obj_track_id);

        
        
    // }

    this.auto_shrink_box= function(box){
        var  extreme = this.data.world.get_points_dimmension_of_box(box);
        
        
        ['x', 'y','z'].forEach((axis)=>{

            this.boxOp.translate_box(box, axis, (extreme.max[axis] + extreme.min[axis])/2);
            box.scale[axis] = extreme.max[axis]-extreme.min[axis];        

        }) 

    };

    this.grow_box= function(min_distance, init_scale_ratio){

        var extreme = this.data.world.grow_box(this.selected_box, min_distance, init_scale_ratio);

        if (extreme){

            ['x','y', 'z'].forEach((axis)=>{
                this.boxOp.translate_box(self.selected_box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                this.selected_box.scale[axis] = extreme.max[axis] - extreme.min[axis];        
            }) 
        }

    };

    this.keydown= function( ev ) {
        this.operation_state.key_pressed = true;

        switch ( ev.key) {
            case '+':
            case '=':
                this.data.scale_point_size(1.2);
                this.render();
                break;
            case '-':
                this.data.scale_point_size(0.8);
                this.render();
                break;
            case '1': 
                this.select_previous_object();
                break;
            case '2':
                this.select_next_object();
                break;
            case '3':
                this.previous_frame();
                break;
            case '4':
                this.next_frame();
                break;

            case 'v':
                this.change_transform_control_view();
                break;
            /*
            case 'm':
            case 'M':
                smart_paste();
                break;
            case 'N':    
            case 'n':
                //add_bbox();
                //header.mark_changed_flag();
                break;        
            case 'B':
            case 'b':
                switch_bbox_type();
                self.header.mark_changed_flag();
                self.on_box_changed(this.selected_box);
                break;
            */
            case 'z': // X
                this.views[0].transform_control.showX = ! this.views[0].transform_control.showX;
                break;
            case 'x': // Y
                this.views[0].transform_control.showY = ! this.views[0].transform_control.showY;
                break;
            case 'c': // Z
                if (ev.ctrlKey){
                    this.mark_bbox(this.selected_box, this.header);
                } else {
                    this.views[0].transform_control.showZ = ! this.views[0].transform_control.showZ;
                }
                break;            
            case ' ': // Spacebar
                //this.views[0].transform_control.enabled = ! this.views[0].transform_control.enabled;
                self.playControl.pause_resume_play();
                break;
                
            case '5':            
            case '6':
            case '7':
                this.views[ev.key-'4'].cameraHelper.visible = !this.views[ev.key-'4'].cameraHelper.visible;
                this.render();
                break;
            /*
            case 'a':
                if (this.selected_box){
                    if (!operation_state.mouse_right_down){
                        this.transform_bbox("x_move_down");
                    }
                    else{
                        this.transform_bbox("x_scale_down");
                    }
                }
                break;
            case 'A':
                this.transform_bbox("x_scale_down");
                break;
            case 'q':
                if (this.selected_box){
                    if (!operation_state.mouse_right_down){
                        this.transform_bbox("x_move_up");
                    }
                    else{
                        this.transform_bbox("x_scale_up");
                    }                
                }            
                break;        
            case 'Q':
                this.transform_bbox("x_scale_up");
                break;
            */
        case 's':
                if (ev.ctrlKey){
                    save_annotation(this.data);
                }
                break;
            /*
            case 's':
                if (ev.ctrlKey){
                    save_annotation();
                }
                else if (this.selected_box){
                    if (!operation_state.mouse_right_down){
                        this.transform_bbox("y_move_down");
                    }else{
                        this.transform_bbox("y_scale_down");
                    }
                }
                break;
            case 'S':
                if (ev.ctrlKey){
                    save_annotation();
                }
                else if (this.selected_box){
                    this.transform_bbox("y_scale_down");
                }            
                break;
            case 'w':
                if (this.selected_box){
                    if (!operation_state.mouse_right_down)
                        this.transform_bbox("y_move_up");
                    else
                        this.transform_bbox("y_scale_up");                
                }
                break;
            case 'W':
                if (this.selected_box){
                    this.transform_bbox("y_scale_up");
                }
                break;


            case 'd':
                if (this.selected_box){
                    if (operation_state.mouse_right_down){
                        this.transform_bbox("z_scale_down");                    
                    }
                    else if (ev.ctrlKey){
                        remove_selected_box();
                        self.header.mark_changed_flag();
                    }else{
                        this.transform_bbox("z_move_down");
                    }
                    
                }
                break;
            case 'D':
                if (this.selected_box){
                    this.transform_bbox("z_scale_down");
                }            
                break;        
            case 'e':
                    if (this.selected_box){
                        if (!operation_state.mouse_right_down)
                            this.transform_bbox("z_move_up");
                        else
                            this.transform_bbox("z_scale_up");                    
                    }
                    break;
            case 'E':
                if (this.selected_box){
                    this.transform_bbox("z_scale_up");
                }
                break;
            */
            case 'f':
                if (this.selected_box){                
                    //this.transform_bbox("z_rotate_right");                
                    this.boxOp.rotate_z(this.selected_box, -0.005, true);
                    this.on_box_changed(this.selected_box);
                }
                break;
            case 'r':
                if (this.selected_box){
                    //this.transform_bbox("z_rotate_left");
                    this.boxOp.rotate_z(this.selected_box, 0.005, true);
                    this.on_box_changed(this.selected_box);
                }
                break;
            
            case 'g':
                this.transform_bbox("z_rotate_reverse");
                break;
            case 't':
                this.transform_bbox("reset");
                break;
            
            case 'Delete':
                this.remove_selected_box();
                this.header.mark_changed_flag();
                break;
            case 'Escape':
                if (this.selected_box){
                    this.unselect_bbox(null);
                }
                break;
        }
    };

    this.previous_frame= function(){

        if (!this.data.meta)
            return;

        var scene_meta = this.data.meta.find((x)=>{
            return x.scene == this.data.world.frameInfo.scene;
        });

        var num_frames = scene_meta.frames.length;

        var frame_index = (this.data.world.frameInfo.frame_index-1 + num_frames) % num_frames;

        this.load_world(scene_meta.scene, scene_meta.frames[frame_index]);

        

    };

    this.next_frame= function(){

        if (!this.data.meta)
            return;
            
        var scene_meta = this.data.get_current_world_scene_meta();

        var num_frames = scene_meta.frames.length;

        var frame_index = (this.data.world.frameInfo.frame_index +1) % num_frames;

        this.load_world(scene_meta.scene, scene_meta.frames[frame_index]);
    };

    this.select_next_object= function(){

        var self=this;
        if (this.data.world.boxes.length<=0)
            return;

        if (this.selected_box){
            this.operation_state.box_navigate_index = this.data.world.boxes.findIndex(function(x){
                return self.selected_box == x;
            });
        }
        
        this.operation_state.box_navigate_index += 1;            
        this.operation_state.box_navigate_index %= this.data.world.boxes.length;    
        
        this.select_bbox(this.data.world.boxes[this.operation_state.box_navigate_index]);

    };

    this.select_previous_object= function(){
        var self=this;
        if (this.data.world.boxes.length<=0)
            return;

        if (this.selected_box){
            this.operation_state.box_navigate_index = this.data.world.boxes.findIndex(function(x){
                return self.selected_box == x;
            });
        }
        
        this.operation_state.box_navigate_index += this.data.world.boxes.length-1;            
        this.operation_state.box_navigate_index %= this.data.world.boxes.length;    
        
        this.select_bbox(this.data.world.boxes[this.operation_state.box_navigate_index]);
    };

    // this.centerMainView =function(){
    //     let offset = this.data.world.coordinatesOffset;
    //     this.views[0].orbit.target.x += offset[0];
    //     this.views[0].orbit.target.y += offset[1];
    //     this.views[0].orbit.target.z += offset[2];        
    // };

    this.on_load_world_finished= function(scene_name, frame){
        this.unselect_bbox(null, true);
        this.unselect_bbox(null, true);
        this.render();
        this.imageContext.render_2d_image();
        this.render2dLabels();
        this.update_frame_info(scene_name, frame);

        this.select_locked_object();
        this.header.unmark_changed_flag();
        load_obj_ids_of_scene(scene_name);

        
    };

    this.load_world= function(scene_name, frame){
        var self=this;
        //stop if current world is not ready!
        if (this.data.world && !this.data.world.preload_finished()){
            console.log("current world is still loading.");
            return;
        }

        var world = this.data.make_new_world(
            scene_name, 
            frame);
        this.data.activate_world(
            world, 
            function(){self.on_load_world_finished(scene_name, frame);}
        );
    };

    this.remove_selected_box= function(){
        if (this.selected_box){
            var target_box = this.selected_box;
            this.unselect_bbox(null);
            this.unselect_bbox(null); //twice to safely unselect.
            //transform_control.detach();
            
            // restroe color
            this.restore_box_points_color(target_box);

            this.imageContext.image_manager.remove_box(target_box.obj_local_id);

            this.floatLabelManager.remove_box(target_box);
            this.scene.remove(target_box);        
            
            //this.selected_box.dispose();
            this.data.world.remove_box(target_box);

            
            this.selected_box = null;
            
            this.render();
            //render_2d_image();
            
        }
    };

    this.clear= function(){

        this.header.clear_box_info();
        //this.editorUi.querySelector("#image").innerHTML = '';
        
        this.unselect_bbox(null);
        this.unselect_bbox(null);

        this.header.clear_frame_info();

        this.imageContext.clear_main_canvas();
        this.imageContext.clear_canvas();


        this.data.world.destroy();
        this.data.world= null; //dump it
        this.floatLabelManager.remove_all_labels();
        this.render();
    };

    this.update_frame_info= function(scene, frame){
        var self = this;
        this.header.set_frame_info(scene, frame, function(scene_name){
            self.scene_changed(scene_name)});
    };

    //box edited
    this.on_box_changed= function(box){

        this.updateSubviewByBox(box);
        this.projectiveViewOps.update_view_handle(box);
        this.imageContext.updateFocusedImageContext(box);
        
        //render_2d_image();
        this.imageContext.image_manager.update_box(box);

        this.header.update_box_info(box);
        //floatLabelManager.update_position(box, false);  don't update position, or the ui is annoying.
        this.header.mark_changed_flag();
        this.updateBoxPointsColor(box);
        this.save_box_info(box);

        
    };

    this.restore_box_points_color= function(box){
        if (this.data.config.color_obj){
            this.data.world.set_box_points_color(box, {x: this.data.config.point_brightness, y: this.data.config.point_brightness, z: this.data.config.point_brightness});
            this.data.world.update_points_color();
            this.render();
        }
    };

    this.updateBoxPointsColor= function(box){
        if (this.data.config.color_obj){
            if (box.last_info){
                this.data.world.set_box_points_color(box.last_info, {x: this.data.config.point_brightness, y: this.data.config.point_brightness, z: this.data.config.point_brightness});
            }

            this.data.world.set_box_points_color(box);
            this.data.world.update_points_color();
            this.render();
        }
    };

    this.onSelectedBoxChanged= function(box){

        if (box){        
            this.header.update_box_info(box);
            this.imageContext.updateFocusedImageContext(box)
            this.floatLabelManager.update_position(box, true);
            this.updateSubviewByBox(box);
            this.projectiveViewOps.update_view_handle(this.selected_box);

            this.imageContext.image_manager.select_bbox(box.obj_local_id, box.obj_type);
        } else {
            this.header.clear_box_info();
            //clear_canvas();
            //render_2d_image();
        }

    };

    this.render2dLabels= function(){
        if (this.editorCfg.disableMainView)
            return;

        this.floatLabelManager.remove_all_labels();
        var self=this;
        this.data.world.boxes.forEach(function(b){
            self.floatLabelManager.add_label(b);
        })

        if (this.selected_box){
            this.floatLabelManager.select_box(this.selected_box.obj_local_id)
        }
    };

    this.add_global_obj_type= function(){

        var self = this;
        var sheet = window.document.styleSheets[1];

        for (var o in obj_type_map){
            var rule = '.'+o+ '{color:'+obj_type_map[o].color+';'+ 
                                'stroke:' +obj_type_map[o].color+ ';'+
                                'fill:' +obj_type_map[o].color+ '22' + ';'+
                                '}';
            sheet.insertRule(rule, sheet.cssRules.length);
        }

        // obj type selector
        var options = "";
        for (var o in obj_type_map){
            options += '<option value="'+o+'" class="' +o+ '">'+o+ '</option>';        
        }

        this.editorUi.querySelector("#object-category-selector").innerHTML = options;


        // submenu of new
        var items = "";
        for (var o in obj_type_map){
            items += '<div class="menu-item cm-new-item ' + o + '" id="cm-new-'+o+'" uservalue="' +o+ '"><div class="menu-item-text">'+o+ '</div></div>';        
        }

        this.editorUi.querySelector("#new-submenu").innerHTML = items;

        // install click actions
        for (var o in obj_type_map){        
            this.editorUi.querySelector("#cm-new-"+o).onclick = (event)=>{

                // hide context men
                this.editorUi.querySelector("#context-menu-wrapper").style.display="none";

                // process event
                var obj_type = event.currentTarget.getAttribute("uservalue");
                self.add_box_on_mouse_pos(obj_type);
                //switch_bbox_type(event.currentTarget.getAttribute("uservalue"));
                self.grow_box(0.2, {x:1.2, y:1.2, z:3});
                self.auto_shrink_box(self.selected_box);
                self.on_box_changed(self.selected_box);
                self.boxOp.auto_rotate_xyz(self.selected_box, null, null, function(b){
                    self.on_box_changed(b);
                });
                
            }
        }

    };

    this.interpolate_selected_object= function(){

        let scene = this.data.world.frameInfo.scene; 
        let frame = this.data.world.frameInfo.frame;
        let obj_id = this.selected_box.obj_track_id;


        var xhr = new XMLHttpRequest();
        // we defined the xhr
        
        xhr.onreadystatechange = function () {
            if (this.readyState != 4) 
                return;
        
            if (this.status == 200) {
                var ret = JSON.parse(this.responseText);
                console.log(ret);
            }

        };
        
        xhr.open('GET', "/interpolate?scene="+scene+"&frame="+frame+"&obj_id="+obj_id, true);
        xhr.send();


    }


    

    this.init(editorUi);

};

export{Editor}