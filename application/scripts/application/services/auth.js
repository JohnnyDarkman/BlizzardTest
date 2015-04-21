// Singleton Auth service that will keep consumers synced with the current auth state
window.application.register.perApp('auth', ['broadcast', 'utilities', 'http', function(bcast, utils, http) {
	var service = this;
	
	// Broadcast channel used to sync updates with listeners
	service.channel = 'Auth.Updated';
	
	// Configure the StackExchange auth api
	var authRedirect = (window.location.href || '')
		.replace(/\#.*$/g, '') // #...
		.replace(/\/[^\/]+\.[^\/]+$/g, '') // /file.ext
		.replace(/\/application\.*$/g, '') // /application...
		+ '/application/proxy.html';
	SE.init({
		clientId: 4573,
		key: 't3poiH*IHytdvd1sU5nGkw((',
		channelUrl: authRedirect,
		complete: function(data) { }
	});
	
	// Syncs up auth info and alerts listeners
	function updateAuth(data) {
		var info = { token: data.accessToken, expires: data.expirationDate };
		localStorage.auth = JSON.stringify(info);
		bcast.send(service.channel);
	}

	// Readonly property containing the current auth information
	utils.readonly(service, 'info', function() {
		var info = JSON.parse(localStorage.auth || '{}'); 
		if ('expires' in info) { info.expires = new Date(info.expires); }
		return info;
	});
	
	// Readonly property with the current authentication state
	utils.readonly(service, 'authenticated', function() {
		var auth = service.info;
		return !!(auth.token && auth.expires && auth.expires > (new Date()));
	});
	
	// Attempts to log in via the SE JS Auth API
	service.login = function() {
		SE.authenticate({
			networkUsers: true,
			scope: [],
			success: function(info) { updateAuth(info); }, 
			error: function() { updateAuth({}); }
		});
	};
	
	// Attempts to log out the currently logged in account
	service.logout = function() {
		if (!service.authenticated) { return; }
		http.get('https://api.stackexchange.com/2.2/apps/' + service.info.token + '/de-authenticate',
			function() { updateAuth({}); },
			function() { updateAuth({}); }
		);
	};
	
	Object.freeze(service);
}]);
