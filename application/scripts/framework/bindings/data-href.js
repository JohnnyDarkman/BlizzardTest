// Binds the HREF attribute of this element to the ViewModel
Application.extend.binding('data-href', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	var path = view.element.getAttribute('data-href');
	var update = function() {
		var value = viewmodel.path(path) || '';
		view.element.setAttribute('href', value);
	};
	viewmodel.watch(path, update);
	update();
}]);