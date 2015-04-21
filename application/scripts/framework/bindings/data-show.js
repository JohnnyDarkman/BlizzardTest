// Binds a "true/false-ish" value and shows/hides this element using an injected style/class
Application.extend.binding('data-show', ['view', 'viewmodel', 'html', function(view, viewmodel, html) {
	html.setStyle('.data-hide', "{ display: none !important; }");
	
	var path = view.element.getAttribute('data-show');
	var update = function() {
		if (viewmodel.path(path)) { html.removeClass(view.element, 'data-hide'); }
		else { html.addClass(view.element, 'data-hide'); }
	};
	viewmodel.watch(path, update);
	update();
}]);