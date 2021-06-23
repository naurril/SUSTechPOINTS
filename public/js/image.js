
import {vector4to3, vector3_nomalize, psr_to_xyz, matmul} from "./util.js"
import {get_obj_cfg_by_type} from "./obj_cfg.js"

function FocusImageContext(ui){

    this.ui = ui;
    
    // draw highlighted box
    this.updateFocusedImageContext = function(box){
        var scene_meta = box.world.frameInfo.sceneMeta;


        let bestImage = choose_best_camera_for_point(
            scene_meta,
            box.getTruePosition());

        if (!bestImage){
            return;           
        }

        if (!scene_meta.calib.camera){
            return;
        }
        
        var calib = scene_meta.calib.camera[bestImage]
        if (!calib){
            return;
        }
        
        if (calib){
            var img = box.world.cameras.getImageByName(bestImage);
            if (img && (img.naturalWidth > 0)){

                this.clear_canvas();

                var imgfinal = box_to_2d_points(box, calib)

                if (imgfinal != null){  // if projection is out of range of the image, stop drawing.
                    var ctx = this.ui.getContext("2d");
                    ctx.lineWidth = 0.5;

                    // note: 320*240 should be adjustable
                    var crop_area = crop_image(img.naturalWidth, img.naturalHeight, ctx.canvas.width, ctx.canvas.height, imgfinal);

                    ctx.drawImage(img, crop_area[0], crop_area[1],crop_area[2], crop_area[3], 0, 0, ctx.canvas.width, ctx.canvas.height);// ctx.canvas.clientHeight);
                    //ctx.drawImage(img, 0,0,img.naturalWidth, img.naturalHeight, 0, 0, 320, 180);// ctx.canvas.clientHeight);
                    var imgfinal = vectorsub(imgfinal, [crop_area[0],crop_area[1]]);
                    var trans_ratio = {
                        x: ctx.canvas.height/crop_area[3],
                        y: ctx.canvas.height/crop_area[3],
                    }

                    draw_box_on_image(ctx, box, imgfinal, trans_ratio, true);
                }
            }
        }
    }

    this.clear_canvas = function(){
        var c = this.ui;
        var ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
    }


    function vectorsub(vs, v){
        var ret = [];
        var vl = v.length;

        for (var i = 0; i<vs.length/vl; i++){
            for (var j=0; j<vl; j++)
                ret[i*vl+j] = vs[i*vl+j]-v[j];
        }

        return ret;
    }


    function crop_image(imgWidth, imgHeight, clientWidth, clientHeight, corners)
    {
        var maxx=0, maxy=0, minx=imgWidth, miny=imgHeight;

        for (var i = 0; i < corners.length/2; i++){
            var x = corners[i*2];
            var y = corners[i*2+1];

            if (x>maxx) maxx=x;
            else if (x<minx) minx=x;

            if (y>maxy) maxy=y;
            else if (y<miny) miny=y;        
        }

        var targetWidth= (maxx-minx)*1.5;
        var targetHeight= (maxy-miny)*1.5;

        if (targetWidth/targetHeight > clientWidth/clientHeight){
            //increate height
            targetHeight = targetWidth*clientHeight/clientWidth;        
        }
        else{
            targetWidth = targetHeight*clientWidth/clientHeight;
        }

        var centerx = (maxx+minx)/2;
        var centery = (maxy+miny)/2;

        return [
            centerx - targetWidth/2,
            centery - targetHeight/2,
            targetWidth,
            targetHeight
        ];
    }

    function draw_box_on_image(ctx, box, box_corners, trans_ratio, selected){
        var imgfinal = box_corners;

        if (!selected){
            ctx.strokeStyle = get_obj_cfg_by_type(box.obj_type).color;

            var c = get_obj_cfg_by_type(box.obj_type).color;
            var r ="0x"+c.slice(1,3);
            var g ="0x"+c.slice(3,5);
            var b ="0x"+c.slice(5,7);

            ctx.fillStyle="rgba("+parseInt(r)+","+parseInt(g)+","+parseInt(b)+",0.2)";
        }
        else{
            ctx.strokeStyle="#ff00ff";        
            ctx.fillStyle="rgba(255,0,255,0.2)";
        }

        // front panel
        ctx.beginPath();
        ctx.moveTo(imgfinal[3*2]*trans_ratio.x,imgfinal[3*2+1]*trans_ratio.y);

        for (var i=0; i < imgfinal.length/2/2; i++)
        {
            ctx.lineTo(imgfinal[i*2+0]*trans_ratio.x, imgfinal[i*2+1]*trans_ratio.y);
        }

        ctx.closePath();
        ctx.fill();
        
        // frame
        ctx.beginPath();

        ctx.moveTo(imgfinal[3*2]*trans_ratio.x,imgfinal[3*2+1]*trans_ratio.y);

        for (var i=0; i < imgfinal.length/2/2; i++)
        {
            ctx.lineTo(imgfinal[i*2+0]*trans_ratio.x, imgfinal[i*2+1]*trans_ratio.y);
        }
        //ctx.stroke();


        //ctx.strokeStyle="#ff00ff";
        //ctx.beginPath();

        ctx.moveTo(imgfinal[7*2]*trans_ratio.x,imgfinal[7*2+1]*trans_ratio.y);

        for (var i=4; i < imgfinal.length/2; i++)
        {
            ctx.lineTo(imgfinal[i*2+0]*trans_ratio.x, imgfinal[i*2+1]*trans_ratio.y);
        }
        
        ctx.moveTo(imgfinal[0*2]*trans_ratio.x,imgfinal[0*2+1]*trans_ratio.y);
        ctx.lineTo(imgfinal[4*2+0]*trans_ratio.x, imgfinal[4*2+1]*trans_ratio.y);
        ctx.moveTo(imgfinal[1*2]*trans_ratio.x,imgfinal[1*2+1]*trans_ratio.y);
        ctx.lineTo(imgfinal[5*2+0]*trans_ratio.x, imgfinal[5*2+1]*trans_ratio.y);
        ctx.moveTo(imgfinal[2*2]*trans_ratio.x,imgfinal[2*2+1]*trans_ratio.y);
        ctx.lineTo(imgfinal[6*2+0]*trans_ratio.x, imgfinal[6*2+1]*trans_ratio.y);
        ctx.moveTo(imgfinal[3*2]*trans_ratio.x,imgfinal[3*2+1]*trans_ratio.y);
        ctx.lineTo(imgfinal[7*2+0]*trans_ratio.x, imgfinal[7*2+1]*trans_ratio.y);


        ctx.stroke();
    }
}



function ImageContext(ui, cfg, on_img_click){
    this.ui = ui;
    this.cfg = cfg;
    this.init_image_op = init_image_op;    
    this.clear_main_canvas= clear_main_canvas;
    this.choose_best_camera_for_point = choose_best_camera_for_point;
    //this.image_manager = image_manager;
    this.on_img_click = on_img_click;
    this.world = null;
    this.attachWorld = function(world){
        this.world = world;
    };
    this.hide = function(){
        this.ui.style.display="none";
    };
    this.show = function(){
        this.ui.style.display="";
    };
    this.img = null;
   

    //internal
    let scope =this;
    var drawing = false;
    var points = [];
    var polyline;

    var all_lines=[];
    
    this.img_lidar_point_map = {};

    function point_color_by_distance(x,y)
    {
        // x,y are image coordinates
        let p = scope.img_lidar_point_map[y*scope.img.width+x];

        let distance = Math.sqrt(p[1]*p[1] + p[2]*p[2] + p[3]*p[3] );

        if (distance > 60.0)
            distance = 60.0;
        else if (distance < 10.0)
            distance = 10.0;
        
        return [(distance-10)/50.0, 1- (distance-10)/50.0, 0].map(c=>{
            let hex = Math.floor(c*255).toString(16);
            if (hex.length == 1)
                hex = "0"+hex;
            return hex;
        }).reduce((a,b)=>a+b,"#"); 

    }

    function to_polyline_attr(points){
        return points.reduce(function(x,y){
            return String(x)+","+y;
        }
        )
    }

    var get_selected_box;

    function init_image_op(func_get_selected_box){
        scope.ui.onclick = on_click;
        get_selected_box = func_get_selected_box;
        // var h = parentUi.querySelector("#resize-handle");
        // h.onmousedown = resize_mouse_down;
        
        // c.onresize = on_resize;
    }

    // function on_resize(ev){
    //     console.log(ev);
    // }


    function to_viewbox_coord(x,y){
        var div = scope.ui.querySelector("#maincanvas-svg");
        
        x = Math.round(x*2048/div.clientWidth);
        y = Math.round(y*1536/div.clientHeight);
        return [x,y];

    }
    function on_click(e){
        var p= to_viewbox_coord(e.layerX, e.layerY);
        var x=p[0];
        var y=p[1];
        
        console.log("clicked",x,y);

        
        if (!drawing){

            if (e.ctrlKey){
                drawing = true;
                var svg = scope.ui.querySelector("#maincanvas-svg");
                //svg.style.position = "absolute";
                
                polyline = document.createElementNS("http://www.w3.org/2000/svg", 'polyline');
                svg.appendChild(polyline);
                points.push(x);
                points.push(y);

                
                polyline.setAttribute("class", "maincanvas-line")
                polyline.setAttribute("points", to_polyline_attr(points));

                var c = scope.ui;
                c.onmousemove = on_move;
                c.ondblclick = on_dblclick;   
                c.onkeydown = on_key;    
            
            }
            else{
                // not drawing
                //this is a test
                if (false){
                    let nearest_x = 100000;
                    let nearest_y = 100000;
                    let selected_pts = [];
                    
                    for (let i =x-100; i<x+100; i++){
                        if (i < 0 || i >= scope.img.width)
                            continue;

                        for (let j = y-100; j<y+100; j++){
                            if (j < 0 || j >= scope.img.height)
                                continue;

                            let lidarpoint = scope.img_lidar_point_map[j*scope.img.width+i];
                            if (lidarpoint){
                                //console.log(i,j, lidarpoint);
                                selected_pts.push(lidarpoint); //index of lidar point

                                if (((i-x) * (i-x) + (j-y)*(j-y)) < ((nearest_x-x)*(nearest_x-x) + (nearest_y-y)*(nearest_y-y))){
                                    nearest_x = i;
                                    nearest_y = j;                                
                                }
                            }
                                
                        }
                    }
                    console.log("nearest", nearest_x, nearest_y);
                    scope.draw_point(nearest_x, nearest_y);
                    if (nearest_x < 100000)
                    {
                        scope.on_img_click([scope.img_lidar_point_map[nearest_y*scope.img.width+nearest_x][0]]);
                    }
                }
                
            }

        } else {
            if (points[points.length-2]!=x || points[points.length-1]!=y){
                points.push(x);
                points.push(y);
                polyline.setAttribute("points", to_polyline_attr(points));
            }
            
        }


        function on_move(e){
            var p= to_viewbox_coord(e.layerX, e.layerY);
            var x=p[0];
            var y=p[1];

            console.log(x,y);
            polyline.setAttribute("points", to_polyline_attr(points) + ',' + x + ',' + y);
        }

        function on_dblclick(e){
            
            points.push(points[0]);
            points.push(points[1]);
            
            polyline.setAttribute("points", to_polyline_attr(points));
            console.log(points)
            
            all_lines.push(points);

            drawing = false;
            points = [];

            var c = scope.ui;
            c.onmousemove = null;
            c.ondblclick = null;
            c.onkeypress = null;
            c.blur();
        }

        function cancel(){
                
                polyline.remove();

                drawing = false;
                points = [];
                var c = scope.ui;
                c.onmousemove = null;
                c.ondblclick = null;
                c.onkeypress = null;

                c.blur();
        }

        function on_key(e){
            if (e.key == "Escape"){
                cancel();
                
            }
        }
    }


    // all boxes
    function clear_main_canvas(){

        var boxes = scope.ui.querySelector("#svg-boxes").children;
        
        if (boxes.length>0){
            for (var c=boxes.length-1; c >= 0; c--){
                boxes[c].remove();                    
            }
        }

        var points = scope.ui.querySelector("#svg-points").children;
        
        if (points.length>0){
            for (var c=points.length-1; c >= 0; c--){
                points[c].remove();                    
            }
        }
    }


    function get_active_calib(){
        var scene_meta = scope.world.sceneMeta;

            
        if (!scene_meta.calib.camera){
            return null;
        }

        var active_camera_name = scope.world.cameras.active_name;
        var calib = scene_meta.calib.camera[active_camera_name];

        return calib;
    }




    function get_trans_ratio(){
        var img = scope.world.cameras.active_image();       

        if (!img || img.width==0){
            return null;
        }

        var clientWidth, clientHeight;

        clientWidth = 2048;
        clientHeight = 1536;

        var trans_ratio ={
            x: clientWidth/img.naturalWidth,
            y: clientHeight/img.naturalHeight,
        };

        return trans_ratio;
    }

    function show_image(){
        var svgimage = scope.ui.querySelector("#svg-image");

        // active img is set by global, it's not set sometimes.
        var img = scope.world.cameras.active_image();
        if (img){
            svgimage.setAttribute("xlink:href", img.src);
        }

        scope.img = img;


    }


    function points_to_svg(points, trans_ratio, cssclass, radius=2){
        var ptsFinal = points.map(function(x, i){
            if (i%2==0){
                return Math.round(x * trans_ratio.x);
            }else {
                return Math.round(x * trans_ratio.y);
            }
        });

        var svg = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        
        if (cssclass)
        {
            svg.setAttribute("class", cssclass);
        }
        
        for (let i = 0; i < ptsFinal.length; i+=2){

            
            let x = ptsFinal[i];
            let y = ptsFinal[i+1];

            let p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
            p.setAttribute("cx", x);
            p.setAttribute("cy", y);
            p.setAttribute("r", 2);
            p.setAttribute("stroke-width", "1");            

            if (! cssclass){
                let image_x = points[i];
                let image_y = points[i+1];
                let color = point_color_by_distance(image_x, image_y);
                color += "24"; //transparency
                p.setAttribute("stroke", color);
                p.setAttribute("fill", color);
            }
            
            svg.appendChild(p);
        }
        
        return svg;
    }

    this.draw_point = function(x,y){
        let trans_ratio = get_trans_ratio();
        let svg = scope.ui.querySelector("#svg-points");
        let pts_svg = points_to_svg([x,y], trans_ratio, "radar-points");
        svg.appendChild(pts_svg);
    };




    this.render_2d_image = function(){

        let self = this;
        if (this.cfg.disableMainImageContext)
            return;

        //console.log("2d iamge rendered!");

        clear_main_canvas();

        // if (params["hide image"]){
        //     hide_canvas();
        //     return;
        // }

        show_image();

        draw_svg();


        function hide_canvas(){
            //document.getElementsByClassName("ui-wrapper")[0].style.display="none";
            scope.ui.style.display="none";
        }

        function show_canvas(){
            scope.ui.style.display="inline";
        }

        function draw_svg(){
            // draw picture
            var img = scope.world.cameras.active_image();       

            if (!img || img.width==0){
                hide_canvas();
                return;
            }

            show_canvas();

            var trans_ratio = get_trans_ratio();

            var calib = get_active_calib();
            if (!calib){
                return;
            }

            let svg = scope.ui.querySelector("#svg-boxes");

            // draw boxes
            scope.world.annotation.boxes.forEach(function(box){
                var imgfinal = box_to_2d_points(box, calib);
                if (imgfinal){
                    var box_svg = box_to_svg (box, imgfinal, trans_ratio, get_selected_box() == box);
                    svg.appendChild(box_svg);
                }

            });

            svg = scope.ui.querySelector("#svg-points");

            // draw radar points
            if (self.cfg.projectRadarToImage)
            {
                scope.world.radars.radarList.forEach(radar=>{
                    let pts = radar.get_unoffset_radar_points();
                    let ptsOnImg = points3d_to_image2d(pts, calib);

                    // there may be none after projecting
                    if (ptsOnImg && ptsOnImg.length>0){
                        let pts_svg = points_to_svg(ptsOnImg, trans_ratio, radar.cssStyleSelector);
                        svg.appendChild(pts_svg);
                    }
                });
            }



            // project lidar points onto camera image   
            if (self.cfg.projectLidarToImage){
                let pts = scope.world.lidar.get_all_points_unoffset();
                let ptsOnImg = points3d_to_image2d(pts, calib, true, self.img_lidar_point_map, img.width, img.height);

                // there may be none after projecting
                if (ptsOnImg && ptsOnImg.length>0){
                    let pts_svg = points_to_svg(ptsOnImg, trans_ratio);
                    svg.appendChild(pts_svg);
                }
            }

        }

    }



    function box_to_svg(box, box_corners, trans_ratio, selected){
        

        var imgfinal = box_corners.map(function(x, i){
            if (i%2==0){
                return Math.round(x * trans_ratio.x);
            }else {
                return Math.round(x * trans_ratio.y);
            }
        })


        var svg = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        svg.setAttribute("id", "svg-box-local-"+box.obj_local_id);

        if (selected){
            svg.setAttribute("class", box.obj_type+" box-svg-selected");
        } else{
            svg.setAttribute("class", box.obj_type);
        }

        var front_panel =  document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
        svg.appendChild(front_panel);
        front_panel.setAttribute("points",
            imgfinal.slice(0, 4*2).reduce(function(x,y){            
                return String(x)+","+y;
            })
        )

        /*
        var back_panel =  document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
        svg.appendChild(back_panel);
        back_panel.setAttribute("points",
            imgfinal.slice(4*2).reduce(function(x,y){            
                return String(x)+","+y;
            })
        )
        */

    for (var i = 0; i<4; ++i){
            var line =  document.createElementNS("http://www.w3.org/2000/svg", 'line');
            svg.appendChild(line);
            line.setAttribute("x1", imgfinal[(4+i)*2]);
            line.setAttribute("y1", imgfinal[(4+i)*2+1]);
            line.setAttribute("x2", imgfinal[(4+(i+1)%4)*2]);
            line.setAttribute("y2", imgfinal[(4+(i+1)%4)*2+1]);
        }


        for (var i = 0; i<4; ++i){
            var line =  document.createElementNS("http://www.w3.org/2000/svg", 'line');
            svg.appendChild(line);
            line.setAttribute("x1", imgfinal[i*2]);
            line.setAttribute("y1", imgfinal[i*2+1]);
            line.setAttribute("x2", imgfinal[(i+4)*2]);
            line.setAttribute("y2", imgfinal[(i+4)*2+1]);
        }

        return svg;
    }


    this.image_manager = {
        display_image: ()=>{
            if (!this.cfg.disableMainImageContext)
                this.render_2d_image();
        },

        add_box: function(box){
            var calib = get_active_calib();
            if (!calib){
                return;
            }
            var trans_ratio = get_trans_ratio();
            if (trans_ratio){
                var imgfinal = box_to_2d_points(box, calib);
                if (imgfinal){
                    var imgfinal = imgfinal.map(function(x, i){
                        if (i%2==0){
                            return Math.round(x * trans_ratio.x);
                        }else {
                            return Math.round(x * trans_ratio.y);
                        }
                    })

                    var svg_box = box_to_svg(box, imgfinal, trans_ratio);
                    var svg = scope.ui.querySelector("#svg-boxes");
                    svg.appendChild(svg_box);
                }
            }
        },


        onBoxSelected: function(box_obj_local_id, obj_type){
            var b = scope.ui.querySelector("#svg-box-local-"+box_obj_local_id);
            if (b){
                b.setAttribute("class", "box-svg-selected");
            }
        },


        onBoxUnselected: function(box_obj_local_id, obj_type){
            var b = scope.ui.querySelector("#svg-box-local-"+box_obj_local_id);

            if (b)
                b.setAttribute("class", obj_type);
        },

        remove_box: function(box_obj_local_id){
            var b = scope.ui.querySelector("#svg-box-local-"+box_obj_local_id);

            if (b)
                b.remove();
        },

        update_obj_type: function(box_obj_local_id, obj_type){
            this.onBoxSelected(box_obj_local_id, obj_type);
        },
        
        update_box: function(box){
            var b = scope.ui.querySelector("#svg-box-local-"+box.obj_local_id);
            if (!b){
                return;
            }

            var children = b.childNodes;

            var calib = get_active_calib();
            if (!calib){
                return;
            }

            var trans_ratio = get_trans_ratio();
            var imgfinal = box_to_2d_points(box, calib);

            if (!imgfinal){
                //box may go out of image
                return;
            }
            var imgfinal = imgfinal.map(function(x, i){
                if (i%2==0){
                    return Math.round(x * trans_ratio.x);
                }else {
                    return Math.round(x * trans_ratio.y);
                }
            })

            if (imgfinal){
                var front_panel = children[0];
                front_panel.setAttribute("points",
                    imgfinal.slice(0, 4*2).reduce(function(x,y){            
                        return String(x)+","+y;
                    })
                )



                for (var i = 0; i<4; ++i){
                    var line =  children[1+i];
                    line.setAttribute("x1", imgfinal[(4+i)*2]);
                    line.setAttribute("y1", imgfinal[(4+i)*2+1]);
                    line.setAttribute("x2", imgfinal[(4+(i+1)%4)*2]);
                    line.setAttribute("y2", imgfinal[(4+(i+1)%4)*2+1]);
                }


                for (var i = 0; i<4; ++i){
                    var line =  children[5+i];
                    line.setAttribute("x1", imgfinal[i*2]);
                    line.setAttribute("y1", imgfinal[i*2+1]);
                    line.setAttribute("x2", imgfinal[(i+4)*2]);
                    line.setAttribute("y2", imgfinal[(i+4)*2+1]);
                }
            }

        }
    }

}


function box_to_2d_points(box, calib){
    var scale = box.scale;
    var pos = box.getTruePosition();
    var rotation = box.rotation;

    var box3d = psr_to_xyz(pos, scale, rotation);

    //console.log(box.obj_track_id, box3d.slice(8*4));

    box3d = box3d.slice(0,8*4);
    return points3d_homo_to_image2d(box3d, calib);
}   

// points3d is length 4 row vector, homogeneous coordinates
// returns 2d row vectors
function points3d_homo_to_image2d(points3d, calib, accept_partial=false,save_map, img_dx, img_dy){
    var imgpos = matmul(calib.extrinsic, points3d, 4);
    
    //rect matrix shall be applied here, for kitti
    if (calib.rect){
        imgpos = matmul(calib.rect, imgpos, 4);
    }

    var imgpos3 = vector4to3(imgpos);

    var imgpos2;
    if (calib.intrinsic.length>9) {
        imgpos2 = matmul(calib.intrinsic, imgpos, 4);
    }
    else
        imgpos2 = matmul(calib.intrinsic, imgpos3, 3);

    let imgfinal = vector3_nomalize(imgpos2);
    let imgfinal_filterd = [];
     
    if (accept_partial){
        let temppos=[];
        let p = imgpos3;
        for (var i = 0; i<p.length/3; i++){
            if (p[i*3+2]>0){
                let x = imgfinal[i*2];
                let y = imgfinal[i*2+1];
                
                x = Math.round(x);
                y = Math.round(y);
                if (x > 0 && x < img_dx && y > 0 && y < img_dy){
                    if (save_map){
                        save_map[img_dx*y+x] = [i, points3d[i*4+0], points3d[i*4+1], points3d[i*4+2]];  //save index? a little dangerous! //[points3d[i*4+0], points3d[i*4+1], points3d[i*4+2]];
                    }

                    imgfinal_filterd.push(x);
                    imgfinal_filterd.push(y);

                }
                else{
                    // console.log("points outside of image",x,y);
                }

            }
        }        

        imgfinal = imgfinal_filterd;
        //warning: what if calib.intrinsic.length
        //todo: this function need clearance
        //imgpos2 = matmul(calib.intrinsic, temppos, 3);
    }
    else  if (!accept_partial && !all_points_in_image_range(imgpos3)){
            return null;
    }

    return imgfinal;
}

function point3d_to_homo(points){
    let homo=[];
    for (let i =0; i<points.length; i+=3){
        homo.push(points[i]);
        homo.push(points[i+1]);
        homo.push(points[i+2]);
        homo.push(1);
    }

    return homo;
}
function points3d_to_image2d(points, calib, accept_partial=false, save_map, img_dx, img_dy){
    // 
    return points3d_homo_to_image2d(point3d_to_homo(points), calib, accept_partial, save_map, img_dx, img_dy);
}

function all_points_in_image_range(p){
    for (var i = 0; i<p.length/3; i++){
        if (p[i*3+2]<0){
            return false;
        }
    }
    
    return true;
}



function choose_best_camera_for_point(scene_meta, center){
    
    if (!scene_meta.calib){
        return null;
    }

    var proj_pos = [];
    for (var i in scene_meta.calib.camera){
        var imgpos = matmul(scene_meta.calib.camera[i].extrinsic, [center.x,center.y,center.z,1], 4);
        proj_pos.push({calib: i, pos: vector4to3(imgpos)});
    }

    var valid_proj_pos = proj_pos.filter(function(p){
        return all_points_in_image_range(p.pos);
    });
    
    valid_proj_pos.forEach(function(p){
        p.dist_to_center = p.pos[0]*p.pos[0] + p.pos[1]*p.pos[1];
    });

    valid_proj_pos.sort(function(x,y){
        return x.dist_to_center - y.dist_to_center;
    });

    //console.log(valid_proj_pos);

    if (valid_proj_pos.length>0){
        return valid_proj_pos[0].calib;
    }

    return null;

}

export {ImageContext, FocusImageContext};
