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