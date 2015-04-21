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
