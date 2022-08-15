


import { globalObjectCategory } from "../obj_cfg";


class ObjTypeEditor{
    constructor(ui)
    {
        let obj_type_map = globalObjectCategory.obj_type_map;

        // obj type selector
        var options = "";
        for (var o in obj_type_map){
            options += '<option value="'+o+'" class="' +o+ '">'+o+ '</option>';        
        }

        ui.innerHTML = options;

        this.ui = ui;
    }

    setValue(v)
    {
        this.ui.value = v;
    }
}

export {ObjTypeEditor}