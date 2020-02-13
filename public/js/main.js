import * as THREE from './lib/three.module.js';
import { GUI } from './lib/dat.gui.module.js';

import {data} from './data.js'
import {create_views, views} from "./view.js"
import {createFloatLabelManager} from "./floatlabel.js"
import {matmul2, euler_angle_to_rotate_matrix} from "./util.js"
import {header} from "./header.js"
import {get_obj_cfg_by_type, obj_type_map, get_next_obj_type_name, guess_obj_type_by_dimension} from "./obj_cfg.js"

import {init_image_op, render_2d_image, update_image_box_projection, clear_canvas, clear_main_canvas, choose_best_camera_for_point, image_manager} from "./image.js"
import {add_calib_gui}  from "./calib.js"
import {mark_bbox, paste_bbox, auto_adjust_bbox, smart_paste} from "./auto-adjust.js"
import {save_annotation} from "./save.js"
import {load_obj_ids_of_scene, generate_new_unique_id} from "./obj_id_list.js"
import {stop_play, pause_resume_play, play_current_scene_with_buffer} from "./play.js"
import {init_mouse, onUpPosition, getIntersects, getMousePosition, get_mouse_location_in_world, get_screen_location_in_world} from "./mouse.js"

import {view_handles, on_z_direction_changed}  from "./side_view_op.js"

import {ml} from  './ml.js'

var sideview_enabled = true;
var container;

var scene, renderer;
var selected_box;
var windowWidth, windowHeight;

var params={};

var floatLabelManager;

var view_state ={
    lock_obj_track_id : "",
    lock_obj_in_highlight : false,
};

var operation_state = {
    mouse_right_down : false,
    key_pressed : false,
    box_navigate_index:0,
}; 


init();
animate();
render();
//$( "#maincanvas" ).resizable();

init_image_op();

load_data_meta();
add_global_obj_type();

function init() {
    document.body.addEventListener('keydown', event => {
        if (event.ctrlKey && 'asdv'.indexOf(event.key) !== -1) {
          event.preventDefault()
        }
    })

    document.oncontextmenu=function(event){
        return false;
    };


    scene = new THREE.Scene();


    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    //renderer.setSize( window.innerWidth, window.innerHeight );
    //renderer.shadowMap.enabled = true;
    //renderer.shadowMap.type = THREE.BasicShadowMap;

    //renderer.setClearColor( 0x000000, 0 );
    //renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
    // renderer will set this eventually
    //matLine.resolution.set( window.innerWidth, window.innerHeight ); // resolution of the viewport
    

    //container = document.createElement( 'container' );
    container = document.getElementById("container");
    

    //document.body.appendChild( container );
    container.appendChild( renderer.domElement );

    create_views(scene, container/*renderer.domElement*/, render, on_box_changed);

    add_range_box();

    floatLabelManager = createFloatLabelManager(views[0]);

    init_gui();
    
    scene.add( new THREE.AxesHelper( 1 ) );

    onWindowResize();

    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'keydown', keydown );

    //renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
    //renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    /*
    container.addEventListener( 'mousemove', onMouseMove, false );
    container.addEventListener( 'mousedown', onMouseDown, true );
    set_mouse_handler(handleLeftClick, handleRightClick);
    */
    init_mouse(container, handleLeftClick, handleRightClick, handleSelectRect);

    //document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    //document.addEventListener( 'mousemove', onDocumentMouseMove, false );
 
    document.getElementById("object-category-selector").onchange = object_category_changed;
    document.getElementById("object-track-id-editor").onchange = object_track_id_changed;
    document.getElementById("object-track-id-editor").addEventListener("keydown", function(e){
        e.stopPropagation();});
    
    document.getElementById("object-track-id-editor").addEventListener("keyup", function(e){
        e.stopPropagation();

        if (selected_box){
            selected_box.obj_track_id = this.value;
            floatLabelManager.set_object_track_id(selected_box.obj_local_id, selected_box.obj_track_id);
        }
    });
    //document.getElementById("header-row").addEventListener('mousedown', function(e){e.preventDefault();});
    //document.getElementById("header-row").addEventListener('mousemove', function(e){e.preventDefault();});
    
    document.getElementById("scene-selector").onchange = function(event){
        scene_changed(event.currentTarget.value);        
        event.currentTarget.blur();
    };

    document.getElementById("frame-selector").onchange = frame_changed;
    document.getElementById("camera-selector").onchange = camera_changed;


    
    install_fast_tool();

    install_context_menu();

    view_handles.init_view_operation();
    view_handles.hide();

    install_grid()
    
}

function install_grid(){
    
    var svg = document.getElementById("main-view-svg");

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
    
}
function install_fast_tool(){
    document.getElementById("label-del").onclick = function(){
        remove_selected_box();
        header.mark_changed_flag();
        event.currentTarget.blur();
    };

    document.getElementById("label-copy").onclick = function(event){
        mark_bbox();
        event.currentTarget.blur();
    }

    document.getElementById("label-paste").onclick = function(event){
        smart_paste();
        event.currentTarget.blur();
    }

    document.getElementById("label-edit").onclick = function(event){
        event.currentTarget.blur();
        select_bbox(selected_box);        
    }

    document.getElementById("label-reset").onclick = function(event){
        event.currentTarget.blur();
        if (selected_box){
            //switch_bbox_type(selected_box.obj_type);
            transform_bbox("reset");
        }        
    }

    document.getElementById("label-highlight").onclick = function(event){
        event.currentTarget.blur();
        if (selected_box.in_highlight){
            cancel_highlight_selected_box(selected_box);
            view_state.lock_obj_in_highlight = false
        }
        else {
            highlight_selected_box();
        }
    }

    document.getElementById("label-rotate").onclick = function(event){
        event.currentTarget.blur();
        transform_bbox("z_rotate_reverse");        
    }
}


function cancel_highlight_selected_box(box){
    
    box.in_highlight = false;
    //view_state.lock_obj_in_highlight = false; // when user unhighlight explicitly, set it to false
    data.world.cancel_highlight(box);
    floatLabelManager.restore_all();
    views[0].save_orbit_state(box.scale);
    views[0].orbit.reset();
}

function highlight_selected_box(){
    if (selected_box){
        data.world.highlight_box_points(selected_box);
        
        floatLabelManager.hide_all();
        views[0].orbit.saveState();

        //views[0].camera.position.set(selected_box.position.x+selected_box.scale.x*3, selected_box.position.y+selected_box.scale.y*3, selected_box.position.z+selected_box.scale.z*3);

        views[0].orbit.target.x = selected_box.position.x;
        views[0].orbit.target.y = selected_box.position.y;
        views[0].orbit.target.z = selected_box.position.z;

        views[0].restore_relative_orbit_state(selected_box.scale);


        views[0].orbit.update();

        render();
        selected_box.in_highlight=true;
        view_state.lock_obj_in_highlight = true;
    }
}

function install_context_menu(){

    document.getElementById("context-menu-wrapper").onclick = function(event){
        event.currentTarget.style.display="none";
    }

    document.getElementById("context-menu-wrapper").oncontextmenu = function(event){
        //event.currentTarget.style.display="none";
        event.preventDefault();
    }
    

    document.getElementById("cm-new").onclick = function(event){
        //add_bbox();
        //header.mark_changed_flag();
        event.preventDefault();
        event.stopPropagation();
    };

    document.getElementById("cm-new").onmouseenter = function(event){
        var parent_menu = document.getElementById("cm-new").getClientRects()[0];

        var item = document.getElementById("new-submenu");
        item.style.display="block";
        item.style.top = parent_menu.top + "px";
        item.style.left = parent_menu.left + parent_menu.width + "px";

        //console.log("enter new item");
    };

    document.getElementById("cm-new").onmouseleave = function(event){
        document.getElementById("new-submenu").style.display="none";
        //console.log("leave  new item");
    };


    document.getElementById("new-submenu").onmouseenter=function(event){
        var item = document.getElementById("new-submenu");
        item.style.display="block";
    }

    document.getElementById("new-submenu").onmouseleave=function(event){
        var item = document.getElementById("new-submenu");
        item.style.display="none";
    }



    document.getElementById("cm-paste").onclick = function(event){
        smart_paste();
    };

    document.getElementById("cm-prev-frame").onclick = function(event){      
        previous_frame();
    };

    document.getElementById("cm-next-frame").onclick = function(event){      
        next_frame();
    };

    document.getElementById("cm-save").onclick = function(event){      
        save_annotation();
    };


    document.getElementById("cm-play").onclick = function(event){      
        play_current_scene_with_buffer();
    };
    document.getElementById("cm-stop").onclick = function(event){      
        stop_play();
    };
    document.getElementById("cm-pause").onclick = function(event){      
        pause_resume_play();
    };


    document.getElementById("cm-prev-object").onclick = function(event){      
        select_previous_object();
    };

    document.getElementById("cm-next-object").onclick = function(event){      
        select_previous_object();
    };

}

function add_range_box(){
    
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

    scene.add(box);
}

function animate() {
    requestAnimationFrame( animate );
    views[0].orbit_orth.update();
}



function render(){

    views[0].switch_camera(params["bird's eye view"]);
    //console.log(views[0].camera.rotation.z);

    for ( var ii = 0; ii < views.length; ++ ii ) {

        if ((ii > 0) && !sideview_enabled){
            break;
        }

        var view = views[ ii ];
        var camera = view.camera;
        //view.updateCamera( camera, scene, mouseX, mouseY );
        
        var left = Math.floor( window.innerWidth * view.left );
        var bottom = Math.floor( window.innerHeight * view.bottom );
        var width = Math.ceil( window.innerWidth * view.width );
        var height = Math.ceil( window.innerHeight * view.height );

        view.viewport={
            left: window.innerWidth * view.left,
            bottom: window.innerHeight-window.innerHeight * view.bottom,
            width:window.innerWidth * view.width,
            height:window.innerHeight * view.height,
            zoom_ratio:view.zoom_ratio,
        };

        renderer.setViewport( left, bottom, width, height );
        renderer.setScissor( left, bottom, width, height );
        renderer.setClearColor(view.background );
        renderer.setScissorTest( true );

        renderer.render( scene, camera );
    }   

    
    floatLabelManager.update_all_position();
    if (selected_box){
        floatLabelManager.update_obj_editor_position(selected_box.obj_local_id);
    }

}

function load_data_meta(){    

    var xhr = new XMLHttpRequest();
    // we defined the xhr
    
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) 
            return;
    
        if (this.status == 200) {
            var ret = JSON.parse(this.responseText);
            data.meta = ret;                               

            var scene_selector_str = ret.map(function(c){
                return "<option value="+c.scene +">"+c.scene + "</option>";
            }).reduce(function(x,y){return x+y;}, "<option>--scene--</option>");

            document.getElementById("scene-selector").innerHTML = scene_selector_str;
        }

    };
    
    xhr.open('GET', "/datameta", true);
    xhr.send();
}

function scene_changed(scene_name){
    
    //var scene_name = event.currentTarget.value;

    if (scene_name.length == 0){
        return;
    }
    
    console.log("choose scene_name " + scene_name);
    var meta = data.get_meta_by_scene_name(scene_name);

    var frame_selector_str = meta.frames.map(function(f){
        return "<option value="+f+">"+f + "</option>";
    }).reduce(function(x,y){return x+y;}, "<option>--frame--</option>");

    document.getElementById("frame-selector").innerHTML = frame_selector_str;
    
    
    if (meta.image){
        var camera_selector_str = meta.image.map(function(c){
            return '<option value="'+c+'">'+c+'</option>';
        }).reduce(function(x,y){return x+y;}, "<option>--camera--</option>");
        document.getElementById("camera-selector").innerHTML = camera_selector_str;
    }

    load_obj_ids_of_scene(scene_name);
}



function frame_changed(event){
    var scene_name = document.getElementById("scene-selector").value;

    if (scene_name.length == 0){
        return;
    }

    var frame =  event.currentTarget.value;
    console.log(scene_name, frame);
    load_world(scene_name, frame);

    event.currentTarget.blur();
}


function camera_changed(event){
    var camera_name = event.currentTarget.value;

    data.set_active_image(camera_name);
    render_2d_image();

    event.currentTarget.blur();
}




function init_gui(){
    var gui = new GUI();

    // view
    var cfgFolder = gui.addFolder( 'View' );

    params["toggle side views"] = function(){
        sideview_enabled = !sideview_enabled;
        render();
    };  

    params["bird's eye view"] = false;
    params["hide image"] = false;
        
    params["toggle id"] = function(){
        floatLabelManager.toggle_id();
        
    };
    params["toggle category"] = function(){
        floatLabelManager.toggle_category();
        
    };

    params["toggle background"] = function(){
        data.toggle_background();
        render();
    };

    params["test2"] = function(){
        grow_box(0.2, {x:1, y:1, z:3});
        on_box_changed(selected_box);
    };
    
    params["reset main view"] = function(){
        views[0].reset_camera();
        views[0].reset_birdseye();
        //render();
    };

    params["rotate bird's eye view"] = function(){
        views[0].rotate_birdseye();
        render();
    };
    
    //params["side view width"] = 0.2;

    params["point size+"] = function(){
        data.scale_point_size(1.2);
        render();
    };
    
    params["point size-"] = function(){
        data.scale_point_size(0.8);
        render();
    };

    params["point brightness+"] = function(){
        data.scale_point_brightness(1.2);
        load_world(data.world.file_info.scene, data.world.file_info.frame);
    };
    
    params["point brightness-"] = function(){
        data.scale_point_brightness(0.8);
        load_world(data.world.file_info.scene, data.world.file_info.frame);
    };

    params["toggle box"] = function(){
        data.toggle_box_opacity();
        if (selected_box){
            selected_box.material.opacity = 1;                
        }

        render();
    }

    params["toggle obj color"] = function(){
        data.toggle_color_obj();
        render();
    }

    cfgFolder.add( params, "point size+");
    cfgFolder.add( params, "point size-");
    cfgFolder.add( params, "point brightness+");
    cfgFolder.add( params, "point brightness-");


    
    cfgFolder.add( params, "test2");

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


    params["play"] = play_current_scene_with_buffer;
    params["stop"] = stop_play;
    params["previous frame"] = previous_frame;
    params["next frame"] = next_frame;

    cfgFolder.add( params, "play");
    cfgFolder.add( params, "stop");
    cfgFolder.add( params, "previous frame");
    cfgFolder.add( params, "next frame");

    //edit
    var editFolder = gui.addFolder( 'Edit' );
    params['select-ref-bbox'] = function () {
        mark_bbox();
    };
    
    params['auto-adjust'] = function () {
        auto_adjust_bbox();
    };

    params['paste'] = function () {
        paste_bbox();
    };

    params['smart-paste'] = function () {
        if (!selected_box)
            paste_bbox();
        auto_adjust_bbox(function(){
            save_annotation();
        });
        
    };
    
    editFolder.add( params, 'select-ref-bbox');
    editFolder.add( params, 'paste');
    editFolder.add( params, 'auto-adjust');
    editFolder.add( params, 'smart-paste');


     add_calib_gui(gui);

    //file
    var fileFolder = gui.addFolder( 'File' );
    params['save'] = function () {
        save_annotation();
    };
    fileFolder.add( params, 'save');

    
    params['reload'] = function () {
        load_world(data.world.file_info.scene, data.world.file_info.frame);
    };

    fileFolder.add( params, 'reload');

    params['clear'] = function () {
        clear();
    };
    fileFolder.add( params, 'clear');


    //fileFolder.open();

    //var dataFolder = gui.addFolder( 'Data' );
    //load_data_meta(dataFolder);


    var toolsFolder = gui.addFolder( 'Tools' );
    params['calibrate_axes'] = function () {
        ml.calibrate_axes(data.world.get_all_pionts());
        render();
    };
    toolsFolder.add( params, 'calibrate_axes');

    params['l-shape fit'] = function () {
        let points = data.world.get_points_relative_coordinates_of_box(selected_box, 1.0);
        points = points.map(function(p){
            return [p[0],p[1]];
        });

        var angle = ml.l_shape_fit(points);
        selected_box.rotation.z += angle;
        on_box_changed(selected_box);
        
    };
    toolsFolder.add( params, 'l-shape fit');


    params['predict rotation'] = function () {
        if (selected_box)
            auto_direction_predict(selected_box);       
    };


    toolsFolder.add( params, 'predict rotation');


    gui.open();
}


function auto_direction_predict(box, callback){
    let points = data.world.get_points_relative_coordinates_of_box(box, 1.0);

        points = points.filter(function(p){
            return p[2] > - box.scale.z/2 + 0.3;
        })

        //points is N*3 shape

        var angle = ml.predict_rotation(points, function(angle){
            on_z_direction_changed(angle, true);
            if (callback){
                callback();
            }
        });
}


function object_category_changed(event){
    if (selected_box){
        
        selected_box.obj_type = event.currentTarget.value;
        floatLabelManager.set_object_type(selected_box.obj_local_id, selected_box.obj_type);
        header.mark_changed_flag();
        update_box_points_color(selected_box);
        image_manager.update_obj_type(selected_box.obj_local_id, selected_box.obj_type);
    }
}


function object_track_id_changed(event){
    if (selected_box){
        var id = event.currentTarget.value;


        if (id == "auto"){
            id = generate_new_unique_id();
            floatLabelManager.update_label_editor(selected_box.obj_type, id);
        }

        selected_box.obj_track_id = id;
        floatLabelManager.set_object_track_id(selected_box.obj_local_id, selected_box.obj_track_id);
        header.mark_changed_flag();
    }
}



function update_subview_by_windowsize(box){

    if (box === null)
        return;

        view_handles.update_view_handle(views[1].viewport, selected_box.scale);
    
    // side views
    var exp_camera_width, exp_camera_height, exp_camera_clip;

    for ( var ii = 1; ii < views.length; ++ ii ) {
        var view = views[ ii ];
        var camera = view.camera;

        view.width = 0.2;//params["side view width"];

        var view_width = Math.floor( window.innerWidth * view.width );
        var view_height = Math.floor( window.innerHeight * view.height );

        if (ii==1){
            exp_camera_width = box.scale.x*1.5*view.zoom_ratio;
            exp_camera_height = box.scale.y*1.5*view.zoom_ratio;

            exp_camera_clip = box.scale.z+0.8;
        } else if (ii==2){
            exp_camera_width = box.scale.x*1.5*view.zoom_ratio;
            exp_camera_height = box.scale.z*1.5*view.zoom_ratio;

            exp_camera_clip = box.scale.y*1.2;
        }else if (ii==3){
            exp_camera_width = box.scale.y*1.5*view.zoom_ratio;
            exp_camera_height = box.scale.z*1.5*view.zoom_ratio;

            exp_camera_clip = box.scale.x*1.2;
        }


        if (exp_camera_width/exp_camera_height > view_width/view_height){
            //increase height
            exp_camera_height = exp_camera_width * view_height/view_width;
        }
        else
        {
            exp_camera_width = exp_camera_height * view_width/view_height;
        }

        camera.top = exp_camera_height/2;
        camera.bottom = exp_camera_height/-2;
        camera.right = exp_camera_width/2;
        camera.left = exp_camera_width/-2;

        camera.near = exp_camera_clip/-2;
        camera.far = exp_camera_clip/2;
        
        //camera.aspect = view_width / view_height;
        camera.updateProjectionMatrix();
        view.cameraHelper.update();
        
        
    }

    render();
}

function update_subview_by_bbox(box){
    var p = box.position;
    var r = box.rotation;
    //console.log(r);
    //
    views[1].camera.rotation.x= r.x;
    views[1].camera.rotation.y= r.y;
    views[1].camera.rotation.z= r.z;

    views[1].camera.position.x= p.x;
    views[1].camera.position.y= p.y;
    views[1].camera.position.z= p.z;
    views[1].camera.updateProjectionMatrix();
    views[1].cameraHelper.update(); 
    

    var trans_matrix = euler_angle_to_rotate_matrix(r, p);


    views[2].camera.position.x= p.x;
    views[2].camera.position.y= p.y;
    views[2].camera.position.z= p.z;

    var up = matmul2(trans_matrix, [0, 0, 1, 0], 4);
    views[2].camera.up.set( up[0], up[1], up[2]);
    var at = matmul2(trans_matrix, [0, 1, 0, 1], 4);
    views[2].camera.lookAt( at[0], at[1], at[2] );
    
    
    views[2].camera.updateProjectionMatrix();
    views[2].cameraHelper.update();
    

    views[3].camera.position.x= p.x;
    views[3].camera.position.y= p.y;
    views[3].camera.position.z= p.z;

    var up3 = matmul2(trans_matrix, [0, 0, 1, 0], 4);
    views[3].camera.up.set( up3[0], up3[1], up3[2]);
    var at3 = matmul2(trans_matrix, [-1, 0, 0, 1], 4);
    views[3].camera.lookAt( at3[0], at3[1], at3[2] );
    

    views[3].camera.updateProjectionMatrix();
    views[3].cameraHelper.update();        

    update_subview_by_windowsize(box);  // render() is called inside this func
}



function handleRightClick(event){

    var pos = getMousePosition(renderer.domElement, event.clientX, event.clientY );
    document.getElementById("context-menu").style.left = event.clientX+"px";
    document.getElementById("context-menu").style.top = event.clientY+"px";
    document.getElementById("context-menu-wrapper").style.display = "block";

}


function handleSelectRect(x,y,w,h){
    y = y+h;
    x = x*2-1;
    y = -y*2+1;
    w *= 2;
    h *= 2;
    
    /*
    console.log("main select rect", x,y,w,h);

    views[0].camera.updateProjectionMatrix();
    data.world.select_points_by_view_rect(x,y,w,h, views[0].camera);
    render();
    render_2d_image();
    */

    var center_pos = get_screen_location_in_world(x+w/2, y+h/2);
    
    var box = data.world.create_box_by_view_rect(x,y,w,h, views[0].camera, center_pos);
    scene.add(box);
       
    image_manager.add_box(box);
    
    auto_shrink_box(box);
    
    // guess obj type here
    
    box.obj_type = guess_obj_type_by_dimension(box.scale);
    
    floatLabelManager.add_label(box, function(){select_bbox(box);});

    select_bbox(box);
    on_box_changed(box);

    auto_direction_predict(box, function(){
        box.obj_type = guess_obj_type_by_dimension(box.scale);
        floatLabelManager.set_object_type(box.obj_local_id, box.obj_type);
        floatLabelManager.update_label_editor(box.obj_type, box.obj_track_id);
        on_box_changed(box);
    });

    
    
    //floatLabelManager.add_label(box, function(){select_bbox(box);});

    

    
}

function handleLeftClick(event) {

        if (event.ctrlKey){
            //Ctrl+left click to smart paste!
            //smart_paste();
        }
        else{
            //select box /unselect box
            if (!data.world || !data.world.boxes){
                return;
            }
        
        
            var intersects = getIntersects( onUpPosition, data.world.boxes );

            if ( intersects.length > 0 ) {

                //var object = intersects[ 0 ].object;
                var object = intersects[ 0 ].object;

                if ( object.userData.object !== undefined ) {
                    // helper
                    select_bbox( object.userData.object );

                } else {

                    select_bbox( object );
                }
            } else {

                    unselect_bbox(null);
            }

            //render();
        }
    

}


function select_locked_object(){
    if (view_state.lock_obj_track_id != ""){
        var box = data.world.boxes.find(function(x){
            return x.obj_track_id == view_state.lock_obj_track_id;
        })

        if (box){
            select_bbox(box);

            if (view_state.lock_obj_in_highlight){
                highlight_selected_box();
            }
        }
    }
}

// new_object
function unselect_bbox(new_object, keep_lock){

    if (new_object==null){
        if (views[0].transform_control.visible)
        {
            //unselect first time
            views[0].transform_control.detach();
        }else{
            //unselect second time
            if (selected_box){
                
                
                
                // restore from highlight
                if (selected_box.in_highlight){
                    cancel_highlight_selected_box(selected_box);    

                    if (!keep_lock){
                        view_state.lock_obj_in_highlight = false;
                    }
                } else{

                    // unselected finally
                    selected_box.material.color = new THREE.Color(parseInt("0x"+get_obj_cfg_by_type(selected_box.obj_type).color.slice(1)));
                    selected_box.material.opacity = data.box_opacity;
                    floatLabelManager.unselect_box(selected_box.obj_local_id, selected_box.obj_type);
                    floatLabelManager.update_position(selected_box, true);

                    if (!keep_lock){
                        view_state.lock_obj_track_id = "";
                    }

                    image_manager.unselect_bbox(selected_box.obj_local_id, selected_box.obj_type);
                    selected_box = null;
                    view_handles.hide();

                    on_selected_box_changed(null);
                }
            }

            
            
        }
    }
    else{
        // selected other box
        //unselect all
        views[0].transform_control.detach();

        
        if (selected_box){
            
            // restore from highlight
            
            if (selected_box.in_highlight){
                cancel_highlight_selected_box(selected_box); 
                if (!keep_lock){
                    view_state.lock_obj_in_highlight = false;
                }
            }

            selected_box.material.color = new THREE.Color(parseInt("0x"+get_obj_cfg_by_type(selected_box.obj_type).color.slice(1)));
            selected_box.material.opacity = data.box_opacity;                
            floatLabelManager.unselect_box(selected_box.obj_local_id);
            floatLabelManager.update_position(selected_box, true);
            image_manager.unselect_bbox(selected_box.obj_local_id, selected_box.obj_type);

            selected_box = null;
            view_handles.hide();
            if (!keep_lock)
                view_state.lock_obj_track_id = "";
        }
    }



    render();

}

function select_bbox(object){

    if (selected_box != object){
        // unselect old bbox
        

        var in_highlight = false;

        if (selected_box){
            in_highlight = selected_box.in_highlight;
            unselect_bbox(selected_box);
        }

        // select me, the first time
        selected_box = object;

        var best_iamge = choose_best_camera_for_point(selected_box.position.x, selected_box.position.y, selected_box.position.z);

        if (best_iamge){
            
            var image_changed = data.set_active_image(best_iamge);

            if (image_changed){
                document.getElementById("camera-selector").value=best_iamge;
                image_manager.display_image();
            }
        }

        view_state.lock_obj_track_id = object.obj_track_id;

        floatLabelManager.select_box(selected_box.obj_local_id);
        floatLabelManager.update_label_editor(object.obj_type, object.obj_track_id);

        selected_box.material.color.r=1;
        selected_box.material.color.g=0;
        selected_box.material.color.b=1;
        selected_box.material.opacity=1;

        if (in_highlight){
            highlight_selected_box();
        }
        
        
    }
    else {
        //reselect the same box
        if (views[0].transform_control.visible){
            change_transform_control_view();
        }
        else{
            //select me the second time
            views[0].transform_control.attach( object );
        }
    }

    save_box_info(object); // this is needed since when a frame is loaded, all box haven't saved anything.
                           // we could move this to when a frame is loaded.

    on_selected_box_changed(object);

    view_handles.show();
}



function onWindowResize() {
    //camera.aspect = window.innerWidth / window.innerHeight;
    //camera.updateProjectionMatrix();
    //renderer.setSize( window.innerWidth, window.innerHeight );

    if ( windowWidth != window.innerWidth || windowHeight != window.innerHeight ) {

        //update_mainview();
        views[0].onWindowResize();

        if (selected_box){
            update_subview_by_windowsize(selected_box);
        }

        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
        renderer.setSize( windowWidth, windowHeight );

        
    }
    
    render();

    //controls.handleResize();

    //dirLightShadowMapViewer.updateForWindowResize();

    //document.getElementById("maincanvas").parentElement.style.left="20%";

}

function change_transform_control_view(){
    if (views[0].transform_control.mode=="scale"){
        views[0].transform_control.setMode( "translate" );
        views[0].transform_control.showY=true;
        views[0].transform_control.showX=true;
        views[0].transform_control.showz=true;
    }else if (views[0].transform_control.mode=="translate"){
        views[0].transform_control.setMode( "rotate" );
        views[0].transform_control.showY=false;
        views[0].transform_control.showX=false;
        views[0].transform_control.showz=true;
    }else if (views[0].transform_control.mode=="rotate"){
        views[0].transform_control.setMode( "scale" );
        views[0].transform_control.showY=true;
        views[0].transform_control.showX=true;
        views[0].transform_control.showz=true;
    }
}



function add_bbox(obj_type){
    // todo: move to data.world
    var pos = get_mouse_location_in_world();
    var rotation = {x:0, y:0, z:views[0].camera.rotation.z};

    var obj_cfg = get_obj_cfg_by_type(obj_type);
    var scale = {   
        x: obj_cfg.size[0],
        y: obj_cfg.size[1],
        z: obj_cfg.size[2]
    };

    var box = data.world.add_box(pos, scale, rotation, obj_type, "");

    scene.add(box);

    floatLabelManager.add_label(box, function(){select_bbox(box);});
    
    image_manager.add_box(box);

    select_bbox(box);
    
    return box;
}

// 
function save_box_info(box){
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
}


function translate_box(box, axis, delta){
    switch (axis){
        case 'x':
            box.position.x += delta*Math.cos(box.rotation.z);
            box.position.y += delta*Math.sin(box.rotation.z);
            break;
        case 'y':
            box.position.x += delta*Math.cos(Math.PI/2 + box.rotation.z);
            box.position.y += delta*Math.sin(Math.PI/2 + box.rotation.z);  
            break;
        case 'z':
            box.position.z += delta;
            break;

    }
}

// axix, xyz, action: scale, move, direction, up/down
function transform_bbox(command){
    if (!selected_box)
        return;
    
    switch (command){
        case 'x_move_up':
            translate_box(selected_box, 'x', 0.05);
            break;
        case 'x_move_down':
            translate_box(selected_box, 'x', -0.05);
            break;
        case 'x_scale_up':
            selected_box.scale.x *= 1.01;    
            break;
        case 'x_scale_down':
            selected_box.scale.x /= 1.01;
            break;
        
        case 'y_move_up':
            translate_box(selected_box, 'y', 0.05);
            break;
        case 'y_move_down':        
            translate_box(selected_box, 'y', -0.05);            
            break;
        case 'y_scale_up':
            selected_box.scale.y *= 1.01;    
            break;
        case 'y_scale_down':
            selected_box.scale.y /= 1.01;
            break;
        
        case 'z_move_up':
            selected_box.position.z += 0.05;
            break;
        case 'z_move_down':        
            selected_box.position.z -= 0.05;
            break;
        case 'z_scale_up':
            selected_box.scale.z *= 1.01;    
            break;
        case 'z_scale_down':
            selected_box.scale.z /= 1.01;
            break;
        
        case 'z_rotate_left':
            selected_box.rotation.z += 0.01;
            break;
        case 'z_rotate_right':
            selected_box.rotation.z -= 0.01;
            break;
        
        case 'z_rotate_reverse':        
            if (selected_box.rotation.z > 0){
                selected_box.rotation.z -= Math.PI;
            }else{
                selected_box.rotation.z += Math.PI;
            }    
            break;
        case 'reset':
            selected_box.rotation.x = 0;
            selected_box.rotation.y = 0;
            selected_box.rotation.z = 0;
            selected_box.position.z = 0;
            break;

    }

    on_box_changed(selected_box);    
    
}


function switch_bbox_type(target_type){
    if (!selected_box)
        return;

    if (!target_type){
        target_type = get_next_obj_type_name(selected_box.obj_type);
    }

    selected_box.obj_type = target_type;
    var obj_cfg = get_obj_cfg_by_type(target_type);
    selected_box.scale.x=obj_cfg.size[0];
    selected_box.scale.y=obj_cfg.size[1];
    selected_box.scale.z=obj_cfg.size[2];           

    
    floatLabelManager.set_object_type(selected_box.obj_local_id, selected_box.obj_type);
    floatLabelManager.update_label_editor(selected_box.obj_type, selected_box.obj_track_id);

    
    
}

function auto_shrink_box(box){
    var  extreme = data.world.get_points_dimmension_of_box(box);
    
    
    ['x', 'y','z'].forEach(function(axis){

        translate_box(box, axis, (extreme.max[axis] + extreme.min[axis])/2);
        box.scale[axis] = extreme.max[axis]-extreme.min[axis];        

    }) 

}

function grow_box(min_distance, init_scale_ratio){

    var extreme = data.world.grow_box(selected_box, min_distance, init_scale_ratio);

    if (extreme){

        ['x','y', 'z'].forEach(function(axis){
            translate_box(selected_box, axis, (extreme.max[axis] + extreme.min[axis])/2);
            selected_box.scale[axis] = extreme.max[axis] - extreme.min[axis];        
        }) 
    }

}

function keydown( ev ) {
    operation_state.key_pressed = true;

    switch ( ev.key) {
        case '+':
        case '=':
            data.scale_point_size(1.2);
            render();
            break;
        case '-':
            data.scale_point_size(0.8);
            render();
            break;
        case '1': 
            select_previous_object();
            break;
        case '2':
            select_next_object();
            break;
        case '3':
            previous_frame();
            break;
        case '4':
            next_frame();
            break;

        case 'v':
            change_transform_control_view();
            break;
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
            header.mark_changed_flag();
            on_box_changed(selected_box);
            break;
        case 'z': // X
            views[0].transform_control.showX = ! views[0].transform_control.showX;
            break;
        case 'x': // Y
            views[0].transform_control.showY = ! views[0].transform_control.showY;
            break;
        case 'c': // Z
            if (ev.ctrlKey){
                mark_bbox();
            } else {
                views[0].transform_control.showZ = ! views[0].transform_control.showZ;
            }
            break;            
        case ' ': // Spacebar
            //views[0].transform_control.enabled = ! views[0].transform_control.enabled;
            pause_resume_play();
            break;
            
        case '5':            
        case '6':
        case '7':
            views[ev.key-'4'].cameraHelper.visible = !views[ev.key-'4'].cameraHelper.visible;
            render();
            break;

        case 'a':
            if (selected_box){
                if (!operation_state.mouse_right_down){
                    transform_bbox("x_move_down");
                }
                else{
                    transform_bbox("x_scale_down");
                }
            }
            break;
        case 'A':
            transform_bbox("x_scale_down");
            break;
        case 'q':
            if (selected_box){
                if (!operation_state.mouse_right_down){
                    transform_bbox("x_move_up");
                }
                else{
                    transform_bbox("x_scale_up");
                }                
            }            
            break;        
        case 'Q':
            transform_bbox("x_scale_up");
            break;
            
        case 's':
            if (ev.ctrlKey){
                save_annotation();
            }
            else if (selected_box){
                if (!operation_state.mouse_right_down){
                    transform_bbox("y_move_down");
                }else{
                    transform_bbox("y_scale_down");
                }
            }
            break;
        case 'S':
            if (ev.ctrlKey){
                save_annotation();
            }
            else if (selected_box){
                transform_bbox("y_scale_down");
            }            
            break;
        case 'w':
            if (selected_box){
                if (!operation_state.mouse_right_down)
                    transform_bbox("y_move_up");
                else
                    transform_bbox("y_scale_up");                
            }
            break;
        case 'W':
            if (selected_box){
                transform_bbox("y_scale_up");
            }
            break;


        case 'd':
            if (selected_box){
                if (operation_state.mouse_right_down){
                    transform_bbox("z_scale_down");                    
                }
                else if (ev.ctrlKey){
                    remove_selected_box();
                    header.mark_changed_flag();
                }else{
                    transform_bbox("z_move_down");
                }
                
            }
            break;
        case 'D':
            if (selected_box){
                transform_bbox("z_scale_down");
            }            
            break;        
        case 'e':
                if (selected_box){
                    if (!operation_state.mouse_right_down)
                        transform_bbox("z_move_up");
                    else
                        transform_bbox("z_scale_up");                    
                }
                break;
        case 'E':
            if (selected_box){
                transform_bbox("z_scale_up");
            }
            break;

        case 'f':
            if (selected_box){                
                //transform_bbox("z_rotate_right");                
                on_z_direction_changed(-0.005, true);
            }
            break;
        case 'r':
            if (selected_box){
                //transform_bbox("z_rotate_left");
                on_z_direction_changed(0.005, true);
            }
            break;
        
        case 'g':
            transform_bbox("z_rotate_reverse");
            break;
        case 't':
            transform_bbox("reset");
            break;
        
        case 'Delete':
            remove_selected_box();
            header.mark_changed_flag();
            break;
        case 'Escape':
            if (selected_box){
                unselect_bbox(null);
            }
            break;
    }
}



function previous_frame(){

    if (!data.meta)
        return;

    var scene_meta = data.meta.find(function(x){
        return x.scene == data.world.file_info.scene;
    });

    var num_frames = scene_meta.frames.length;

    var frame_index = (data.world.file_info.frame_index-1 + num_frames) % num_frames;

    load_world(scene_meta.scene, scene_meta.frames[frame_index]);

    

}

function next_frame(){

    if (!data.meta)
        return;
        
    var scene_meta = data.get_current_world_scene_meta();

    var num_frames = scene_meta.frames.length;

    var frame_index = (data.world.file_info.frame_index +1) % num_frames;

    load_world(scene_meta.scene, scene_meta.frames[frame_index]);
}

function select_next_object(){

    if (data.world.boxes.length<=0)
        return;

    if (selected_box){
        operation_state.box_navigate_index = data.world.boxes.findIndex(function(x){
            return selected_box == x;
        });
    }
    
    operation_state.box_navigate_index += 1;            
    operation_state.box_navigate_index %= data.world.boxes.length;    
    
    select_bbox(data.world.boxes[operation_state.box_navigate_index]);

}

function select_previous_object(){
    if (data.world.boxes.length<=0)
        return;

    if (selected_box){
        operation_state.box_navigate_index = data.world.boxes.findIndex(function(x){
            return selected_box == x;
        });
    }
    
    operation_state.box_navigate_index += data.world.boxes.length-1;            
    operation_state.box_navigate_index %= data.world.boxes.length;    
    
    select_bbox(data.world.boxes[operation_state.box_navigate_index]);
}

function on_load_world_finished(scene_name, frame){
    unselect_bbox(null, true);
    unselect_bbox(null, true);
    render();
    render_2d_image();
    render_2d_labels();
    update_frame_info(scene_name, frame);

    select_locked_object();
    header.unmark_changed_flag();
    load_obj_ids_of_scene(scene_name);
}

function load_world(scene_name, frame){

    //stop if current world is not ready!
    if (data.world && !data.world.complete()){
        console.log("current world is still loading.");
        return;
    }

    var world = data.make_new_world(
        scene_name, 
        frame);
    data.activate_world(scene, 
        world, 
        function(){on_load_world_finished(scene_name, frame);}
    );
}



function remove_selected_box(){
    if (selected_box){
        var target_box = selected_box;
        unselect_bbox(null);
        unselect_bbox(null); //twice to safely unselect.
        //transform_control.detach();
        
        // restroe color
        restore_box_points_color(target_box);

        image_manager.remove_box(target_box.obj_local_id);

        floatLabelManager.remove_box(target_box);
        scene.remove(target_box);        
        
        //selected_box.dispose();
        data.world.remove_box(target_box);

        
        selected_box = null;
        
        render();
        //render_2d_image();
        
    }
}

function clear(){

    header.clear_box_info();
    //document.getElementById("image").innerHTML = '';
    
    unselect_bbox(null);
    unselect_bbox(null);

    header.clear_frame_info();

    clear_main_canvas();
    clear_canvas();


    data.world.destroy();
    data.world= null; //dump it
    floatLabelManager.remove_all_labels();
    render();
}



function update_frame_info(scene, frame){
    header.set_frame_info(scene, frame, scene_changed);
}

//box edited
function on_box_changed(box){

    update_subview_by_bbox(box);
    view_handles.update_view_handle();
    update_image_box_projection(box);
    
    //render_2d_image();
    image_manager.update_box(box);

    header.update_box_info(box);
    //floatLabelManager.update_position(box, false);  don't update position, or the ui is annoying.
    header.mark_changed_flag();
    update_box_points_color(box);
    save_box_info(box);

    
}


function restore_box_points_color(box){
    if (data.color_obj){
        data.world.set_box_points_color(box, {x: data.point_brightness, y: data.point_brightness, z: data.point_brightness});
        data.world.update_points_color();
        render();
    }
}

function update_box_points_color(box){
    if (data.color_obj){
        if (box.last_info){
            data.world.set_box_points_color(box.last_info, {x: data.point_brightness, y: data.point_brightness, z: data.point_brightness});
        }

        data.world.set_box_points_color(box);
        data.world.update_points_color();
        render();
    }
}

function on_selected_box_changed(box){

    if (box){        
        header.update_box_info(box);
        update_image_box_projection(box)
        floatLabelManager.update_position(box, true);
        update_subview_by_bbox(box);
        view_handles.update_view_handle(views[1].viewport, selected_box.scale);

        image_manager.select_bbox(box.obj_local_id, box.obj_type);
    } else {
        header.clear_box_info();
        //clear_canvas();
        //render_2d_image();
    }

      
    
    
}


function render_2d_labels(){
    floatLabelManager.remove_all_labels();

    data.world.boxes.forEach(function(b){
        floatLabelManager.add_label(b, function(){select_bbox(b);});
    })

    if (selected_box){
        floatLabelManager.select_box(selected_box.obj_local_id)
    }
}




function add_global_obj_type(){
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

    document.getElementById("object-category-selector").innerHTML = options;


    // submenu of new
    var items = "";
    for (var o in obj_type_map){
        items += '<div class="menu-item cm-new-item ' + o + '" id="cm-new-'+o+'" uservalue="' +o+ '"><div class="menu-item-text">'+o+ '</div></div>';        
    }

    document.getElementById("new-submenu").innerHTML = items;

    // install click actions
    for (var o in obj_type_map){        
        document.getElementById("cm-new-"+o).onclick = function(event){
            var obj_type = event.currentTarget.getAttribute("uservalue");
            add_bbox(obj_type);
            //switch_bbox_type(event.currentTarget.getAttribute("uservalue"));
            grow_box(0.2, {x:1.2, y:1.2, z:3});
            auto_shrink_box(selected_box);
            on_box_changed(selected_box);
            auto_direction_predict(selected_box);
            
        }
    }

}



export {selected_box, params, on_box_changed, select_bbox, scene, floatLabelManager, on_load_world_finished, operation_state, transform_bbox, translate_box, update_subview_by_windowsize}