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