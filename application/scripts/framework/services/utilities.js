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





















