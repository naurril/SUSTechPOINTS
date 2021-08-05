

import {World} from "./world.js";
import {Debug} from "./debug.js";
import {log} from "./log.js"

function Data(metaData, cfg){

    // multiple world support
    // place world by a offset so they don't overlap
    this.dbg = new Debug();
    this.cfg = cfg;
    this.worldGap=1000.0;
    this.worldList=[];
    this.MaxWorldNumber=60;
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

        let [x,y,z] = this.allocateOffset();
        console.log("create world",x,y,z);
        let world = new World(this, sceneName, frame, [this.worldGap*x, this.worldGap*y, this.worldGap*z], on_preload_finished);        
        world.offsetIndex = [x,y,z];
        this.createWorldIndex++;
        this.worldList.push(world);
        
        return world;

    };


    this.offsetList = [];
    this.lastSeedOffset = [0,0,0];
    this.allocateOffset = function()
    {

        if (this.offsetList.length == 0)
        {
            let [x,y,z] = this.lastSeedOffset;

            if (x == y)
            {  
                x = x+1;
                y = 0;
            }
            else
            {
                y = y+1;
            }

            this.lastSeedOffset = [x, y, 0];
            
            this.offsetList.push([x,y,0]);
            
            if (x != 0)  this.offsetList.push([-x,y,0]);
            if (y != 0)  this.offsetList.push([x,-y,0]);
            if (x * y != 0)  this.offsetList.push([-x,-y,0]);

            if (x != y) {
                this.offsetList.push([y,x,0]);
            
                if (y != 0)  this.offsetList.push([-y,x,0]);
                if (x != 0)  this.offsetList.push([y,-x,0]);
                if (x * y != 0)  this.offsetList.push([-y,-x,0]);
            }
        }

        let ret =  this.offsetList.pop();        
        return ret;
    };

    this.returnOffset = function(offset)
    {
        this.offsetList.push(offset);
    };

    this.deleteDistantWorlds = function(world){
        let currentWorldIndex = world.frameInfo.frame_index;

        let disposable = (w)=>{
            let distant = Math.abs(w.frameInfo.frame_index - currentWorldIndex)>this.MaxWorldNumber;
            let active  = w.everythingDone;
            if (w.annotation.modified)
            {
                console.log("deleting world not saved. stop.");
            }
            
            return distant && !active && !w.annotation.modified;
        }

        let distantWorldList = this.worldList.filter(w=>disposable(w));

        distantWorldList.forEach(w=>{
            this.returnOffset(w.offsetIndex);
            w.deleteAll();
        });

        
        this.worldList = this.worldList.filter(w=>!disposable(w));

    };

    this.deleteOtherWorldsExcept=function(keepScene){
        // release resources if scene changed
        this.worldList.forEach(w=>{
            if (w.frameInfo.scene != keepScene)
                w.deleteAll();
        })
        this.worldList = this.worldList.filter(w=>w.frameInfo.scene==keepScene);
    };
    
    this.preloadScene = function(sceneName, currentWorld){

        this.deleteOtherWorldsExcept(sceneName);
        this.deleteDistantWorlds(currentWorld);

        
        if (this.cfg.disablePreload)
            return;

        

        //this.deleteOtherWorldsExcept(sceneName);
        let meta = currentWorld.sceneMeta;

        let currentWorldIndex = currentWorld.frameInfo.frame_index;
        let startIndex = Math.max(0, currentWorldIndex - this.MaxWorldNumber/3);
        let endIndex = Math.min(meta.frames.length, 1 + currentWorldIndex + this.MaxWorldNumber/3);

        

        let numLoaded = 0;
        let _need_create = (frame)=>{
            let world = this.worldList.find((w)=>{
                return w.frameInfo.scene == sceneName && w.frameInfo.frame == frame;
            })
            
            return !world;
        }

        let _do_create = (frame)=>{
            this._createWorld(sceneName, frame);
            numLoaded++;
        };

        let pendingFrames = meta.frames.slice(startIndex, endIndex).filter(_need_create);

        log.println(`preload ${meta.scene} ${pendingFrames}`);
        // if (numLoaded > 0){
        //     meta.frames.slice(endIndex, Math.min(endIndex+5, meta.frames.length)).forEach(_do_create);
        //     meta.frames.slice(Math.max(0, startIndex-5), startIndex).forEach(_do_create);
        // }

        pendingFrames.forEach(_do_create);
        
        console.log(`${numLoaded} frames created`);
    };

    this.reloadAllAnnotation=function(done){
        this.worldList.forEach(w=>w.reloadAnnotation(done));
    };

    this.onAnnotationUpdatedByOthers = function(scene, frames){
        frames.forEach(f=>{
            let world = this.worldList.find(w=>(w.frameInfo.scene==scene && w.frameInfo.frame==f));
            if (world)
                world.annotation.reloadAnnotation();
        })
    };


    this.webglScene = null;
    this.set_webglScene=function(scene, mainScene){
            this.webglScene = scene;
            this.webglMainScene = mainScene;
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
            this.world.lidar.set_point_size(this.config.point_size);
        }

        this.worldList.forEach(w=>{
            w.lidar.set_point_size(this.config.point_size);
        })
    };

    this.scale_point_brightness = function(v){
        this.config.point_brightness *= v;

        if (this.world){
            this.world.lidar.recolor_all_points();
        }

        this.worldList.forEach(w=>{
            w.lidar.recolor_all_points();
        })
    };

    this.toggle_box_opacity = function(){
        this.config.box_opacity = 1- this.config.box_opacity;
        this.world.annotation.set_box_opacity(this.config.box_opacity);
    };

    this.toggle_background = function(){
        this.config.show_background = !this.config.show_background;

        if (this.config.show_background){
            this.world.lidar.cancel_highlight();
        }
        else{
            this.world.lidar.hide_background();
        }
    };

    this.toggle_color_obj = function(){
        this.config.color_obj = !this.config.color_obj;
        if (this.config.color_obj){
            this.world.lidar.color_points();
        } else {
            this.world.lidar.set_points_color({
                x: this.config.point_brightness,
                y: this.config.point_brightness,
                z: this.config.point_brightness,
            });            
        }

        this.world.lidar.update_points_color();
    };

    this.active_camera_name = "";

    // return null means not changed.
    this.set_active_image = function(name){
        if (name === this.active_camera_name){
            return null;
        }

        this.active_camera_name = name;
        if (this.world){
            this.world.cameras.activate(name);
        }
        this.worldList.forEach(w=>w.cameras.activate(name));
        
        return name;
    };

    this.world=null;

    // this.future_world_buffer = [];
    // this.put_world_into_buffer= function(world){
    //     this.future_world_buffer.push(world);
    // };

    // this.reset_world_buffer= function(){
    //     this.future_world_buffer=[];
    // };

    // this.activateMultiWorld=function(world, on_finished){
    //     world.activate(this.webglScene, 
    //         null,  //don't destroy old world
    //         on_finished);
    //     this.worldList.push(world);
    // };

    this.activate_world= function(world, on_finished, dontDestroyOldWorld){

        if (dontDestroyOldWorld){
            world.activate(this.webglScene, null, on_finished);            
        }
        else{
            var old_world = this.world;   // current world, should we get current world later?
            this.world = world;  // swich when everything is ready. otherwise data.world is half-baked, causing mysterious problems.

            world.activate(this.webglMainScene, 
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

