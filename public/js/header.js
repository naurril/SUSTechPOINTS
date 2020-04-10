
var Header=function(ui, data, cfg, onSceneChanged, onFrameChanged, onObjectSelected, onCameraChanged){

    this.ui = ui;
    this.data =  data;
    this.cfg = cfg;
    this.boxUi = ui.querySelector("#box");
    this.refObjUi = ui.querySelector("#ref-obj");
    this.sceneSelectorUi = ui.querySelector("#scene-selector");
    this.frameSelectorUi = ui.querySelector("#frame-selector");
    this.objectSelectorUi = ui.querySelector("#object-selector");
    this.cameraSelectorUi = ui.querySelector("#camera-selector");
    this.changedMarkUi = ui.querySelector("#changed-mark");

    this.onSceneChanged = onSceneChanged;
    this.onFrameChanged = onFrameChanged;
    this.onObjectSelected = onObjectSelected;
    this.onCameraChanged = onCameraChanged;


    if (cfg.disableSceneSelector){
        this.sceneSelectorUi.style.display="none";
    }

    if (cfg.disableFrameSelector){
        this.frameSelectorUi.style.display="none";
    }

    if (cfg.disableCameraSelector){
        this.cameraSelectorUi.style.display="none";
    }

    // update scene selector ui
    var scene_selector_str = data.meta.map(function(c){
        return "<option value="+c.scene +">"+c.scene + "</option>";
    }).reduce(function(x,y){return x+y;}, "<option>--scene--</option>");

    this.ui.querySelector("#scene-selector").innerHTML = scene_selector_str;



    this.sceneSelectorUi.onchange = (e)=>{this.onSceneChanged(e);};
    this.objectSelectorUi.onchange = (e)=>{this.onObjectSelected(e);};
    this.frameSelectorUi.onchange = (e)=>{this.onFrameChanged(e);};
    this.cameraSelectorUi.onchange = (e)=>{this.onCameraChanged(e);};

    this.clear_box_info = function(){
        this.boxUi.innerHTML = '';
    };
    
    this.update_box_info = function(box){
        var scale = box.scale;
        var pos = box.getTruePosition();
        var rotation = box.rotation;
        var points_number = box.world.get_box_points_number(box);

        this.boxUi.innerHTML = "| "+pos.x.toFixed(2) +" "+pos.y.toFixed(2) + " " + pos.z.toFixed(2) + " | " +
                                                    scale.x.toFixed(2) +" "+scale.y.toFixed(2) + " " + scale.z.toFixed(2) + " | " +
                                                    (rotation.x*180/Math.PI).toFixed(2)+" "+(rotation.y*180/Math.PI).toFixed(2)+" "+(rotation.z*180/Math.PI).toFixed(2)+" | " +
                                                    points_number + " ";
    },

    this.set_ref_obj = function(marked_object){
        this.refObjUi.innerHTML="| BoxRef: "+marked_object.scene+"/"+marked_object.frame+": "+marked_object.obj_type+"-"+marked_object.obj_track_id;
    },

    this.set_frame_info =function(scene, frame, on_scene_changed){
        
        if (this.sceneSelectorUi.value != scene){
            this.sceneSelectorUi.value = scene;
            on_scene_changed(scene);
        }

        this.frameSelectorUi.value = frame;
    },

    this.clear_frame_info = function(scene, frame){

    },
    
    this.unmark_changed_flag = function(){
        this.changedMarkUi.innerText=" ";
        
    },
    
    this.mark_changed_flag = function(){
        this.changedMarkUi.innerText="*";
    }
};


export {Header}