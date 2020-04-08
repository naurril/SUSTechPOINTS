

import {World} from "./world.js";

function Data(metaData, enableMultiWorld){

    // multiple world support
    // place world by a offset so they don't overlap

    this.enableMultiWorld = enableMultiWorld;
    this.worldGap=200.0;
    this.createWorldIndex = 0;
    this.worldList=[];

    this.make_new_world = function(scene_name, frame, on_preload_finished){
        if (this.enableMultiWorld){
            let world = new World(this, scene_name, frame, [this.worldGap*this.createWorldIndex, 0, 0], on_preload_finished);        
            this.createWorldIndex += 1;
            return world;
        }
        else{
            return new World(this, scene_name, frame, [0, 0, 0], on_preload_finished);        
        }
    };


    this.webgl_scene = null;
    this.set_webgl_scene=function(s){
            this.webgl_scene = s;
        };

    this.config = {
        point_size: 1,
        point_brightness: 0.6,
        box_opacity: 1,
        show_background: true,
        color_obj: true,
    };

    this.scale_point_size = function(v){
        this.config.point_size *= v;
        if (this.world){
            this.world.set_point_size(this.config.point_size);
        }
    };

    this.scale_point_brightness = function(v){
        this.config.point_brightness *= v;        
    };

    this.toggle_box_opacity = function(){
        this.config.box_opacity = 1- this.config.box_opacity;
        this.world.set_box_opacity(this.config.box_opacity);
    };

    this.toggle_background = function(){
        this.config.show_background = !this.config.show_background;

        if (this.config.show_background){
            this.world.cancel_highlight();
        }
        else{
            this.world.hide_background();
        }
    };

    this.toggle_color_obj = function(){
        this.config.color_obj = !this.config.color_obj;
        if (this.config.color_obj){
            this.world.color_points();
        } else {
            this.world.set_points_color({
                x: this.config.point_brightness,
                y: this.config.point_brightness,
                z: this.config.point_brightness,
            });            
        }

        this.world.update_points_color();
    };

    this.active_image_name = "";

    // return null means not changed.
    this.set_active_image = function(name){
        if (name === this.active_image_name){
            return null;
        }

        this.active_image_name = name;
        if (this.world){
            this.world.images.activate(name);
        }
        return name;
    };

    this.world=null;

    this.future_world_buffer = [];
    this.put_world_into_buffer= function(world){
        this.future_world_buffer.push(world);
    };

    this.reset_world_buffer= function(){
        this.future_world_buffer=[];
    };

    this.activateMultiWorld=function(world, on_finished){
        world.activate(this.webgl_scene, 
            null,  //don't destroy old world
            on_finished);
        this.worldList.push(world);
    };

    this.activate_world= function(world, on_finished){

        if (this.enableMultiWorld){
            world.activate(this.webgl_scene, null, on_finished);
            this.worldList.push(world);
        }
        else{
            var old_world = this.world;   // current world, should we get current world later?
            this.world = world;  // swich when everything is ready. otherwise data.world is half-baked, causing mysterious problems.

            world.activate(this.webgl_scene, 
                function(){
                    if (old_world)
                        old_world.destroy();
                },
                on_finished);
        }
    };


    this.meta = metaData;  //meta data

    this.get_meta_by_scene_name = (scene_name)=>{

        var sceneMeta = this.meta.find(function(x){
            return x.scene == scene_name;
        });

        return sceneMeta;
    };

    this.get_current_world_scene_meta = function(){
        return this.get_meta_by_scene_name(this.world.frameInfo.scene);
    };

};


export {Data};

