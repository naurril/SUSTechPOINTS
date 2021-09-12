// size is the dimension of the object in x/y/z axis, with unit meter.

class ObjectCategory
{


    obj_type_map = {
        Car:            {color: '#86af49',  size:[4.5, 1.8, 1.5], attr:["door open"]},
        Van:            {color: '#00ff00',  size:[4.5, 1.8, 1.5]},
        PoliceCar:      {color: '#86af49',  size:[4.5, 1.8, 1.5]},

        Pedestrian:     {color: '#ff0000',  size:[0.4, 0.5, 1.7], attr:["baby cart", "trash can", "umbrella", "sitting", "bending over", "largage"]},
        RoadWorker: {color: '#ff0000',  size:[0.4, 0.5, 1.7]},
        Child:          {color: '#ff0000',  size:[0.4, 0.5, 1.2]},
        //Crowd:          {color: '#ff0000',  size:[1.6, 0.6, 1.2]},

        Cone:           {color: '#ff0000',  size:[0.3, 0.3, 0.6]},
        FireHydrant:    {color: '#ff0000',  size:[0.4, 0.4, 0.6]},
        ReflectiveTriangle:       {color: '#ff0000',  size:[0.3, 0.4, 0.4]},
        PlatformCart:   {color: '#ff0000',  size:[1.2, 0.8, 1.0]},
        ConstructionCart: {color: '#ff0000',  size:[1.2, 0.8, 1.0]},
        RoadBarrel:     {color: '#ff0000',  size:[0.5, 0.5, 0.6]},
        TrafficBarrier: {color: '#ff0000',  size:[1.5, 0.3, 1.2]},

        ScooterRider:   {color: '#ff8800',  size:[1.6, 0.6, 1.6], attr:["umbrella", "1 passenger", "2 passengers", "3 passengers"]},
        MotorcyleRider: {color: '#ff8800',  size:[1.6, 0.6, 1.6], attr:["umbrella", "1 passenger", "2 passengers", "3 passengers"]},
        BicycleRider:   {color: '#88ff00',  size:[1.6, 0.6, 1.6], attr:["umbrella", "1 passenger", "2 passengers", "3 passengers"]},

        Bicycle:        {color: '#ff8800',  size:[1.6, 0.6, 1.2], attr:["laying down"]},
        Motorcycle:     {color: '#aaaa00',  size:[1.6, 0.6, 1.2]},
        Scooter:        {color: '#aaaa00',  size:[1.6, 0.6, 1.2]},
        
        BicycleGroup:   {color: '#ff0000',  size:[1.6, 0.6, 1.2]},
        
        Bus:            {color: '#ffff00',  size:[13, 3, 3.5]},
        Truck:          {color: '#00ffff',  size:[10., 2.8, 3]},
        ConcreteTruck:  {color: '#00ffff',  size:[10., 2.8, 3]},
        Tram:           {color: '#00ffff',  size:[10., 2.8, 3]},
        Animal:         {color: '#00aaff',  size:[1.6, 0.6, 1.2]},

        ForkLift:       {color: '#00aaff',  size:[5.0, 1.2, 2.0]},
        Trimotorcycle:  {color: '#00aaff',  size:[2.6, 1.0, 1.6]},
        Crane:          {color: '#00aaff',  size:[5.0, 1.2, 2.0]},

        Misc:           {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown:        {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown1:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown2:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown3:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown4:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown5:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
    };


    constructor(){
        this.objAttrsOptions = {};

        for (let obj in this.obj_type_map)
        {
            if (this.obj_type_map[obj].attr)
                this.objAttrsOptions[obj] = this.obj_type_map[obj].attr.reduce((a,b)=>a+`<option value="${b}">${b}</option>`, "");
        }
    }

    guess_obj_type_by_dimension(scale){

        var max_score = 0;
        var max_name = 0;
        for (var i in this.obj_type_map){
            var o = this.obj_type_map[i];
            var scorex = o.size[0]/scale.x;
            var scorey = o.size[1]/scale.y;

            if (scorex>1) scorex = 1/scorex;
            if (scorey>1) scorey = 1/scorey;

            if (scorex + scorey > max_score){
                max_score = scorex + scorey;
                max_name = i;
            }
        };

        console.log("guess type", max_name);
        return max_name;
    }

    global_color_idx = 0;
    get_color_by_id(id){
        let idx = parseInt(id);

        if (!idx)
        {
            idx = this.global_color_idx;
            this.global_color_idx += 1;
        }

        idx %= 33;
        idx = idx*19 % 33;

        return {
            x: idx*8/256.0,
            y: 1- idx*8/256.0,
            z: (idx<16)?(idx*2*8/256.0):((32-idx)*2*8/256.0),
        };
    }

    get_color_by_category(category){
        let target_color_hex = parseInt("0x"+this.get_obj_cfg_by_type(category).color.slice(1));
        
        return {
            x: (target_color_hex/256/256)/255.0,
            y: (target_color_hex/256 % 256)/255.0,
            z: (target_color_hex % 256)/255.0,
        };
    }

    get_obj_cfg_by_type(name){
        if (this.obj_type_map[name]){
            return this.obj_type_map[name];
        }
        else{
            return this.obj_type_map["Unknown"];
        }
    }

    // name_array = []

    // build_name_array(){
    //     for (var n in this.obj_type_map){
    //         name_array.push(n);
    //     }
    // }


    // get_next_obj_type_name(name){

    //     if (name_array.length == 0)    {
    //         build_name_array();
    //     }

    //     var idx = name_array.findIndex(function(n){return n==name;})
    //     idx+=1;
    //     idx %= name_array.length;

    //     return name_array[idx];
    // }

}


let globalObjectCategory = new ObjectCategory();

export {globalObjectCategory};