// Turns this element into a template that is bound to the specified value on the ViewModel
Application.extend.binding('data-template', [function() {
	throw 'templates cannot be instantiated';
}], function(view) { 
	var html = view.application.resolve('html');
	var utils = view.application.resolve('utilities');
	var bmgr = view.application.resolve('binding manager');
	var vmgr = view.application.resolve('viewmodel manager');
	var viewmodel = vmgr.get(view);
	
	var element = view.element; // Reconfigure the element attributes to have a view-model and not a data-template
	var path = element.getAttribute('data-template');
	element.removeAttribute('data-template');
	element.setAttribute('view-model', '');
	
	var template = element.outerHTML; // Turn the template into a string
	var marker = document.createComment('Template Content');
	element.parentNode.insertBefore(marker, element);
	element.parentNode.removeChild(element);
	
	function create(model, insert) { // Applies the model to the template and inserts a new copy at "insert"
		var e = html.parse(template)[0];
		var v = bmgr.view(e);
		var vm = vmgr.surrogate(v, model);
		v.bind({scope: {viewmodel: vm}});
		marker.parentNode.insertBefore(e, insert || marker);
		return { model: model, view: v };
	}

	var templateItems = [];
	var update = function() { // Keeps the view synced with the item(s) watched on the viewmodel
		var value = viewmodel.path(path);
		if (!utils.is(value, Array)) { value = [value]; }
		
		var i = 0; do {
			while (i < templateItems.length && templateItems[i].model !== value[i]) {
				var e = templateItems.splice(i, 1)[0].view.element;
				e.parentNode.removeChild(e);
			}
			if (i >= templateItems.length && i < value.length) { 
				templateItems.push(create(value[i])); 
			}
		} while (++i < value.length);
	}
	// Sets a watch on the "path" on the view model
	viewmodel.watch(path, update);
	update();
	
	return false;
});