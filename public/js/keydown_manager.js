

class KeyDownManager
{

    handlerList = [];

    // return id;
    register(handler, name)
    {
        this.handlerList.push([name, handler]);
        console.log("register keydown", name);
    }

    deregister(name)
    {
        console.log("deregister keydown", name);
        this.handlerList = this.handlerList.filter(v=>v[0]!== name);
    }

    constructor()
    {
        document.addEventListener( 'keydown', (event)=>{

            for (let i = this.handlerList.length-1; i >= 0; i--)
            {
                let ret = this.handlerList[i][1](event);

                if (!ret)
                {
                    break;
                }
            }
        });
    }
   
}


var globalKeyDownManager = new KeyDownManager();

export{globalKeyDownManager};