function Debug(){
    this.res_count = 0;

    this.alloc = function(){
        this.res_count++;
    };

    this.free = function(){
        this.res_count--;
    };

    this.dump = function(){
        console.log(`number of resources: ${this.res_count}`);
    }
};

export {Debug};

