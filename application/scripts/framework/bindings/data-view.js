// Blocks other bindings on this element and replaces this element with the view at the specified URI
Application.extend.binding('data-view', ['html', function(html) {
	throw 'view cannot be instantiated';
}], function(view) {
	var html = view.application.resolve('html');
	var element = view.element;
	var url = element.getAttribute('data-view');
	var utils = view.application.resolve('utilities');
		
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (this.readyState !== 4) { return; }

		if (!html.indom(element)) { return; }
		var marker = document.createComment('view: ' + url);
		element.parentNode.insertBefore(marker, element);
		element.parentNode.removeChild(element);
		var elements = html.parse(this.responseText);
		if (!elements) { return; }
		for (var i = 0; i < elements.length; i++) { marker.parentNode.insertBefore(elements[i], marker); }
	}
	request.open('get', url);
	request.send();
	return false;
});
