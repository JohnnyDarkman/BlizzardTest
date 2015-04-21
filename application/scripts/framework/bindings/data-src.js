// Binds the "SRC" attribute to the ViewModel
Application.extend.binding('data-src', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-src');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('src', value);
	};
	viewmodel.watch(path, update);
	update();
}]);