
class Config{

    //dataCfg = {
    
    //disableLabels: true,
    disablePreload = false;
    color_points = "mono";
    enableRadar = false;
    enableAuxLidar = false;
    enableDynamicGroundLevel = true;

    coordinateSystem = 'utm';

    point_size = 1;
    point_brightness = 0.6;
    box_opacity = 1;
    show_background = true;
    color_obj = "category";
    theme = "dark";

    enableFilterPoints = true;
    filterPointsZ = 1.0;

    batchModeInstNumber = 20;
    batchModeSubviewSize = {width: 130, height: 450};

    autoRotateZOnly = true;
    ///editorCfg

    //disableSceneSelector = true;
    //disableFrameSelector = true;
    //disableCameraSelector = true;
    //disableFastToolbox= true;
    //disableMainView= true;
    //disableMainImageContext = true;
    //disableGrid = true;
    //disableRangeCircle = true;
    //disableAxis = true;
    //disableMainViewKeyDown = true;
    //projectRadarToImage = true;
    //projectLidarToImage = true;   

    constructor()
    {
        
    }

    readItem(name, defaultValue, castFunc){
        let ret = window.localStorage.getItem(name);
        
        if (ret)
        {
            if (castFunc)
                return castFunc(ret);
            else
                return ret;
        }
        else
        {
            return defaultValue;
        }        
    }

    setItem(name, value)
    {
        this[name] = value;
        if (typeof value == 'object')
            value = JSON.stringify(value);
        window.localStorage.setItem(name, value);
    }

    toBool(v)
    {
        return v==="true";
    }

    saveItems = [
        ["theme", null],
        ["enableRadar", this.toBool],
        ["enableAuxLidar", this.toBool],
        ["enableFilterPoints", this.toBool],
        ["filterPointsZ", parseFloat],
        ["color_points", null],
        ["coordinateSystem", null],
        ["batchModeInstNumber", parseInt],
        ["batchModeSubviewSize", JSON.parse],
    ];

    load()
    {
        this.saveItems.forEach(item=>{
            let key = item[0];
            let castFunc = item[1];

            this[key] = this.readItem(key, this[key], castFunc);
        })
    }
};

export {Config};