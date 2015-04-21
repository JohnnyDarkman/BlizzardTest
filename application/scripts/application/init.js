// Starts a new application scoped to the document element
window.application = new Application(document);

// Configure basic application stuff
window.application.viewmodel('root', ['route', 'http', function(route, http) {

	// Set up application routing
	route.register('', 'application/views/search.html');
	route.register('profile', 'application/views/profile.html');
	route.register('question', 'application/views/question.html');
	
	var viewmodel = this;
	// Root VM bindings
	viewmodel.throttled = false;
	viewmodel.hours = 'forever';
	
	// Configures a global value that will be added to all API calls
	http.setGlobalParam('key', 't3poiH*IHytdvd1sU5nGkw(('); // app key
	
	// Startup call that will determine the app's throttle state
	http.get('https://api.stackexchange.com/info', {site: 'stackoverflow'}, 
		function() { viewmodel.throttled = false; },
		function() {
			if (this.status !== 400) { return; }
			viewmodel.throttled = true;
			try {
				var info = JSON.parse(this.responseText);
				var seconds = info['error_message'].match(/\d+(?= seconds$)/i)[0];
				viewmodel.hours = Math.round(parseInt(seconds) / 60 / 60 * 100) / 100;
			} catch(error) { 
				viewmodel.hours = 'several'; 
			}
		}
	);
}]);
