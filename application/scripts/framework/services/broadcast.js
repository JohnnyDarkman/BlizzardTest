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
