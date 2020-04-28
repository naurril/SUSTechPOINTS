function Log(){
    this.div = document.querySelector("#output-window #textarea");

    this.handle = document.querySelector("#output-window #handle");

    this.handle.onclick = (event)=>{
        if (this.div.style.display===""){
            this.div.style.display="none";
        }else{
            this.div.style.display="";
        }
    };


    this.println = function(str){
        console.log(str);
        let d = new Date();
        this.div.innerHTML += d.toLocaleString() + ": ";
        this.div.innerHTML += str;
        this.div.innerHTML += "<br>";

        this.div.scrollTop = this.div.scrollHeight;
    };

    this.println("Welcome.");
}


var log = new Log();

export{log}