function Log(){
    this.div = document.querySelector("#output-window #textarea");

    this.handle = document.querySelector("#output-window #handle");
    this.clear = document.querySelector("#output-window #clear");

    this.handle.onclick = ()=>{
        if (this.div.style.display===""){
            this.div.style.display="none";
            this.clear.style.display="none";
        }else{
            this.div.style.display="";
            this.clear.style.display="";
        }
    };

    this.hide = function(){
        this.div.style.display="none";
        this.clear.style.display="none";
    };

    this.clear.onclick = (evnet) =>{
        event.stopPropagation();
        event.preventDefault();

        this.div.innerHTML = "";
    }

    this.println = function(str){
        console.log(str);
        let d = new Date();
        this.div.innerHTML += d.toLocaleString() + ": ";
        this.div.innerHTML += str;
        this.div.innerHTML += "<br>";

        this.div.scrollTop = this.div.scrollHeight;
    };

    this.println("Welcome.");
    this.hide();
}


var log = new Log();

export{log}