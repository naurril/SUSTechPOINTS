


import {matmul2} from "./util.js"

class Calib
{
    constructor(sceneMeta, world, frameInfo)
    {
        this.world = world;
        this.data = this.world.data;
        this.sceneMeta = sceneMeta;
    }

    
    preload(on_preload_finished)
    {
        this.on_preload_finished = on_preload_finished;
        this.load();
    };

    getDefaultExtrinicCalib(sensorType, sensorName)
    {
        if (this.world.sceneMeta.calib[sensorType] && this.world.sceneMeta.calib[sensorType][sensorName])
        {
            let default_calib = this.world.sceneMeta.calib[sensorType][sensorName];

            if (default_calib.extrinsic)
                return default_calib.extrinsic;
        
            if (default_calib.lidar_to_camera)
                return default_calib.lidar_to_camera;
        }

        return null;
    }

    getExtrinsicCalib(sensorType, sensorName){
        
        let default_extrinsic = this.getDefaultExtrinicCalib(sensorType, sensorName);


        if (this.calib[sensorType] && this.calib[sensorType][sensorName])
        {
            let frame_calib = this.calib[sensorType][sensorName]

            if (frame_calib.extrinsic)
                return  frame_calib.extrinsic;

            if (frame_calib.lidar_to_camera)
                return frame_calib.lidar_to_camera;
            
            if (frame_calib.lidar_transform && default_extrinsic)
                return matmul2(default_extrinsic, frame_calib.lidar_transform, 4);
            
        }
        
        return default_extrinsic;
    }

    getIntrinsicCalib(sensorType, sensorName){
        if (this.calib[sensorType] && this.calib[sensorType][sensorName])
        {
            let frame_calib = this.calib[sensorType][sensorName]

            if (frame_calib.intrinsic)
                return  frame_calib.intrinsic;
        }
            
        if (this.world.sceneMeta.calib[sensorType] && this.world.sceneMeta.calib[sensorType][sensorName])
            return this.world.sceneMeta.calib[sensorType][sensorName].intrinsic;
        
        return null;
    }

    
    
    getCalib(sensorType, sensorName){
        
        let extrinsic = this.getExtrinsicCalib(sensorType, sensorName);
        let intrinsic = this.getIntrinsicCalib(sensorType, sensorName);

        return {extrinsic, intrinsic};
    }
    
    load(){

        var xhr = new XMLHttpRequest();
        // we defined the xhr
        var _self = this;
        xhr.onreadystatechange = function () {
            if (this.readyState != 4) return;
        
            if (this.status == 200) {
                let calib = JSON.parse(this.responseText);
                _self.calib = calib;
            }
        
            console.log(_self.world.frameInfo.frame, "calib", "loaded");
            _self.preloaded = true;

            if (_self.on_preload_finished){
                _self.on_preload_finished();
            }                
            if (_self.go_cmd_received){
                _self.go(this.webglScene, this.on_go_finished);
            }

            // end of state change: it can be after some time (async)
        };
        
        xhr.open('GET', "/load_calib"+"?scene="+this.world.frameInfo.scene+"&frame="+this.world.frameInfo.frame, true);
        xhr.send();
    };


    go_cmd_received = false;
    on_go_finished = null;

    go(webglScene, on_go_finished)
    {
        if (this.preloaded){
            if (on_go_finished)
                on_go_finished();
        } else {
            this.go_cmd_received = true;
            this.on_go_finished = on_go_finished;
        }
    };




    unload()
    {
       
    };

}


export{Calib}