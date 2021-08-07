class Config{

    constructor(button, wrapper, editor)
    {
        this.button = button;
        this.wrapper = wrapper;
        this.editor = editor;
        this.editorCfg = editor.editorCfg;
        this.dataCfg = editor.data.cfg;
        this.menu = this.wrapper.querySelector("#config-menu");
        
        this.wrapper.onclick = ()=>{
            this.wrapper.style.display = "none";
        }

        this.button.onclick = (event)=>{
            this.wrapper.style.display="inherit";

            this.menu.style.right = "0px";
            this.menu.style.top = event.currentTarget.offsetHeight + "px";
            
        }

        this.clickableItems = [
            "#cfg-increase-size",
            "#cfg-decrease-size",
            "#cfg-increase-brightness",
            "#cfg-decrease-brightness",
            "#cfg-point-size",
            "#cfg-point-brightness",
            "#cfg-light-mode",
            "#cfg-color-object",
        ];

        this.chaneableItems = [
            "#cfg-light-mode-checkbox",
            "#cfg-color-object-scheme"
        ]

        this.clickableItems.forEach(item=>{
            this.menu.querySelector(item).onclick = (event) =>
            {          
                
                let ret = this.handleContextMenuEvent(event);                        
                if (ret)
                {                            
                    this.hide();
                }
                
            }                   
        });

        this.chaneableItems.forEach(item=>{
            this.menu.querySelector(item).onchange = (event) =>
            {          
                let ret = this.handleContextMenuEvent(event);                        
                if (ret)
                {                            
                    this.hide();
                }
            }                   
        });
    }



    handleContextMenuEvent(event){

        switch(event.currentTarget.id)
        {
        case "cfg-point-size":
        case "cfg-point-brightness":
        case "cfg-light-mode":
        case "cfg-color-object":
            {
                event.stopPropagation();
                return false;
            }

        case "cfg-color-object-scheme":
            {
                let value = event.currentTarget.value;
                this.editor.data.set_obj_color_scheme(value);
                this.editor.render();

                return false;
            }
        case "cfg-light-mode-checkbox":  //onchange
            {
                let checked = event.currentTarget.checked;

                //let scheme = document.documentElement.className;

                if (checked)
                    document.documentElement.className = "theme-light"
                else
                    document.documentElement.className = "theme-dark"
                
                this.editor.viewManager.setColorScheme();
                this.editor.render();

                return false;
            }
        case "cfg-increase-size":
            this.editor.data.scale_point_size(1.2);
            this.editor.render();
            return false;
            
        case "cfg-decrease-size":
            this.editor.data.scale_point_size(0.8);
            this.editor.render();
            return false;

        

        case "cfg-increase-brightness":
            this.editor.data.scale_point_brightness(1.2);
            this.editor.render();
            return false;
            
        case "cfg-decrease-brightness":
            this.editor.data.scale_point_brightness(0.8);
            this.editor.render();
            return false;
        case "cfg-take-screenshot":
            this.editor.downloadWebglScreenShot();
            break;
        // case "cfg-light-mode-checkbox":
        //     {
        //         let checkbox =event.currentTarget;
        //         checkbox.checked = !checkbox.checked;
        //     }
        //     return false;

        // case "cfg-light-mode":
        //     {
        //         let checkbox =event.currentTarget.querySelector("#cfg-light-mode-checkbox");
        //         checkbox.checked = !checkbox.checked;
        //     }
        //     return false;
        }

        return true;
    };
}


export {Config}