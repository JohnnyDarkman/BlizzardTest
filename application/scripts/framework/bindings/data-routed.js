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