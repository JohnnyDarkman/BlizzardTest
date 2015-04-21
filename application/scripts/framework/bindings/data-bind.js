// Binds an input's value to the ViewModel
Application.extend.binding('data-bind', ['view', 'viewmodel', 'utilities', 'html', function(view, viewmodel, utilities, html) {
	var uri = view.element.getAttribute('data-bind') || false;
	if (!uri) { throw 'data-bind must be set to a property / path to watch' }
	
	var parts = uri.split('.');
	var memberName = parts.pop();
	var modelPath = parts.join('.');
	if (!memberName) { return; }
	
	var toModel = false;
	var toView = false;
	
	var events = ['click', 'keyup', 'change'];
	for (var i = 0; i < events.length; i++) { try {
		view.element.addEventListener(events[i], function() {
			if (toView) { return; }
			toModel = true; toView = false;
			
			var model = !modelPath ? viewmodel : viewmodel.path(modelPath);
			model[memberName] = html.getInputValue(view.element);
			toModel = false;
		});
	} catch (error) { } }
	
	function writeView() {
		if (toModel) { return; }
		toView = true; toModel = false;
		
		var value = viewmodel.path(uri);
		html.setInputValue(view.element, value === utilities.nothing ? '' : value);
		toView = false;
	}
	
	viewmodel.watch(uri, writeView);
	writeView();
}]);