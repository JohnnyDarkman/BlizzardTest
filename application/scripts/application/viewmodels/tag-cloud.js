// This is a child (nested) ViewModel that requires the parent ViewModel exposes a "tags" binding
window.application.viewmodel('tag-cloud', ['viewmodel', function(parent) {
	if (!('tags' in parent)) { return; }
	var viewmodel = this;
	viewmodel.tags = [];
	
	// Generates tag view-models for binding to
	function update() {
		var tags = [];
		var max = 0;
		for (var i = 0; i < parent.tags.length; i++) {
			tags.push({
				count: parent.tags[i].count,
				name: parent.tags[i].name,
				link: '#?tags=' + encodeURIComponent(parent.tags[i].name)
			});
			max = Math.max(parent.tags[i].count, max);
		}
		for (var i = 0; i < tags.length; i++) {
			tags[i].strength = 'strength-' + Math.round(tags[i].count / max * 10);
		}
		viewmodel.tags = tags;
	}
	// Keeps synced with the parent "tags" property
	parent.watch('tags', update);
	update();
}]);