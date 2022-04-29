


function PlayControl(data){

    this.data = data;
    this.stop_play_flag=true;
    this.pause_play_flag=false;

    this.pause_resume_play=function(){
        this.pause_play_flag=!this.pause_play_flag;

        if (!this.pause_play_flag && !this.stop_play_flag){
            this.play(this.on_load_world_finished);
        }
    };


    this.stop_play=function(){
        this.stop_play_flag=true;
        this.pause_play_flag=false;
    };

    this.on_load_world_finished = null;
    this.play=function(on_load_world_finished, fps=2){
        this.on_load_world_finished = on_load_world_finished;

        if (!this.data.meta){
            console.log("no meta data! cannot play");
            return;
        }

        // if (this.stop_play_flag == false && !resume){
        //     return;
        // }

        this.stop_play_flag = false;
        this.pause_play_flag = false;

        var scene_meta = data.world.sceneMeta;
        
        var scope=this;

        

        let start_frame = data.world.frameInfo.frame;

        let current_frame_index = scene_meta.frames.findIndex(function(x){return x == data.world.frameInfo.frame;})
        if (current_frame_index == scene_meta.frames.length-1)
        {
            //this is the last frmae
            // we go to first frame.
            start_frame = scene_meta.frames[0];
        }


        play_frame(scene_meta, start_frame, on_load_world_finished);


        async function play_frame(scene_meta, frame, on_load_world_finished){
            if (!scope.stop_play_flag && !scope.pause_play_flag)
            {
                var world = await scope.data.getWorld(scene_meta.scene, frame)

                if (world.preloaded())  //found, data ready
                {
                    scope.data.activate_world(
                        world, 
                        function(){//on load finished
                            //views[0].detach_control();
                            on_load_world_finished(world);

                            // play next frame
                            let frame_index = world.frameInfo.frame_index;
                            if (frame_index+1 < scene_meta.frames.length)
                            {
                                var next_frame = scene_meta.frames[frame_index+1];
                                setTimeout(
                                    function(){                    
                                        play_frame(scene_meta, next_frame, on_load_world_finished);
                                    }, 
                                    1000/fps);
                            } 
                            else{
                                scope.stop_play();
                            }
                        
                    });
            
                }
                else{
                    //not ready.
                    console.log("wait buffer!", frame);   

                    setTimeout(
                        function(){                    
                            play_frame(scene_meta, frame, on_load_world_finished);
                        }, 
                        10);
                } 
                
                
            }
        };
    };



// function play_current_scene_without_buffer(){
    
//     if (!data.meta){
//         console.log("no meta data! cannot play");
//         return;
//     }

//     if (stop_play_flag== false){
//         return;
//     }

//     stop_play_flag = false;

//     var scene_meta = data.get_current_world_scene_meta();
//     var sceneName= scene_meta.scene;
    
//     play_frame(scene_meta, data.world.frameInfo.frame);


//     function play_frame(scene_meta, frame){
//         load_world(sceneName, frame);


//         if (!stop_play_flag)
//         {   
//             var frame_index = scene_meta.frames.findIndex(function(x){return x == frame;});
//             if (frame_index+1 < scene_meta.frames.length)
//             {
//                 next_frame = scene_meta.frames[frame_index+1];
//                 setTimeout(
//                     function(){    
//                         play_frame(scene_meta, next_frame);                       
//                     }, 
//                     100);                   
//             } 
//             else{
//                 stop_play_flag = true;
//             } 
        
//         }
//     };
// }

}


export {PlayControl};