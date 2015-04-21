// Binds the innerHTML of this element to the ViewModel
Application.extend.binding('data-html', ['view', 'viewmodel', 'html', 'utilities', function(view, viewmodel, html, utilities) {
	var path = view.element.getAttribute('data-html') || '';

	function update() {
		var value = viewmodel.path(path);
		value = value === utilities.nothing ? '' : value;
		view.element.innerHTML = value;
	}
	viewmodel.watch(path, update);
	update();
}]);
