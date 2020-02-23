


function on_x_auto_rotate(){
    console.log("x auto ratote");
    var box = selected_box;
    let points = data.world.get_points_of_box(box, 2.0);

    // 1. find surounding points
    var side_indices = []
    var side_points = []
    points.position.forEach(function(p, i){
        if ((p[0] > box.scale.x/2 || p[0] < -box.scale.x/2) && (p[1] < box.scale.y/2 && p[1] > -box.scale.y/2)){
            side_indices.push(points.index[i]);
            side_points.push(points.position[i]);
        }
    })


    var end_indices = []
    var end_points = []
    points.position.forEach(function(p, i){
        if ((p[0] < box.scale.x/2 && p[0] > -box.scale.x/2) && (p[1] > box.scale.y/2 || p[1] < -box.scale.y/2)){
            end_indices.push(points.index[i]);
            end_points.push(points.position[i]);
        }
    })
    

    // 2. grid by 0.3 by 0.3

    // compute slope (derivative)
    // for side part (pitch/tilt), use y,z axis
    // for end part (row), use x, z axis

    

    data.world.set_spec_points_color(side_indices, {x:1,y:0,z:0});
    data.world.set_spec_points_color(end_indices, {x:0,y:0,z:1});
    data.world.update_points_color();
    //render();

    var x = side_points.map(function(x){return x[0]});
    var y = side_points.map(function(x){return x[1]});
    var z = side_points.map(function(x){return x[2]});
    var z_mean = z.reduce(function(x,y){return x+y;}, 0)/z.length;
    var z = z.map(function(x){return x-z_mean;});
    var  theta =  Math.atan2(dotproduct(y,z), dotproduct(y,y));
    console.log(theta);

    on_x_direction_changed(theta, true);
}
