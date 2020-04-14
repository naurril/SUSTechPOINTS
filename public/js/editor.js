import * as THREE from './lib/three.module.js';
import { GUI } from './lib/dat.gui.module.js';

import {ViewManager} from "./view.js"
import {createFloatLabelManager} from "./floatlabel.js"
import {Mouse} from "./mouse.js"
import {BoxEditorManager} from "./box_editor.js"
import {ImageContext} from "./image.js"
import {get_obj_cfg_by_type, obj_type_map, get_next_obj_type_name, guess_obj_type_by_dimension} from "./obj_cfg.js"

import {load_obj_ids_of_scene, generate_new_unique_id} from "./obj_id_list.js"
import {Header} from "./header.js"
import {BoxOp} from './box_op.js';
import {AutoAdjust} from "./auto-adjust.js"
import {PlayControl} from "./play.js"
import {saveWorld, reloadWorldList, saveWorldList} from "./save.js"

function Editor(editorUi, wrapperUi, editorCfg, data, name="editor"){

    this.editorCfg = editorCfg;
    this.sideview_enabled = true;
    this.editorUi = editorUi;
    this.wrapperUi = wrapperUi;
    this.container = null;
    this.name = name;

    this.data = data;
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
    this.boxEditorManager  = null; 
    this.init = function(editorUi) {
    
        let self = this;
        this.editorUi = editorUi;
        
        this.playControl = new PlayControl(this.data);



        this.header = new Header(editorUi.querySelector("#global-info"), this.data, this.editorCfg,
            (e)=>{
                this.scene_changed(e.currentTarget.value);
                //event.currentTarget.blur();
            },        
            (e)=>{this.frame_changed(e)},
            (e)=>{this.object_changed(e)},
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
        

        this.imageContext = new ImageContext(
                 this.editorUi.querySelector("#maincanvas-wrapper"), 
                this.editorCfg);


        if (!this.editorCfg.disableRangeCircle)
            this.addRangeCircle();
    
        this.floatLabelManager = createFloatLabelManager(this.editorUi, this.container, this.viewManager.mainView,function(box){self.selectBox(box);});
    
        //this.init_gui();
        
        this.scene.add( new THREE.AxesHelper( 1 ) );
    
        
    
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

        

        this.boxEditorManager = new BoxEditorManager(this.editorUi.querySelector("#box-editor-wrapper"),
            this.viewManager,
            this.editorCfg,
            this.boxOp,
            this.header,
            (b)=>this.on_box_changed(b),
            (b)=>this.remove_box(b));

        if (!this.editorCfg.disableMainBoxEditor)
        {
            // should make a boxeditormanager,
            // 
            this.boxEditor= this.boxEditorManager.addEditor();
        }

        this.mouse = new Mouse(
            this.viewManager.mainView,
            this.operation_state,
            this.container, 
            this.editorUi,
            function(ev){self.handleLeftClick(ev);}, 
            function(ev){self.handleRightClick(ev);}, 
            function(x,y,w,h){self.handleSelectRect(x,y,w,h);});

        this.autoAdjust=new AutoAdjust(this.mouse, this.header);


        this.install_fast_tool();
    
        this.install_context_menu();
    
        
        //this.projectiveViewOps.hide();
    
        if (!this.editorCfg.disableGrid)
            this.installGridLines()
    
        window.onbeforeunload = function() {
            return "Exit?";
            //if we return nothing here (just calling return;) then there will be no pop-up question at all
            //return;
        };

        this.onWindowResize();
        
        let exitbtn = this.editorUi.querySelector("#exit");
        if (exitbtn){
            exitbtn.onclick = (e)=>{
                this.hide();
            }
        }
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

    this.hide = function(){
        this.wrapperUi.style.display="none";
    };
    this.show = function(){
        this.wrapperUi.style.display="block";
    };

    this.setBatchEditor = function(editor){
        this.batchEditor = editor;
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
            self.autoAdjust.mark_bbox(self.selected_box);
            //event.currentTarget.blur();
        }

        this.editorUi.querySelector("#label-paste").onclick = (event)=>{
            this.autoAdjust.smart_paste(self.selected_box);
            //event.currentTarget.blur();
        }

        this.editorUi.querySelector("#label-edit").onclick = function(event){
            event.currentTarget.blur();
            self.selectBox(self.selected_box);
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
        
        this.viewManager.mainView.save_orbit_state(box.scale);
        this.viewManager.mainView.orbit.reset();
    };

    this.focusOnSelectedBox = function(box){
        if (this.editorCfg.disableMainView)
            return;

        if (box){
            this.data.world.highlight_box_points(box);
            
            this.floatLabelManager.hide_all();
            this.viewManager.mainView.orbit.saveState();

            //this.viewManager.mainView.camera.position.set(this.selected_box.position.x+this.selected_box.scale.x*3, this.selected_box.position.y+this.selected_box.scale.y*3, this.selected_box.position.z+this.selected_box.scale.z*3);

            this.viewManager.mainView.orbit.target.x = box.position.x;
            this.viewManager.mainView.orbit.target.y = box.position.y;
            this.viewManager.mainView.orbit.target.z = box.position.z;

            this.viewManager.mainView.restore_relative_orbit_state(box.scale);


            this.viewManager.mainView.orbit.update();

            this.render();
            box.in_highlight=true;
            this.view_state.lock_obj_in_highlight = true;
        }
    };

    this.install_context_menu= function(){

        let menuUi = this.editorUi.querySelector("#context-menu");
        let menuWrapper = this.editorUi.querySelector("#context-menu-wrapper");
        menuWrapper.onclick = function(event){
            event.currentTarget.style.display="none"; 
            event.preventDefault();
            event.stopPropagation();             
        };

        menuWrapper.oncontextmenu = function(event){
            event.currentTarget.style.display="none"; 
            event.preventDefault();
            event.stopPropagation();
        };
        
        /*    
        this.editorUi.querySelector("#context-menu").onclick = function(enabled){
            // some items clicked
            menuWrapper.style.display = "none";
            event.preventDefault();
            event.stopPropagation();
        };

        this.editorUi.querySelector("#new-submenu").onclick = function(enabled){
            // some items clicked
            menuWrapper.style.display = "none";
            event.preventDefault();
            event.stopPropagation();
        };
        */

        menuUi.querySelector("#cm-new").onclick = function(event){
            //add_bbox();
            //header.mark_changed_flag();

            // all submenus of `new' will forward click event to here
            // since they are children of `new'
            // so we should 
            event.preventDefault();
            event.stopPropagation();


        };

        menuUi.querySelector("#cm-new").onmouseenter = (event)=>{
            var item = menuUi.querySelector("#new-submenu");
            item.style.display="inherit";
        };

        menuUi.querySelector("#cm-new").onmouseleave = function(event){
            menuUi.querySelector("#new-submenu").style.display="none";
            //console.log("leave  new item");
        };


        menuUi.querySelector("#new-submenu").onmouseenter=function(event){
            var item = menuUi.querySelector("#new-submenu");
            item.style.display="block";
        }

        menuUi.querySelector("#new-submenu").onmouseleave=function(event){
            var item = menuUi.querySelector("#new-submenu");
            item.style.display="none";
        }



        menuUi.querySelector("#cm-paste").onclick = (event)=>{
            this.autoAdjust.smart_paste(this.selected_box);
        };

        menuUi.querySelector("#cm-prev-frame").onclick = (event)=>{
            this.previous_frame();
        };

        menuUi.querySelector("#cm-next-frame").onclick = (event)=>{
            this.next_frame();
        };

        menuUi.querySelector("#cm-save").onclick = (event)=>{
            saveWorld(this.data.world, ()=>{
                this.header.unmark_changed_flag();
            });
        };

        menuUi.querySelector("#cm-reload").onclick = (event)=>{
            reloadWorldList(this.data.worldList, ()=>this.on_load_world_finished(this.data.world));
        };


        menuUi.querySelector("#cm-play").onclick = (event)=>{
            this.playControl.play_current_scene_with_buffer(false,
                function(w){
                    this.on_load_world_finished(w)
                });
        };
        menuUi.querySelector("#cm-stop").onclick = (event)=>{
            this.playControl.stop_play();
        };
        menuUi.querySelector("#cm-pause").onclick = (event)=>{
            this.playControl.pause_resume_play();
        };


        menuUi.querySelector("#cm-prev-object").onclick = (event)=>{
            this.select_previous_object();
        };

        menuUi.querySelector("#cm-next-object").onclick = (event)=>{
            this.select_previous_object();
        };

        let objMenuUi = this.editorUi.querySelector("#object-context-menu");
        objMenuUi.querySelector("#cm-delete").onclick = (event)=>{
            this.remove_selected_box();
            this.header.mark_changed_flag();
        };

        objMenuUi.querySelector("#cm-interpolate").onclick = (event)=>{

            if (!this.selected_box.obj_track_id){
                console.error("no track id");
            }

            this.batchEditor.show();
            
            this.batchEditor.editBatch(
                this.data.world.frameInfo.scene,
                this.data.world.frameInfo.frame,
                this.selected_box.obj_track_id
            );
        };

        objMenuUi.querySelector("#cm-fix-relation").onclick = (event)=>{
            this.autoAdjust.fixRelationToRef(this.selected_box);
        };

        objMenuUi.querySelector("#cm-delete-obj").onclick = (event)=>{
            let saveList=[];
            this.data.worldList.forEach(w=>{
                let box = w.boxes.find(b=>b.obj_track_id === this.selected_box.obj_track_id);
                if (box && box !== this.selected_box){
                    w.unload_box(box);
                    w.remove_box(box);
                    saveList.push(w);
                }                
            });

            saveWorldList(saveList);
        };
    };


    // this.animate= function() {
    //     let self=this;
    //     requestAnimationFrame( function(){self.animate();} );
    //     this.viewManager.mainView.orbit_orth.update();
    // };



    this.render= function(){

        this.viewManager.render();

        this.floatLabelManager.update_all_position();
        if (this.selected_box){
            this.floatLabelManager.update_obj_editor_position(this.selected_box.obj_local_id);
        }

    };

    

    this.scene_changed= function(sceneName){
        
        //var sceneName = event.currentTarget.value;

        if (sceneName.length == 0){
            return;
        }
        
        console.log("choose sceneName " + sceneName);
        var meta = this.data.getMetaBySceneName(sceneName);

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

        load_obj_ids_of_scene(sceneName);
    };

    this.frame_changed= function(event){
        var sceneName = this.editorUi.querySelector("#scene-selector").value;

        if (sceneName.length == 0){
            return;
        }

        var frame =  event.currentTarget.value;
        console.log(sceneName, frame);
        this.load_world(sceneName, frame);

        event.currentTarget.blur();
    };

    this.editBatch = function(sceneName, frame, objectTrackId){
        this.boxEditorManager.edit(this.data, this.data.getMetaBySceneName(sceneName), frame, objectTrackId);
    };

    this.object_changed = function(event){
        var sceneName = this.editorUi.querySelector("#scene-selector").value;
        let objectTrackId = event.currentTarget.value;

        this.editBatch(sceneName, null, objectTrackId);
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
            this.viewManager.mainView.reset_camera();
            this.viewManager.mainView.reset_birdseye();
            //render();
        };

        params["rotate bird's eye view"] = function(){
            this.viewManager.mainView.rotate_birdseye();
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
            play_current_scene_with_buffer(flase, function(w){self.on_load_world_finished(w)});
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
        //         saveWorld();
        //     });
            
        // };
        
        // editFolder.add( params, 'select-ref-bbox');
        // editFolder.add( params, 'paste');
        // editFolder.add( params, 'auto-adjust');
        // editFolder.add( params, 'smart-paste');


        

        //file
        var fileFolder = gui.addFolder( 'File' );
        params['save'] = ()=> {
            saveWorld(this.data.world);
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

            this.render();
        }
    };

    this.object_track_id_changed= function(event){
        if (this.selected_box){
            var id = event.currentTarget.value;


            if (id == "new"){
                id = generate_new_unique_id(this.data.world);
                this.floatLabelManager.update_label_editor(this.selected_box.obj_type, id);
            }

            this.selected_box.obj_track_id = id;
            this.floatLabelManager.set_object_track_id(this.selected_box.obj_local_id, this.selected_box.obj_track_id);
            this.header.mark_changed_flag();
        }
    };

    // this.updateSubviewRangeByWindowResize= function(box){

    //     if (box === null)
    //         return;

    //     if (box.boxEditor)
    //         box.boxEditor.onWindowResize();

    //     this.render();
    // };

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
                this.selectBox(target_obj);
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

        this.viewManager.mainView.camera.updateProjectionMatrix();
        this.data.world.select_points_by_view_rect(x,y,w,h, this.viewManager.mainView.camera);
        render();
        render_2d_image();
        */

        var self=this;
        var center_pos = this.mouse.get_screen_location_in_world(x+w/2, y+h/2);
        
        var box = this.data.world.create_box_by_view_rect(x,y,w,h, this.viewManager.mainView.camera, center_pos);
        this.scene.add(box);
        
        this.imageContext.image_manager.add_box(box);
        
        this.auto_shrink_box(box);
        
        // guess obj type here
        
        box.obj_type = guess_obj_type_by_dimension(box.scale);
        
        this.floatLabelManager.add_label(box);

        this.selectBox(box);
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
                        this.selectBox( object.userData.object );

                    } else {

                        this.selectBox( object );
                    }
                } else {

                    this.unselectBox(null);
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
                this.selectBox(box);

                if (self.view_state.lock_obj_in_highlight){
                    this.focusOnSelectedBox(box);
                }
            }
        }
    };

    // new_object
    this.unselectBox = function(new_object, keep_lock){

        if (new_object==null){
            if (this.viewManager.mainView && this.viewManager.mainView.transform_control.visible)
            {
                //unselect first time
                this.viewManager.mainView.transform_control.detach();
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
                        //this.selected_box.material.color = new THREE.Color(parseInt("0x"+get_obj_cfg_by_type(this.selected_box.obj_type).color.slice(1)));
                        //this.selected_box.material.opacity = this.data.config.box_opacity;
                        //this.boxOp.unhighlightBox(this.selected_box);
                        this.floatLabelManager.unselect_box(this.selected_box.obj_local_id, this.selected_box.obj_type);
                        this.floatLabelManager.update_position(this.selected_box, true);

                        if (!keep_lock){
                            this.view_state.lock_obj_track_id = "";
                        }

                        this.imageContext.image_manager.onBoxUnselected(this.selected_box.obj_local_id, this.selected_box.obj_type);
                        this.selected_box = null;
                        this.boxEditor.detach();

                        this.onSelectedBoxChanged(null);
                    }
                }
                else{
                    // just an empty click
                    return;
                }
            }
        }
        else{
            // selected other box
            //unselect all
            this.viewManager.mainView.transform_control.detach();

            
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
                this.imageContext.image_manager.onBoxUnselected(this.selected_box.obj_local_id, this.selected_box.obj_type);

                this.selected_box = null;
                this.boxEditor.detach();
                if (!keep_lock)
                    this.view_state.lock_obj_track_id = "";
            }
        }



        this.render();

    };



    this.selectBox = function(object){

        if (this.selected_box != object){
            // unselect old bbox
            
            var in_highlight = false;

            if (this.selected_box){
                in_highlight = this.selected_box.in_highlight;
                this.unselectBox(this.selected_box);
            }

            // select me, the first time
            this.selected_box = object;

            // switch camera
            if (!this.editorCfg.disableMainImageContext){
                var best_iamge = this.imageContext.choose_best_camera_for_point(
                    this.selected_box.world.frameInfo.sceneMeta,
                    this.selected_box.getTruePosition());

                if (best_iamge){
                    
                    var image_changed = this.data.set_active_image(best_iamge);

                    if (image_changed){
                        this.editorUi.querySelector("#camera-selector").value=best_iamge;
                        this.imageContext.image_manager.display_image();
                    }
                }
            }

            // highlight box
            this.view_state.lock_obj_track_id = object.obj_track_id;

            this.floatLabelManager.select_box(this.selected_box.obj_local_id);
            this.floatLabelManager.update_label_editor(object.obj_type, object.obj_track_id);

            this.boxOp.highlightBox(this.selected_box);

            if (in_highlight){
                this.focusOnSelectedBox(this.selected_box);
            }
            
            this.save_box_info(object); // this is needed since when a frame is loaded, all box haven't saved anything.
                                        // we could move this to when a frame is loaded.

            this.boxEditor.attachBox(object);
            this.onSelectedBoxChanged(object);

        }
        else {
            //reselect the same box
            if (this.viewManager.mainView.transform_control.visible){
                this.change_transform_control_view();
            }
            else{
                //select me the second time
                this.viewManager.mainView.transform_control.attach( object );
            }
        }
    };

    this.onWindowResize= function() {

        // use clientwidth and clientheight to resize container
        // but use scrollwidth/height to place other things.
        if ( this.windowWidth != this.container.clientWidth || this.windowHeight != this.container.clientHeight ) {

            //update_mainview();
            if (this.viewManager.mainView)
                this.viewManager.mainView.onWindowResize();

            if (this.boxEditor)
                this.boxEditor.update("dontrender");

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
        if (this.viewManager.mainView.transform_control.mode=="scale"){
            this.viewManager.mainView.transform_control.setMode( "translate" );
            this.viewManager.mainView.transform_control.showY=true;
            this.viewManager.mainView.transform_control.showX=true;
            this.viewManager.mainView.transform_control.showz=true;
        }else if (this.viewManager.mainView.transform_control.mode=="translate"){
            this.viewManager.mainView.transform_control.setMode( "rotate" );
            this.viewManager.mainView.transform_control.showY=false;
            this.viewManager.mainView.transform_control.showX=false;
            this.viewManager.mainView.transform_control.showz=true;
        }else if (this.viewManager.mainView.transform_control.mode=="rotate"){
            this.viewManager.mainView.transform_control.setMode( "scale" );
            this.viewManager.mainView.transform_control.showY=true;
            this.viewManager.mainView.transform_control.showX=true;
            this.viewManager.mainView.transform_control.showz=true;
        }
    };

    this.add_box_on_mouse_pos= function(obj_type){
        // todo: move to this.data.world
        var pos = this.mouse.get_mouse_location_in_world();
        var rotation = {x:0, y:0, z:this.viewManager.mainView.camera.rotation.z+Math.PI/2};

        var obj_cfg = get_obj_cfg_by_type(obj_type);
        var scale = {   
            x: obj_cfg.size[0],
            y: obj_cfg.size[1],
            z: obj_cfg.size[2]
        };

        let box = this.add_box(pos, scale, rotation, obj_type, "");
        
        return box;
    };

    this.add_box= function(pos, scale, rotation, obj_type, obj_track_id){
        let box = this.data.world.add_box(pos, scale, rotation, obj_type, obj_track_id);

        this.scene.add(box);

        this.floatLabelManager.add_label(box);
        
        this.imageContext.image_manager.add_box(box);

        this.selectBox(box);
        return box;
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

    this.grow_box= function(box, min_distance, init_scale_ratio){

        var extreme = this.data.world.grow_box(box, min_distance, init_scale_ratio);

        if (extreme){

            ['x','y', 'z'].forEach((axis)=>{
                this.boxOp.translate_box(box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                box.scale[axis] = extreme.max[axis] - extreme.min[axis];        
            }) 
        }

    };

    this.keydown= function( ev ) {
        this.operation_state.key_pressed = true;

        switch ( ev.key) {
            case '+':
            case '=':
                this.data.scale_point_size(1.2);
                this.batchEditor.data.scale_point_size(1.2);
                this.render();
                break;
            case '-':
                this.data.scale_point_size(0.8);
                this.batchEditor.data.scale_point_size(0.8);
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
                this.viewManager.mainView.transform_control.showX = ! this.viewManager.mainView.transform_control.showX;
                break;
            case 'x': // Y
                this.viewManager.mainView.transform_control.showY = ! this.viewManager.mainView.transform_control.showY;
                break;
            case 'c': // Z
                if (ev.ctrlKey){
                    this.mark_bbox(this.selected_box);
                } else {
                    this.viewManager.mainView.transform_control.showZ = ! this.viewManager.mainView.transform_control.showZ;
                }
                break;            
            case ' ': // Spacebar
                //this.viewManager.mainView.transform_control.enabled = ! this.viewManager.mainView.transform_control.enabled;
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
                    saveWorld(this.data.world);
                }
                break;
            /*
            case 's':
                if (ev.ctrlKey){
                    saveWorld();
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
                    saveWorld();
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
                    this.unselectBox(null);
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
        
        this.selectBox(this.data.world.boxes[this.operation_state.box_navigate_index]);

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
        
        this.selectBox(this.data.world.boxes[this.operation_state.box_navigate_index]);
    };

    // this.centerMainView =function(){
    //     let offset = this.data.world.coordinatesOffset;
    //     this.viewManager.mainView.orbit.target.x += offset[0];
    //     this.viewManager.mainView.orbit.target.y += offset[1];
    //     this.viewManager.mainView.orbit.target.z += offset[2];        
    // };

    this.on_load_world_finished= function(world){

        // switch view positoin

        this.lookAtWorld(world);
        this.unselectBox(null, true);
        this.unselectBox(null, true);
        this.render();
        this.imageContext.attachWorld(world);
        this.imageContext.render_2d_image();
        this.render2dLabels(world);
        this.update_frame_info(world.frameInfo.scene, world.frameInfo.frame);

        this.select_locked_object();
        this.header.unmark_changed_flag();
        load_obj_ids_of_scene(world.frameInfo.scene);
    };

    this.mainViewOffset = [0,0,0];

    this.lookAtWorld = function(world){
        let newOffset = [
                world.coordinatesOffset[0] - this.mainViewOffset[0],
                world.coordinatesOffset[1] - this.mainViewOffset[1],
                world.coordinatesOffset[2] - this.mainViewOffset[2],
            ];
        
        this.mainViewOffset = world.coordinatesOffset;
        
        this.viewManager.mainView.orbit.target.x += newOffset[0];
        this.viewManager.mainView.orbit.target.y += newOffset[1];
        this.viewManager.mainView.orbit.target.z += newOffset[2];

        this.viewManager.mainView.camera.position.x += newOffset[0];
        this.viewManager.mainView.camera.position.y += newOffset[1];
        this.viewManager.mainView.camera.position.z += newOffset[2];

        this.viewManager.mainView.orbit.update();
        
    };

    this.load_world = function(sceneName, frame){
        var self=this;
        //stop if current world is not ready!
        if (this.data.world && !this.data.world.preload_finished()){
            console.error("current world is still loading.");
            return;
        }

        if (this.selected_box && this.selected_box.in_highlight){
            this.cancelFocus(this.selected_box);
        }

        var world = this.data.getWorld(sceneName, frame);
        this.data.activate_world(
            world, 
            function(){
                self.on_load_world_finished(world);

                // preload after the first world loaded
                // otherwise the loading of the first world would be too slow
                self.data.preloadScene(sceneName, world);
            }
        );

        
    };


    this.remove_box = function(box){
        if (box === this.selected_box){
            this.remove_selected_box();
        } else {

            if (box.boxEditor){
                box.boxEditor.detach("donthide");
            }
            else{
                console.error("what?");
            }

            this.restore_box_points_color(box);

            this.imageContext.image_manager.remove_box(box.obj_local_id);

            this.floatLabelManager.remove_box(box);
            this.scene.remove(box);        
            
            //this.selected_box.dispose();
            box.world.remove_box(box);
            this.render();
        }
    };

    this.remove_selected_box= function(){
        if (this.selected_box){
            var target_box = this.selected_box;
            this.unselectBox(null);
            this.unselectBox(null); //twice to safely unselect.
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
        
        this.unselectBox(null);
        this.unselectBox(null);

        this.header.clear_frame_info();

        this.imageContext.clear_main_canvas();
        this.boxEditor.detach();


        this.data.world.unload();
        this.data.world= null; //dump it
        this.floatLabelManager.remove_all_labels();
        this.render();
    };

    this.update_frame_info= function(scene, frame){
        var self = this;
        this.header.set_frame_info(scene, frame, function(sceneName){
            self.scene_changed(sceneName)});
    };

    //box edited
    this.on_box_changed= function(box){

        
        
        //render_2d_image();
        this.imageContext.image_manager.update_box(box);

        this.header.update_box_info(box);
        //floatLabelManager.update_position(box, false);  don't update position, or the ui is annoying.
        this.header.mark_changed_flag();
        this.updateBoxPointsColor(box);
        this.save_box_info(box);

        if (box.boxEditor){
            box.boxEditor.onBoxChanged();
        }
        else{
            console.error("what?");
        }

        this.render();
    };

    this.restore_box_points_color= function(box){
        if (this.data.config.color_obj){
            box.world.set_box_points_color(box, {x: this.data.config.point_brightness, y: this.data.config.point_brightness, z: this.data.config.point_brightness});
            box.world.update_points_color();
            this.render();
        }
    };

    this.updateBoxPointsColor= function(box){
        if (this.data.config.color_obj){
            if (box.last_info){
                box.world.set_box_points_color(box.last_info, {x: this.data.config.point_brightness, y: this.data.config.point_brightness, z: this.data.config.point_brightness});
            }

            box.world.set_box_points_color(box);
            box.world.update_points_color();            
        }
    };

    this.onSelectedBoxChanged= function(box){

        if (box){        
            this.header.update_box_info(box);
            this.floatLabelManager.update_position(box, true);
            this.imageContext.image_manager.onBoxSelected(box.obj_local_id, box.obj_type);


            this.boxEditor.attachBox(box);
            this.render();
            //this.updateSubviewRangeByWindowResize(box);
            
        } else {
            this.header.clear_box_info();
            //clear_canvas();
            //render_2d_image();
        }

    };

    this.render2dLabels= function(world){
        if (this.editorCfg.disableMainView)
            return;

        this.floatLabelManager.remove_all_labels();
        var self=this;
        world.boxes.forEach(function(b){
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
                let box = self.add_box_on_mouse_pos(obj_type);
                //switch_bbox_type(event.currentTarget.getAttribute("uservalue"));
                self.grow_box(box, 0.2, {x:1.2, y:1.2, z:3});
                self.auto_shrink_box(box);
                self.on_box_changed(box);

                self.boxOp.auto_rotate_xyz(box, null, null, function(b){
                    self.on_box_changed(b);
                });
                
            }
        }

    };

    this.interpolate_selected_object= function(){

        let scene = this.data.world.frameInfo.scene; 
        let frame = this.data.world.frameInfo.frame;
        let obj_id = this.selected_box.obj_track_id;

        this.boxOp.interpolate_selected_object(scene, obj_id, frame, (s,fs)=>{
            this.onAnnotationUpdatedByOthers(s, fs);
        });

        
    };

    this.onAnnotationUpdatedByOthers = function(scene, frames){
        this.data.onAnnotationUpdatedByOthers(scene, frames);
    }

    this.init(editorUi);

};

export{Editor}