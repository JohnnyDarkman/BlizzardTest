// Binds a "true/false-ish" value on the ViewModel and shows/hides this element using an injected class/style
Application.extend.binding('data-hide', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	html.setStyle('.data-hide', "{ display: none !important; }");
	
	var path = view.element.getAttribute('data-hide');
	var update = function() {
		if (!viewmodel.path(path)) { html.removeClass(view.element, 'data-hide'); }
		else { html.addClass(view.element, 'data-hide'); }
	};
	viewmodel.watch(path, update);
	update();
}]);