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
