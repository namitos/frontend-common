export function BaseComponentMixin(base = class {}) {
  function deepSet(obj, path, value, create = true) {
    let properties = path;
    if (!(path instanceof Array)) {
      properties = path.split('.');
    }

    let currentObject = obj;
    let property;
    create = create === undefined ? true : create;
    while (properties.length) {
      property = properties.shift();
      if (!currentObject) {
        break;
      }
      if (!(currentObject[property] instanceof Object) && create) {
        currentObject[property] = {};
      }
      if (!properties.length) {
        currentObject[property] = value;
      }
      currentObject = currentObject[property];
    }

    return obj;
  }

  return class BaseComponentMixin extends base {
    static get is() {
      return 'div';
    }

    static get properties() {
      return {};
    }

    get _isWebcomponent() {
      return this instanceof HTMLElement;
    }

    get _wrapper() {
      return this._isWebcomponent ? this : this.el;
    }

    get _content() {
      return this._isWebcomponent ? this.shadowRoot : this.el;
    }

    template() {
      throw new Error('no template instance');
    }

    constructor(args = {}) {
      super();
      this.initialize(args);
    }

    initialize(args) {
      let { is, properties } = this.constructor;

      if (this._isWebcomponent) {
        this.attachShadow({ mode: 'open' });
      } else {
        this.el = Object.assign(document.createElement(is), { i: this });
      }
      this._watchingProperties = {};

      Object.keys(properties).forEach((propName) => {
        let prop = properties[propName];
        if (prop.hasOwnProperty('value') && !args.hasOwnProperty(propName)) {
          args[propName] = prop.value instanceof Function ? prop.value() : prop.value;
        }
        Object.defineProperty(this, propName, {
          get() {
            return this._watchingProperties[propName];
          },
          set(v) {
            if (this._watchingProperties[propName] !== v) {
              this._watchingProperties[propName] = v;
              if (prop.reflectToAttribute) {
                if (v) {
                  this._wrapper.setAttribute(propName, v);
                } else {
                  this._wrapper.removeAttribute(propName);
                }
              }
              if (prop.observer) {
                if (prop.observer instanceof Function) {
                  prop.observer.call(this);
                } else {
                  this[prop.observer]();
                }
              }
              if (!prop.noRender && this._wrapper.parentNode) {
                this.render();
              }
              if (prop.notify) {
                if (window.CustomEvent) {
                  this.emit(`${propName}-changed`, v);
                }
                if (this[`${propName}Changed`]) {
                  this[`${propName}Changed`](v);
                }
              }
            }
          }
        });
      });
      Object.keys(args).forEach((k) => {
        //to avoid race between setter fn and default values fn
        if (!this[k]) {
          this[k] = args[k];
        }
      });
      this.render();
      if (args.id) {
        this._wrapper.setAttribute('id', args.id);
      }
      //console.log(`constructor of ${is}`, this.el);
    }

    emit(type, detail) {
      this._wrapper.dispatchEvent(
        new CustomEvent(type, {
          bubbles: true,
          composed: true,
          detail
        })
      );
    }

    set(path, value) {
      deepSet(this, path, value);
    }
  };
}
