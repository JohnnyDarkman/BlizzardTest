// Traps the "submit" event on a form and calls a command on the ViewModel
Application.extend.binding('data-submit', ['view', 'viewmodel', 'utilities', function(view, viewmodel, utilities) {
	var path = view.element.getAttribute('data-submit');
	view.element.addEventListener('submit', function(e) {
		e.preventDefault();
		var method = viewmodel.path(path);
		if (!utilities.is(method, 'function')) { return; }
		method.apply(viewmodel, arguments);
		return false;
	});
}]);