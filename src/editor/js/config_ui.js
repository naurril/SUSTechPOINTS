import { globalKeyDownManager } from "./keydown_manager.js";
import {logger} from "./log.js";

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

        "#cfg-show-log": (event)=>{
            logger.show();
            return true;
        },
        
        "#cfg-calib-camera-LiDAR":(event)=>{
            this.editor.calib.show();
            return true;
        },

        "#cfg-crop-scene": (event)=>{
            this.editor.cropScene.show();
            return true;
        },
        
    };

    changeableItems = {
        
        "#cfg-theme-select":(event)=>{
            let theme = event.currentTarget.value;

            //let scheme = document.documentElement.className;

            
            document.documentElement.className = "theme-"+theme;
            
            window.pointsGlobalConfig.setItem("theme", theme);
            
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


        "#cfg-hide-id-checkbox":(event)=>{
            let checked = event.currentTarget.checked;          
            this.editor.floatLabelManager.show_id(!checked);            
            return false;
        },


        
        "#cfg-hide-category-checkbox":(event)=>{
            let checked = event.currentTarget.checked;
            this.editor.floatLabelManager.show_category(!checked);
            return false;
        },

        "#cfg-hide-circle-ruler-checkbox": (event)=>{
            let checked = event.currentTarget.checked;
            this.editor.showRangeCircle(!checked);
            return false;
        },

        "#cfg-auto-rotate-xy-checkbox": (event)=>{
            let checked = event.currentTarget.checked;
            window.pointsGlobalConfig.setItem("enableAutoRotateXY", checked);
            return false;
        },

        '#cfg-auto-update-interpolated-boxes-checkbox': (event)=>{
            let checked = event.currentTarget.checked;
            window.pointsGlobalConfig.setItem("autoUpdateInterpolatedBoxes", checked);
            return false;
        },

        "#cfg-color-points-select": (event)=>{
            let value = event.currentTarget.value;
            window.pointsGlobalConfig.setItem("color_points", value);

            this.editor.data.worldList.forEach(w=>{
                w.lidar.color_points();                
                w.lidar.update_points_color();
            });
            this.editor.render();
            return false;
        },

        "#cfg-color-object-scheme":(event)=>{
            let value = event.currentTarget.value;
            this.editor.data.set_obj_color_scheme(value);
            this.editor.render();
            this.editor.imageContextManager.render_2d_image();

            this.editor.floatLabelManager.set_color_scheme(value);
            this.editor.render2dLabels(this.editor.data.world);
            this.editor.boxEditorManager.render();

            return false;
        },

        "#cfg-batch-mode-inst-number":(event)=>{
            let batchSize = parseInt(event.currentTarget.value);

            window.pointsGlobalConfig.setItem("batchModeInstNumber", batchSize);

            this.editor.boxEditorManager.setBatchSize(batchSize);
            return false;
        },

        "#cfg-coordinate-system-select": (event)=>{
            let coord = event.currentTarget.value;
            window.pointsGlobalConfig.setItem("coordinateSystem", coord);

            this.editor.data.worldList.forEach(w=>{
                w.calcTransformMatrix();
            });
            this.editor.render();
        },

        "#cfg-data-aux-lidar-checkbox": (event)=>{
            let checked = event.currentTarget.checked;

            window.pointsGlobalConfig.setItem("enableAuxLidar", checked);
            return false;
        },

        "#cfg-data-radar-checkbox": (event)=>{
            let checked = event.currentTarget.checked;

            window.pointsGlobalConfig.setItem("enableRadar", checked);
            return false;
        },

        "#cfg-data-filter-points-checkbox": (event)=>{
            let checked = event.currentTarget.checked;

            window.pointsGlobalConfig.setItem("enableFilterPoints", checked);
            return false;
        },

        "#cfg-data-filter-points-z": (event)=>{
            let z = event.currentTarget.value;

            window.pointsGlobalConfig.setItem("filterPointsZ", z);
            return false;
        },

        '#cfg-data-preload-frames':(event)=>{
            let n = event.currentTarget.value;

            window.pointsGlobalConfig.setItem("maxWorldNumber", n);
            return false;
        },

        "#cfg-data-preload-checkbox": (event)=>{
            let checked = event.currentTarget.checked;
            window.pointsGlobalConfig.setItem("enablePreload", checked);
            return false;
        }

    };

    ignoreItems = [
        "#cfg-point-size",
        "#cfg-point-brightness",
        "#cfg-theme",
        "#cfg-color-object",
        "#cfg-menu-batch-mode-inst-number",
        "#cfg-hide-box",
        "#cfg-experimental",
        "#cfg-data",
    ];

    subMenus = [
        "#cfg-experimental",
        "#cfg-data",
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
            this.hide();
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

                event.stopPropagation();
            }
        }

        for (let item in this.changeableItems)
        {
            this.menu.querySelector(item).onchange = (event)=>{
                let ret = this.changeableItems[item](event);
                if (ret)
                {
                    this.hide();
                }

                event.stopPropagation();
            }
        }

        this.ignoreItems.forEach(item=>{
            this.menu.querySelector(item).onclick = (event)=>{
                {
                    event.stopPropagation();                    
                }
            }
        });

        this.subMenus.forEach(item=>{
            this.menu.querySelector(item).onmouseenter = function(event){
                if (this.hideTimer)
                {
                    clearTimeout(this.hideTimer);
                    this.hideTimer = null;
                }

                let currentTarget = event.currentTarget;

                if (currentTarget.querySelector(item +"-submenu").style.display !== "")
                {
                    //shown now
                }
                else
                {

                    this.showTimer = setTimeout(()=>{
                        currentTarget.querySelector(item +"-submenu").style.display="inherit";
                        this.showTimer = null;
                    }, 300);
                }
            }

            this.menu.querySelector(item).onmouseleave = function(event){

                if (this.showTimer)
                {
                    clearTimeout(this.showTimer);
                    this.showTimer = null;
                }
                else
                {
                    let ui = event.currentTarget.querySelector(item +"-submenu");
                    this.hideTimer = setTimeout(()=>{
                        ui.style.display="";
                        this.hideTimer = null;
                    },
                    200);
                }
            }
        });

        this.menu.onclick = (event)=>{
            event.stopPropagation();                    
        };



        // init ui
        this.menu.querySelector("#cfg-theme-select").value = window.pointsGlobalConfig.theme;
        this.menu.querySelector("#cfg-data-aux-lidar-checkbox").checked = window.pointsGlobalConfig.enableAuxLidar;
        this.menu.querySelector("#cfg-data-radar-checkbox").checked = window.pointsGlobalConfig.enableRadar;
        this.menu.querySelector("#cfg-color-points-select").value = window.pointsGlobalConfig.color_points;
        this.menu.querySelector("#cfg-coordinate-system-select").value = window.pointsGlobalConfig.coordinateSystem;
        this.menu.querySelector("#cfg-batch-mode-inst-number").value = window.pointsGlobalConfig.batchModeInstNumber;
        this.menu.querySelector("#cfg-data-filter-points-checkbox").checked = window.pointsGlobalConfig.enableFilterPoints;
        this.menu.querySelector("#cfg-data-filter-points-z").value = window.pointsGlobalConfig.filterPointsZ;
        this.menu.querySelector("#cfg-data-preload-frames").value = window.pointsGlobalConfig.maxWorldNumber;
        this.menu.querySelector("#cfg-hide-id-checkbox").value = window.pointsGlobalConfig.hideId;
        this.menu.querySelector("#cfg-hide-category-checkbox").value = window.pointsGlobalConfig.hideCategory;
        this.menu.querySelector("#cfg-data-preload-checkbox").checked = window.pointsGlobalConfig.enablePreload;
        this.menu.querySelector("#cfg-auto-rotate-xy-checkbox").checked = window.pointsGlobalConfig.enableAutoRotateXY;
        this.menu.querySelector("#cfg-auto-update-interpolated-boxes-checkbox").checked = window.pointsGlobalConfig.autoUpdateInterpolatedBoxes;
    }


    show(target){
        this.wrapper.style.display="inherit";

        this.menu.style.right = "0px";
        this.menu.style.top = target.offsetHeight + "px";

        globalKeyDownManager.register((event)=>false, 'config');
    }

    hide(){
        globalKeyDownManager.deregister('config');
        this.wrapper.style.display="none";
    }

}


export {ConfigUi}