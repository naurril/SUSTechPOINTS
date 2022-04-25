
import {matmul2} from "./util.js"

import {
	Quaternion,
	Vector3
} from "./lib/three.module.js";


class ProjectiveView{
    constructor(ui, 
        cfg,
        on_edge_changed, 
        on_direction_changed, 
        on_auto_shrink, 
        on_moved, 
        on_scale, 
        on_wheel, 
        on_fit_size,
        on_auto_rotate, 
        on_reset_rotate, 
        on_focus, 
        on_box_remove,
        fn_isActive)
    {

        this.ui = ui;
        this.cfg = cfg;
        this.on_edge_changed = on_edge_changed;
        this.on_direction_changed = on_direction_changed;
        this.on_auto_shrink = on_auto_shrink; 
        this.on_moved=on_moved; 
        this.on_scale=on_scale; 
        this.on_wheel=on_wheel; 
        this.on_fit_size=on_fit_size;
        this.on_auto_rotate=on_auto_rotate;
        this.on_reset_rotate=on_reset_rotate;
        this.on_focus = on_focus;
        this.on_box_remove = on_box_remove;
        this.isActive = fn_isActive;

        this.lines = {
            top: ui.querySelector("#line-top"),
            bottom: ui.querySelector("#line-bottom"),
            left: ui.querySelector("#line-left"),
            right: ui.querySelector("#line-right"),
            direction: ui.querySelector("#line-direction"),            
        };
    

        this.orgPointInd = ui.querySelector("#origin-point-indicator");

        this.svg = ui.querySelector("#view-svg");
        

        this.handles = {
        
            top: ui.querySelector("#line-top-handle"),
            bottom: ui.querySelector("#line-bottom-handle"),
            left: ui.querySelector("#line-left-handle"),
            right: ui.querySelector("#line-right-handle"),
            direction: ui.querySelector("#line-direction-handle"),

            topleft: ui.querySelector("#top-left-handle"),
            topright: ui.querySelector("#top-right-handle"),
            bottomleft: ui.querySelector("#bottom-left-handle"),
            bottomright: ui.querySelector("#bottom-right-handle"),

            move: ui.querySelector("#move-handle"),
        };

        this.buttons = {
            fit_position: ui.querySelector("#v-fit-position"),
            fit_size: ui.querySelector("#v-fit-size"),
            fit_rotation: ui.querySelector("#v-fit-rotation"),
            fit_all: ui.querySelector("#v-fit-all"),
            reset_rotation: ui.querySelector("#v-reset-rotation"),
            fit_moving_direction: ui.querySelector("#v-fit-moving-direction"),
        };
    
    
        ui.onkeydown = this.on_key_down.bind(this);
        ui.onmouseenter = (event)=>{

            if (this.isActive())
            {
                ui.focus();

                ui.querySelector("#v-buttons").style.display="inherit";

                if (this.on_focus)
                    this.on_focus();
            }
        };
        ui.onmouseleave = (event)=>{
            if (this.showButtonsTimer)
                clearTimeout(this.showButtonsTimer);
                
            this.hide_buttons();

            ui.blur();
        };

        ui.onwheel = event=>{                    
            event.stopPropagation();
            event.preventDefault();
            this.on_wheel(event.deltaY);        
        };

        this.install_edge_hanler('left', this.handles.left,   this.lines,   {x:-1,y:0});
        this.install_edge_hanler('right', this.handles.right,  this.lines,   {x:1, y:0});
        this.install_edge_hanler('top', this.handles.top,    this.lines,   {x:0, y:1});
        this.install_edge_hanler('bottom', this.handles.bottom, this.lines,   {x:0, y:-1});
        this.install_edge_hanler('top,left', this.handles.topleft, this.lines,   {x:-1, y:1});
        this.install_edge_hanler('top,right', this.handles.topright, this.lines,   {x:1, y:1});
        this.install_edge_hanler('bottom,left', this.handles.bottomleft, this.lines,   {x:-1, y:-1});
        this.install_edge_hanler('bottom,right', this.handles.bottomright, this.lines,   {x:1, y:-1});
        this.install_edge_hanler('left,right,top,bottom', this.handles.move, this.lines,  null);

        if (this.on_direction_changed){
            this.install_direction_handler("line-direction");
        }

        this.install_buttons();  

    }


    mouse_start_pos = null;

    view_handle_dimension = {  //dimension of the enclosed box
        x: 0,  //width
        y: 0,  //height
    }
    
    view_center = {
        x: 0,
        y: 0,
    };

    line(name){
        return this.lines[name];
    }

    show_lines(){
        let theme = document.documentElement.className;

        let lineColor = "yellow";
        if (theme == "theme-light")
            lineColor = "red";

        for (var l in this.lines){
            this.lines[l].style.stroke=lineColor;
        };
    }
    hide_lines(){
        for (var l in this.lines){
            this.lines[l].style.stroke="#00000000";
        }
    };

    hightlight_line(line)
    {
        let theme = document.documentElement.className;

        let lineColor = "red";
        if (theme == "theme-light")
            lineColor = "blue";

        line.style.stroke=lineColor;
    }


    disable_handle_except(exclude){
        for (var h in this.handles){
            if (this.handles[h] != exclude)
                this.handles[h].style.display='none';
        }
    }

    enable_handles(){
        for (var h in this.handles){
            this.handles[h].style.display='inherit';
        }
    }

    move_lines(delta, direction){
        
        var x1 = this.view_center.x-this.view_handle_dimension.x/2;
        var y1 = this.view_center.y-this.view_handle_dimension.y/2;
        var x2 = this.view_center.x+this.view_handle_dimension.x/2;
        var y2 = this.view_center.y+this.view_handle_dimension.y/2;

        if (direction){
            if (direction.x == 1){ //right
                x2 += delta.x;
            } else if (direction.x == -1){ //left
                x1 += delta.x;
            }

            if (direction.y == -1){ //bottom
                y2 += delta.y;
            } else if (direction.y == 1){ //top
                y1 += delta.y;
            }
        } 
        else {
            x1 += delta.x;
            y1 += delta.y;
            x2 += delta.x;
            y2 += delta.y;   
        }

        this.set_line_pos(Math.ceil(x1),Math.ceil(x2),Math.ceil(y1),Math.ceil(y2));        
    }

    set_line_pos(x1,x2,y1,y2){
        this.lines.top.setAttribute("x1", "0%");
        this.lines.top.setAttribute("y1", y1);
        this.lines.top.setAttribute("x2", "100%");
        this.lines.top.setAttribute("y2", y1);

        this.lines.bottom.setAttribute("x1", "0%");
        this.lines.bottom.setAttribute("y1", y2);
        this.lines.bottom.setAttribute("x2", "100%");
        this.lines.bottom.setAttribute("y2", y2);

        this.lines.left.setAttribute("x1", x1);
        this.lines.left.setAttribute("y1", "0%");
        this.lines.left.setAttribute("x2", x1);
        this.lines.left.setAttribute("y2", "100%");

        this.lines.right.setAttribute("x1", x2);
        this.lines.right.setAttribute("y1", "0%");
        this.lines.right.setAttribute("x2", x2);
        this.lines.right.setAttribute("y2", "100%");
    }

    set_org_point_ind_pos(viewWidth, viewHeight, objPos, objRot){
        /*
        cos -sin 
        sin  cos
        *
        objPos.x
        objPos.y

        */
       let c = Math.cos(objRot);  // for topview, x goes upward, so we add pi/2
       let s = Math.sin(objRot);

       let relx = c*(-objPos.x) + s*(-objPos.y);
       let rely = -s*(-objPos.x) + c*(-objPos.y);

       let radius = Math.sqrt(viewWidth*viewWidth/4 + viewHeight*viewHeight/4);
       let distToRog = Math.sqrt(relx*relx + rely*rely)

       let indPosX3d = relx*radius/distToRog;
       let indPosY3d = rely*radius/distToRog;

       let indPosX = -indPosY3d;
       let indPosY = -indPosX3d;
    
       let dotRelPos = 0.8;
       // now its pixel coordinates, x goes right, y goes down
       if (indPosX > viewWidth/2*dotRelPos){
            let shrinkRatio = viewWidth/2*dotRelPos/indPosX;

            indPosX = viewWidth/2*dotRelPos;
            indPosY = indPosY*shrinkRatio;
       }

        if (indPosX < -viewWidth/2*dotRelPos){
            let shrinkRatio = -viewWidth/2*dotRelPos/indPosX;

            indPosX = -viewWidth/2*dotRelPos;
            indPosY = indPosY*shrinkRatio;
        }

        if (indPosY > viewHeight/2*dotRelPos){
            let shrinkRatio = viewHeight/2*dotRelPos/indPosY;

            indPosY = viewHeight/2*dotRelPos;
            indPosX = indPosX*shrinkRatio;
       }

        if (indPosY < -viewHeight/2*dotRelPos){
            let shrinkRatio = -viewHeight/2*dotRelPos/indPosY;

            indPosY = -viewHeight/2*dotRelPos;
            indPosX = indPosX*shrinkRatio;
        }


       this.orgPointInd.setAttribute("cx", viewWidth/2+indPosX);
       this.orgPointInd.setAttribute("cy", viewHeight/2+indPosY);
    }

    // when direction handler is draging
    rotate_lines(theta){

        console.log(theta);
        theta = -theta-Math.PI/2;
        console.log(theta);
        // we use rotation matrix
        var trans_matrix =[
            Math.cos(theta), Math.sin(theta), this.view_center.x,
            -Math.sin(theta), Math.cos(theta), this.view_center.y,
            0, 0, 1,
        ]

        var points ;/*= `[
            -view_handle_dimension.x/2, view_handle_dimension.x/2,view_handle_dimension.x/2,-view_handle_dimension.x/2, 0,
            -view_handle_dimension.y/2, -view_handle_dimension.y/2,view_handle_dimension.y/2,  view_handle_dimension.y/2, -this.view_center.y,
            1,1,1,1,1
        ]; */
        var trans_points ;//= matmul2(trans_matrix, points, 3);

        //console.log(points);
        //var trans_points ;//= matmul2(trans_matrix, points, 3);
        //console.log(trans_points);

        points =[
            0,
            -this.view_center.y,
            1
        ];
        trans_points = matmul2(trans_matrix, points, 3);
        this.lines.direction.setAttribute("x2", Math.ceil(trans_points[0]));
        this.lines.direction.setAttribute("y2", Math.ceil(trans_points[1]));

        points =[
            -this.view_center.x, this.view_center.x,//-view_handle_dimension.x/2, view_handle_dimension.x/2,
            -this.view_handle_dimension.y/2, -this.view_handle_dimension.y/2,
            1,1,
        ];
        var trans_points = matmul2(trans_matrix, points, 3);

        this.lines.top.setAttribute("x1", Math.ceil(trans_points[0]));
        this.lines.top.setAttribute("y1", Math.ceil(trans_points[0+2]));
        this.lines.top.setAttribute("x2", Math.ceil(trans_points[1]));
        this.lines.top.setAttribute("y2", Math.ceil(trans_points[1+2]));


        points =[
            -this.view_handle_dimension.x/2, -this.view_handle_dimension.x/2,
            -this.view_center.y, this.view_center.y,
            1,1,
        ];
        trans_points = matmul2(trans_matrix, points, 3);

        this.lines.left.setAttribute("x1", Math.ceil(trans_points[0]));
        this.lines.left.setAttribute("y1", Math.ceil(trans_points[0+2]));
        this.lines.left.setAttribute("x2", Math.ceil(trans_points[1]));
        this.lines.left.setAttribute("y2", Math.ceil(trans_points[1+2]));


        points =[
            this.view_center.x,-this.view_center.x,
            this.view_handle_dimension.y/2,  this.view_handle_dimension.y/2,
            1,1
        ];
        trans_points = matmul2(trans_matrix, points, 3);
        this.lines.bottom.setAttribute("x1", Math.ceil(trans_points[1]));
        this.lines.bottom.setAttribute("y1", Math.ceil(trans_points[1+2]));
        this.lines.bottom.setAttribute("x2", Math.ceil(trans_points[0]));
        this.lines.bottom.setAttribute("y2", Math.ceil(trans_points[0+2]));

        points =[
             this.view_handle_dimension.x/2,this.view_handle_dimension.x/2,
            -this.view_center.y,this.view_center.y,
            1,1
        ];
        trans_points = matmul2(trans_matrix, points, 3);

        this.lines.right.setAttribute("x1", Math.ceil(trans_points[0]));
        this.lines.right.setAttribute("y1", Math.ceil(trans_points[0+2]));
        this.lines.right.setAttribute("x2", Math.ceil(trans_points[1]));
        this.lines.right.setAttribute("y2", Math.ceil(trans_points[1+2]));

    }
    
    update_view_handle(viewport, obj_dimension, obj_pos, obj_rot){
        var viewport_ratio = viewport.width/viewport.height;
        var box_ratio = obj_dimension.x/obj_dimension.y;
    
        var width=0;
        var height=0;
    
        if (box_ratio > viewport_ratio){
            //handle width is viewport.width*2/3
            width = viewport.width*(2/3)/viewport.zoom_ratio;
            height = width/box_ratio;
        }
        else{
            //handle height is viewport.height*2/3
            height = viewport.height*2/3/viewport.zoom_ratio;
            width = height*box_ratio;
        }
    
        this.view_handle_dimension.x = width;
        this.view_handle_dimension.y = height;
    
        // viewport width/height is position-irrelavent
        // so x and y is relative value.
        var x = viewport.width/2;//viewport.left + viewport.width/2;
        var y = viewport.height/2//viewport.bottom - viewport.height/2;
    
        var left = x-width/2;
        var right = x+width/2;
        var top = y-height/2;
        var bottom = y+height/2;
    
        this.view_center.x = x;
        this.view_center.y = y;
    
        this.set_line_pos(left, right, top, bottom);

        if (obj_pos && obj_rot){
            this.set_org_point_ind_pos(viewport.width, viewport.height, obj_pos, obj_rot);
        }
    
        // note when the object is too thin, the height/width value may be negative,
        // this causes error reporting, but we just let it be.
        var de = this.handles.left;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', "0%"); //Math.ceil(top+10));
        de.setAttribute('height', "100%");//Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);

    
        de = this.handles.right;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', "0%");//Math.ceil(top+10));
        de.setAttribute('height', "100%");//Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);
        
        de = this.handles.top;
        de.setAttribute('x', "0%");//Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(top-10));
        de.setAttribute('width', "100%");//Math.ceil(right-left-20));
        de.setAttribute('height', 20);

        de = this.handles.bottom;
        de.setAttribute('x', "0%");//Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(bottom-10));
        de.setAttribute('width', "100%");//Math.ceil(right-left-20));
        de.setAttribute('height', 20);
    

        de = this.handles.topleft;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(top-10));


        de = this.handles.topright;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(top-10));


        de = this.handles.bottomleft;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(bottom-10));

        de = this.handles.bottomright;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(bottom-10));

        //direction
        if (this.on_direction_changed){
            de = this.lines.direction;
            de.setAttribute('x1', Math.ceil((left+right)/2));
            de.setAttribute('y1', Math.ceil((top+bottom)/2));
            de.setAttribute('x2', Math.ceil((left+right)/2));
            de.setAttribute('y2', Math.ceil(0));
        
            de = this.handles.direction;
            de.setAttribute('x', Math.ceil((left+right)/2-10));
            de.setAttribute('y', 0);//Math.ceil(top+10));    
            de.setAttribute('height', Math.ceil((bottom-top)/2-10+top));
        }
        else{
            de = this.lines.direction;
            de.style.display = "none";
        
            de = this.handles.direction;
            de.style.display = "none";
        }


        // move handle
        de = this.ui.querySelector("#move-handle");
        de.setAttribute('x', Math.ceil((left+right)/2-10));
        de.setAttribute('y', Math.ceil((top+bottom)/2-10));
    }
    

    showButtonsTimer = null;
    hide_buttons(delay){
        this.ui.querySelector("#v-buttons").style.display="none";

        if (delay)
        {
            if (this.showButtonsTimer){
                clearTimeout(this.showButtonsTimer);
            }

            this.showButtonsTimer = setTimeout(() => {
                this.ui.querySelector("#v-buttons").style.display="inherit";
            }, 200);
        }
    }
    
    hide(){
        this.hide_lines(this.lines);
    };
    //install_move_handler();

    install_edge_hanler(name, handle, lines, direction)
    {
                                                       
        handle.onmouseenter = ()=>{
            if (this.isActive()){
                this.show_lines();

                if (name)
                    name.split(",").forEach(n=> this.hightlight_line(lines[n]));
            }


        };    
        handle.onmouseleave = ()=>this.hide();


        // handle.onmouseup = event=>{
        //     if (event.which!=1)
        //         return;

        //     //line.style["stroke-dasharray"]="none";
        //     //hide();
        //     handle.onmouseleave = hide;
        // };

        handle.ondblclick= (event)=>{
            if (event.which!=1)
                return;
            event.stopPropagation();
            event.preventDefault();
            this.on_auto_shrink(direction); //if double click on 'move' handler, the directoin is null
            
        };

        handle.onmousedown = (event)=>{
            if (event.which!=1)
                return;
            
            var svg =  this.svg;

            //
            event.stopPropagation();
            event.preventDefault();

            
            this.disable_handle_except(handle);
            this.hide_buttons();

            handle.onmouseleave = null;

            this.mouse_start_pos={x: event.layerX,y:event.layerY,};
            let mouse_cur_pos = {x: this.mouse_start_pos.x, y: this.mouse_start_pos.y};

            console.log(this.mouse_start_pos);

            svg.onmouseup = (event)=>{
                svg.onmousemove = null;
                svg.onmouseup=null;
                this.enable_handles();
                // restore color
                //hide();
                handle.onmouseleave = this.hide.bind(this);
                
                this.ui.querySelector("#v-buttons").style.display="inherit";

                var handle_delta = {
                    x: mouse_cur_pos.x - this.mouse_start_pos.x,
                    y: -(mouse_cur_pos.y - this.mouse_start_pos.y),  //reverse since it'll be used by 3d-coord system
                };

                console.log("delta", handle_delta);
                if (handle_delta.x == 0 && handle_delta.y==0 && !event.ctrlKey && !event.shiftKey){
                    return;
                }

                var ratio_delta = {
                    x: handle_delta.x/this.view_handle_dimension.x,
                    y: handle_delta.y/this.view_handle_dimension.y
                };
                
                
                if (direction){
                    this.on_edge_changed(ratio_delta, direction, event.ctrlKey, event.shiftKey);

                    // if (event.ctrlKey){
                    //     this.on_auto_shrink(direction);
                    // }
                }
                else{
                    // when intall handler for mover, the direcion is left null
                    this.on_moved(ratio_delta);
                }
            }

            svg.onmousemove = (event)=>{

                if (event.which!=1)
                    return;
                
                mouse_cur_pos={x: event.layerX,y:event.layerY,};
                
                var handle_delta = {
                    x: mouse_cur_pos.x - this.mouse_start_pos.x,
                    y: mouse_cur_pos.y - this.mouse_start_pos.y,  // don't reverse direction
                };

                this.move_lines(handle_delta, direction);
            }
        };
    }

    install_direction_handler(linename){
        var handle = this.ui.querySelector("#"+linename+"-handle");
        var line =  this.ui.querySelector("#"+linename);
        var svg =  this.svg;

        handle.onmouseenter = (event)=>{
            if (this.isActive()){
                this.show_lines();
                this.hightlight_line(line);
            }
        };


        handle.onmouseleave = ()=>this.hide();

        handle.ondblclick= (event)=>{
            event.stopPropagation();
            event.preventDefault();
            //transform_bbox(this_axis+"_rotate_reverse");
            this.on_direction_changed(Math.PI);
        };


        // function hide(event){
        //     line.style.stroke="#00000000";
        // };

        // handle.onmouseup = event=>{
        //     if (event.which!=1)
        //         return;
        //     //line.style["stroke-dasharray"]="none";
        //     //line.style.stroke="#00000000";
        //     handle.onmouseleave = hide;
        // };

        
        handle.onmousedown = (event)=>{
            
            if (event.which!=1)
                return;

            event.stopPropagation();
            event.preventDefault();

            //line.style.stroke="yellow";
            handle.onmouseleave = null;
            //show_lines(lines);
            
            this.disable_handle_except(handle);

            this.hide_buttons();

            let handle_center={
                x: parseInt(line.getAttribute('x1')),
            }

            this.mouse_start_pos={
                x: event.layerX,
                y:event.layerY,

                handle_offset_x: handle_center.x - event.layerX,                
            };


            let mouse_cur_pos = {x: this.mouse_start_pos.x, y: this.mouse_start_pos.y};

            console.log(this.mouse_start_pos);

            let theta = 0;

            svg.onmousemove = (event)=>{
                
                mouse_cur_pos={x: event.layerX,y:event.layerY,};
                
                let handle_center_cur_pos = {
                    x: mouse_cur_pos.x + this.mouse_start_pos.handle_offset_x,
                    y: mouse_cur_pos.y,
                };

                

                theta = Math.atan2(
                    handle_center_cur_pos.y-this.view_center.y,  
                    handle_center_cur_pos.x-this.view_center.x);
                console.log(theta);

                this.rotate_lines(theta);
            };

            svg.onmouseup = event=>{
                svg.onmousemove = null;
                svg.onmouseup=null;

                // restore color
                //line.style.stroke="#00000000";
                this.enable_handles();
                handle.onmouseleave = this.hide.bind(this);

                this.ui.querySelector("#v-buttons").style.display="inherit";

                if (theta == 0){
                    return;
                }

                this.on_direction_changed(-theta-Math.PI/2, event.ctrlKey);
                
            };

            
        };
    }

    on_key_down(event){
        
        switch(event.key){
            case 'e':
                event.preventDefault();
                event.stopPropagation();
                this.on_direction_changed(-this.cfg.rotateStep, event.ctrlKey);
                this.hide_buttons(true);
                return true;
            case 'q':
                event.preventDefault();
                event.stopPropagation();
                this.on_direction_changed(this.cfg.rotateStep, event.ctrlKey);
                this.hide_buttons(true);
                break;
            case 'f':
                event.preventDefault();
                event.stopPropagation();
                this.on_direction_changed(-this.cfg.rotateStep, true);
                this.hide_buttons(true);
                break;
            case 'r':                
                event.preventDefault();
                event.stopPropagation();
                this.on_direction_changed(this.cfg.rotateStep, true);
                this.hide_buttons(true);
                break;
            case 'g':
                event.preventDefault();
                event.stopPropagation();
                this.on_direction_changed(Math.PI, false);
                break;
            case 'w':
            case 'ArrowUp':
                event.preventDefault();
                event.stopPropagation();
                this.on_moved({x:0, y: this.cfg.moveStep});
                this.hide_buttons(true);
                break;
            case 's':
                if (!event.ctrlKey){
                    event.preventDefault();
                    event.stopPropagation();
                    this.on_moved({x:0, y:-this.cfg.moveStep});
                    this.hide_buttons(true);
                    break;    
                } else{
                    console.log("ctrl+s");
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                event.stopPropagation();
                this.on_moved({x:0, y:-this.cfg.moveStep});
                this.hide_buttons(true);
                break;
            case 'a':
                if (event.ctrlKey)
                {
                    break;
                }
                // no break;
            case 'ArrowLeft':
                event.preventDefault();
                event.stopPropagation();
                this.on_moved({x:-this.cfg.moveStep, y:0});
                this.hide_buttons(true);
                break;
            case 'd':
                if (event.ctrlKey){
                    console.log("ctrl+d");
                    this.on_box_remove();
                    break;
                }
            case 'ArrowRight':
                event.preventDefault();
                event.stopPropagation();
                this.on_moved({x:this.cfg.moveStep, y:0});
                this.hide_buttons(true);
                break;
            case 'Delete':
                this.on_box_remove();
                break;
        }
    }


    install_buttons()
    {
        let buttons = this.buttons;
        let ignore_left_mouse_down = (event)=>{
            if (event.which == 1){
                event.stopPropagation();
            }
        };

        if (buttons.fit_rotation){
            buttons.fit_rotation.onmousedown = ignore_left_mouse_down;
            buttons.fit_rotation.onclick = event=>{
                this.on_auto_rotate("noscaling")
            };
        }

        if (buttons.fit_position && this.on_fit_size){
            buttons.fit_position.onmousedown = ignore_left_mouse_down;
            buttons.fit_position.onclick = event=>{
                this.on_fit_size("noscaling");
            };
        }

        if (buttons.fit_size && this.on_fit_size){

            buttons.fit_size.onmousedown = ignore_left_mouse_down;
            buttons.fit_size.onclick = event=>{
                this.on_fit_size();
            };
        }
    
        buttons.fit_all.onmousedown = ignore_left_mouse_down;
        buttons.fit_all.onclick = event=>{
            //console.log("auto rotate button clicked.");
            this.on_auto_rotate();
            //event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
        }


        if (buttons.reset_rotation){

            buttons.reset_rotation.onmousedown = ignore_left_mouse_down;

            buttons.reset_rotation.onclick = event=>{
                //console.log("auto rotate button clicked.");
                this.on_reset_rotate();
                //event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
            }
        }

        if (buttons.fit_moving_direction){
            buttons.fit_moving_direction.onmousedown = ignore_left_mouse_down;
            buttons.fit_moving_direction.onclick = event=>{
                //console.log("auto rotate button clicked.");
                this.on_auto_rotate("noscaling", "moving-direction");
                //event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
            }
        }
    }

}


class ProjectiveViewOps{
    constructor(ui, editorCfg, boxEditor, views, boxOp, func_on_box_changed,func_on_box_remove){

        this.ui = ui;
        this.cfg = editorCfg;
        this.on_box_changed = func_on_box_changed;
        this.views = views;
        this.boxOp = boxOp;
        this.boxEditor = boxEditor;
        //internals
        var scope = this;

        function default_on_del(){
            if (scope.box){
                func_on_box_remove(scope.box);
            }
        }

        function default_on_focus(){
            // this is a long chain!
            if (scope.box && scope.box.boxEditor.boxEditorManager)
                scope.box.boxEditor.boxEditorManager.globalHeader.update_box_info(scope.box);
        }


        // direction: 1, -1
        // axis: x,y,z

        function auto_shrink(extreme, direction){

            for (var axis in direction){

                if (direction[axis] !=0){

                    var end = "max";
                    if (direction[axis] === -1){
                        end = "min";
                    }
                    
                    var delta = direction[axis]*extreme[end][axis] - scope.box.scale[axis]/2;

                    console.log(extreme, delta);
                    scope.boxOp.translate_box(scope.box, axis, direction[axis]* delta/2 );
                    scope.box.scale[axis] += delta;
                }
            }
        }



        //direction is in 3d
        function auto_stick(delta, direction, use_box_bottom_as_limit){
            //let old_dim = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, true);
            //let old_scale = scope.box.scale;

            let virtbox = {
                position: {
                    x: scope.box.position.x,
                    y: scope.box.position.y,
                    z: scope.box.position.z,
                },
                scale: {
                    x: scope.box.scale.x,
                    y: scope.box.scale.y,
                    z: scope.box.scale.z,},
                rotation: {
                    x: scope.box.rotation.x,
                    y: scope.box.rotation.y,
                    z: scope.box.rotation.z,}
            };

            scope.boxOp.translate_box(virtbox, 'x', delta.x/2 * direction.x);
            scope.boxOp.translate_box(virtbox, 'y', delta.y/2 * direction.y);
            scope.boxOp.translate_box(virtbox, 'z', delta.z/2 * direction.z);

            virtbox.scale.x += delta.x;
            virtbox.scale.y += delta.y;
            virtbox.scale.z += delta.z;


            // note dim is the relative value
            let new_dim = scope.box.world.lidar.get_points_dimmension_of_box(virtbox, use_box_bottom_as_limit);


            for (var axis in direction){

                if (direction[axis] !=0){

                    var end = "max";
                    if (direction[axis] === -1){
                        end = "min";
                    }

                    //scope.box.scale[axis]/2 - direction[axis]*extreme[end][axis];
                    var truedelta = delta[axis]/2 + direction[axis]*new_dim[end][axis] - scope.box.scale[axis]/2;

                    console.log(new_dim, delta);
                    scope.boxOp.translate_box(scope.box, axis, direction[axis]* truedelta );
                    //scope.box.scale[axis] -= delta;
                }
            }

            scope.on_box_changed(scope.box);
        }

        function on_edge_changed(delta, direction){
            console.log(delta);

            scope.boxOp.translate_box(scope.box, 'x', delta.x/2 * direction.x);
            scope.boxOp.translate_box(scope.box, 'y', delta.y/2 * direction.y);
            scope.boxOp.translate_box(scope.box, 'z', delta.z/2 * direction.z);

            scope.box.scale.x += delta.x;
            scope.box.scale.y += delta.y;
            scope.box.scale.z += delta.z;
            scope.on_box_changed(scope.box);
        }


        function get_wheel_multiplier(wheel_direction){
            var multiplier = 1.0;
            if (wheel_direction > 0){
                multiplier = 1.1;
            } else {
                multiplier = 0.9;
            }
            return multiplier;
        }


        ///////////////////////////////////////////////////////////////////////////////////
        // direction is null if triggered by dbclick on 'move' handler 
        function on_z_auto_shrink(direction){
            var  extreme = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, true);
            
            if (!direction){
                ['x','y'].forEach(function(axis){

                    scope.boxOp.translate_box(scope.box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                    scope.box.scale[axis] = extreme.max[axis] - extreme.min[axis];        
        
                })
            } else{
                direction = {
                    x: direction.y,
                    y: -direction.x,
                    z: 0,
                }

                auto_shrink(extreme, direction)
            }
            
            scope.on_box_changed(scope.box);
        }

        
        function on_z_edge_changed(ratio, direction2d, autoShrink, lockScale){

            var delta = {        
                x: scope.box.scale.x * ratio.y * direction2d.y,
                y: scope.box.scale.y * ratio.x * direction2d.x,
                z: 0,
            };

            let direction3d ={
                x: direction2d.y,
                y: -direction2d.x,
                z: 0,
            };

            if (!autoShrink && !lockScale){
                on_edge_changed(delta, direction3d);
            } else if (autoShrink){
                on_edge_changed(delta, direction3d);
                on_z_auto_shrink(direction2d);
            } else if (lockScale){
                auto_stick(delta, direction3d, true);
            }
        }

        function on_z_direction_changed(theta, sticky){
            // points indices shall be obtained before rotation.
            let box = scope.box;
            scope.boxOp.rotate_z(box, theta, sticky)
            scope.on_box_changed(box);
        }


        //ratio.y  vertical
        //ratio.x  horizental
        // box.x  vertical
        // box.y  horizental

        function limit_move_step(v, min_abs_v)
        {
            if (v < 0)
                return Math.min(v, -min_abs_v)
            else if (v > 0)
                return Math.max(v, min_abs_v)
            else
                return v;
        }

        function on_z_moved(ratio){
            let delta = {        
                x:  scope.box.scale.x*ratio.y,
                y: -scope.box.scale.y*ratio.x,
            };

            delta.x = limit_move_step(delta.x, 0.02);
            delta.y = limit_move_step(delta.y, 0.02);
            
            // scope.boxOp.translate_box(scope.box, "x", delta.x);
            // scope.boxOp.translate_box(scope.box, "y", delta.y);

            // scope.on_box_changed(scope.box);
            scope.boxEditor.onOpCmd({
                op: "translate",
                params:{
                    delta
                }
            });
        }


        function on_z_scaled(ratio){
                
            ratio = {
                x: ratio.y,
                y: ratio.x,
                z: 0,
            };

            for (var axis in ratio){
                if (ratio[axis] != 0){
                    scope.box.scale[axis] *= 1+ratio[axis];
                }
            }
            
            scope.on_box_changed(scope.box);
        }

        function on_z_wheel(wheel_direction){
            let multiplier = get_wheel_multiplier(wheel_direction);
            let newRatio = scope.views[0].zoom_ratio *= multiplier;
            scope.boxEditor.updateViewZoomRatio(0, newRatio);
            //z_view_handle.update_view_handle(scope.views[0].getViewPort(), {x: scope.box.scale.y, y:scope.box.scale.x});
        }

        function on_z_fit_size(noscaling){
            if (noscaling)
            {
                // fit position only
                scope.boxOp.auto_rotate_xyz(scope.box, null, 
                    {x:true, y:true, z:false}, 
                    scope.on_box_changed, noscaling, "dontrotate");
            }
            else
            {
                scope.boxOp.fit_size(scope.box, ['x','y']);
                scope.on_box_changed(scope.box);
            }
            
        }

        function on_z_auto_rotate(noscaling, rotate_method){

            if (rotate_method == "moving-direction")
            {
                let estimatedRot = scope.boxOp.estimate_rotation_by_moving_direciton(scope.box);

                if (estimatedRot)
                {
                    scope.box.rotation.z = estimatedRot.z;
                    scope.on_box_changed(scope.box);
                }        
            }
            else{
                scope.boxOp.auto_rotate_xyz(scope.box, null, 
                    noscaling?null:{x:false, y:false, z:true}, 
                    scope.on_box_changed, noscaling);
            }
            
        }

        function on_z_reset_rotate(){
            scope.box.rotation.z = 0;
            scope.on_box_changed(scope.box);
        }

        this.z_view_handle = new ProjectiveView(scope.ui.querySelector("#z-view-manipulator"), 
                                            editorCfg,
                                            on_z_edge_changed, 
                                            on_z_direction_changed, 
                                            on_z_auto_shrink, 
                                            on_z_moved, 
                                            on_z_scaled, 
                                            on_z_wheel, 
                                            on_z_fit_size, 
                                            on_z_auto_rotate, 
                                            on_z_reset_rotate,
                                            default_on_focus,
                                            default_on_del,
                                            this.isActive.bind(this));


        ///////////////////////////////////////////////////////////////////////////////////

        function on_y_edge_changed(ratio, direction2d, autoShrink, lockScale){

            var delta = {
                x: scope.box.scale.x * ratio.x * direction2d.x,
                z: scope.box.scale.z * ratio.y * direction2d.y,
                y: 0,
            };

            let direction3d ={
                x: direction2d.x,
                z: direction2d.y,
                y: 0,
            };

            if (!autoShrink && !lockScale){
                on_edge_changed(delta, direction3d);
            } else if (autoShrink){
                on_edge_changed(delta, direction3d);
                on_y_auto_shrink(direction2d);
            } else if (lockScale){
                auto_stick(delta, direction3d, direction2d.y===0);
            }
        }

        function on_y_auto_shrink(direction){
            
            
            if (!direction){
                var  extreme = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, false);
                ['x','z'].forEach(function(axis){

                    scope.boxOp.translate_box(scope.box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                    scope.box.scale[axis] = extreme.max[axis]-extreme.min[axis];        
        
                })       
                

            } else{
                direction = {
                    x: direction.x,
                    y: 0,
                    z: direction.y,
                }

                if (direction.z != 0){
                    var  extreme = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, false);
                    auto_shrink(extreme, direction)
                }else {
                    var  extreme = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, true);
                    auto_shrink(extreme, direction)
                }
                
            }
            
            scope.on_box_changed(scope.box);
        }


        function on_y_moved(ratio){
            var delta = {
                x: limit_move_step(scope.box.scale.x*ratio.x, 0.02),
                z: limit_move_step(scope.box.scale.z*ratio.y,0.02),
            };

            
            // scope.boxOp.translate_box(scope.box, "x", delta.x);
            // scope.boxOp.translate_box(scope.box, "z", delta.z);

            // scope.on_box_changed(scope.box);
            scope.boxEditor.onOpCmd({
                op: "translate",
                params:{
                    delta
                }
            });
        }

        function on_y_direction_changed(theta, sticky){
            scope.boxOp.change_rotation_y(scope.box, theta, sticky, scope.on_box_changed)
        }


        function on_y_scaled(ratio){
            
            ratio = {
                x: ratio.x,
                y: 0,
                z: ratio.y,
            };

            for (var axis in ratio){
                if (ratio[axis] != 0){
                    scope.box.scale[axis] *= 1+ratio[axis];
                }
            }
            
            scope.on_box_changed(scope.box);
        }

        function on_y_wheel(wheel_direction){
            let multiplier = get_wheel_multiplier(wheel_direction);        
            let newRatio = scope.views[1].zoom_ratio *= multiplier;
            scope.boxEditor.updateViewZoomRatio(1, newRatio);
        }

        function on_y_reset_rotate(){
            scope.box.rotation.y = 0;
            scope.on_box_changed(scope.box);
        }

        function on_y_auto_rotate(){
            scope.boxOp.auto_rotate_y(scope.box, scope.on_box_changed);
        }

        this.y_view_handle = new ProjectiveView(scope.ui.querySelector("#y-view-manipulator"), 
                                                    editorCfg,
                                                    on_y_edge_changed, 
                                                    on_y_direction_changed, 
                                                    on_y_auto_shrink, 
                                                    on_y_moved, 
                                                    on_y_scaled, 
                                                    on_y_wheel, 
                                                    null,
                                                    on_y_auto_rotate,
                                                    on_y_reset_rotate,
                                                    default_on_focus,
                                                    default_on_del,
                                                    this.isActive.bind(this));


        ///////////////////////////////////////////////////////////////////////////////////

        function on_x_edge_changed(ratio, direction2d, autoShrink, lockScale){

            var delta = {
                y: scope.box.scale.y * ratio.x * direction2d.x,
                z: scope.box.scale.z * ratio.y * direction2d.y,
                x: 0,
            };

            let direction3d ={
                y: -direction2d.x,
                z: direction2d.y,
                x: 0,
            };

            if (!autoShrink && !lockScale){
                on_edge_changed(delta, direction3d);
            } else if (autoShrink){
                on_edge_changed(delta, direction3d);
                on_x_auto_shrink(direction2d);
            } else if (lockScale){
                auto_stick(delta, direction3d, direction2d.y===0);
            }
        }


        function on_x_auto_shrink(direction){
            if (!direction){
                var  extreme = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, false);

                ['y','z'].forEach(function(axis){

                    scope.boxOp.translate_box(scope.box, axis, (extreme.max[axis] + extreme.min[axis])/2);
                    scope.box.scale[axis] = extreme.max[axis]-extreme.min[axis];        
        
                })       
                

            } else{
                direction = {
                    x: 0,
                    y: -direction.x,
                    z: direction.y,
                }

                if (direction.z != 0){
                    var  extreme = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, false);
                    auto_shrink(extreme, direction)
                } else {
                    var  extreme = scope.box.world.lidar.get_points_dimmension_of_box(scope.box, true);
                    auto_shrink(extreme, direction)
                }
            }
            
            scope.on_box_changed(scope.box);
        }


        function on_x_moved(ratio){
            var delta = {
                y: limit_move_step(scope.box.scale.y*(-ratio.x), 0.02),
                z: limit_move_step(scope.box.scale.z*ratio.y, 0.02),
            };

            
            // scope.boxOp.translate_box(scope.box, "y", delta.y);
            // scope.boxOp.translate_box(scope.box, "z", delta.z);

            // scope.on_box_changed(scope.box);

            scope.boxEditor.onOpCmd({
                op: "translate",
                params:{
                    delta
                }
            });
        }

        function on_x_direction_changed(theta, sticky){
            scope.boxOp.change_rotation_x(scope.box, -theta, sticky, scope.on_box_changed)
        }

        function on_x_scaled(ratio){
            
            ratio = {
                y: ratio.x,
                z: ratio.y,
            };

            for (var axis in ratio){
                if (ratio[axis] != 0){
                    scope.box.scale[axis] *= 1+ratio[axis];
                }
            }
            
            scope.on_box_changed(scope.box);
        }

        function on_x_wheel(wheel_direction){
            let multiplier = get_wheel_multiplier(wheel_direction);        
            let newRatio = scope.views[2].zoom_ratio *= multiplier;
            scope.boxEditor.updateViewZoomRatio(2, newRatio);
        }


        function on_x_reset_rotate(){
            scope.box.rotation.x = 0;
            scope.on_box_changed(scope.box);
        }

        function on_x_auto_rotate(){
            scope.boxOp.auto_rotate_x(scope.box, scope.on_box_changed);
        }

        this.x_view_handle = new ProjectiveView(scope.ui.querySelector("#x-view-manipulator"), 
                                                    editorCfg,
                                                    on_x_edge_changed, 
                                                    on_x_direction_changed, 
                                                    on_x_auto_shrink, 
                                                    on_x_moved, 
                                                    on_x_scaled, 
                                                    on_x_wheel, 
                                                    null,
                                                    on_x_auto_rotate,
                                                    on_x_reset_rotate,
                                                    default_on_focus,
                                                    default_on_del,
                                                    this.isActive.bind(this));

    }  // end of constructor

    // exports



    hideAllHandlers(){
        this.ui.querySelectorAll(".subview-svg").forEach(ui=>ui.style.display="none");
        //this.ui.querySelectorAll(".v-buttons-wrapper").forEach(ui=>ui.style.display="none");
    };

    showAllHandlers(){
        this.ui.querySelectorAll(".subview-svg").forEach(ui=>ui.style.display="");
        //this.ui.querySelectorAll(".v-buttons-wrapper").forEach(ui=>ui.style.display="");
    };

    isActive()
    {
        return !!this.box;
    }

    ////////////////////////////////////////////////////////////////////////////////////////
    // public interface

    box = undefined;
    attachBox(box){
        this.box = box;
        //this.show();
        this.showAllHandlers();
        this.update_view_handle(box);
    };
    detach(box){
        this.box = null;
        this.hideAllHandlers();
    };

    update_view_handle(){
        if (this.box){
            let boxPos = this.box.position;

            this.z_view_handle.update_view_handle(this.views[0].getViewPort(), {x: this.box.scale.y, y:this.box.scale.x}, {x: boxPos.x, y: boxPos.y}, this.box.rotation.z);
            this.y_view_handle.update_view_handle(this.views[1].getViewPort(), {x: this.box.scale.x, y:this.box.scale.z});
            this.x_view_handle.update_view_handle(this.views[2].getViewPort(), {x: this.box.scale.y, y:this.box.scale.z});
        }
    };

};

export {ProjectiveViewOps}
