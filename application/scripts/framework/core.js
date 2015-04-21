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
