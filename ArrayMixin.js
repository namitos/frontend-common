export function ArrayMixin(base) {
  return class ArrayMixin extends base {
    groupBy(fn) {
      let obj = {};
      for (let i = 0; i < this.length; ++i) {
        let item = this[i];
        let key = fn instanceof Function ? fn(item) : item[fn];
        if (!obj[key]) {
          obj[key] = [];
        }
        obj[key].push(item);
      }
      return obj;
    }

    keyBy(fn) {
      let obj = {};
      for (let i = 0; i < this.length; ++i) {
        let item = this[i];
        let key = fn instanceof Function ? fn(item) : item[fn];
        obj[key] = item;
      }
      return obj;
    }
  }
}