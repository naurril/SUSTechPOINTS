


function PlayControl(data){

    this.data = data;
    this.stop_play_flag=true;
    this.pause_play_flag=false;

    this.pause_resume_play=function(){
        this.pause_play_flag=!this.pause_play_flag;

        if (!this.pause_play_flag && !this.stop_play_flag){
            this.play_current_scene_with_buffer(true);
        }
    };


    this.stop_play=function(){
        this.stop_play_flag=true;
        this.pause_play_flag=false;
    };

    this.play_current_scene_with_buffer=function(resume, on_load_world_finished){
        
        if (!this.data.meta){
            console.log("no meta data! cannot play");
            return;
        }

        if (this.stop_play_flag== false && !resume){
            return;
        }

        this.stop_play_flag = false;
        this.pause_play_flag = false;

        var scene_meta = data.get_current_world_scene_meta();

        var sceneName= scene_meta.scene;
        
        this.data.reset_world_buffer();
        var scope=this;

        //var start_frame_index = scene_meta.frames.findIndex(function(x){return x == data.world.frameInfo.frame;})

        preload_frame(scene_meta, this.data.world.frameInfo.frame);
        play_frame(scene_meta, this.data.world.frameInfo.frame, on_load_world_finished);

        

        function preload_frame(meta, frame){
            //if (frame_index < scene_meta.frames.length && !stop_play_flag)
            {
                var new_world = scope.data.getWorld(meta.scene,
                    frame, 
                    function(world){
                        scope.data.put_world_into_buffer(world);  //put new world into buffer.

                        // continue next frmae
                        if (!scope.stop_play_flag && !scope.pause_play_flag){
                            var frame_index = meta.frames.findIndex(function(x){return x == frame;});
                            if (frame_index+1 < meta.frames.length){
                                preload_frame(meta, meta.frames[frame_index+1]);
                            }
                        }
                    });
                
            }
            
        };
        

        function play_frame(scene_meta, frame, on_load_world_finished){
            if (!scope.stop_play_flag && !scope.pause_play_flag)
            {
                var world = scope.data.future_world_buffer.find(function(w){return w.frameInfo.frame == frame; });

                if (world)  //found, data ready
                {
                    scope.data.activate_world(
                        world, 
                        function(){//on load finished
                            //views[0].detach_control();
                            on_load_world_finished(world);

                            next_frame();
                            
                            function next_frame(){
                                var frame_index = scene_meta.frames.findIndex(function(x){return x == frame;});
                                if (frame_index+1 < scene_meta.frames.length)
                                {
                                    var next_frame = scene_meta.frames[frame_index+1];
                                    setTimeout(
                                        function(){                    
                                            play_frame(scene_meta, next_frame, on_load_world_finished);
                                        }, 
                                        500);
                                } 
                                else{
                                    scope.stop_play_flag = true;
                                    scope.pause_play_flag = false;
                                }
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
                        100);
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