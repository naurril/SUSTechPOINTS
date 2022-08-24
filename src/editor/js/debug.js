function Debug(){
    this.res_count = 0;

    this.countMap = {};

    this.alloc = function(category){
        this.res_count++;
        
        if (!this.countMap[category])
            this.countMap[category] = 1
        else 
            this.countMap[category] ++;

        this.dump();
    };

    this.free = function(category){
        this.res_count--;
        this.countMap[category] --;
        this.dump();
    };

    this.dump = function(){
        console.log(`number of resources: ${this.res_count}`, this.countMap.toString());
    }
};

export {Debug};

