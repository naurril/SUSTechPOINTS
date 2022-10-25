

import {World} from "./world.js";
import {Debug} from "./debug.js";
import {logger} from "./log.js"
import { jsonrpc } from "./jsonrpc.js";

class Data
{

    constructor(cfg)
    {
        this.cfg = cfg;
        
    }

    async readSceneList()
    {
        return jsonrpc("/api/get_all_scene_desc").then(ret=>{
            console.log(ret);            
            return ret;
        })
        .catch(reject=>{
            console.log("error read scene list!");
        });
    }

    init(){
        //this.sceneDescList = this.readSceneList();
    }

    // multiple world support
    // place world by a offset so they don't overlap
    dbg = new Debug();

    worldGap=1000.0;
    worldList=[];
    
    createWorldIndex = 0; // this index shall not repeat, so it increases permanently

    async getWorld(sceneName, frame, on_preload_finished){
        // find in list

        if (!this.meta[sceneName]){
            await this.readSceneMetaData(sceneName)
        }

        if (!this.meta[sceneName])
        {
            logger.log("load scene failed", sceneName);
            return null; 
        }

        let world = this.worldList.find((w)=>{
            return w.frameInfo.scene ===sceneName && w.frameInfo.frame ===frame;
        })
        if (world) // found!
            return world;

                
        world = this._createWorld(sceneName, frame, on_preload_finished);


        return world;
    };

    _createWorld(sceneName, frame, on_preload_finished){

        let [x,y,z] = this.allocateOffset();
        console.log("create world",x,y,z);
        let world = new World(this, sceneName, frame, [this.worldGap*x, this.worldGap*y, this.worldGap*z], on_preload_finished);        

        this.activateWorld(world, null, false);

        world.offsetIndex = [x,y,z];
        this.createWorldIndex++;
        this.worldList.push(world);
        
        return world;

    };

    findWorld(sceneName, frameIndex){
        let world = this.worldList.find((w)=>{
            return w.frameInfo.scene ===sceneName && w.frameInfo.frameIndex ===frameIndex;
        })
        if (world) // found!
            return world;
        else
            return null;
    };

    offsetList = [[0,1,0]];
    lastSeedOffset = [0,1,0];
    offsetsAliveCount  = 0;
    allocateOffset()
    {

        // we need to make sure the first frame loaded in a scene 
        // got to locate in [0,0,0]

        if (this.offsetsAliveCount === 0)
        {
            //reset offsets.
            this.offsetList = [[0,1,0]];
            this.lastSeedOffset = [0,1,0];
        }



        if (this.offsetList.length === 0)
        {
            let [x,y,] = this.lastSeedOffset;

            if (x ===y)
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
            
            if (x !== 0)  this.offsetList.push([-x,y,0]);
            if (y !== 0)  this.offsetList.push([x,-y,0]);
            if (x * y !== 0)  this.offsetList.push([-x,-y,0]);

            if (x !== y) {
                this.offsetList.push([y,x,0]);
            
                if (y !== 0)  this.offsetList.push([-y,x,0]);
                if (x !== 0)  this.offsetList.push([y,-x,0]);
                if (x * y !== 0)  this.offsetList.push([-y,-x,0]);
            }
        }

        let ret =  this.offsetList.pop();
        this.offsetsAliveCount++;

        return ret;
    };

    returnOffset(offset)
    {
        this.offsetList.push(offset);
        this.offsetsAliveCount--;
    };

    deleteDistantWorlds(world){
        let currentWorldIndex = world.frameInfo.frameIndex;

        let disposable = (w)=>{
            let distant = Math.abs(w.frameInfo.frameIndex - currentWorldIndex)>this.cfg.maxWorldNumber;
            //let active  = w.everythingDone;
            if (w.annotation.modified)
            {
                console.log("deleting world unsaved yet. stop.");
            }
            
            return distant ; //&& !w.active && !w.annotation.modified;
        }

        let distantWorldList = this.worldList.filter(w=>disposable(w));

        distantWorldList.forEach(w=>{
            this.returnOffset(w.offsetIndex);
            w.deleteAll();
        });

        
        this.worldList = this.worldList.filter(w=>!disposable(w));

    };

    deleteOtherWorldsExcept=function(keepScene){
        // release resources if scene changed
        this.worldList.forEach(w=>{
            if (w.frameInfo.scene !== keepScene){
                //if (!w.active)
                    this.returnOffset(w.offsetIndex);
                    w.deleteAll();

                    this.removeRefEgoPoseOfScene(w.frameInfo.scene);

            }
        })
        this.worldList = this.worldList.filter(w=>w.frameInfo.scene === keepScene);
    };
    

    refEgoPose={};
    getRefEgoPose(sceneName, currentPose)
    {
        if (this.refEgoPose[sceneName]){
            return this.refEgoPose[sceneName];
        }
        else{
            this.refEgoPose[sceneName] = currentPose;
            return currentPose;
        }
    }

    removeRefEgoPoseOfScene(sceneName)
    {
        if (this.refEgoPose[sceneName])
            delete this.refEgoPose[sceneName];
    }

    forcePreloadScene(sceneName, currentWorld){
        //this.deleteOtherWorldsExcept(sceneName);
        let meta = currentWorld.sceneMeta;

        let currentWorldIndex = currentWorld.frameInfo.frameIndex;
        let startIndex = Math.max(0, currentWorldIndex - this.cfg.maxWorldNumber/2);
        let endIndex = Math.min(meta.frames.length, startIndex + this.cfg.maxWorldNumber);

        this._doPreload(sceneName, startIndex, endIndex);       
        
        
    }

    preloadScene(sceneName, currentWorld){

        // clean other scenes.


        if (!this.cfg.enablePreload)
            return;
        
        this.forcePreloadScene(sceneName, currentWorld);
        
    };

    _doPreload(sceneName, startIndex, endIndex)
    {
        let meta = this.getMetaBySceneName(sceneName);

        
        let _need_create = (frame)=>{
            let world = this.worldList.find((w)=>{
                return w.frameInfo.scene ===sceneName && w.frameInfo.frame ===frame;
            })
            
            return !world;
        }

        let _do_create = (frame)=>{
            this._createWorld(sceneName, frame);
        };

        let pendingFrames = meta.frames.slice(startIndex, endIndex).filter(_need_create);

        pendingFrames.forEach(_do_create);

        console.log(pendingFrames.length + ' world created.')
    }


    reloadAllAnnotation=function(done){
        this.worldList.forEach(w=>w.reloadAnnotation(done));
    };

    onAnnotationUpdatedByOthers(scene, frames){
        frames.forEach(f=>{
            let world = this.worldList.find(w=>(w.frameInfo.scene === scene && w.frameInfo.frame === f));
            if (world)
                world.annotation.reloadAnnotation();
        })
    };

    webglScene = null;
    set_webglScene(scene){
            this.webglScene = scene;
    };

    scale_point_size(v){
        this.cfg.point_size *= v;
        // if (this.world){
        //     this.world.lidar.set_point_size(this.cfg.point_size);
        // }

        this.worldList.forEach(w=>{
            w.lidar.set_point_size(this.cfg.point_size);
        });
    };

    scale_point_brightness(v){
        this.cfg.point_brightness *= v;

        // if (this.world){
        //     this.world.lidar.recolorAllPoints();
        // }

        this.worldList.forEach(w=>{
            w.lidar.recolorAllPoints();
        })
    };

    set_box_opacity(opacity){
        this.cfg.box_opacity = opacity;

        this.worldList.forEach(w=>{
            w.annotation.set_box_opacity(this.cfg.box_opacity);
        });
    };

    toggle_background(){
        this.cfg.show_background = !this.cfg.show_background;

        if (this.cfg.show_background){
            this.world.lidar.cancel_highlight();
        }
        else{
            this.world.lidar.hide_background();
        }
    };

    set_obj_color_scheme(scheme){

        
        window.pointsGlobalConfig.color_obj = scheme;

        // if (window.pointsGlobalConfig.color_obj !== "no"){
        //     this.world.lidar.color_points();
        // } else {
        //     this.world.lidar.set_points_color({
        //         x: this.cfg.point_brightness,
        //         y: this.cfg.point_brightness,
        //         z: this.cfg.point_brightness,
        //     });            
        // }

        // this.world.lidar.updatePointsColor();
        // this.world.annotation.color_boxes();


        // toto: move to world
        this.worldList.forEach(w=>{
            if (window.pointsGlobalConfig.color_obj ==="no")
            {
                w.lidar.color_points();
            }
            else
            {
                w.lidar.color_objects();
            }
            
            w.lidar.updatePointsColor();

            w.annotation.color_boxes();
        })
    };

    // active_camera_name = "";

    // // return null means not changed.
    // set_active_image(name){
    //     if (name === this.active_camera_name){
    //         return null;
    //     }

    //     this.active_camera_name = name;
    //     if (this.world){
    //         this.world.cameras.activate(name);
    //     }
    //     this.worldList.forEach(w=>w.cameras.activate(name));
        
    //     return name;
    // };

    world=null;

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

    activateWorld= function(world, on_finished, show){
        if (show){
            this.world = world;

            this.deleteOtherWorldsExcept(world.frameInfo.scene);
            this.deleteDistantWorlds(world);

        }
        world.activate(this.webglScene, on_finished);        
    };


    meta = {};  //meta data

    getMetaBySceneName = (sceneName)=>{
        return this.meta[sceneName];
    };


    getCurrentWorldSceneMeta(){
        return this.getMetaBySceneName(this.world.frameInfo.scene);
    };


    readSceneMetaData(sceneName)
    {
        return jsonrpc(`/api/scenemeta?scene=${sceneName}`).then(ret=>{
            this.meta[sceneName] = ret;
            return ret;
        });
    }
};


export {Data};

