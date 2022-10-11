function Debug () {
  this.res_count = 0

  this.countMap = {}

  this.alloc = function (category) {
    this.res_count++

    if (!this.countMap[category]) { this.countMap[category] = 1 } else { this.countMap[category]++ }
  }

  this.free = function (category) {
    this.res_count--
    this.countMap[category]--
  }

  this.dump = function () {
    console.log(`GL resources allocated: ${this.res_count}`, this.countMap)
  }
};

export { Debug }
