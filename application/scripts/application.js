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

;
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

;
// Search service triggers on URI updates.
window.application.register.perApp('search', ['http', 'html', 'route', 'utilities', 'broadcast', function(http, html, route, utils, bcast) {
	var instance = this;
	// Listeners will be updated when search results have been updated
	instance.channel = 'Search.Updated';
	
	// Query data used in search
	var query = {
		intitle: '',
		sort: 'activity',
		tagged: '',
		page: 1,
		pagesize: 10,
		site: 'stackoverflow',
		order: 'desc'
	};
	
	// Maps current URI parameters to the query data
	function mapquery(loc) {
		query.intitle = loc.data.query || '';
		query.sort = loc.data.sort || 'activity';
		query.tagged = loc.data.tags || '';
	}

	// Readonly property with current search results
	var results = [];
	utils.readonly(instance, 'results', function() { return utils.toarray(results); });
	
	// Readonly property with current relevant tags
	var tags = [];
	utils.readonly(instance, 'tags', function() { return utils.toarray(tags); });
	
	// Readonly property specifies if more results are available
	var hasmore = false;
	utils.readonly(instance, 'hasmore', function() { return hasmore; });
	
	// Tags will be queried either site-wide or based on current search results
	function tagsuri(names) {
		if (!names) { return 'https://api.stackexchange.com/tags'; }
		var url = 'https://api.stackexchange.com/tags/';
		for (var tag in names) { url = url + encodeURIComponent(tag) + ';'; }
		url = url.replace(/;$/g, '');
		url = url + '/info';
		return url;
	}
	
	// TODO: Model transformations below belong in the ViewModel
	// Assembles result models for consumption
	function update(items) {
		var tagnames = {};
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			item.cappslink = (function(id) { return function() { 
				route.navigate('question', {id: id}); 
			};})(item['question_id']);
			if (!item.owner['accept_rate']) { item.owner['accept_rate'] = 'n/a'; }
			for (var t = 0; !!item.tags && t < item.tags.length; t++) {
				item.tags[t] = {
					value: item.tags[t],
					link: (function(value) { return function(e) { 
						e.stopPropagation();
						route.navigate('', {query: query.intitle, sort: query.sort, tags: value}); 
					};})(item.tags[t])
				}
				tagnames[item.tags[t].value] = true;
			}
		}
		http.get((!items.length ? tagsuri() : tagsuri(tagnames)), 
			{
				order: (!items.length ? 'desc' : 'asc'), sort: (!items.length ? 'popular' : 'name'), 
				site: 'stackoverflow', filter: '!-.G.68phH_FI', pagesize: 40
			},
			function(infos) {
				for (var i = 0; i < infos.items.length; i++) {
					tags = tags.filter(function(t) { return t.name !== infos.items[i].name; });
					tags.push(infos.items[i]);
				}
				bcast.send(instance.channel);
			}, function() {
				bcast.send(instance.channel);
			}
		);
		for (var i = 0; i < items.length; i++) { results.push(items[i]); }
	}
	
	// Gathers search results based on the query data object
	function doquery() {
		if (!query.intitle && !query.tagged) { hasmore = false; update([]); return; }
		http.get('https://api.stackexchange.com/search', query,
			function(data) { 
				if (!data || !data.items || !data.items.length) { 
					hasmore = false; update([]); return; 
				}
				hasmore = data['has_more'] || false;
				update(data.items);
			}, function() {
				hasmore = false; update([]);
			}
		);
	}
	
	// Increments the current query data object page and queries more results
	instance.loadmore = function() {
		if (!hasmore) { return; }
		query.page++;
		doquery();
	}
	
	// Listens for parameter updates
	route.subscribe(function(loc) {
		query.page = 1;
		mapquery(loc);
		results = [];
		tags = [];
		doquery();
	}, ''); // '' filters out updates to be only the home (search) page
	if (!route.current.uri) { mapquery(route.current); doquery(); }
	
	Object.freeze(instance);
}]);

;
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


;
// Search ViewModel syncs with the search service and manages triggering new searches
window.application.viewmodel('search', ['view', 'html', 'route', 'search', 'auth', function(view, html, route, search, auth) {
	var viewmodel = this;
	
	// Expose bindings
	viewmodel.results = search.results;
	viewmodel.query = '';
	viewmodel.sort = 'activity';
	viewmodel.searchtags = '';
	viewmodel.tags = [];
	viewmodel.hasmore = false;
	
	// Sync to uri
	function sync() {
		viewmodel.results = search.results || [];
		viewmodel.query = route.current.data.query || '';
		viewmodel.sort = route.current.data.sort || 'activity';
		viewmodel.searchtags = route.current.data.tags || '';
		viewmodel.hasmore = false;
		viewmodel.tags = search.tags || [];
		setTimeout(function() { 
			viewmodel.hasmore = search.hasmore; 
		}, 500);
	}
	view.listen(search.channel, sync);
	sync();
	
	// Navigation triggers search
	viewmodel.search = function() {
		var params = html.formatParameters({
			query: viewmodel.query,
			sort: viewmodel.sort,
			tags: viewmodel.searchtags
		});
		route.navigate('', '?' + params);
	};
	
	// Search more
	viewmodel.next = function() {
		if (!viewmodel.hasmore) { return; }
		viewmodel.hasmore = false;
		search.loadmore();
	}
	
	viewmodel.authenticated = auth.authenticated;
	view.listen(auth.channel, function() { 
		viewmodel.authenticated = auth.authenticated; 
	});
	
	viewmodel.fav = function(e) {
		e.preventDefault();
		e.stopPropagation();
		alert('This feature not implemented because it would be disruptive to live data (please see code).');
		// To implement this add a "favorited" boolean to the viewmodel
		// When this is clicked send the request and update the favorited property
		// use data-class to update the visual appearance of the question based on
		// the favorited property value.
	}
	
	viewmodel.upvote = function(e) { 
		e.stopPropagation();
		e.preventDefault();
		alert('feature not implemented because it would be disruptive to live data (please see code).'); 
	};
	viewmodel.downvote = function(e) { 
		e.stopPropagation();
		e.preventDefault();
		alert('feature not implemented because it would be disruptive to live data (please see code).'); 
	};
	
}]);

;
// Question ViewModel
window.application.viewmodel('question', ['view', 'route', 'http', 'html', 'auth', function(view, route, http, html, auth) {
	var viewmodel = this;
	
	// Expose bindings
	viewmodel.data = {};
	viewmodel.answers = [];
	viewmodel.authenticated = auth.authenticated;
	view.listen(auth.channel, function() {
		viewmodel.authenticated = auth.authenticated;
	});
	
	viewmodel.fav = function(e) {
		e.preventDefault();
		e.stopPropagation();
		alert('This feature not implemented because it would be disruptive to live data (please see code).');
		// To implement this add a "favorited" boolean to the viewmodel
		// When this is clicked send the request and update the favorited property
		// use data-class to update the visual appearance of the question based on
		// the favorited property value.
	}
	
	viewmodel.upvote = function(e) { 
		e.stopPropagation();
		e.preventDefault();
		alert('feature not implemented because it would be disruptive to live data (please see code).'); 
	};
	viewmodel.downvote = function(e) { 
		e.stopPropagation();
		e.preventDefault();
		alert('feature not implemented because it would be disruptive to live data (please see code).'); 
	};
	
	
	// TODO: Break everything below out into a service
	var loc = route.current;
	// Gather question info
	http.get('https://api.stackexchange.com/questions/' + route.current.data.id,
			 { order: 'desc', sort: 'activity', site: 'stackoverflow', filter: '!L_Zm1rmoFy**bp.d27d-ZJ' },
		function(data) {
			viewmodel.data = data.items[0];
			if (viewmodel.data.answers && viewmodel.data.answers.length) {
				var ids = [];
				for (var i = 0; i < viewmodel.data.answers.length; i++) {
					ids.push(viewmodel.data.answers[i].answer_id);
				}
				// Gather answers
				http.get('https://api.stackexchange.com/answers/' + ids.join(';'),
						{order: 'desc', sort: 'activity', site: 'stackoverflow', filter: '!1zSsisdDRFlWF2g_cxdSy'},
					function(data) {
						viewmodel.answers = data.items;
					});
			}
		});
		
	
}]);
;
// Profile ViewModel 
window.application.viewmodel('profile', ['view', 'http', 'auth', 'route', function(view, http, auth, route) {
	var viewmodel = this;
	// Expose bindings
	viewmodel.userless = false;
	viewmodel.user = {};
	viewmodel.answers = [];
	viewmodel.badges = [];
	viewmodel.tags = [];
	
	// Syncs with the auth service and redirects home if the user logs out
	view.listen(auth.channel, function() {
		if (!auth.authenticated) { 
			route.navigate('');
		}
	});
	
	// Formats dates (This would be an inline-filter in Angular and then used in the view)
	function date(timestamp) {
		var d = new Date(timestamp * 1000);
		var format = 
			   '' + d.getMonth() 
			+ '/' + d.getDate()
			+ '/' + (d.getYear() % 100)
			+ ' ' + ((d.getHours() % 12) || 12)
			+ ':' + d.getMinutes()
			+ ' ' + (d.getHours() > 11 ? 'pm' : 'am');
		return format.replace(/\b(\d)(?!\d+)/g, '0$1');
	}
	
	// TODO: Break everything below out into a service
	// Configure session parameters for the API
	http.setParam('access_token', auth.info.token);
	http.setParam('site', 'stackoverflow');
	
	// Gather basic user information
	http.get('https://api.stackexchange.com/me',
		{order: 'desc', sort: 'reputation', filter: '!)sjdGQOAfl.okknbe0u3'},
		function(users) {
			var user = users.items[0];
			viewmodel.userless = !user;
			if (viewmodel.userless) { return; }
			user['creation_date'] = date(user['creation_date']);
			viewmodel.user = user;
		}
	);
	// Gather user tags
	http.get('https://api.stackexchange.com/me/tags',
		{order: 'asc', sort: 'name', filter: '!-.G.68phH_FI'},
		function(tags) {
			viewmodel.tags = tags.items;
		}
	);
	// Gather user badges
	http.get('https://api.stackexchange.com/me/badges',
		{order: 'asc', sort: 'rank', filter: '!SWKA(oWp7_Kp)zbUAU'},
		function(badges) {
			viewmodel.badges = badges.items;
		}
	);
	// Gather user answers
	http.get('https://api.stackexchange.com/me/answers', 
		{order:'desc', sort:'activity', filter:'!7gohVUNU(8KPtsp85qewC*Q_lGt)7g*HaB'},
		function(answers) {
			for (var i = 0; i < answers.items.length; i++) {
				var answer = answers.items[i];
				answer['last_activity_date'] = date(answer['last_activity_date']);
				answer['creation_date'] = date(answer['creation_date']);
				answer['last_edit_date'] = !answer['last_edit_date']
					? 'N/A'
					: date(answer['last_edit_date']);
			}
			viewmodel.answers = answers.items;
		}
	);
}]);
;
// This is a child (nested) ViewModel that requires the parent ViewModel exposes a "tags" binding
window.application.viewmodel('tag-cloud', ['viewmodel', function(parent) {
	if (!('tags' in parent)) { return; }
	var viewmodel = this;
	viewmodel.tags = [];
	
	// Generates tag view-models for binding to
	function update() {
		var tags = [];
		var max = 0;
		for (var i = 0; i < parent.tags.length; i++) {
			tags.push({
				count: parent.tags[i].count,
				name: parent.tags[i].name,
				link: '#?tags=' + encodeURIComponent(parent.tags[i].name)
			});
			max = Math.max(parent.tags[i].count, max);
		}
		for (var i = 0; i < tags.length; i++) {
			tags[i].strength = 'strength-' + Math.round(tags[i].count / max * 10);
		}
		viewmodel.tags = tags;
	}
	// Keeps synced with the parent "tags" property
	parent.watch('tags', update);
	update();
}]);