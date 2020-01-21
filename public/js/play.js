
import {data} from "./data.js"
import {on_load_world_finished, scene} from "./main.js"


var stop_play_flag=true;
var pause_play_flag=false;

function pause_resume_play(){
    pause_play_flag=!pause_play_flag;

    if (!pause_play_flag && !stop_play_flag){
        play_current_scene_with_buffer(true);
    }
}


function stop_play(){
    stop_play_flag=true;
    pause_play_flag=false;
}

function play_current_scene_with_buffer(resume){
    
    if (!data.meta){
        console.log("no meta data! cannot play");
        return;
    }

    if (stop_play_flag== false && !resume){
        return;
    }

    stop_play_flag = false;
    pause_play_flag = false;

    var scene_meta = data.get_current_world_scene_meta();

    var scene_name= scene_meta.scene;
    
    data.reset_world_buffer();

    //var start_frame_index = scene_meta.frames.findIndex(function(x){return x == data.world.file_info.frame;})

    preload_frame(scene_meta, data.world.file_info.frame);
    play_frame(scene_meta, data.world.file_info.frame);


    function preload_frame(meta, frame){
        //if (frame_index < scene_meta.frames.length && !stop_play_flag)
        {
            var new_world = data.make_new_world(meta.scene,
                frame, 
                function(world){
                    data.put_world_into_buffer(world);  //put new world into buffer.

                    // continue next frmae
                    if (!stop_play_flag && !pause_play_flag){
                        var frame_index = meta.frames.findIndex(function(x){return x == frame;});
                        if (frame_index+1 < meta.frames.length){
                            preload_frame(meta, meta.frames[frame_index+1]);
                        }
                    }
                });
            
        }
        
    };
    

    function play_frame(scene_meta, frame){
        if (!stop_play_flag && !pause_play_flag)
        {
            var world = data.future_world_buffer.find(function(w){return w.file_info.frame == frame; });

            if (world)  //found, data ready
            {
                data.activate_world(scene,  //this is webgl scene
                    world, 
                    function(){//on load finished
                        //views[0].detach_control();
                        on_load_world_finished(scene_name, frame);

                        next_frame();
                        
                        function next_frame(){
                            var frame_index = scene_meta.frames.findIndex(function(x){return x == frame;});
                            if (frame_index+1 < scene_meta.frames.length)
                            {
                                var next_frame = scene_meta.frames[frame_index+1];
                                setTimeout(
                                    function(){                    
                                        play_frame(scene_meta, next_frame);
                                    }, 
                                    500);
                            } 
                            else{
                                stop_play_flag = true;
                                pause_play_flag = false;
                            }
                        }
                });
           
            }
            else{
                //not ready.
                console.log("wait buffer!", frame);   

                setTimeout(
                    function(){                    
                        play_frame(scene_meta, frame);
                    }, 
                    100);
            } 
            
            
        }
    };
}



function play_current_scene_without_buffer(){
    
    if (!data.meta){
        console.log("no meta data! cannot play");
        return;
    }

    if (stop_play_flag== false){
        return;
    }

    stop_play_flag = false;

    var scene_meta = data.get_current_world_scene_meta();
    var scene_name= scene_meta.scene;
    
    play_frame(scene_meta, data.world.file_info.frame);


    function play_frame(scene_meta, frame){
        load_world(scene_name, frame);


        if (!stop_play_flag)
        {   
            var frame_index = scene_meta.frames.findIndex(function(x){return x == frame;});
            if (frame_index+1 < scene_meta.frames.length)
            {
                next_frame = scene_meta.frames[frame_index+1];
                setTimeout(
                    function(){    
                        play_frame(scene_meta, next_frame);                       
                    }, 
                    100);                   
            } 
            else{
                stop_play_flag = true;
            } 
        
        }
    };
}


export {stop_play, pause_resume_play, play_current_scene_with_buffer};