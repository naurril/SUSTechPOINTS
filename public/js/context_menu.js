

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

            let motherMenu = [
                "#cm-goto", "#cm-new", "#cm-play", "#cm-save-all"
            ];

            motherMenu.forEach(item=>{
                this.menus.world.querySelector(item).onmouseenter = (event)=>{
                    this.handler.handleContextMenuEvent(event);
                }

                this.menus.world.querySelector(item).onmouseleave = (event)=>{
                    this.handler.handleContextMenuEvent(event);
                }
            });

            
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
        let menu = this.menus[name]
        menu.style.display = "inherit";

        if (funcSetPos)
        {
            funcSetPos(menu);
        }
        else{
            menu.style.left = posX+"px";
            menu.style.top = posY+"px";
        }


        this.wrapperUi.style.display = "block";
    }


};

export {ContextMenu};
