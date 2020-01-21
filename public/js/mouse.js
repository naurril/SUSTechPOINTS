
import * as THREE from './lib/three.module.js';
import {operation_state}  from "./main.js";
import {views} from "./view.js";

var mouse = new THREE.Vector2();

var raycaster;
var onDownPosition;
var onUpPosition;

var handleLeftClick;
var handleRightClick;
var handleSelectRect;
var dom_element;

var in_select_mode = false;
var select_start_pos;
var select_end_pos;


function init_mouse(container, on_left_click, on_right_click, on_select_rect){
    raycaster = new THREE.Raycaster();
    onDownPosition = new THREE.Vector2();
    onUpPosition = new THREE.Vector2();


    container.addEventListener( 'mousemove', onMouseMove, false );
    container.addEventListener( 'mousedown', onMouseDown, true );
    set_mouse_handler(on_left_click, on_right_click, on_select_rect);
    dom_element = container;
}

function set_mouse_handler(on_left_click, on_right_click, on_select_rect){
    handleLeftClick = on_left_click;
    handleRightClick = on_right_click;
    handleSelectRect = on_select_rect;
}




function get_mouse_location_in_world(){
    raycaster.setFromCamera( mouse, views[0].camera );
    var o = raycaster.ray.origin;
    var d = raycaster.ray.direction;

    var alpha = - o.z/d.z;
    var x = o.x + d.x*alpha;
    var y = o.y + d.y*alpha;
    return {x:x, y:y, z:0};
}


function get_screen_location_in_world(x,y){
    var screen_pos = new THREE.Vector2();
    screen_pos.x = x;
    screen_pos.y = y;

    raycaster.setFromCamera( screen_pos, views[0].camera );
    var o = raycaster.ray.origin;
    var d = raycaster.ray.direction;

    var alpha = - o.z/d.z;
    var x = o.x + d.x*alpha;
    var y = o.y + d.y*alpha;
    return {x:x, y:y, z:0};
}


function onMouseDown( event ) {    

    in_select_mode = false;

    if (event.which==3){
        operation_state.mouse_right_down = true;
        operation_state.key_pressed = false;
    } else if (event.which == 1){
        console.log("mouse left key down!");
        if (event.ctrlKey){
            in_select_mode = true;
        
            select_start_pos={
                x: event.clientX,
                y: event.clientY,
            }            
        }
    }
    

    var array = getMousePosition(dom_element, event.clientX, event.clientY );
    onDownPosition.fromArray( array );        
    

    this.addEventListener( 'mouseup', onMouseUp, false );

}

function onMouseMove( event ) {
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
   
    if (event.ctrlKey)
        console.log(mouse);   

    if (in_select_mode){
        if (event.client != select_start_pos.x || event.clientY != select_end_pos.y){
            //draw select box
            var sbox = document.getElementById("select-box");
            
            sbox.style.display="inherit";

            select_end_pos={
                x: event.clientX,
                y: event.clientY,
            } 

            if (select_start_pos.x < select_end_pos.x){
                sbox.style.left = select_start_pos.x + 'px';
                sbox.style.width = select_end_pos.x - select_start_pos.x + 'px';
            }else {
                sbox.style.left = select_end_pos.x + 'px';
                sbox.style.width = -select_end_pos.x + select_start_pos.x + 'px';
            }

            if (select_start_pos.y < select_end_pos.y){
                sbox.style.top = select_start_pos.y + 'px';
                sbox.style.height = select_end_pos.y - select_start_pos.y + 'px';
            }else {
                sbox.style.top = select_end_pos.y + 'px';
                sbox.style.height = -select_end_pos.y + select_start_pos.y + 'px';
            }
        }
    }
    
}


function onMouseUp( event ) {
    this.removeEventListener( 'mouseup', onMouseUp, false );


    if (event.which==3){
        operation_state.mouse_right_down = false;
    }

    
    var array = getMousePosition(dom_element, event.clientX, event.clientY );
    onUpPosition.fromArray( array );

    if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {
        if (event.which == 3){
            //right click
            // if no other key pressed, we consider this as a right click
            if (!operation_state.key_pressed){
                console.log("right clicked.");
                handleRightClick(event);
            }
        }
        else{
            // left click
            handleLeftClick(event);
        }
    }
    

    if (in_select_mode){
        in_select_mode = false;
        
        
        var sbox = document.getElementById("select-box");
        sbox.style.display="none";

        if (handleSelectRect){
            var x,y,w,h;

            if (onDownPosition.x < onUpPosition.x){
                x = onDownPosition.x;
                w = onUpPosition.x - onDownPosition.x;
            }
            else{
                x = onUpPosition.x;
                w = onDownPosition.x - onUpPosition.x;
            }

            if (onDownPosition.y < onUpPosition.y){
                y = onDownPosition.y;
                h = onUpPosition.y - onDownPosition.y;
            }
            else{
                y = onUpPosition.y;
                h = onDownPosition.y - onUpPosition.y;
            }



            console.log("select rect",x,y,w,h);
            handleSelectRect(x,y,w,h, onUpPosition);
        }
    }

    this.removeEventListener( 'mouseup', onMouseUp, false );

}


function getMousePosition( dom, x, y ) {

    var rect = dom.getBoundingClientRect();
    return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

}

function getIntersects( point, objects ) {

    mouse.set( ( point.x * 2 ) - 1, - ( point.y * 2 ) + 1 );

    raycaster.setFromCamera( mouse, views[0].camera );

    return raycaster.intersectObjects( objects, false );  // 2nd argument: recursive.

}


export{getMousePosition, onMouseDown, onMouseMove,set_mouse_handler, get_screen_location_in_world, get_mouse_location_in_world, init_mouse, onUpPosition, getIntersects}