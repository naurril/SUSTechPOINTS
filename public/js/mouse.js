
import * as THREE from './lib/three.module.js';



function Mouse(view, op_state, mainui_container, parentUi, on_left_click, on_right_click, on_select_rect){
    this.view=view;
    this.domElement = mainui_container;
    this.parentUi = parentUi;
    this.operation_state = op_state;

    
    this.domElement.addEventListener( 'mousemove', (e)=>{this.onMouseMove(e);}, false );
    this.domElement.addEventListener( 'mousedown', (e)=>{this.onMouseDown(e);}, true );
    
    

    this.raycaster = new THREE.Raycaster();
    this.onDownPosition = new THREE.Vector2();
    this.onUpPosition = new THREE.Vector2();
    

    this.handleLeftClick = on_left_click;
    this.handleRightClick = on_right_click;
    this.handleSelectRect = on_select_rect;


    var in_select_mode = false;
    var select_start_pos;
    var select_end_pos;
    
    this.get_mouse_location_in_world = function(){
        this.raycaster.setFromCamera( this.onUpPosition, this.view.camera );
        var o = this.raycaster.ray.origin;
        var d = this.raycaster.ray.direction;

        var alpha = - o.z/d.z;
        var x = o.x + d.x*alpha;
        var y = o.y + d.y*alpha;
        return {x:x, y:y, z:0};
    };


    this.get_screen_location_in_world = function(x,y){
        var screen_pos = new THREE.Vector2();
        screen_pos.x = x;
        screen_pos.y = y;

        this.raycaster.setFromCamera( screen_pos, this.view.camera );
        var o = this.raycaster.ray.origin;
        var d = this.raycaster.ray.direction;

        var alpha = - o.z/d.z;
        var x = o.x + d.x*alpha;
        var y = o.y + d.y*alpha;
        return {x:x, y:y, z:0};
    };




    this.getMousePosition = function( dom, offsetX, offsetY ) {

        
        return [offsetX/dom.clientWidth * 2 - 1,  - offsetY/dom.clientHeight * 2 + 1];

    };

    this.getIntersects = function( point, objects ) {

        // mouse is temp var
        let mouse = new THREE.Vector2();
        mouse.set(point.x, point.y); 

        this.raycaster.setFromCamera( mouse, this.view.camera );

        return this.raycaster.intersectObjects( objects, false );  // 2nd argument: recursive.

    };


    this.onMouseDown=function( event ) {    

        in_select_mode = false;

        if (event.which==3){
            this.operation_state.key_pressed = false;
        } else if (event.which == 1){
            console.log("mouse left key down!");
            if (event.ctrlKey || event.shiftKey){
                event.stopPropagation();
                event.preventDefault();

                in_select_mode = true;
            
                select_start_pos={
                    x: event.offsetX,
                    y: event.offsetY,
                }            
            }
        }

        var array = this.getMousePosition(this.domElement, event.offsetX, event.offsetY );
        this.onDownPosition.fromArray( array );        
        console.log("mouse down", array);

        this.domElement.addEventListener( 'mouseup', on_mouse_up, false );

    }

    this.onMouseMove=function( event ) {
        event.preventDefault();

        //console.log(this.getMousePosition(this.domElement, event.offsetX, event.offsetY));

        if (in_select_mode){

            select_end_pos={
                x: event.offsetX,
                y: event.offsetY,
            };


            if (event.offsetX != select_start_pos.x || event.offsetY != select_end_pos.y){
                //draw select box
                var sbox = this.parentUi.querySelector("#select-box");
                
                sbox.style.display="inherit";

                

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

    var on_mouse_up = (e)=>{this.onMouseUp(e)};

    this.onMouseUp=function( event ) {
        this.domElement.removeEventListener( 'mouseup', on_mouse_up, false );

        

        
        var array = this.getMousePosition(this.domElement, event.offsetX, event.offsetY );
        this.onUpPosition.fromArray( array );

        console.log("mouse up", array);

        if ( this.onDownPosition.distanceTo( this.onUpPosition ) === 0 ) {
            if (event.which == 3){
                //right click
                // if no other key pressed, we consider this as a right click
                if (!this.operation_state.key_pressed){
                    console.log("right clicked.");
                    this.handleRightClick(event);
                }
            }
            else{
                // left click
                this.handleLeftClick(event);
            }

            in_select_mode = false;
            return;
        }
        

        if (in_select_mode){
            in_select_mode = false;
            
            
            var sbox = this.parentUi.querySelector("#select-box");
            sbox.style.display="none";

            if (this.handleSelectRect){
                var x,y,w,h;

                if (this.onDownPosition.x < this.onUpPosition.x){
                    x = this.onDownPosition.x;
                    w = this.onUpPosition.x - this.onDownPosition.x;
                }
                else{
                    x = this.onUpPosition.x;
                    w = this.onDownPosition.x - this.onUpPosition.x;
                }

                if (this.onDownPosition.y < this.onUpPosition.y){
                    y = this.onDownPosition.y;
                    h = this.onUpPosition.y - this.onDownPosition.y;
                }
                else{
                    y = this.onUpPosition.y;
                    h = this.onDownPosition.y - this.onUpPosition.y;
                }

                console.log("select rect",x,y,w,h);
                this.handleSelectRect(x,y,w,h, event.ctrlKey, event.shiftKey);
            }
        }

    }

}

export{Mouse}