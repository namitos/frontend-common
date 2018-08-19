import { html, render } from '../lit-html/lib/lit-extended.js';

export function BaseComponentMixin(base = class {}) {
  return class BaseComponentMixin extends base {
    get is() {
      return 'div';
    }

    get _isWebcomponent() {
      return this instanceof HTMLElement;
    }

    get _wrapper() {
      return this._isWebcomponent ? this : this.el;
    }

    render() {
      if (this._isWebcomponent) {
        render(this.template(), this.shadowRoot);
      } else {
        if (!this.el) {
          this.el = Object.assign(document.createElement(this.is), { i: this });
        }
        render(this.template(), this.el);
        //console.log('render', this);
      }
      return this.el;
    }

    template() {
      throw new Error('no template instance');
    }


    get properties() {
      return {}
    }

    constructor(properties = {}) {
      super();
      if (this._isWebcomponent) {
        this.attachShadow({ mode: 'open' });
      }
      this._watchingProperties = {};
      Object.keys(this.properties).forEach((propName) => {
        let prop = this.properties[propName];
        //console.log(`set property ${propName}`);
        Object.defineProperty(this, propName, {
          get() {
            return this._watchingProperties[propName];
          },
          set(v) {
            //console.log(`set ${propName}: ${v}`, this._wrapper.parentNode);
            this._watchingProperties[propName] = v;
            if (prop.reflectToAttribute) {
              if (v) {
                this._wrapper.setAttribute(propName, v);
              } else {
                this._wrapper.removeAttribute(propName);
              }
            }
            if (this._wrapper.parentNode) { //пока не приаттачено в дом, незачем перерендеривать на каждое изменение проперти
              this.render();
            }
          }
        });
      });
      Object.assign(this, properties);
      this.render();
      if (properties.id) {
        this._wrapper.setAttribute('id', properties.id);
      }
    }
  }
}