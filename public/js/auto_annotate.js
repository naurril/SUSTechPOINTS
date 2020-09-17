


function autoAnnotate(world, done, alg){
    var xhr = new XMLHttpRequest();
        // we defined the xhr
    xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
    
        if (this.status == 200) {
            let anns = JSON.parse(this.responseText);
        
            // load annotations
            world.annotation.reapplyAnnotation(anns);            
                
            if (done)
                done();
        }
    };
    
    xhr.open('GET', "/auto_annotate?"+"scene="+world.frameInfo.scene+"&frame="+world.frameInfo.frame, true);

    xhr.send();
}


export {autoAnnotate}