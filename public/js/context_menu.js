

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
                        this.handler.handleContextMenuEvent(event);                        
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
            
            /*    
            this.editorUi.querySelector("#context-menu").onclick = function(enabled){
                // some items clicked
                menuWrapper.style.display = "none";
                event.preventDefault();
                event.stopPropagation();
            };
    
            this.editorUi.querySelector("#new-submenu").onclick = function(enabled){
                // some items clicked
                menuWrapper.style.display = "none";
                event.preventDefault();
                event.stopPropagation();
            };
            */
    
            // this.menus.world.querySelector("#cm-new").onclick = (event)=>{
            //     //add_bbox();
            //     //header.mark_changed_flag();
    
            //     // all submenus of `new' will forward click event to here
            //     // since they are children of `new'
            //     // so we should 
            //     event.preventDefault();
            //     event.stopPropagation();
            // };
    
            // this.menus.world.querySelector("#cm-new").onmouseenter = (event)=>{
            //     var item = this.menus.world.querySelector("#new-submenu");
            //     item.style.display="inherit";
            // };
    
            // this.menus.world.querySelector("#cm-new").onmouseleave = (event)=>{
            //     this.menus.world.querySelector("#new-submenu").style.display="none";
            //     //console.log("leave  new item");
            // };


            // this.menus.world.querySelector("#cm-play").onmouseenter = (event)=>{
            //     var item = this.menus.world.querySelector("#play-submenu");
            //     item.style.display="inherit";
            // };
    
            // this.menus.world.querySelector("#cm-play").onmouseleave = (event)=>{
            //     this.menus.world.querySelector("#play-submenu").style.display="none";
            //     //console.log("leave  new item");
            // };
    
    
            // this.menus.world.querySelector("#new-submenu").onmouseenter=(event)=>{
            //     var item = this.menus.world.querySelector("#new-submenu");
            //     item.style.display="block";
            // }
    
            // this.menus.world.querySelector("#new-submenu").onmouseleave=(event)=>{
            //     var item = this.menus.world.querySelector("#new-submenu");
            //     item.style.display="none";
            // }
    }

    show(name, posX, posY, handler)
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
        menu.style.left = posX+"px";
        menu.style.top = posY+"px";

        this.wrapperUi.style.display = "block";
    }
};

export {ContextMenu};
