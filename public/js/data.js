

import {World} from "./world.js";

function Data(metaData){

    // multiple world support
    // place world by a offset so they don't overlap

    this.worldGap=200.0;
    this.worldList=[];
    this.MaxWorldNumber=40;
    this.createWorldIndex = 0; // this index shall not repeat, so it increases permanently
    this.getWorld = function(sceneName, frame, on_preload_finished){
        // find in list
        let world = this.worldList.find((w)=>{
            return w.frameInfo.scene == sceneName && w.frameInfo.frame == frame;
        })
        if (world) // found!
            return world;

        return this._createWorld(sceneName, frame, on_preload_finished);
    };

    this._createWorld = function(sceneName, frame, on_preload_finished){

        let world = new World(this, sceneName, frame, [this.worldGap*this.createWorldIndex, 0, 0], on_preload_finished);        
        this.createWorldIndex++;
        this.worldList.push(world);
        
        return world;

    };

    this.deleteWorldNotNear = function(world){
        let currentWorldIndex = world.frameInfo.frame_index;

        let disposable = (w)=>{
            let distant = Math.abs(w.frameInfo.frame_index - currentWorldIndex)>=this.MaxWorldNumber/2;
            let active  = w.everythingDone;
            return distant && !active;
        }

        let distantWorldList = this.worldList.filter(w=>disposable(w));

        distantWorldList.forEach(w=>w.deleteAll());
        
        this.worldList = this.worldList.filter(w=>!disposable(w));

    };

    this.deleteWorldExcept=function(keepScene){
        // release resources if scene changed
        this.worldList.forEach(w=>{
            if (w.frameInfo.scene != keepScene)
                w.deleteAll();
        })
        this.worldList = this.worldList.filter(w=>w.frameInfo.scene==keepScene);
    };
    
    this.preloadScene = function(sceneName, currentWorld){

        
        this.deleteWorldExcept(sceneName);
        this.deleteWorldNotNear(currentWorld);

        //this.deleteWorldExcept(sceneName);
        let meta = currentWorld.sceneMeta;

        let currentWorldIndex = currentWorld.frameInfo.frame_index;
        let startIndex = Math.max(0, currentWorldIndex - this.MaxWorldNumber/2);
        let endIndex = Math.min(meta.frames.length, 1 + currentWorldIndex + this.MaxWorldNumber/2);

        console.log(`preload ${startIndex}, ${endIndex}`);

        
        meta.frames.slice(startIndex, endIndex).forEach(frame=>{
            let world = this.worldList.find((w)=>{
                return w.frameInfo.scene == sceneName && w.frameInfo.frame == frame;
            })

            if (!world){
                this._createWorld(sceneName, frame);
            }
        });
        
    };

    this.reloadAllAnnotation=function(done){
        this.worldList.forEach(w=>w.reloadAnnotation(done));
    };

    this.onAnnotationUpdatedByOthers = function(scene, frames){
        frames.forEach(f=>{
            let world = this.worldList.find(w=>(w.frameInfo.scene==scene && w.frameInfo.frame==f));
            if (world)
                world.reloadAnnotation();
        })
    };

    this.saveWorldList = function(worldList){
        worldList.forEach(w=>{
            saveWorld(world, ()=>{
                e.box.changed=false;
                e.updateInfo();
            });
        });
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

        this.worldList.forEach(w=>{
            w.set_point_size(this.config.point_size);
        })
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

    this.activate_world= function(world, on_finished, dontDestroyOldWorld){

        if (dontDestroyOldWorld){
            world.activate(this.webgl_scene, null, on_finished);            
        }
        else{
            var old_world = this.world;   // current world, should we get current world later?
            this.world = world;  // swich when everything is ready. otherwise data.world is half-baked, causing mysterious problems.

            world.activate(this.webgl_scene, 
                function(){
                    if (old_world)
                        old_world.unload();
                },
                on_finished);
        }
    };


    this.meta = metaData;  //meta data

    this.getMetaBySceneName = (sceneName)=>{

        var sceneMeta = this.meta.find(function(x){
            return x.scene == sceneName;
        });

        return sceneMeta;
    };

    this.get_current_world_scene_meta = function(){
        return this.getMetaBySceneName(this.world.frameInfo.scene);
    };

};


export {Data};

