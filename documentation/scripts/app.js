window.app = new Application(document.querySelector('main'));

window.app.viewmodel('root', ['route', function(route) { 
	
	route.register('', 'documentation/views/getting-started.html');
	route.register('why-mvvm', 'documentation/views/what-is-mvvm.html');
	route.register('app-vs-fw', 'documentation/views/app-vs-fw.html');
	route.register('init-js', 'documentation/views/init-js.html');
	route.register('services-auth', 'documentation/views/services-auth.html');
	route.register('services-search', 'documentation/views/services-search.html');
	route.register('viewmodels-auth', 'documentation/views/viewmodels-auth.html');
	route.register('viewmodels-profile', 'documentation/views/viewmodels-profile.html');
	route.register('viewmodels-question', 'documentation/views/viewmodels-question.html');
	route.register('viewmodels-search', 'documentation/views/viewmodels-search.html');
	route.register('viewmodels-tag-cloud', 'documentation/views/viewmodels-tag-cloud.html');
	route.register('core-js', 'documentation/views/core-js.html');
	route.register('services-bindings', 'documentation/views/services-bindings.html');
	route.register('services-broadcast', 'documentation/views/services-broadcast.html');
	route.register('services-http', 'documentation/views/services-http.html');
	route.register('services-route', 'documentation/views/services-route.html');
	route.register('utilities', 'documentation/views/utilities.html');
	route.register('viewmodels', 'documentation/views/bindings-view-model.html');
	route.register('bindings', 'documentation/views/bindings-other.html');
}]);
