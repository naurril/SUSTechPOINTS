import { globalKeyDownManager } from "./keydown_manager.js";


class ContextMenu {
    constructor(ui)
    {
            this.wrapperUi = ui;

            this.menus = {
                world: ui.querySelector("#context-menu"),
                object: ui.querySelector("#object-context-menu"),
                boxEditor: ui.querySelector("#box-editor-context-menu"),
                boxEditorManager: ui.querySelector("#box-editor-manager-context-menu"),
                playSubMenu: ui.querySelector("#play-submenu"),
                gotoSubMenu: ui.querySelector("#goto-submenu"),
                fitSubMenu: ui.querySelector("#cm-fit-submenu"),
            };
            
            for (let m in this.menus){
                for (let i = 0; i < this.menus[m].children.length; i++)
                {
                    this.menus[m].children[i].onclick = (event) =>
                    {          
                        //event.preventDefault();
                        event.stopPropagation();

                        let ret = this.handler.handleContextMenuEvent(event);                        
                        if (ret)
                        {                            
                            this.hide();
                        }
                    }                   
                }
            }

            let motherMenu = {
                "#cm-goto": "#goto-submenu",
                "#cm-new": "#new-submenu",
                "#cm-play": "#play-submenu",                
                "#cm-fit": "#cm-fit-submenu",
            };

            for (let item in motherMenu)
            {
                let menu = ui.querySelector(item);
                menu.onclick = (event)=>{
                    return false;
                }

                menu.onmouseenter = (event)=>{
                    let menu = event.currentTarget.querySelector(motherMenu[item]);
                    menu.style.display="inherit";

                    let motherMenuRect = event.currentTarget.getBoundingClientRect();
                    let posX = motherMenuRect.right;
                    let posY = motherMenuRect.bottom;

                    if (this.wrapperUi.clientHeight < posY + menu.clientHeight){
                        menu.style.bottom = "0%";
                        menu.style.top = "";
                    }
                    else{
                        menu.style.top = "0%";
                        menu.style.bottom = "";
                    }
        
        
                    if (this.wrapperUi.clientWidth < posX + menu.clientWidth){
                        menu.style.right = "100%";
                        menu.style.left = "";
                    }
                    else{
                        menu.style.left = "100%";
                        menu.style.right = "";
                    }
                }

                menu.onmouseleave = (event)=>{
                    event.currentTarget.querySelector(motherMenu[item]).style.display="none";
                }
            }

            
            this.wrapperUi.onclick = function(event){
                event.currentTarget.style.display="none"; 
                event.preventDefault();
                event.stopPropagation();             
            };
    
            this.wrapperUi.oncontextmenu = function(event){
                //event.currentTarget.style.display="none"; 
                event.preventDefault();
                event.stopPropagation();
            };           
    }

    // install dynamic menu, like object new
    installMenu(name, ui, funcHandler)
    {
        this.menus[name] = ui;

        for (let i = 0; i < ui.children.length; i++){
            ui.children[i].onclick = (event) =>
            {   
                //event.preventDefault();
                event.stopPropagation();
                                    
                let ret = funcHandler(event);                        
                if (ret)
                {                            
                    this.hide();
                }
            }               
        }
    }

    hide()
    {
        this.wrapperUi.style.display = "none";
        globalKeyDownManager.deregister(this.keydownHandleId);

    }

    show(name, posX, posY, handler, funcSetPos)
    {
        this.handler = handler;

        //hide all others
        for (let m in this.menus) {
            if (m !== name)
                this.menus[m].style.display = 'none';
        }

        // show
        this.wrapperUi.style.display = "block";

        let menu = this.menus[name]
        menu.style.display = "inherit";

        if (funcSetPos)
        {
            funcSetPos(menu);
        }
        else{

            if (this.wrapperUi.clientHeight < posY + menu.clientHeight){
                menu.style.top = (this.wrapperUi.clientHeight - menu.clientHeight) + "px";
            }
            else{
                menu.style.top = posY+"px";
            }


            if (this.wrapperUi.clientWidth < posX + menu.clientWidth){
                menu.style.left = (this.wrapperUi.clientWidth - menu.clientWidth) + "px";
            }
            else{
                menu.style.left = posX+"px";
            }
            
        }


        this.keydownHandleId = globalKeyDownManager.register((event)=>{
            let ret = this.handler.handleContextMenuKeydownEvent(event);
            if (!ret)
            {
                this.hide();
            }

            return false;  // false means don't propogate
        })
        
    }


};

export {ContextMenu};
