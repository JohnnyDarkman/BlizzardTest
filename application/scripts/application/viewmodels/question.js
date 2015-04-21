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