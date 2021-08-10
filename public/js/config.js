
class Config{

    //dataCfg = {
        //disableLabels: true,
    disablePreload = true;
    enablePointIntensity = false;
    enableRadar = true;
    enableAuxLidar = true;
    enableDynamicGroundLevel = true;

    point_size = 1;
    point_brightness = 0.6;
    box_opacity = 1;
    show_background = true;
    color_obj = "category";
    theme = "dark";


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
        this.uiCfg = this.dataCfg;
    }

    readItem(name, defaultValue){
        let ret = window.localStorage.getItem("theme");
        
        return ret? ret : defaultValue;
    }

    setItem(name, value)
    {
        this[name] = value;
        window.localStorage.setItem(name, value);
    }

    load()
    {
        this.theme = this.readItem("theme", this.theme);
    }
};

export {Config};