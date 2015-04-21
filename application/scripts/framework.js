(function() {
	// Globally defining the Application constructor
	Object.defineProperty(window, 'Application', { value: Application, configurable: false, enumerable: false });
	
	// Creating the "extend" registry (for registering framework extensions prior to construction)
	var extensions = [];
	window.Application.extend = function(constructor) { extensions.push(constructor); };
	
	// Defining the global injection container
	Object.defineProperty(window.Application.extend, 'register', { 
		value: new InjectionContainer(),
		configurable: false, enumerable: true
	});
	Object.freeze(window.Application);
	
	// Stuff
	var nothing = (function(v) { return v; })();
	function copy(f) { var x = {}; for (var n in f) { x[n] = f[n]; }; return x; }
	function is(v, m) {
		if (v && v.__proto__ && v.__proto__.constructor === m) { return true; }
		if (v && v.prototype && v.prototype.constructor === m) { return true; }
		if (v && v.constructor && v.constructor === m) { return true; }
		return ((typeof(v) || '').toString().toLowerCase() === (m || '').toString().trim().toLowerCase());
	}
	
	/*** Application ***/
	function Application(root) {
		var application = this;
		var container = window.Application.extend.register.clone(); 
		Object.defineProperty(this, 'root', { value: root || document, configurable: false, enumerable: true });
		
		// Application offers dependency resolution and extension integration
		Object.defineProperty(this, 'register', {value: {
			instance: function(name, value) { container.instance(name, value); },
			perApp: function(name, constructor) { container.perApp(name, constructor); },
			perScope: function(name, constructor) { container.perScope(name, constructor); },
			perResolve: function(name, constructor) { container.perResolve(name, constructor); }
		}, configurable: false, enumerable: true });
		Object.freeze(application.register);
		
		Object.defineProperty(this, 'resolve', { value: function(item, overrides) { 
			var scope = copy(overrides || {});
			scope.application = application;
			return container.resolve(item, scope); 
		}, configurable: false, enumerable: true });
		
		for (var i = 0; i < extensions.length; i++) {
			container.resolve(extensions[i], {application: application});
		}
		Object.freeze(application);
	}
	
	/*** Dependency Injection ***/
	function InjectionContainer(instances, singletons, scoped, transients) {
		var container = this;
		
		var instances = copy(instances || {});
		container.instance = function(name, value) { instances[name] = value; };
		
		var singletons = copy(singletons || {});
		container.perApp = function(name, constructor) { singletons[name] = constructor; };
		
		var scoped = copy(scoped || {});
		container.perScope = function(name, constructor) { scoped[name] = constructor; };
		
		var transients = copy(transients || {});
		container.perResolve = function(name, constructor) { transients[name] = constructor; };
		
		container.registered = function(name) { return (name in instances || name in singletons || name in scoped || name in transients); };
		function get(name) { return singletons[name] || scoped[name] || transients[name]; }
		
		// Creates a proxy constructor effectively allowing "apply" on a constructor
		function construct(ctr, values) {
			ctr = is(ctr, Array) ? ctr[ctr.length - 1] : ctr;
			function dependency(values) { ctr.apply(this, values); }
			dependency.prototype = ctr.prototype;
			return new dependency(values);
		}
		
		// If the constructor is an array will extract dependencies or call "parse" (dependencies are determined by "name")
		function params(ctr) {
			if (is(ctr, Array)) {
				var items = [];
				for (var v = 0; v < ctr.length && is(ctr[v], String); v++) {
					items.push(ctr[v].trim());
				} return items;
			} return parse(ctr);
		}
		
		// Parses dependencies from a function's signature (dependencies are determined by "name")
		function parse(ctr, items) {
			var values = (/^function[^\(]*\(([^\)]+)\)/gi).exec(ctr.toString());
			if (!values) { return []; }
			var items = values[1].split(',');
			for (var i = 0; i < items.length; i++) { items[i] = items[i].trim(); }
			return items;
		}
		
		// Resolves a registered dependency by name
		function resolveName(name, scope) {
			if (!container.registered(name)) { return nothing; }
			if (name in instances) { return instances[name]; }
			if (name in singletons) { 
				instances[name] = resolve(singletons[name], scope);
				return instances[name];
			}
			return resolve(scoped[name] || transients[name], scope);
		}
		
		// Resolves a constructor
		function resolve(ctr, scope) {
			var reqs = params(ctr);
			var values = [];
			for (var i = 0; i < reqs.length; i++) {
				var name = reqs[i];
				if (name in scope) { values.push(scope[name]); }
				else if (name in transients) { 
					values.push(resolveName(name, scope)); 
				} else {
					scope[name] = resolveName(name, scope);
					values.push(scope[name]);
				}
			}
			return construct(ctr, values);
		}
		
		container.resolve = function(item, overrides) {
			var scope = copy(overrides || {});
			if (is(item, String)) { return resolveName(item, scope); }
			else { return resolve(item, scope); }
		};
		
		container.clone = function() {
			return new InjectionContainer(instances, singletons, scoped, transients);
		}
		
		container.dispose = function() {
			if (container === window.Application.extend.register) { throw "Can't dispose global container"; }
			instances = nothing; singletons = nothing; scoped = nothing; transients = nothing;
		}
		Object.freeze(container);
	}
})()

;
// Common application utilities. "Observable" stuff is done here
(function() {
	var nothing = (function(v) { return v; })();
	
	window.Application.extend.register.perApp('utilities', ['application', function(app) {
		var utilities = this;
		utilities.nothing = nothing;
		utilities.is = function(value, type) {
			if (value && value.__proto__ && value.__proto__.constructor === type) { return true; }
			if (value && value.prototype && value.prototype.constructor === type) { return true; }
			if (value && value.constructor && value.constructor === type) { return true; }
			return ((typeof(value) || '').toString().toLowerCase() === (type || '').toString().trim().toLowerCase());
		};
		utilities.locked = function(target, member) { 
			return !(Object.getOwnPropertyDescriptor(target, member) || {configurable: true}).configurable; 
		};
		utilities.readonly = function(target, member, func) { Object.defineProperty(target, member, {
			get: func, configurable: false, enumerable: true
		});};
		utilities.constant = function(target, member, value) { Object.defineProperty(target, member, {
			value: value, configurable: false, enumerable: true
		});};
		utilities.proxy = function(target, source, member) { Object.defineProperty(target, member, {
			get: function() { return source[member]; },
			set: function(v) { source[member] = v; },
			configurable: false, enumerable: true
		});};
		utilities.override = function(target, member, func) {
			var source = target[member] || function() { };
			Object.defineProperty(target, member, { 
				value: function() { func.apply(this, arguments); source.apply(this, arguments); }, 
				configurable: false, enumerable: false 
			});
		};
		utilities.observe = function(target, member, callback) { 
			var value = target[member];
			Object.defineProperty(target, member, {
				get: function() { return value; },
				set: function(v) { value = v; callback.call(target, member); },
				configurable: false, enumerable: true
			});
		};
		utilities.path = function(source, path) { 
			var parts = (path.split('.') || []);
			while (source != nothing && parts.length) { source = source[parts.shift()]; }
			return source;
		};
		utilities.watch = function(target, path, callback) {
			var parts = (path || '').split('.'); if (!parts.length) { return function() {}; }
			var member = parts.shift(); if (!member) { return function() {}; }
			var childpath = parts.join('.');
			function watchchild(child) { return (utilities.is(child, observable)) 
				? child.watch(childpath, callback) 
				: function() {}; 
			} 
			var disposechild = watchchild(target[member]);
			var observer = function(name) { if (name === member) {
				disposechild();
				disposechild = watchchild(target[member]);
				callback.call(target, member);
			} };
			target.observe(observer);
			return function() { 
				target.unobserve(observer); disposechild(); 
			}
		};
		utilities.copy = function(obj) {
			var shallow = {};
			for (var m in obj) { shallow[m] = obj[m]; }
			return shallow;
		};
		utilities.merge = function(from, to) {
			var result = {};
			for (var m in from) { result[m] = from[m]; }
			for (var m in to) { result[m] = to[m]; }
			return result;
		};
		utilities.toarray = function(items) {
			var array = [];
			if ('length' in items) { 
				for (var i = 0; i < items.length; i++) { array.push(items[i]); }
			} else {
				for (var i = 0; i in items; i++) { array.push(items[i]); }
			}
			return array;
		};
		utilities.distinct = function(items) {
			for (var i = 0; i < items.length; i++) {
				for (var j = i + 1; j < items.length; j++) {
					if (items[i] === items[j]) {
						items.splice(j--, 1);
					}
				}
			}
		};
		utilities.domdepth = function(node, offset) {
			offset = offset || 0;
			if (!node) { return offset; };
			return utilities.domdepth(node.parentNode, offset + 1);
		};
		utilities.domsort = function(nodes) {
			nodes = utilities.toarray(nodes);
			for (var i = 0; i < nodes.length; i++) { 
				nodes[i] = {n: nodes[i], d: utilities.domdepth(nodes[i]) }; 
			}
			nodes.sort(function(a, b) { return a.d - b.d; });
			for (var i = 0; i < nodes.length; i++) {
				nodes[i] = nodes[i].n;
			}
			return nodes;
		};
		utilities.domquery = function(node, selector) {
			var nodes = [];
			if (node.matches && node.matches(selector)) { nodes.push(node); }
			var matches = node.querySelectorAll ? node.querySelectorAll(selector) : [];
			for (var i = 0; i < matches.length; i++) { nodes.push(matches[i]); }
			return utilities.domsort(nodes);
		};
		utilities.indom = function(element) {
			var searcher = (!!app.root.body && !!app.root.body.contains) ? app.root.body : app.root;
			return !searcher.contains || searcher.contains(element);
		};
		utilities.observable = function(model) { observable.convert(model); };
		utilities.surrogate = function(model, surrogate) { observable.proxy(model, surrogate); };
		Object.freeze(utilities);
		
	
		/*** Observable ***/
		function observable(model) {
			model.__proto__ = {constructor: observable}; // This object is no longer whatever it was
			var observers = [];
			utilities.override(model, 'notify', function(member) { 
				for (var i = 0; i < observers.length; i++) { observers[i](member); }
			});
			utilities.override(model, 'observe', function(callback) {
				observers.push(callback);
			});
			utilities.override(model, 'unobserve', function(callback) {
				observers = observers.filter(function(o) { return o !== callback; });
			});
			utilities.constant(model, 'path', function(path) {
				return utilities.path(model, path);
			});
			if (!utilities.locked(model, 'watch')) {
				utilities.constant(model, 'watch', function(path, callback) { 
					return utilities.watch(model, path, callback); 
				});
			}
			utilities.override(model, 'dispose', function() { observers = nothing; });
		}
		observable.convert = function(model) {
			observable(model);
			for (var member in model) {
				if (utilities.locked(model, member)) { continue; }
				utilities.observe(model, member, model.notify);
			}
			Object.freeze(model);
		};
		observable.proxy = function(model, proxy) {
			proxy = proxy || {};
			if (!utilities.is(model, observable)) { observable(proxy); }
			for (var member in model) {
				if (utilities.locked(proxy, member)) { continue; }
				utilities.proxy(proxy, model, member);
			}
			Object.freeze(proxy);
		};
	}]);
})();






















;
// Singleton service that manages global broadcasts
Application.extend.register.perApp('broadcast', function() {
	var service = this;
	var subscriptions = {};
	service.subscribe = function(key, callback) { 
		subscriptions[key] = subscriptions[key] || [];
		subscriptions[key].push(callback);
	};
	
	service.unsubscribe = function(callback) {
		for (var key in subscriptions) {
			subscriptions[key] = subscriptions[key].filter(function(c) { 
				return c !== callback; 
			});
		}
	};
	
	service.send = function(key) {
		var args = [];
		for (var i = 1; i < arguments.length; i++) { args.push(arguments[i]); }
		var callbacks = subscriptions[key] || [];
		for (var i = 0; i < callbacks.length; i++) { callbacks[i].apply(this, args); }
	};
	
	Object.freeze(service);
});

;
(function() {
	var globals = {};
	Object.defineProperty(Application.extend, 'binding', { value: 
		function(name, constructor, prescan) { globals[name] = { ctr: constructor, prescan: prescan}; },
		configurable: false, enumerable: true
	});
		
	// Application extension that tracks DOM changes and manages DOM bindings
	// TLDR: This manages/tracks data-attributes and keeps them wired to code
	Application.extend(['application', 'utilities', 'broadcast', function(app, utils, bcast) {
		// A "View" is any element with bindings on it
		View.Member = ' View '; // WTB some kind of hashing or a hash code on elements
		View.Unbound = []; // List of bindings being blocked by an "unready" ancestor
		View.Get = function(e) { return e[View.Member]; };
		View.Parent = function(e) {
			e = ('element' in e) ? e.element : e;
			while (e.parentNode && !(View.Member in e.parentNode)) { e = e.parentNode; }
			return !e.parentNode ? utils.nothing : e.parentNode[View.Member];
		};
		View.Children = function(v) {
			var element = ('element' in v) ? v.element : v;
			var candidates = utils.toarray(element.querySelectorAll('*'));
			return candidates.filter(function(c) { return c[View.Member].parent === element[View.Member]; });
		};
		View.Rescan = function() { // Go through blocked bindings and try again
			View.Unbound = View.Unbound.filter(function(v) { 
				if (!utils.indom(v.element)) { 
					View.Dispose(v);
					return false;
				} 
				v.scan(); return !v.bound; 
			});
		};
		View.Dispose = function(ref) {
			ref = ref.element || ref;
			disposal = disposal.filter(function(d) {
				if (d.element === ref) { d.dispose(); return false; }
				return true;
			});
		}
		
		// Manages all disposals that must occur when an element is removed from the DOM
		var disposal = []; 
		var bindings = utils.copy(globals);
		var root = new View(app.root);
		var observer = new DomWatcher(app.root, attach, detach, utils);
		
		function registerDisposal(element, dispose) {
			disposal.push({element: element, dispose: dispose}); 
			return true;
		}
		
		function search(element) { // Find elements with bindings
			var all = [];
			for (var binding in bindings) {
				all = all.concat(utils.domquery(element, '[' + binding + ']'));
			}
			utils.distinct(all);
			all = utils.domsort(all);
			return all;
		}
		
		function detach(nodes) { // Views will be disposed when their nodes are removed.
			for (var n = 0; n < nodes.length; n++) {
				if (!nodes[n].querySelectorAll) { continue; }
				var elements = utils.toarray(nodes[n].querySelectorAll('*')).concat(nodes[n]);
				for (var e = 0; e < elements.length; e++) {
					View.Dispose(elements[e]);
				}
			}
		}
		
		function attach(nodes) { // Handle configuring elements newly added to the DOM
			for (var n = 0; n < nodes.length; n++) {
				var node = nodes[n];
				var elements = search(node, bindings);
				for (var e = 0; e < elements.length; e++) {
					var view = View.Get(elements[e]) || new View(elements[e]);
					if (!view.bound) { View.Unbound.push(view); }
				}
			}
			View.Rescan();
		}
		root.scan();
		attach([app.root]);
		
		/*** Binding Manager ***/
		app.register.instance('binding manager', new (function() { // Injectable service
			var mgr = this;
			mgr.root = root;
			mgr.exists = function(name) { return name in bindings; };
			mgr.disposal = function(element, dispose) { registerDisposal(element, dispose); }
			mgr.rescan = function() { View.Rescan(); };
			mgr.view = function(element) { return new View(element); }
			Object.freeze(mgr);
		})());
		
		/*** View ***/
		function View(element) { // Represents a DOM node and keeps track of bindings.
			if (View.Member in element) { return; }
			var view = this;
			utils.constant(element, View.Member, view);
			
			view.application = app;
			view.element = element;
			view.root = (function(v) { while(View.Parent(v.element)) { v = View.Parent(v.element); } return v; })(view);
			
			utils.readonly(view, 'parent', function() { return View.Parent(element); });
			utils.readonly(view, 'children', function() { return View.Children(view); });
			
			var bound = false; // Will not be bound until all bindings and parent bindings are "ready"
			utils.readonly(view, 'bound', function() { return bound; });
			
			// Subscribes to a broadcast and will auto-unsubscribe when the view is disposed
			view.listen = function(channel, callback) { 
				bcast.subscribe(channel, callback);
				registerDisposal(element, function() { bcast.unsubscribe(callback); });
			}
			
			// Marks this view as "bound" which will block further bindings to this element.
			function setbound() { 
				bound = true; 
				View.Unbound = View.Unbound.filter(function(v) { return v !== view; }); 
			}
			
			// Disposes this view when the element is removed from the DOM
			registerDisposal(element, function() { 
				setbound(); element = utils.nothing; 
				view = utils.nothing; dispose = utils.nothing; 
			});
			
			// "Setting" dispose on the view will add to the disposal chain intead of replacing it
			Object.defineProperty(view, 'dispose', {
				get: function() { return; },
				set: function(d) { registerDisposal(element, d); },
				configurable: false, enumerable: true
			});
			
			// Injection scope for views is based on their ancestors
			var scope = {view: view};
			utils.readonly(view, 'scope', function() {
				return !view.parent ? utils.copy(scope) : utils.merge(view.parent.scope, scope);
			});
			
			// Scans this element and all of its child elements for bindings that need to be made
			view.scan = function() {
				if (bound) { return; } // Taken care of in a previous scan
				if (view.parent && !view.parent.bound) { return; }
				var names = {}; 
				for (b in bindings) { 
					if (element.matches && element.matches('[' + b + ']')) { 
						names[b] = bindings[b]; 
					} 
				}
				for (var b in names) { 
					if ( bindings[b].prescan && bindings[b].prescan(view) === false ) { 
						bound = false; return; 
					}
				}
				for (var b in names) {
					view.bind(app.resolve(bindings[b].ctr, view.scope));
				}
				setbound();
			};
			
			// Wires up scope and disposal for bindings. (Exposed for adding logical bindings)
			view.bind = function(binding) {
				if ('scope' in binding) {
					for (name in binding.scope) {
						if (!(name in scope)) { scope[name] = binding.scope[name]; }
					}
				}
				if ('dispose' in binding) { view.dispose = binding.dispose; }
			}
			
			Object.freeze(view);
		}
	}]);
	
	/*** DomWatcher (IE9+) ***/ 
	function DomWatcher(root, add, remove, utils) { // Responds to dom mutations
		function handler(reports) {
			var added = [];
			var removed = [];
			for (var r = 0; r < reports.length; r++) {
				pushall(added, reports[r].addedNodes);
				pushall(removed, reports[r].removedNodes);
			}
			utils.distinct(removed); remove(removed);
			utils.distinct(added); add(added);
		}
		if (!window.MutationObserver) {
			root.addEventListener('DOMNodeInserted', function(e) {
				handler([{addedNodes: [e.target]}]);
			});
			root.addEventListener('DOMNodeRemoved', function(e) {
				handler([{removedNodes: [e.target]}]);
			});
			if (('all' in document) && !('atob' in window)) { // IE9 jumpstart
				document.addEventListener('DOMContentLoaded', function() {
					handler([{addedNodes: [root]}]);
				});
			}
		} else {
			(new MutationObserver(handler)).observe(root, { childList: true, subtree: true });
		}
		function pushall(arr, from) { for (var i = 0; !!from && i < from.length; i++) { arr.push(from[i]); } }
	}
	
	/*** Compat Fixes ***/
	Element.prototype.matches = Element.prototype.matches 
								|| Element.prototype.matchesSelector
								|| function(selector) {
									if (!this || !this.parentNode || !this.parentNode.querySelectorAll) { return; };
									var matches = this.parentNode.querySelectorAll(selector);
									for (var i = 0; matches && i < matches.length; i++) { 
										if (matches[i] === this) { return true; } 
									}
									return false;
								};
})();
;
// General AJAX wrapper that provides global and session request configurations
Application.extend(['application', function(app) { // Wrapping like this will make global configuration become per-application
	var globalHeaders = {};
	var globalConfig = {};
	var globalParams = {};
	
	// Not singleton. Allows a service to configure its own common headers/parameters without affecting other services
	app.register.perResolve('http', ['html', function(html) {
		var persistHeaders = {};
		var persistConfig = {};
		var persistParams = {};
		
		this.setGlobalHeader = function(key, value) { globalHeaders[key] = value; }
		this.setGlobalConfig = function(key, value) { globalConfig[key] = value; }
		this.setGlobalParam = function(key, value) { globalParams[key] = value; }
		
		this.setHeader = function(key, value) { persistHeaders[key] = value; }
		this.setConfig = function(key, value) { persistConfig[key] = value; }
		this.setParam = function(key, value) { persistParams[key] = value; }
		
		function combine(source, persist, global) {
			var result = {};
			for (var key in source) { result[key] = source[key]; }
			for (var key in persist) { if (!(key in result)) { result[key] = persist[key]; } }
			for (var key in global) { if (!(key in result)) { result[key] = global[key]; } }
			return result;
		}
		
		function applyHeaders(headers) {
			return combine(headers, persistHeaders, globalHeaders);
		}
		
		function applyConfig(config) {
			return combine(config, persistConfig, globalConfig);
		}
		
		function applyParams(params) {
			return combine(params, persistParams, globalParams);
		}
	
		// REST methods
		this.get = function(uri, params, success, error, headers, config) {
			return send('get', html.formatUri(uri, applyParams(params)), success, error, false, applyHeaders(headers), applyConfig(config));
		};
		
		this.delete = function(uri, params, success, error, headers, config) {
			return send('delete', html.formatUri(uri, applyParams(params)), success, error, false, applyHeaders(headers), applyConfig(config));
		};
		
		this.post = function(uri, body, success, error, headers, config) {
			return send('post', uri, success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		this.patch = function(uri, body, success, error, headers, config) {
			return send('patch', uri, success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		this.put = function(uri, body, success, error, headers, config) {
			return send('put', uri, success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		Object.freeze(this);
	}]);
	
	function send(method, uri, success, error, body, headers, config) {
		body = body ? JSON.stringify(body) : false;
		error = error || function() {};
		success = success || function() {};
		config = config || {};
		headers = headers || {};
		headers['Accept'] = 'application/json';
		if (body !== false) {
			headers['Content-Type'] = 'application/json';
		}
		
		var request = new XMLHttpRequest();
		request.open(method, uri, config.async !== false, config.user, config.pass);
		
		for (var header in headers) {
			request.setRequestHeader(header, headers[header]);
		}
		if (config.mimeType) { request.overrideMimeType(config.mimeType); }
		if (config.withCredentials === true) { request.withCredentials = true; }
		if (config.timeout) { request.timeout = timeout; }
		
		request.onreadystatechange = function() {
			if (this.readyState !== 4) { return; }
			var response = pack(this);
			var data = tryparse(this.responseText);
			if (this.status < 200 || this.status >= 400) { error.call(response, data); }
			else { success.call(response, data); }
		}
		
		request.ontimeout = function() {
			error({}, pack(request, true));
		}
		
		if (body === false) { request.send(); }
		else { request.send(body); }
		
		return request.abort;
	}

	function pack(request, timeout) {
		return {
			timeout: !!timeout,
			state: request.readyState,
			response: request.response,
			responseText: request.responseText,
			responseType: request.responseType,
			status: request.status,
			statusText: request.statusText,
			getHeaders: request.getAllResponseHeaders,
		}
	}

	function tryparse(content) {
		try { return JSON.parse(content); } catch(error) { console.log(content); return { parseError: error } }
	}
}]);

;
// Common HTML related utilities available for injection
(function() {
	var parser = document.createElement('div');
	var styleblock = document.createElement('style');
	document.head.appendChild(styleblock);
	var styles = {};

	Application.extend.register.perApp('html', ['utilities', 'application', 'binding manager', function(utils, app, mgr) {
		var service = this;
		
		service.encode = function(str) {
			if (str.indexOf('"') < 0 && str.indexOf("'") < 0 && str.indexOf('<') < 0 && str.indexOf('>') < 0) { return str; }
			return (str || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		};
		
		service.parse = function(str) {
			var nodes = [];
			try { parser.innerHTML = str; } catch(error) { return false; }
			while (parser.firstChild) { nodes.push(parser.firstChild); parser.removeChild(parser.firstChild); }
			return nodes;
		};

		service.getInputValue = function(element) {
			if (element.matches('input[type=radio]') || element.matches('input[type=checkbox]')) {
				return element.checked;
			}
			if (element.matches('select')) {
				var values = [];
				for (var i = 0; i < element.options.length; i++) {
					if (element.options[i].selected) { values.push(element.options[i].value); }
				}
				return values.length > 1 ? values : values[0];
			}
			if ('value' in element) { return element.value; }
			return element.innerHTML || '';
		};
		
		service.setInputValue = function(element, value) {
			if (element.matches('input[type=radio]') || element.matches('input[type=checkbox]')) {
				element.checked = !!value;
				return;
			}
			if (element.matches('select')) {
				if (!utils.is(value, Array)) { value = [value]; }
				for (var v = 0; v < value.length; v++) {
					for (var o = 0; o < element.options.length; o++) {
						element.options[o].checked = element.options[o].value === value[v];
					}
				}
				return;
			}
			if ('value' in element) { element.value = value; return; }
			element.innerHTML = service.encode((value || '').toString());
		};
		
		service.setStyle = function(selector, style) {
			if (selector in styles) { return; }
			styles[selector] = style;
			
			var concat = '';
			for (var key in styles) {
				concat = concat + key + ' ' + styles[key] + '\r\n';
			}
			styleblock.innerHTML = concat;
		};
		
		service.removeClass = function(element, cls) {
			var value = element.getAttribute('class') || '';
			value = value.replace(new RegExp('\\b' + cls + '\\b\\s*', 'gi'), '');
			element.setAttribute('class', value.trim());
		};
		
		service.addClass = function(element, cls) {
			var value = element.getAttribute('class') || '';
			value = value.replace(new RegExp('\\b' + cls + '\\b\\s*', 'gi'), '');
			value = value + ' ' + cls;
			element.setAttribute('class', value.trim());
		};
		
		service.indom = function(element) {
			return utils.indom(element);
		}
		
		service.formatParameters = function(obj) {
			if (typeof(obj) === 'string') { return obj; }
			var params = [];
			for (var name in obj) {
				var value = (obj[name] === utils.nothing ? '' : obj[name]).toString();
				params.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
			}
			return params.join('&');
		}
		
		service.formatUri = function(uri, params) {
			if (!params) { return uri; }
			if (!utils.is(params, 'string')) { params = service.formatParameters(params); }
			params = params.replace(/^[&?]+/g, '');
			return uri.indexOf('?') >= 0
				? uri + '&' + params
				: uri + '?' + params;
		}
		
		service.parseQuery = function(params) {
			var result = {};
			var items = (params || '').replace(/^\?+|^\&+|\&+$/g, '').split('&');
			for (var i = 0; i < items.length; i++) {
				var parts = items[i].split('=');
				if (parts.length !== 2) { continue; }
				var key = decodeURIComponent(parts[0] || '');
				var value = decodeURIComponent(parts[1] || '');
				if (!key || !value) { continue; }
				if (typeof(result[key]) === 'string') { result[key] = [result[key], value]; }				
				else if (key in result) { result[key].push(value); }
				else { result[key] = value; }
			}
			return result;
		}
		
		Object.freeze(service);
	}]);
})();

;
// Route Service manages and syncs application hash navigations and state.
Application.extend.register.perApp('route', ['utilities', 'html', 'broadcast', function(utils, html, bcast) {
	var service = this;
	service.channel = 'Route.Updated';
	
	service.parse = function(uri) {
		uri = (uri || '').replace(/^#+/g, '');
		var parts = uri.split('?');
		var uri = (parts[0] || '').toLowerCase();
		var params = parts[1] || '';
		var data = html.parseQuery(parts[1] || '');
		var info = {uri: uri, params: params, data: data};
		Object.freeze(info);
		return info;
	}
	
	utils.readonly(service, 'current', function() { return service.parse(window.location.hash); });
	var previous = service.current;
	
	var views = {};
	utils.readonly(service, 'routes', function() { return utils.copy(views); });
	service.register = function(uri, view) {
		views[service.parse(uri).uri] = view;
	};
	
	var general = [];
	var subscriptions = {};
	service.subscribe = function(subscription, uri) { 
		if (uri === utils.nothing) { general.push(subscription); return; }
		subscriptions[uri] = subscription[uri] || [];
		subscriptions[uri].push(subscription);
	};
	service.unsubscribe = function(subscription) {
		for (var name in subscriptions) {
			subscriptions[name] = subscriptions[name]
			.filter(function(s) { return s !== subscription; });
		}
		general = general.filter(function(s) { return s !== subscription; });
	};
	
	service.navigate = function(uri, params) {
		if (window.history && window.history.pushState) {
			window.history.pushState(null, null, '#' + html.formatUri(uri, params));
			onstate();
		} else {
			window.location.hash = html.formatUri(uri, params);
		}
	}
	
	function onstate() {
		var prev = previous;
		previous = service.current;
		var curr = service.current;
		var handlers = subscriptions[curr.uri] || [];
		for (var i = 0; i < 2; i++) {
			for (var h = 0; h < handlers.length; h++) {
				handlers[h](curr, prev);
			}
			handlers = general;
		}
		bcast.send(service.channel, curr);
	}
	
	if (window.onpopstate) { window.onpopstate = onstate; }
	else { window.addEventListener('hashchange', onstate); }
	
	Object.freeze(service);
}]);







































;
// Responds to routing changes and loads content into the element.
Application.extend.binding('data-routed', ['view', 'route', function(view, route) {
	var update = function(current, previous) {
		if (previous && current.uri === previous.uri) { return; } // only trigger on path changes
		var uri = route.routes[current.uri];
		if (!uri) { view.element.innerHTML = ''; return; }
		var request = new XMLHttpRequest();
		request.open('get', uri, true);
		request.onreadystatechange = function() {
			if (this.readyState !== 4) { return; }
			if (this.status < 200 || this.status >= 400) { 
				view.element.innerHTML = ''; 
			}
			else { 
				view.element.innerHTML = this.responseText; 
			}
		}
		request.send();
	};
	route.subscribe(update);
	update(route.current);
}]);
;
// Turns this element into a template that is bound to the specified value on the ViewModel
Application.extend.binding('data-template', [function() {
	throw 'templates cannot be instantiated';
}], function(view) { 
	var html = view.application.resolve('html');
	var utils = view.application.resolve('utilities');
	var bmgr = view.application.resolve('binding manager');
	var vmgr = view.application.resolve('viewmodel manager');
	var viewmodel = vmgr.get(view);
	
	var element = view.element; // Reconfigure the element attributes to have a view-model and not a data-template
	var path = element.getAttribute('data-template');
	element.removeAttribute('data-template');
	element.setAttribute('view-model', '');
	
	var template = element.outerHTML; // Turn the template into a string
	var marker = document.createComment('Template Content');
	element.parentNode.insertBefore(marker, element);
	element.parentNode.removeChild(element);
	
	function create(model, insert) { // Applies the model to the template and inserts a new copy at "insert"
		var e = html.parse(template)[0];
		var v = bmgr.view(e);
		var vm = vmgr.surrogate(v, model);
		v.bind({scope: {viewmodel: vm}});
		marker.parentNode.insertBefore(e, insert || marker);
		return { model: model, view: v };
	}

	var templateItems = [];
	var update = function() { // Keeps the view synced with the item(s) watched on the viewmodel
		var value = viewmodel.path(path);
		if (!utils.is(value, Array)) { value = [value]; }
		
		var i = 0; do {
			while (i < templateItems.length && templateItems[i].model !== value[i]) {
				var e = templateItems.splice(i, 1)[0].view.element;
				e.parentNode.removeChild(e);
			}
			if (i >= templateItems.length && i < value.length) { 
				templateItems.push(create(value[i])); 
			}
		} while (++i < value.length);
	}
	// Sets a watch on the "path" on the view model
	viewmodel.watch(path, update);
	update();
	
	return false;
});
;
// Blocks other bindings on this element and replaces this element with the view at the specified URI
Application.extend.binding('data-view', ['html', function(html) {
	throw 'view cannot be instantiated';
}], function(view) {
	var html = view.application.resolve('html');
	var element = view.element;
	var url = element.getAttribute('data-view');
	var utils = view.application.resolve('utilities');
		
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (this.readyState !== 4) { return; }

		if (!html.indom(element)) { return; }
		var marker = document.createComment('view: ' + url);
		element.parentNode.insertBefore(marker, element);
		element.parentNode.removeChild(element);
		var elements = html.parse(this.responseText);
		if (!elements) { return; }
		for (var i = 0; i < elements.length; i++) { marker.parentNode.insertBefore(elements[i], marker); }
	}
	request.open('get', url);
	request.send();
	return false;
});

;
// Extends the application to support ViewModels
(function() {
	// Adds a registration extension to the Application constructor for pre-registration
	var globals = {};
	Object.defineProperty(Application.extend, 'viewmodel', { value: 
		function(name, constructor) { globals[name] = constructor; },
		configurable: false, enumerable: true
	});
	
	var bindingName = 'view-model';
	// The "view-model" binding
	Application.extend.binding(bindingName, ['viewmodel manager', 'view', function(mgr, view) {
		// This will construct the view model and add it to the current binding scope (can be injected by asking for "viewmodel")
		if (mgr.bound(view.element)) { return true; }
		var name = view.element.getAttribute(bindingName);
		if (!mgr.exists(name)) { throw 'viewmodel did not exist at time of construction'; }
		var vm = mgr.create(view, name);
		this.scope = {viewmodel: vm};
	}], function(view) {
		// This will block the current element and its descendants from completing the binding process until this view-model and its parent view models are ready
		var mgr = view.application.resolve('viewmodel manager');
		if (!mgr) { return false; }
		if (mgr.bound(view.element)) { return true; }
		var name = view.element.getAttribute(bindingName);
		if (!mgr.exists(name)) { return false; }
		return mgr.ready(view);
	});
	
	// Adds the ".viewmodel" extension to the application to be used after the application has been constructed
	// Adds the "viewmodel manager" which manages constructing and converting viewmodels
	Application.extend(['utilities', 'application', 'binding manager', function(utils, app, bmgr) {
		var viewmodels = utils.copy(globals);
		app.viewmodel = function(name, constructor) { 
			if (name in viewmodels) { return; }
			viewmodels[name] = constructor;
			bmgr.rescan();
		};
		
		/*** ViewModel ***/
		function viewmodel(view, model) {
			view.element[viewmodel.Member] = model;
			model.view = view;
			utils.readonly(model, 'parent', function() { return viewmodel.Parent(model); });
			utils.readonly(model, 'children', function() { return viewmodel.Children(model); });
			
			var disposals = []; // disposals should always remove themselves from this array
			utils.constant(model, 'watch', function(path, callback) {
				var disposal = utils.watch(model, path, callback);
				var wrap = function() {
					disposals = disposals.filter(function(d) { return d !== wrap; });
					disposal();
				};
				disposals.push(wrap);
				return wrap;
			});
			view.dispose = function() { 
				while (disposals.length) { disposals[0](); } 
			};
		}
		viewmodel.convert = function(view, model) {
			viewmodel(view, model);
			utils.observable(model);
			return model;
		};
		viewmodel.surrogate = function(view, model) {
			var surrogate = {};
			viewmodel(view, surrogate)
			utils.surrogate(model, surrogate);
			return surrogate;
		};
		viewmodel.Member = ' ViewModel ';
		viewmodel.Get = function(r) { 
			r = r || {}; r = r.view || r; r = r.element || r;
			return r[viewmodel.Member];
		};
		viewmodel.Parent = function(r) { 
			r = r || {}; r = r.view || r; r = r.element || r;
			if (r === app.root) { return false; }
			while (r.parentNode && r.parentNode !== app.root && !(viewmodel.Member in r.parentNode)) { r = r.parentNode; }
			return viewmodel.Get(r.parentNode);
		};
		viewmodel.Children = function(r) {
			r = r.view || r; r = r.element || r;
			var candidates = utils.toarray(r.querySelectorAll('*'));
			return candidates.filter(function(c) {
				if (!(viewmodel.Member in c)) { return false; }
				return c[viewmodel.Member].parent === r[viewmodel.Member];
			});
		};	
		viewmodel.Ready = function(r) {
			r = r || {}; r = r.view || r; r = r.element || r;
			if (r === app.root) return true;
			while (r.parentNode && r.parentNode !== app.root && r.parentNode.matches && !r.parentNode.matches('[' + bindingName + ']')) { 
				r = r.parentNode; 
			}
			return r.parentNode === app.root || (viewmodel.Member in r.parentNode);
		};
		
		/*** ViewModel Manager ***/
		var vmmgr = new (function() {
			var instance = this;
			instance.exists = function(name) { return name in viewmodels; };
			instance.ready = function(view) { return viewmodel.Ready(view.element); }
			function resolvevm(view, name) {
				if (viewmodel.Member in view.element) { return false; }
				if (!viewmodel.Ready(view)) { return false; }
				return app.resolve(viewmodels[name], view.scope);
			}
			instance.create = function(view, name) {
				var model = resolvevm(view, name);
				if (!model) { return false; }
				viewmodel.convert(view, model);
				return model;
			};
			instance.surrogate = function(view, model) {
				var surrogate = viewmodel.surrogate(view, model);
				return surrogate;
			};
			instance.get = function(ref) {
				return viewmodel.Get(ref) || viewmodel.Parent(ref);
			};
			instance.bound = function(element) { return viewmodel.Member in element; }
			Object.freeze(instance);
		})()
		app.register.instance('viewmodel manager', vmmgr);
	}]);
})();
;
// Binds the innerTEXT of this element to the multi-value formatted text specified
// use double-curly-brackets: "My value is {{member.something.value}}"
Application.extend.binding('data-format', ['view', 'viewmodel', 'utilities', 'html', function(view, viewmodel, utilities, html) {
	var format = view.element.getAttribute('data-format') || '';
	var members = format.match(/\{\{[^\}]+\}\}/g);
	if (!members) { return; }
	
	function trim(member) { return member.replace(/^\{\{|\}\}$/g, ''); }
	function callback() {
		var phrase = format;
		for (var i = 0; i < members.length; i++) {
			var member = members[i];
			var value = viewmodel.path(trim(member));
			value = value === utilities.nothing ? '' : value;
			while (phrase.indexOf(member) >= 0) { phrase = phrase.replace(member, value); }
		}
		if (value in view.element) { view.element.value = phrase; }
		else { view.element.innerHTML = html.encode(phrase); }
	}

	for (var m = 0; m < members.length; m++) {
		viewmodel.watch(trim(members[m]), callback);
	}
	callback();
}]);

;
// Binds an input's value to the ViewModel
Application.extend.binding('data-bind', ['view', 'viewmodel', 'utilities', 'html', function(view, viewmodel, utilities, html) {
	var uri = view.element.getAttribute('data-bind') || false;
	if (!uri) { throw 'data-bind must be set to a property / path to watch' }
	
	var parts = uri.split('.');
	var memberName = parts.pop();
	var modelPath = parts.join('.');
	if (!memberName) { return; }
	
	var toModel = false;
	var toView = false;
	
	var events = ['click', 'keyup', 'change'];
	for (var i = 0; i < events.length; i++) { try {
		view.element.addEventListener(events[i], function() {
			if (toView) { return; }
			toModel = true; toView = false;
			
			var model = !modelPath ? viewmodel : viewmodel.path(modelPath);
			model[memberName] = html.getInputValue(view.element);
			toModel = false;
		});
	} catch (error) { } }
	
	function writeView() {
		if (toModel) { return; }
		toView = true; toModel = false;
		
		var value = viewmodel.path(uri);
		html.setInputValue(view.element, value === utilities.nothing ? '' : value);
		toView = false;
	}
	
	viewmodel.watch(uri, writeView);
	writeView();
}]);
;
// Binds the innerHTML of this element to the ViewModel
Application.extend.binding('data-html', ['view', 'viewmodel', 'html', 'utilities', function(view, viewmodel, html, utilities) {
	var path = view.element.getAttribute('data-html') || '';

	function update() {
		var value = viewmodel.path(path);
		value = value === utilities.nothing ? '' : value;
		view.element.innerHTML = value;
	}
	viewmodel.watch(path, update);
	update();
}]);

;
// Binds the "SRC" attribute to the ViewModel
Application.extend.binding('data-src', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-src');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('src', value);
	};
	viewmodel.watch(path, update);
	update();
}]);
;
// Binds the HREF attribute of this element to the ViewModel
Application.extend.binding('data-href', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-href');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('href', value);
	};
	viewmodel.watch(path, update);
	update();
}]);
;
// Binds this element's "TITLE" attribute to a value on the ViewModel
Application.extend.binding('data-title', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-title');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('title', value);
	};
	viewmodel.watch(path, update);
	update();
}]);
;
// Binds a "true/false-ish" value and shows/hides this element using an injected style/class
Application.extend.binding('data-show', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	html.setStyle('.data-hide', "{ display: none !important; }");
	
	var path = view.element.getAttribute('data-show');
	var update = function() {
		if (viewmodel.path(path)) { html.removeClass(view.element, 'data-hide'); }
		else { html.addClass(view.element, 'data-hide'); }
	};
	viewmodel.watch(path, update);
	update();
}]);
;
// Binds a "true/false-ish" value on the ViewModel and shows/hides this element using an injected class/style
Application.extend.binding('data-hide', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	html.setStyle('.data-hide', "{ display: none !important; }");
	
	var path = view.element.getAttribute('data-hide');
	var update = function() {
		if (!viewmodel.path(path)) { html.removeClass(view.element, 'data-hide'); }
		else { html.addClass(view.element, 'data-hide'); }
	};
	viewmodel.watch(path, update);
	update();
}]);
;
// Binds one or more classes on this element to the state of members on the ViewModel (See documentation)
Application.extend.binding('data-class', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var value = view.element.getAttribute('data-class') || '';
	var member = value.indexOf('{') >= 0 ? false : value;
	var config = value.indexOf('{') < 0 ? false : value.replace(/^\{+|\}+$/g, '');

	if (member) {
		var update = function() {
			var cls = viewmodel.path(member) || '';
			html.addClass(view.element, cls);
		};
		viewmodel.watch(member, update);
		update();
	} else if (config) {
		var settings = config.split(',');
		for (var i = 0; i < settings.length; i++) { 
			var parts = settings[i].split(':');
			settings[i] = {
				class: parts[0].trim(),
				path: parts[1].trim()
			};
			settings[i].update = (function(setting) { return function() {
				var value = viewmodel.path(setting.path);
				if (value) { html.addClass(view.element, setting.class); }
				else { html.removeClass(view.element, setting.class); }
			};})(settings[i]);
			viewmodel.watch(settings[i].path, settings[i].update);
			settings[i].update();
		}
	}
}]);
;
// Traps the "submit" event on a form and calls a command on the ViewModel
Application.extend.binding('data-submit', ['view', 'viewmodel', 'utilities', function(view, viewmodel, utilities) {
	var path = view.element.getAttribute('data-submit');
	view.element.addEventListener('submit', function(e) {
		e.preventDefault();
		var method = viewmodel.path(path);
		if (!utilities.is(method, 'function')) { return; }
		method.apply(viewmodel, arguments);
		return false;
	});
}]);
;
// Binds this element's click event to a command handler on the ViewModel
Application.extend.binding('data-click', ['view', 'viewmodel', 'utilities', function(view, viewmodel, utilities) {
	var path = view.element.getAttribute('data-click');
	view.element.addEventListener('click', function() {
		var method = viewmodel.path(path);
		if (!utilities.is(method, 'function')) { return; }
		method.apply(viewmodel, arguments);
	});
}]);