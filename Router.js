let PATH_REGEXP = new RegExp(['(\\\\.)', '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'].join('|'), 'g');

function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/])/g, '\\$1');
}

function parse(str) {
  let tokens = [];
  let key = 0;
  let index = 0;
  let path = '';
  let res;
  while ((res = PATH_REGEXP.exec(str)) !== null) {
    let m = res[0];
    let escaped = res[1];
    let offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;
    if (escaped) {
      path += escaped[1];
      continue;
    }
    if (path) {
      tokens.push(path);
      path = '';
    }
    let prefix = res[2];
    let name = res[3];
    let capture = res[4];
    let group = res[5];
    let suffix = res[6];
    let asterisk = res[7];
    let repeat = suffix === '+' || suffix === '*';
    let optional = suffix === '?' || suffix === '*';
    let delimiter = prefix || '/';
    let pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');
    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    });
  }
  if (index < str.length) {
    path += str.substr(index);
  }
  if (path) {
    tokens.push(path);
  }
  return tokens;
}

function flags(options) {
  return options.sensitive ? '' : 'i';
}

function escapeGroup(group) {
  return group.replace(/([=!:$/()])/g, '\\$1');
}

function tokensToRegExp(tokens, options) {
  options = options || {};
  let strict = options.strict;
  let end = options.end !== false;
  let route = '';
  let lastToken = tokens[tokens.length - 1];
  let endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (typeof token === 'string') {
      route += escapeString(token);
    } else {
      let prefix = escapeString(token.prefix);
      let capture = token.pattern;
      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*';
      }
      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?';
        } else {
          capture = '(' + capture + ')?';
        }
      } else {
        capture = prefix + '(' + capture + ')';
      }
      route += capture;
    }
  }
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
  }
  if (end) {
    route += '$';
  } else {
    route += strict && endsWithSlash ? '' : '(?=\\/|$)';
  }
  return new RegExp('^' + route, flags(options));
}

function stringToRegexp(path, keys = [], options = {}) {
  let tokens = parse(path);
  let re = tokensToRegExp(tokens, options);
  for (let i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i]);
    }
  }
  re.keys = keys;
  return re;
}

function getParents(node, memo = []) {
  let parentNode = node.parentNode;
  if (!parentNode) {
    return memo;
  } else {
    return getParents(parentNode, memo.concat([parentNode]));
  }
}

function eventPath(e) {
  let path = (e.composedPath && e.composedPath()) || e.path;
  let target = e.target;

  if (path != null) {
    // Safari doesn't include Window, and it should.
    path = path.indexOf(window) < 0 ? path.concat([window]) : path;
    return path;
  }

  if (target === window) {
    return [window];
  }
  return [target].concat(getParents(target)).concat([window]);
}

function installRouter(locationUpdatedCallback) {
  document.body.addEventListener('click', (e) => {
    try {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = eventPath(e).filter((n) => n.tagName === 'A')[0];
      if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.getAttribute('rel') === 'external') return;
      const href = anchor.href;
      if (!href || href.indexOf('mailto:') !== -1) return;
      const location = window.location;
      const origin = location.origin || location.protocol + '//' + location.host;
      if (href.indexOf(origin) !== 0) return;
      e.preventDefault();
      if (href !== location.href) {
        window.history.pushState({}, '', href);
        locationUpdatedCallback(location, e);
      }
    } catch (err) {
      console.log(err);
    }
  });
  window.addEventListener('popstate', (e) => locationUpdatedCallback(window.location, e));
  locationUpdatedCallback(window.location, null /* event */);
}

export class Router {
  constructor(routes = {}) {
    this.routes = Object.keys(routes).map((key) => {
      return {
        fn: routes[key],
        regexp: stringToRegexp(key)
      };
    });
    installRouter(() => {
      this.page(location.pathname);
    });
  }
  page(pathname) {
    document.documentElement ? (document.documentElement.scrollTop = 0) : (document.body.scrollTop = 0);
    //pathname = pathname ? pathname.substr(1) : "";
    let route = this.routes.find((route) => route.regexp.test(pathname));
    let regexp = route.regexp;
    let qsIndex = pathname.indexOf('?');
    pathname = ~qsIndex ? pathname.slice(0, qsIndex) : pathname;
    let m = regexp.exec(decodeURIComponent(pathname));
    let params = {};
    regexp.keys.map((key, i) => {
      params[key.name] = m[i + 1];
    });
    route.fn(params);
  }
}
