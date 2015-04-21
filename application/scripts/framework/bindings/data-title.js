// Binds this element's "TITLE" attribute to a value on the ViewModel
Application.extend.binding('data-title', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-title');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('title', value);
	};
	viewmodel.watch(path, update);
	update();
}]);