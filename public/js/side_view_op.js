
import {translate_box, on_box_changed, selected_box, update_subview_by_windowsize} from "./main.js"

import {data} from "./data.js"
import {views} from "./view.js"
import {matmul2} from "./util.js"
import {auto_rotate_x, auto_rotate_y, change_rotation_y, change_rotation_x, auto_rotate_xyz} from "./box_op.js"

import {
	Quaternion,
	Vector3
} from "./lib/three.module.js";

function create_view_handler(view_prefix, on_edge_changed, on_direction_changed, on_auto_shrink, on_moved, on_scale, on_wheel, on_auto_rotate, on_reset_rotate){

    var mouse_start_pos;

    var view_handle_dimension = {  //dimension of the enclosed box
        x: 0,  //width
        y: 0,  //height
    }
    
    var view_center = {
        x: 0,
        y: 0,
    };

    var view_port_pos = {
        x:0,
        y:0,
    }

    var lines = {
        top: document.getElementById(view_prefix+"line-top"),
        bottom: document.getElementById(view_prefix+"line-bottom"),
        left: document.getElementById(view_prefix+"line-left"),
        right: document.getElementById(view_prefix+"line-right"),
        direction: document.getElementById(view_prefix+"line-direction"),
    }

    var svg = document.getElementById(view_prefix+"view-svg");
    var div = document.getElementById(view_prefix+"view-manipulator");

    var handles = {
        top: document.getElementById(view_prefix+"line-top-handle"),
        bottom: document.getElementById(view_prefix+"line-bottom-handle"),
        left: document.getElementById(view_prefix+"line-left-handle"),
        right: document.getElementById(view_prefix+"line-right-handle"),
        direction: document.getElementById(view_prefix+"line-direction-handle"),

        topleft: document.getElementById(view_prefix+"top-left-handle"),
        topright: document.getElementById(view_prefix+"top-right-handle"),
        bottomleft: document.getElementById(view_prefix+"bottom-left-handle"),
        bottomright: document.getElementById(view_prefix+"bottom-right-handle"),

        move: document.getElementById(view_prefix+"move-handle"),
    }

    var buttons = {
        auto_rotate: document.getElementById(view_prefix+"v-auto-rotate"),
        reset_rotate: document.getElementById(view_prefix+"v-reset-rotate"),
    };

    var viewport_info;
    
    var this_axis = view_prefix[0];

    function line(name){
        return lines[name];
    }

    function highlight_lines(lines){
        for (var l in lines){
            lines[l].style.stroke="yellow";
        };
    }

    function hide_lines(lines){
        for (var l in lines){
            lines[l].style.stroke="#00000000";
        }
    };

    function disable_handle_except(exclude){
        for (var h in handles){
            if (handles[h] != exclude)
                handles[h].style.display='none';
        }
    }

    function enable_handles(){
        for (var h in handles){
            handles[h].style.display='inherit';
        }
    }

    function move_lines(delta, direction){
        
        var x1 = view_center.x-view_handle_dimension.x/2;
        var y1 = view_center.y-view_handle_dimension.y/2;
        var x2 = view_center.x+view_handle_dimension.x/2;
        var y2 = view_center.y+view_handle_dimension.y/2;

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

        set_line_pos(Math.ceil(x1),Math.ceil(x2),Math.ceil(y1),Math.ceil(y2));        
    }

    function set_line_pos(x1,x2,y1,y2){
        lines.top.setAttribute("x1", "0%");
        lines.top.setAttribute("y1", y1);
        lines.top.setAttribute("x2", "100%");
        lines.top.setAttribute("y2", y1);

        lines.bottom.setAttribute("x1", "0%");
        lines.bottom.setAttribute("y1", y2);
        lines.bottom.setAttribute("x2", "100%");
        lines.bottom.setAttribute("y2", y2);

        lines.left.setAttribute("x1", x1);
        lines.left.setAttribute("y1", "0%");
        lines.left.setAttribute("x2", x1);
        lines.left.setAttribute("y2", "100%");

        lines.right.setAttribute("x1", x2);
        lines.right.setAttribute("y1", "0%");
        lines.right.setAttribute("x2", x2);
        lines.right.setAttribute("y2", "100%");
    }

    // when direction handler is draging
    function rotate_lines(theta){

        console.log(theta);
        theta = -theta-Math.PI/2;
        console.log(theta);
        // we use rotation matrix
        var trans_matrix =[
            Math.cos(theta), Math.sin(theta), view_center.x,
            -Math.sin(theta), Math.cos(theta), view_center.y,
            0, 0, 1,
        ]

        var points ;/*= `[
            -view_handle_dimension.x/2, view_handle_dimension.x/2,view_handle_dimension.x/2,-view_handle_dimension.x/2, 0,
            -view_handle_dimension.y/2, -view_handle_dimension.y/2,view_handle_dimension.y/2,  view_handle_dimension.y/2, -view_center.y,
            1,1,1,1,1
        ]; */
        var trans_points ;//= matmul2(trans_matrix, points, 3);

        //console.log(points);
        //var trans_points ;//= matmul2(trans_matrix, points, 3);
        //console.log(trans_points);

        points =[
            0,
            -view_center.y,
            1
        ];
        trans_points = matmul2(trans_matrix, points, 3);
        lines.direction.setAttribute("x2", Math.ceil(trans_points[0]));
        lines.direction.setAttribute("y2", Math.ceil(trans_points[1]));

        points =[
            -view_center.x, view_center.x,//-view_handle_dimension.x/2, view_handle_dimension.x/2,
            -view_handle_dimension.y/2, -view_handle_dimension.y/2,
            1,1,
        ];
        var trans_points = matmul2(trans_matrix, points, 3);

        lines.top.setAttribute("x1", Math.ceil(trans_points[0]));
        lines.top.setAttribute("y1", Math.ceil(trans_points[0+2]));
        lines.top.setAttribute("x2", Math.ceil(trans_points[1]));
        lines.top.setAttribute("y2", Math.ceil(trans_points[1+2]));


        points =[
            -view_handle_dimension.x/2, -view_handle_dimension.x/2,
            -view_center.y, view_center.y,
            1,1,
        ];
        trans_points = matmul2(trans_matrix, points, 3);

        lines.left.setAttribute("x1", Math.ceil(trans_points[0]));
        lines.left.setAttribute("y1", Math.ceil(trans_points[0+2]));
        lines.left.setAttribute("x2", Math.ceil(trans_points[1]));
        lines.left.setAttribute("y2", Math.ceil(trans_points[1+2]));


        points =[
            view_center.x,-view_center.x,
            view_handle_dimension.y/2,  view_handle_dimension.y/2,
            1,1
        ];
        trans_points = matmul2(trans_matrix, points, 3);
        lines.bottom.setAttribute("x1", Math.ceil(trans_points[1]));
        lines.bottom.setAttribute("y1", Math.ceil(trans_points[1+2]));
        lines.bottom.setAttribute("x2", Math.ceil(trans_points[0]));
        lines.bottom.setAttribute("y2", Math.ceil(trans_points[0+2]));

        points =[
             view_handle_dimension.x/2,view_handle_dimension.x/2,
            -view_center.y,view_center.y,
            1,1
        ];
        trans_points = matmul2(trans_matrix, points, 3);

        lines.right.setAttribute("x1", Math.ceil(trans_points[0]));
        lines.right.setAttribute("y1", Math.ceil(trans_points[0+2]));
        lines.right.setAttribute("x2", Math.ceil(trans_points[1]));
        lines.right.setAttribute("y2", Math.ceil(trans_points[1+2]));

    }
    
    function update_view_handle(viewport, obj_dimension){
        var viewport_ratio = viewport.width/viewport.height;
        var box_ratio = obj_dimension.x/obj_dimension.y;
    
        view_port_pos.x = viewport.left;
        view_port_pos.y = viewport.bottom-viewport.height;

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
    
        view_handle_dimension.x = width;
        view_handle_dimension.y = height;
    
        var x = viewport.width/2;//viewport.left + viewport.width/2;
        var y = viewport.height/2//viewport.bottom - viewport.height/2;
    
        var left = x-width/2;
        var right = x+width/2;
        var top = y-height/2;
        var bottom = y+height/2;
    
        view_center.x = x;
        view_center.y = y;
    
        set_line_pos(left, right, top, bottom);    
    
        // note when the object is too thin, the height/width value may be negative,
        // this causes error reporting, but we just let it be.
        var de = handles.left;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', "0%"); //Math.ceil(top+10));
        de.setAttribute('height', "100%");//Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);

    
        de = handles.right;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', "0%");//Math.ceil(top+10));
        de.setAttribute('height', "100%");//Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);
        
        de = handles.top;
        de.setAttribute('x', "0%");//Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(top-10));
        de.setAttribute('width', "100%");//Math.ceil(right-left-20));
        de.setAttribute('height', 20);

        de = handles.bottom;
        de.setAttribute('x', "0%");//Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(bottom-10));
        de.setAttribute('width', "100%");//Math.ceil(right-left-20));
        de.setAttribute('height', 20);
    

        de = handles.topleft;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(top-10));


        de = handles.topright;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(top-10));


        de = handles.bottomleft;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(bottom-10));

        de = handles.bottomright;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(bottom-10));

        //direction
        if (on_direction_changed){
            de = lines.direction;
            de.setAttribute('x1', Math.ceil((left+right)/2));
            de.setAttribute('y1', Math.ceil((top+bottom)/2));
            de.setAttribute('x2', Math.ceil((left+right)/2));
            de.setAttribute('y2', Math.ceil(0));
        
            de = handles.direction;
            de.setAttribute('x', Math.ceil((left+right)/2-10));
            de.setAttribute('y', 0);//Math.ceil(top+10));    
            de.setAttribute('height', Math.ceil((bottom-top)/2-10+top));
        }
        else{
            de = lines.direction;
            de.style.display = "none";
        
            de = handles.direction;
            de.style.display = "none";
        }


        // move handle
        de = document.getElementById(view_prefix+"move-handle");
        de.setAttribute('x', Math.ceil((left+right)/2-20));
        de.setAttribute('y', Math.ceil((top+bottom)/2-20));
    }
    
    
    function init_view_operation(){
        /*
        document.getElementById("z-v-up").onclick = function(){
            transform_bbox("y_move_up");
        };
    
        document.getElementById("z-v-down").onclick = function(){
            transform_bbox("y_move_down");
        };
    
        document.getElementById("z-v-left").onclick = function(){
            transform_bbox("x_move_down");
        };
    
        document.getElementById("z-v-right").onclick = function(){
            transform_bbox("x_move_up");
        };
    
    
    
        document.getElementById("z-v-t-up").onclick = function(){
            transform_bbox("y_scale_up");
        };
    
        document.getElementById("z-v-t-down").onclick = function(){
            transform_bbox("y_scale_down");
        };
    
        document.getElementById("z-v-t-left").onclick = function(){
            transform_bbox("x_scale_down");
        };
    
        document.getElementById("z-v-t-right").onclick = function(){
            transform_bbox("x_scale_up");
        };
        */
    
        var mouse_right_down = false;

        div.onkeydown = on_key_down;
        div.onmouseenter = function(event){
            div.focus();
        };
        div.onmouseleave = function(event){
            div.blur();
            mouse_right_down = false;
        };

        div.oncontextmenu = function(event){
            return false;
        };

        div.onmousedown = function(event){
            if (event.which==3){
                mouse_right_down = true;
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        };

        div.onmouseup = function(event){
            if (event.which==3){
                mouse_right_down = false;
                event.preventDefault();
                event.stopPropagation();
            }
        };

        div.onwheel = function(event){
            //console.log(event);
            if (event.deltaY>0){
                console.log("down");
            } else {
                console.log("up");
            }

            on_wheel(event.deltaY);            
        };

        install_edge_hanler(handles.left,   lines,   {x:-1,y:0});
        install_edge_hanler(handles.right,  lines,   {x:1, y:0});
        install_edge_hanler(handles.top,    lines,   {x:0, y:1});
        install_edge_hanler(handles.bottom, lines,   {x:0, y:-1});
        install_edge_hanler(handles.topleft, lines,   {x:-1, y:1});
        install_edge_hanler(handles.topright, lines,   {x:1, y:1});
        install_edge_hanler(handles.bottomleft, lines,   {x:-1, y:-1});
        install_edge_hanler(handles.bottomright, lines,   {x:1, y:-1});
        install_edge_hanler(handles.move, lines,  null);

        if (on_direction_changed){
            install_direction_handler("line-direction");
        }
    
        buttons.auto_rotate.onclick = function(event){
            //console.log("auto rotate button clicked.");
            on_auto_rotate();
            //event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
        }

        buttons.reset_rotate.onclick = function(event){
            //console.log("auto rotate button clicked.");
            on_reset_rotate();
            //event.currentTarget.blur();  // this bluring will disable focus on sideview also, which is not expected.
        }


        //install_move_handler();

        function install_edge_hanler(handle, lines, direction)
        {
            
            function hide(){
                hide_lines(lines);
            };
            function highlight(){
                highlight_lines(lines);
            }
            
            handle.onmouseenter = highlight;    
            handle.onmouseleave = hide;

    
            handle.onmouseup = function(event){
                //line.style["stroke-dasharray"]="none";
                hide();
                handle.onmouseleave = hide;
            };
    
            handle.ondblclick= function(event){
                event.stopPropagation();
                event.preventDefault();
                on_auto_shrink(direction); //if double click on 'move' handler, the directoin is null
                
            };
    
            handle.onmousedown = function(event){
                highlight();
                disable_handle_except(handle);

                handle.onmouseleave = null;

                var lines_pos = {
                    x1 : parseInt(lines.top.getAttribute('x1')),
                    y1 : parseInt(lines.top.getAttribute('y1')),
                    x2 : parseInt(lines.right.getAttribute('x2')),
                    y2 : parseInt(lines.right.getAttribute('y2')),
                };
    
                mouse_start_pos={x: event.clientX,y:event.clientY,};
                var mouse_cur_pos = {x: mouse_start_pos.x, y: mouse_start_pos.y};
    
                console.log(mouse_start_pos);
    
                svg.onmouseup = function(event){
                    svg.onmousemove = null;
                    svg.onmouseup=null;
                    enable_handles();
                    // restore color
                    hide();
                    handle.onmouseleave = hide;
                    
                    var handle_delta = {
                        x: mouse_cur_pos.x - mouse_start_pos.x,
                        y: -(mouse_cur_pos.y - mouse_start_pos.y),  //reverse since it'll be used by 3d-coord system
                    };

                    var ratio_delta = {
                        x: handle_delta.x/view_handle_dimension.x,
                        y: handle_delta.y/view_handle_dimension.y
                    };
                    
                    
                    if (direction){
                        on_edge_changed(ratio_delta, direction);

                        if (event.ctrlKey){
                            on_auto_shrink(direction);
                        }
                    }
                    else{
                        // when intall handler for mover, the direcion is left null
                        on_moved(ratio_delta);
                    }
                }
    
                svg.onmousemove = function(event){
                    
                    mouse_cur_pos={x: event.clientX,y:event.clientY,};
                    
                    var handle_delta = {
                        x: mouse_cur_pos.x - mouse_start_pos.x,
                        y: mouse_cur_pos.y - mouse_start_pos.y,  // don't reverse direction
                    };

                    move_lines(handle_delta, direction);
                }
            };
        }
    
        function install_direction_handler(linename){
            var handle = document.getElementById(view_prefix+linename+"-handle");
            var line = document.getElementById(view_prefix+linename);
            var svg = document.getElementById(view_prefix+"view-svg");
    
            handle.onmouseenter = function(event){
                line.style.stroke="yellow";
            };
    
            handle.onmouseleave = hide;
    
            handle.ondblclick= function(event){
                event.stopPropagation();
                event.preventDefault();
                //transform_bbox(this_axis+"_rotate_reverse");
                on_direction_changed(Math.PI);
            };
    
    
            function hide(event){
                line.style.stroke="#00000000";
            };
    
            handle.onmouseup = function(event){
                //line.style["stroke-dasharray"]="none";
                line.style.stroke="#00000000";
                handle.onmouseleave = hide;
            };
    
            handle.onmousedown = function(event){
                

                line.style.stroke="yellow";
                handle.onmouseleave = null;
                highlight_lines(lines);
                disable_handle_except(handle);



                var handle_center={
                    x: parseInt(line.getAttribute('x1')),
                }
    
                mouse_start_pos={
                    x: event.clientX,
                    y:event.clientY,
    
                    handle_offset_x: handle_center.x - event.clientX,                
                };
    
    
                var mouse_cur_pos = {x: mouse_start_pos.x, y: mouse_start_pos.y};
    
                console.log(mouse_start_pos);
    
                var theta = 0;
    
                svg.onmousemove = function(event){
                    
                    mouse_cur_pos={x: event.clientX,y:event.clientY,};
                    
                    var handle_center_cur_pos = {
                        x: mouse_cur_pos.x + mouse_start_pos.handle_offset_x - view_port_pos.x,
                        y: mouse_cur_pos.y - view_port_pos.y,
                    };
    
                    
    
                    theta = Math.atan2(
                        handle_center_cur_pos.y-view_center.y,  
                        handle_center_cur_pos.x-view_center.x);
                    console.log(theta);

                    rotate_lines(theta);
                };

                svg.onmouseup = function(event){
                    svg.onmousemove = null;
                    svg.onmouseup=null;
    
                    // restore color
                    line.style.stroke="#00000000";
                    enable_handles();
                    handle.onmouseleave = hide;


                    if (theta == 0){
                        return;
                    }
    
                    on_direction_changed(-theta-Math.PI/2, event.ctrlKey);
                    
                };

                
            };
        }
    
        function on_key_down(event){
            
            switch(event.key){
                case 'e':
                    event.preventDefault();
                    event.stopPropagation();
                    on_direction_changed(-0.005, event.ctrlKey);
                    
                    return true;
                case 'q':
                    event.preventDefault();
                    event.stopPropagation();
                    on_direction_changed(0.005, event.ctrlKey);
                    break;
                case 'f':
                    event.preventDefault();
                    event.stopPropagation();
                    on_direction_changed(-0.005, true);
                    break;
                case 'r':                
                    event.preventDefault();
                    event.stopPropagation();
                    on_direction_changed(0.005, true);
                    break;

                case 'w':
                case 'ArrowUp':
                    event.preventDefault();
                    event.stopPropagation();
                    if (mouse_right_down){
                        //console.log("right mouse down!");
                        on_scale({x:0, y:0.01});
                    }
                    else{
                        on_moved({x:0, y:0.01});
                    }
                    break;
                case 's':
                    if (!event.ctrlKey){
                        event.preventDefault();
                        event.stopPropagation();
                        if (mouse_right_down){
                            //console.log("right mouse down!");
                            on_scale({x:0, y:-0.01});
                        }
                        else
                            on_moved({x:0, y:-0.01});
                        break;    
                    }
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    event.stopPropagation();
                    if (mouse_right_down){
                        //console.log("right mouse down!");
                        on_scale({x:0, y:-0.01});
                    }
                    else
                        on_moved({x:0, y:-0.01});
                    break;
                case 'a':
                case 'ArrowLeft':
                    event.preventDefault();
                    event.stopPropagation();
                    if (mouse_right_down)
                        on_scale({x:-0.01, y:0});
                    else
                        on_moved({x:-0.01, y:0});
                    break;
                case 'd':
                case 'ArrowRight':
                    event.preventDefault();
                    event.stopPropagation();
                    if (mouse_right_down)
                        on_scale({x:0.01, y:0});
                    else
                        on_moved({x:0.01, y:0});
                    break;
            }
        }

        
        /*
        document.getElementById("z-view-manipulator").onmouseenter = function(){
            document.getElementById("z-v-table-translate").style.display="inherit";
            document.getElementById("z-v-table-scale").style.display="inherit";
            document.getElementById("z-v-table-shrink").style.display="inherit";
        };
    
        document.getElementById("z-view-manipulator").onmouseleave = function(){
            document.getElementById("z-v-table-translate").style.display="none";
            document.getElementById("z-v-table-scale").style.display="none";
            document.getElementById("z-v-table-shrink").style.display="none";
        };
        */
    
        // document.getElementById("z-v-shrink-left").onclick = function(event){
        //     var points = data.world.get_points_of_box_in_box_coord(selected_box);
    
        //     if (points.length == 0){
        //         return;
        //     }
    
        //     var minx = 0;
        //     for (var i in points){
        //         if (points[i][0] < minx){
        //             minx = points[i][0];
        //         }
        //     }
    
            
        //     var delta = minx + selected_box.scale.x/2;
        //     console.log(minx, delta);
        //     translate_box(selected_box, 'x', delta/2 );
        //     selected_box.scale.x -= delta;
        //     on_box_changed(selected_box);
        // };
    
        // document.getElementById("z-v-shrink-right").onclick = function(event){
        //     auto_shrink("x",1);
        // }
        
    }

    return {
        update_view_handle: update_view_handle,
        init_view_operation: init_view_operation,
    }
}

function get_selected_obj_support_point(){
    return data.world.get_points_dimmension_of_box(selected_box, true);
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

            var delta = selected_box.scale[axis]/2 - direction[axis]*extreme[end][axis];

            console.log(extreme, delta);
            translate_box(selected_box, axis, -direction[axis]* delta/2 );
            selected_box.scale[axis] -= delta;
        }
    }
}

function on_edge_changed(delta, direction){
    console.log(delta);

    translate_box(selected_box, 'x', delta.x/2 * direction.x);
    translate_box(selected_box, 'y', delta.y/2 * direction.y);
    translate_box(selected_box, 'z', delta.z/2 * direction.z);

    selected_box.scale.x += delta.x;
    selected_box.scale.y += delta.y;
    selected_box.scale.z += delta.z;
    on_box_changed(selected_box);
}


function on_wheel(subview, wheel_direction){
    var multiplier = 1.0;
    if (wheel_direction > 0){
        multiplier = 1.1;
    } else {
        multiplier = 0.9;
    }

    subview.viewport.zoom_ratio *= multiplier;
    subview.zoom_ratio *= multiplier;

    return;
}



///////////////////////////////////////////////////////////////////////////////////
// direction is null if triggered by dbclick on 'move' handler 
function on_z_auto_shrink(direction){
    var  extreme = data.world.get_points_dimmension_of_box(selected_box, true);
    
    if (!direction){
        ['x','y'].forEach(function(axis){

            translate_box(selected_box, axis, (extreme.max[axis] + extreme.min[axis])/2);
            selected_box.scale[axis] = extreme.max[axis] - extreme.min[axis];        
 
        })
    } else{
        direction = {
            x: direction.y,
            y: -direction.x,
            z: 0,
        }

        auto_shrink(extreme, direction)
    }
    
    on_box_changed(selected_box);
}



function on_z_edge_changed(ratio, direction){

    var delta = {        
        x: selected_box.scale.x * ratio.y * direction.y,
        y: selected_box.scale.y * ratio.x * direction.x,
        z: 0,
    };

    direction ={
        x: direction.y,
        y: -direction.x,
        z: 0,
    };

    direction.z = 0;

    on_edge_changed(delta, direction);
}

function on_z_direction_changed(theta, sticky){
    // points indices shall be obtained before rotation.
    var points_indices = data.world.get_points_indices_of_box(selected_box);
        

    var _tempQuaternion = new Quaternion();
    var rotationAxis = new Vector3(0,0,1);
    selected_box.quaternion.multiply( _tempQuaternion.setFromAxisAngle( rotationAxis, theta ) ).normalize();

    if (sticky){
    
        var extreme = data.world.get_dimension_of_points(points_indices, selected_box);

        ['x','y'].forEach(function(axis){

            translate_box(selected_box, axis, (extreme.max[axis] + extreme.min[axis])/2);
            selected_box.scale[axis] = extreme.max[axis] - extreme.min[axis];        

        }) 
    }

    on_box_changed(selected_box);
}


//ratio.y  vertical
//ratio.x  horizental
// box.x  vertical
// box.y  horizental
function on_z_moved(ratio){
    var delta = {        
        x: selected_box.scale.x*ratio.y,
        y: -selected_box.scale.y*ratio.x,
    };

    
    translate_box(selected_box, "x", delta.x);
    translate_box(selected_box, "y", delta.y);

    on_box_changed(selected_box);
}


function on_z_scaled(ratio){
        
    ratio = {
        x: ratio.y,
        y: ratio.x,
        z: 0,
    };

    for (var axis in ratio){
        if (ratio[axis] != 0){
            selected_box.scale[axis] *= 1+ratio[axis];
        }
    }
    
    on_box_changed(selected_box);
}

function on_z_wheel(wheel_direction){
    on_wheel(views[1], wheel_direction);
    update_subview_by_windowsize(selected_box);
    z_view_handle.update_view_handle(views[1].viewport, {x: selected_box.scale.y, y:selected_box.scale.x});
}

function on_z_auto_rotate(){
    auto_rotate_xyz(selected_box, null, {x:false, y:false, z:true});
}

function on_z_reset_rotate(){
    selected_box.rotation.z = 0;
    on_box_changed(selected_box);
}

var z_view_handle = create_view_handler("z-", on_z_edge_changed, on_z_direction_changed, on_z_auto_shrink, on_z_moved, on_z_scaled, on_z_wheel, on_z_auto_rotate, on_z_reset_rotate);


///////////////////////////////////////////////////////////////////////////////////

function on_y_edge_changed(ratio, direction){

    var delta = {
        x: selected_box.scale.x * ratio.x * direction.x,
        z: selected_box.scale.z * ratio.y * direction.y,
        y: 0,
    };

    direction ={
        x: direction.x,
        z: direction.y,
        y: 0,
    };

    on_edge_changed(delta, direction);
}

function on_y_auto_shrink(direction){
    
    
    if (!direction){
        var  extreme = data.world.get_points_dimmension_of_box(selected_box, false);
        ['x','z'].forEach(function(axis){

            translate_box(selected_box, axis, (extreme.max[axis] + extreme.min[axis])/2);
            selected_box.scale[axis] = extreme.max[axis]-extreme.min[axis];        
 
        })       
        

    } else{
        direction = {
            x: direction.x,
            y: 0,
            z: direction.y,
        }

        if (direction.z != 0){
            var  extreme = data.world.get_points_dimmension_of_box(selected_box, false);
            auto_shrink(extreme, direction)
        }else {
            var  extreme = data.world.get_points_dimmension_of_box(selected_box, true);
            auto_shrink(extreme, direction)
        }
        
    }
    
    on_box_changed(selected_box);
}


function on_y_moved(ratio){
    var delta = {
        x: selected_box.scale.x*ratio.x,
        z: selected_box.scale.z*ratio.y
    };

    
    translate_box(selected_box, "x", delta.x);
    translate_box(selected_box, "z", delta.z);

    on_box_changed(selected_box);
}

function on_y_direction_changed(theta, sticky){
    change_rotation_y(selected_box, theta, sticky)
}


function on_y_scaled(ratio){
    
    ratio = {
        x: ratio.x,
        y: 0,
        z: ratio.y,
    };

    for (var axis in ratio){
        if (ratio[axis] != 0){
            selected_box.scale[axis] *= 1+ratio[axis];
        }
    }
    
    on_box_changed(selected_box);
}

function on_y_wheel(wheel_direction){
    on_wheel(views[2], wheel_direction);
    update_subview_by_windowsize(selected_box);
    y_view_handle.update_view_handle(views[2].viewport, {x: selected_box.scale.x, y:selected_box.scale.z});
}

function on_y_reset_rotate(){
    selected_box.rotation.y = 0;
    on_box_changed(selected_box);
}

function on_y_auto_rotate(){
    auto_rotate_y(selected_box);
}

var y_view_handle = create_view_handler("y-", on_y_edge_changed, 
                                              on_y_direction_changed, on_y_auto_shrink, on_y_moved, on_y_scaled, on_y_wheel, 
                                              on_y_auto_rotate,
                                              on_y_reset_rotate);


///////////////////////////////////////////////////////////////////////////////////

function on_x_edge_changed(ratio, direction){

    var delta = {
        y: selected_box.scale.y * ratio.x * direction.x,
        z: selected_box.scale.z * ratio.y * direction.y,
        x: 0,
    };

    direction ={
        y: direction.x,
        z: direction.y,
        x: 0,
    };

    on_edge_changed(delta, direction);
}


function on_x_auto_shrink(direction){
    if (!direction){
        var  extreme = data.world.get_points_dimmension_of_box(selected_box, false);

        ['y','z'].forEach(function(axis){

            translate_box(selected_box, axis, (extreme.max[axis] + extreme.min[axis])/2);
            selected_box.scale[axis] = extreme.max[axis]-extreme.min[axis];        
 
        })       
        

    } else{
        direction = {
            x: 0,
            y: direction.x,
            z: direction.y,
        }

        if (direction.z != 0){
            var  extreme = data.world.get_points_dimmension_of_box(selected_box, false);
            auto_shrink(extreme, direction)
        } else {
            var  extreme = data.world.get_points_dimmension_of_box(selected_box, true);
            auto_shrink(extreme, direction)
        }
    }
    
    on_box_changed(selected_box);
}


function on_x_moved(ratio){
    var delta = {
        y: selected_box.scale.y*ratio.x,
        z: selected_box.scale.z*ratio.y
    };

    
    translate_box(selected_box, "y", delta.y);
    translate_box(selected_box, "z", delta.z);

    on_box_changed(selected_box);
}

function on_x_direction_changed(theta, sticky){
    change_rotation_x(selected_box, theta, sticky)
}

function on_x_scaled(ratio){
    
    ratio = {
        y: ratio.x,
        z: ratio.y,
    };

    for (var axis in ratio){
        if (ratio[axis] != 0){
            selected_box.scale[axis] *= 1+ratio[axis];
        }
    }
    
    on_box_changed(selected_box);
}

function on_x_wheel(wheel_direction){
    on_wheel(views[3], wheel_direction);
    update_subview_by_windowsize(selected_box);
    x_view_handle.update_view_handle(views[3].viewport, {x: selected_box.scale.y, y:selected_box.scale.z});
}


function on_x_reset_rotate(){
    selected_box.rotation.x = 0;
    on_box_changed(selected_box);
}

function on_x_auto_rotate(){
    auto_rotate_x(selected_box);
}

var x_view_handle = create_view_handler("x-", on_x_edge_changed, 
                                              on_x_direction_changed, 
                                              on_x_auto_shrink, 
                                              on_x_moved, 
                                              on_x_scaled, 
                                              on_x_wheel, 
                                              on_x_auto_rotate,
                                              on_x_reset_rotate);



// exports

var view_handles = {
    init_view_operation: function(){
        z_view_handle.init_view_operation();
        y_view_handle.init_view_operation();
        x_view_handle.init_view_operation();
    },

    update_view_handle: function(){
        z_view_handle.update_view_handle(views[1].viewport, {x: selected_box.scale.y, y:selected_box.scale.x});
        y_view_handle.update_view_handle(views[2].viewport, {x: selected_box.scale.x, y:selected_box.scale.z});
        x_view_handle.update_view_handle(views[3].viewport, {x: selected_box.scale.y, y:selected_box.scale.z});
    }, 

    hide: function(){
        document.getElementById("z-view-manipulator").style.display="none";
        document.getElementById("y-view-manipulator").style.display="none";
        document.getElementById("x-view-manipulator").style.display="none";
    },

    show: function(){
        document.getElementById("z-view-manipulator").style.display="inline-flex";
        document.getElementById("y-view-manipulator").style.display="inline-flex";
        document.getElementById("x-view-manipulator").style.display="inline-flex";
    },
}


export {view_handles, on_x_direction_changed, on_y_direction_changed, on_z_direction_changed}
