import { HttpTransport } from './HttpTransport.js';
import { ArrayMixin } from './ArrayMixin.js';

export function initModels({ models = {}, schemas, apiHost }) {
  if (!schemas) {
    throw { name: 'InitModelsError', text: 'schemas is required' };
  }

  let crud = new HttpTransport(`${apiHost || ''}/api/crud`);

  class Collection extends ArrayMixin(Array) {}

  class _Model {
    constructor(properties = {}, options) {
      Object.assign(this, properties);
      if (options) {
        Object.keys(options).forEach((prop) => {
          Object.defineProperty(this, prop, {
            value: options[prop]
          });
        });
      }

      if (this.constructor.schema.sendOnlyUpdates) {
        let value = Object.assign({}, this);
        Object.keys(value).forEach((prop) => {
          if (value[prop] instanceof Object) {
            value[prop] = JSON.stringify(value[prop]);
          }
        })
        Object.defineProperty(this, '_initial', { value })
      }
    }

    toJSON() {
      let result = { _id: this._id };
      if (this.constructor.schema.sendOnlyUpdates) {
        Object.keys(this).forEach((prop) => {
          if (this[prop] instanceof Object) {
            if (JSON.stringify(this[prop]) !== this._initial[prop]) {
              result[prop] = this[prop];
            }
          } else {
            if (this[prop] !== this._initial[prop]) {
              result[prop] = this[prop];
            }
          }
        });
      } else {
        result = Object.assign(result, this);
      }
      return result;
    }

    static get schema() {}
  }

  models.Model = models.Model || class Model extends _Model {
    async save() {
      let r;
      if (this._id) {
        r = await crud.u(`${this.constructor.schema.name}`, this);
      } else {
        r = await crud.c(`${this.constructor.schema.name}`, this);
      }
      Object.assign(this, r);
      return this;
    }

    async 'delete' () {
      return crud.d(`${this.constructor.schema.name}/${this._id}`);
    }

    static async read(where = {}, options) {
      if (this.schema.safeDelete && !where.hasOwnProperty('deleted')) {
        where.deleted = {
          $ne: true
        };
      }
      let items = await crud.r(`${this.schema.name}`, { where, options });
      for (let i = 0; i < items.length; ++i) {
        items[i] = new this(items[i]);
      }
      return items;
    }

    static async count(where = {}) {
      let r = await crud.r(`${this.schema.name}`, { where, count: true });
      return r.itemsCount;
    }
  };

  models.Tree = models.Tree || class Tree extends models.Model {
    static async breadcrumb(id) {
      if (!id) { return [] }
      let items = await crud.r(`${this.schema.name}/breadcrumb/${id}`);
      for (let i = 0; i < items.length; ++i) {
        items[i] = new this(items[i]);
      }
      return items;
    }
  };


  models.User = models.User || class User extends models.Model {
    static get schema() {
      return schemas.User;
    }
    permission(permissionString) {
      return this.permissions.includes(permissionString) || this.permissions.includes('full access');
    }
  };

  models.Schema = models.Schema || class Schema {
    constructor(schema = {}) {
      Object.assign(this, schema);
    }

    forEach(fn, schema) {
      schema = schema || this;
      fn(schema);
      if (schema.type === 'object') {
        Object.keys(schema.properties).forEach((key) => {
          this.forEach(fn, schema.properties[key]);
        });
      } else if (schema.type === 'array') {
        this.forEach(fn, schema.items);
      }
    }

    getField(path) {
      const arr = path.split('.').reduce((prev, cur) => prev.concat(['properties', cur]), []);
      return arr.reduce((prev, cur) => prev ? prev[cur] : null, this);
    }
  }

  for (let key in schemas) {
    if (!models[key]) {
      if (schemas[key].tree) {
        models[key] = class extends models.Tree {
          static get schema() {
            return schemas[key];
          }
        }
      } else {
        models[key] = class extends models.Model {
          static get schema() {
            return schemas[key];
          }
        }
      }
    }
  }

  return models;
}