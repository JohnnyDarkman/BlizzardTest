window.app.viewmodel('getting-started', function() {
	this.myTitle = 'My First Application';
	this.updateTitle = function() {
		this.myTitle = 'My First Binding';
	};	
});
