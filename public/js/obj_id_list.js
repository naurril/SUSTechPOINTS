

var obj_id_list = [];
function load_obj_ids_of_scene(scene, done){

    var xhr = new XMLHttpRequest();
    // we defined the xhr
    
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) 
            return;
    
        if (this.status == 200) {
            var ret = JSON.parse(this.responseText);
            
            ret = ret.sort(function(x, y){
                return x.id - y.id;
            });

            let obj_id_option_list = ret.map(function(c){
                return "<option value="+c.id+">"+c.category+"</option>";
            }).reduce(function(x,y){return x+y;}, 
                            //"<option value='auto'></option><option value='new'></option>");
                            "<option value='new'></option>");

            obj_id_list = ret.map(function(x){return x.id;});

            document.getElementById("obj-ids-of-scene").innerHTML = obj_id_option_list;


            let objectList = ret.map(function(c){
                   return "<option value="+c.id+">"+String(c.id) +"-"+ c.category+"</option>";
                 }).reduce(function(x,y){return x+y;},
                           "<option>--object--</option>");
            document.getElementById("object-selector").innerHTML = objectList;

            if (done)
                done(ret)
        }

    };
    
    xhr.open('GET', "/objs_of_scene?scene="+scene, true);
    xhr.send();
}


function generate_new_unique_id(world){
    var id = 1;
    var objs_of_current_frame = world.annotation.boxes.map(function(b){return b.obj_track_id;});
    var allobjs = objs_of_current_frame.concat(obj_id_list);
    while (allobjs.findIndex(function(x){return x == id;}) >= 0){
        id++;
    }

    return id;
}


export {load_obj_ids_of_scene, generate_new_unique_id};