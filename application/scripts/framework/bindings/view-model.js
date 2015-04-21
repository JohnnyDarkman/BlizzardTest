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