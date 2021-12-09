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
        
        "#cfg-start-calib":(event)=>{
            this.editor.calib.start_calibration();
            return true;
        },

        "#cfg-show-calib":(event)=>{
            this.editor.calib.save_calibration();
            return true;
        },

        // "#cfg-reset-calib":(event)=>{
        //     this.editor.calib.reset_calibration();
        //     return true;
        // }

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
            
            pointsGlobalConfig.setItem("theme", theme);
            
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
            pointsGlobalConfig.setItem("enableAutoRotateXY", checked);
            return false;
        },

        '#cfg-auto-update-interpolated-boxes-checkbox': (event)=>{
            let checked = event.currentTarget.checked;
            pointsGlobalConfig.setItem("autoUpdateInterpolatedBoxes", checked);
            return false;
        },

        "#cfg-color-points-select": (event)=>{
            let value = event.currentTarget.value;
            pointsGlobalConfig.setItem("color_points", value);

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

            pointsGlobalConfig.setItem("batchModeInstNumber", batchSize);

            this.editor.boxEditorManager.setBatchSize(batchSize);
            return false;
        },

        "#cfg-coordinate-system-select": (event)=>{
            let coord = event.currentTarget.value;
            pointsGlobalConfig.setItem("coordinateSystem", coord);

            this.editor.data.worldList.forEach(w=>{
                w.calcTransformMatrix();
            });
            this.editor.render();
        },

        "#cfg-data-aux-lidar-checkbox": (event)=>{
            let checked = event.currentTarget.checked;

            pointsGlobalConfig.setItem("enableAuxLidar", checked);
            return false;
        },

        "#cfg-data-radar-checkbox": (event)=>{
            let checked = event.currentTarget.checked;

            pointsGlobalConfig.setItem("enableRadar", checked);
            return false;
        },

        "#cfg-data-filter-points-checkbox": (event)=>{
            let checked = event.currentTarget.checked;

            pointsGlobalConfig.setItem("enableFilterPoints", checked);
            return false;
        },

        "#cfg-data-filter-points-z": (event)=>{
            let z = event.currentTarget.value;

            pointsGlobalConfig.setItem("filterPointsZ", z);
            return false;
        },


        "#cfg-data-preload-checkbox": (event)=>{
            let checked = event.currentTarget.checked;
            pointsGlobalConfig.setItem("enablePreload", checked);
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
        "#cfg-calib-camera-LiDAR",
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
                if (this.timerId)
                {
                    clearTimeout(this.timerId);
                    this.timerId = null;
                }
                
                event.currentTarget.querySelector(item +"-submenu").style.display="inherit";
            }

            this.menu.querySelector(item).onmouseleave = function(event){
                let ui = event.currentTarget.querySelector(item +"-submenu");
                this.timerId = setTimeout(()=>{
                    ui.style.display="none";
                    this.timerId = null;
                },
                200);
            }
        });

        this.menu.onclick = (event)=>{
            event.stopPropagation();                    
        };



        // init ui
        this.menu.querySelector("#cfg-theme-select").value = pointsGlobalConfig.theme;
        this.menu.querySelector("#cfg-data-aux-lidar-checkbox").checked = pointsGlobalConfig.enableAuxLidar;
        this.menu.querySelector("#cfg-data-radar-checkbox").checked = pointsGlobalConfig.enableRadar;
        this.menu.querySelector("#cfg-color-points-select").value = pointsGlobalConfig.color_points;
        this.menu.querySelector("#cfg-coordinate-system-select").value = pointsGlobalConfig.coordinateSystem;
        this.menu.querySelector("#cfg-batch-mode-inst-number").value = pointsGlobalConfig.batchModeInstNumber;
        this.menu.querySelector("#cfg-data-filter-points-checkbox").checked = pointsGlobalConfig.enableFilterPoints;
        this.menu.querySelector("#cfg-data-filter-points-z").value = pointsGlobalConfig.filterPointsZ;
        this.menu.querySelector("#cfg-hide-id-checkbox").value = pointsGlobalConfig.hideId;
        this.menu.querySelector("#cfg-hide-category-checkbox").value = pointsGlobalConfig.hideCategory;
        this.menu.querySelector("#cfg-data-preload-checkbox").checked = pointsGlobalConfig.enablePreload;
        this.menu.querySelector("#cfg-auto-rotate-xy-checkbox").checked = pointsGlobalConfig.enableAutoRotateXY;
        this.menu.querySelector("#cfg-auto-update-interpolated-boxes-checkbox").checked = pointsGlobalConfig.autoUpdateInterpolatedBoxes;
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