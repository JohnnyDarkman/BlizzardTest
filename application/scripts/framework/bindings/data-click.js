// Binds this element's click event to a command handler on the ViewModel
Application.extend.binding('data-click', ['view', 'viewmodel', 'utilities', function(view, viewmodel, utilities) {
	var path = view.element.getAttribute('data-click');
	view.element.addEventListener('click', function() {
		var method = viewmodel.path(path);
		if (!utilities.is(method, 'function')) { return; }
		method.apply(viewmodel, arguments);
	});
}]);