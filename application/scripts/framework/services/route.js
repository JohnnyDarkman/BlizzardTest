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






































