// Auth ViewModel exposing view bindings and syncing with the Auth service
window.application.viewmodel('auth', ['view', 'http', 'auth', function(view, http, auth) {
	var viewmodel = this;
	
	// View bindings
	viewmodel.authenticated = false;
	viewmodel.expires = false;
	viewmodel.token = false;
	
	// Syncs when the auth service updates its state (on broadcast)
	function sync() {
		var info = auth.info;
		viewmodel.authenticated = auth.authenticated;
		viewmodel.expires = info.expires || false;
		viewmodel.token = info.token || false;
	}
	view.listen(auth.channel, sync); // This listener will dispose with the view using this viewmodel
	sync();
	
	// View command handler
	viewmodel.login = function() {
		auth.login();
	};
	
	// View command handler
	viewmodel.logout = function() {
		auth.logout();
	}
}]);

