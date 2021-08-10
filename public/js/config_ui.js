class ConfigUi{

    clickableItems = {
        "#cfg-increase-size": (event)=>{
            this.editor.data.scale_point_size(1.2);
            this.editor.render();
            this.editor.boxEditorManager.render();
            return false;
        },

        "#cfg-decrease-size": (event)=>{
            this.editor.data.scale_point_size(0.8);
            this.editor.render();
            this.editor.boxEditorManager.render();
            return false;
        },

        "#cfg-increase-brightness": (event)=>{
            this.editor.data.scale_point_brightness(1.2);
            this.editor.render();
            this.editor.boxEditorManager.render();
            return false;
        },

        "#cfg-decrease-brightness": (event)=>{
            this.editor.data.scale_point_brightness(0.8);
            this.editor.render();
            this.editor.boxEditorManager.render();
            return false;
        },

        "#cfg-take-screenshot": (event)=>{
            this.editor.downloadWebglScreenShot();
            return true;
        },
        
    };

    chaneableItems = {
        "#cfg-theme-select":(event)=>{
            let theme = event.currentTarget.value;

            //let scheme = document.documentElement.className;

            
            document.documentElement.className = "theme-"+theme;
            
            config.setItem("theme", theme);
            
            this.editor.viewManager.setColorScheme();
            this.editor.render();
            this.editor.boxEditorManager.render();

            return false;
        },

        "#cfg-hide-box-checkbox":(event)=>{
            let checked = event.currentTarget.checked;

            //let scheme = document.documentElement.className;

            if (checked)
                this.editor.data.set_box_opacity(0);
            else
                this.editor.data.set_box_opacity(1);
            
            this.editor.render();
            this.editor.boxEditorManager.render();
            

            return false;
        },

        "#cfg-color-object-scheme":(event)=>{
            let value = event.currentTarget.value;
            this.editor.data.set_obj_color_scheme(value);
            this.editor.render();
            this.editor.imageContext.render_2d_image();

            this.editor.floatLabelManager.set_color_scheme(value);
            this.editor.render2dLabels(this.editor.data.world);
            this.editor.boxEditorManager.render();

            return false;
        },

        "#cfg-batch-mode-inst-number":(event)=>{
            let batchSize = parseInt(event.currentTarget.value);
            this.editor.boxEditorManager.setBatchSize(batchSize);
            return false;
        }
    };

    ignoreItems = [
        "#cfg-point-size",
        "#cfg-point-brightness",
        "#cfg-theme",
        "#cfg-color-object",
        "#cfg-menu-batch-mode-inst-number",
        "#cfg-hide-box"
       
    ];

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
            this.show(event.currentTarget);            
        }

        for (let item in this.clickableItems)
        {
            this.menu.querySelector(item).onclick = (event)=>{
                let ret = this.clickableItems[item](event);
                if (ret)
                {
                    this.hide();
                }
            }
        }

        for (let item in this.chaneableItems)
        {
            this.menu.querySelector(item).onchange = (event)=>{
                let ret = this.chaneableItems[item](event);
                if (ret)
                {
                    this.hide();
                }
            }
        }

        this.ignoreItems.forEach(item=>{
            this.menu.querySelector(item).onclick = (event)=>{
                {
                    event.stopPropagation();                    
                }
            }
        });

        this.menu.onclick = (event)=>{
            event.stopPropagation();                    
        };



        // init ui
        this.menu.querySelector("#cfg-theme-select").value = config.theme;
    }


    show(target){
        this.wrapper.style.display="inherit";

        this.menu.style.right = "0px";
        this.menu.style.top = target.offsetHeight + "px";
    }

    hide(){
        this.wrapper.style.display="none";
    }

}


export {ConfigUi}