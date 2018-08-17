export class HttpTransport {
  constructor(endpoint, params = {}) {
    this.endpoint = endpoint;
    this.params = Object.assign({
      credentials: 'include',
      headers: { "Content-type": "application/json; charset=UTF-8" }
    }, params)
  }
  async status(res) {
    if ([200, 201].includes(res.status)) {
      return res.json()
    } else {
      try {
        let r = await res.json();
        return Promise.reject(r)
      } catch (err) {
        return Promise.reject(res)
      }
    }
  }
  async c(url, data) {
    return fetch(`${this.endpoint}/${url}`, {
      credentials: this.params.credentials,
      method: 'post',
      headers: this.params.headers,
      body: JSON.stringify(data)
    }).then(this.status)
  }
  async r(url, where = {}) {
    return fetch(`${this.endpoint}/${url}?q=${encodeURIComponent(JSON.stringify(where))}`, {
      credentials: this.params.credentials,
      headers: this.params.headers
    }).then(this.status)
  }
  async u(url, data) {
    return fetch(`${this.endpoint}/${url}`, {
      credentials: this.params.credentials,
      method: 'put',
      headers: this.params.headers,
      body: JSON.stringify(data)
    }).then(this.status)
  }
  async d(url, where = {}) {
    return fetch(`${this.endpoint}/${url}?q=${encodeURIComponent(JSON.stringify(where))}`, {
      credentials: this.params.credentials,
      method: 'delete',
      headers: this.params.headers
    }).then(this.status)
  }

  async get() {
    return this.r(...arguments);
  }
  async post() {
    return this.c(...arguments);
  }
  async put() {
    return this.u(...arguments);
  }
  async 'delete' () {
    return this.d(...arguments);
  }
};