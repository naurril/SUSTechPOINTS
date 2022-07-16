import { loadjson } from "./jsonrpc";




class EgoPose
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
        this.load_ego_pose();
    };

    
    load_ego_pose(){       
        let path = this.world.frameInfo.get_egopose_path();
        loadjson(path).then(ret=>{
            let egoPose = ret;
            this.egoPose = egoPose;

            console.log(this.world.frameInfo.frame, "egopose", "loaded");
            this.preloaded = true;

            if (this.on_preload_finished){
                this.on_preload_finished();
            }                
            if (this.go_cmd_received){
                this.go(this.webglScene, this.on_go_finished);
            }

        });
      
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


export{EgoPose}