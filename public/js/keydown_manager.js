

class KeyDownManager
{

    handlerList = [];

    // return id;
    register(handler)
    {
        this.handlerList.push(handler);
        return this.handlerList.length-1;
    }

    deregister(id)
    {
        if (id >= this.handlerList.length)
        {
            console.log("invalid id!");
            return;
        }

        this.handlerList = this.handlerList.filter((v,i)=>i!== id);
    }

    constructor()
    {
        document.addEventListener( 'keydown', (event)=>{

            for (let i = this.handlerList.length-1; i >= 0; i--)
            {
                let ret = this.handlerList[i](event);

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