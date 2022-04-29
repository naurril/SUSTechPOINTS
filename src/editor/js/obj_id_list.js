


class ObjectIdManager
{
    maxId = 1;
    objectList = [];
    //todo: should use all worldlist
    generateNewUniqueId(world){
        this.maxId += 1;
        return this.maxId;
    }

    scene = "";
    setCurrentScene(scene, done)
    {
        if (scene != this.scene)
        {
            this.scene = scene;
            this.load_obj_ids_of_scene(scene, done);
        }
    }

    forceUpdate(done)
    {
        this.load_obj_ids_of_scene(this.scene, done);
    }

    // should just tell  editor
    // don't change html elements directly.
    setObjdIdListOptions()
    {
        let objSelOptions = this.objectList.map(function(c){
            return "<option value="+c.id+">"+String(c.id) +"-"+ c.category+"</option>";
          }).reduce(function(x,y){return x+y;},
                    "<option>--object--</option>");
        document.getElementById("object-selector").innerHTML = objSelOptions;


        let objIdsOptions = this.objectList.map(function(c){
            return "<option value="+c.id+">"+c.category+"</option>";
        }).reduce(function(x,y){return x+y;}, 
                        //"<option value='auto'></option><option value='new'></option>");
                        //"<option value='new'>suggest a new id</option>"
                        ""
                        );

        document.getElementById("obj-ids-of-scene").innerHTML = objIdsOptions;
    }

    sortObjIdList()
    {
        this.objectList = this.objectList.sort(function(x, y){
            return parseInt(x.id) - parseInt(y.id);
        });
    }

    // called when 1) new object 2) category/id modified
    addObject(obj)
    {
        if (! this.objectList.find(x=>x.id == obj.id && x.category == obj.category))
        {
            this.objectList.push(obj);      
            this.sortObjIdList();

            this.setObjdIdListOptions();

            if (obj.id > this.maxId)
            {
                this.maxId = parseInt(obj.id);
            }
        }
    }

    load_obj_ids_of_scene(scene, done){

        var xhr = new XMLHttpRequest();
        // we defined the xhr
        let self =this;

        xhr.onreadystatechange = function() {
            if (this.readyState != 4) 
                return;
        
            if (this.status == 200) {
                var ret = JSON.parse(this.responseText);

                self.objectList = ret;
                self.sortObjIdList();
                self.maxId = Math.max(...ret.map(function(x){return x.id;}));
                if (self.maxId < 0) // this is -infinity if there is no ids.
                    self.maxId = 0;

                self.setObjdIdListOptions();
    
                if (done)
                    done(ret)
            }
    
        };
        
        xhr.open('GET', "/objs_of_scene?scene="+scene, true);
        xhr.send();
    }
    

    getObjById(id)
    {
        return this.objectList.find(x=>x.id == id);
    }
}


let objIdManager = new ObjectIdManager();


export {objIdManager};