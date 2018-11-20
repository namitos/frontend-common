import { BaseComponentMixin } from './BaseComponentMixin.js';
import { render, html } from '../lit-html/lit-html.js';

export { html };
export class BaseComponent extends BaseComponentMixin(HTMLElement) {
  template() {
    throw { name: 'BaseComponentError', text: 'template() method required' };
  }

  render() {
    render(this.template(), this._content);
    return this;
  }

  get html() {
    return html;
  }

  connectedCallback() {
    this.render();
  }
}
