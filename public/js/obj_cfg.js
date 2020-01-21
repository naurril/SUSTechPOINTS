// size is the dimension of the object in x/y/z axis.
var obj_type_map = {
    Car:            {color: '#00ff00',  size:[1.8, 4.5, 1.5]},
    Van:            {color: '#00ff00',  size:[1.8, 4.5, 1.5]},
    Bus:            {color: '#ffff00',  size:[3, 13, 3.5]},
    Pedestrian:     {color: '#ff0000',  size:[0.5, 0.4, 1.7]},
    Rider:          {color: '#ff8800',  size:[0.6, 1.6, 1.6]},
    Cyclist:        {color: '#ff8800',  size:[0.6, 1.6, 1.6]},
    Bicycle:        {color: '#88ff00',  size:[0.6, 1.6, 1.2]},
    BicycleGroup:   {color: '#88ff00',  size:[0.6, 1.6, 1.2]},
    Motor:          {color: '#aaaa00',  size:[0.6, 1.6, 1.2]},
    Truck:          {color: '#00ffff',  size:[2.8, 10, 3]},
    Tram:           {color: '#00ffff',  size:[2.8, 10, 3]},
    Animal:         {color: '#00aaff',  size:[0.6, 1.6, 1.2]},
    Misc:           {color: '#008888',  size:[1.8, 4.5, 1.5]},
    Unknown:        {color: '#008888',  size:[1.8, 4.5, 1.5]},
}


function guess_obj_type_by_dimension(scale){

    var max_score = 0;
    var max_name = 0;
    for (var i in obj_type_map){
        var o = obj_type_map[i];
        var scorex = o.size[0]/scale.x;
        var scorey = o.size[1]/scale.y;

        if (scorex>1) scorex = 1/scorex;
        if (scorey>1) scorey = 1/scorey;

        if (scorex + scorey > max_score){
            max_score = scorex + scorey;
            max_name = i;
        }
    };


    return max_name;
}


function get_obj_cfg_by_type(name){
    if (obj_type_map[name]){
        return obj_type_map[name];
    }
    else{
        return obj_type_map["Unknown"];
    }
}

var name_array = []

function build_name_array(){
    for (var n in obj_type_map){
        name_array.push(n);
    }
}


function get_next_obj_type_name(name){

    if (name_array.length == 0)    {
        build_name_array();
    }

    var idx = name_array.findIndex(function(n){return n==name;})
    idx+=1;
    idx %= name_array.length;

    return name_array[idx];
}

export {obj_type_map, get_obj_cfg_by_type, get_next_obj_type_name, guess_obj_type_by_dimension}