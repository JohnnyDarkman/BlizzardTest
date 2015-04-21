module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
	concat: {
		options: {
			separator: '\r\n;\r\n'
		},
		framework: {
			src: [
				'scripts/framework/core.js',
				'scripts/framework/services/utilities.js',
				'scripts/framework/services/broadcast.js',
				'scripts/framework/services/bindings.js',
				'scripts/framework/services/http.js',
				'scripts/framework/services/html.js',
				'scripts/framework/services/route.js',
				
				'scripts/framework/bindings/data-routed.js',
				'scripts/framework/bindings/data-template.js',
				'scripts/framework/bindings/data-view.js',
				'scripts/framework/bindings/view-model.js',
				'scripts/framework/bindings/data-format.js',
				'scripts/framework/bindings/data-bind.js',
				'scripts/framework/bindings/data-html.js',
				'scripts/framework/bindings/data-src.js',
				'scripts/framework/bindings/data-href.js',
				'scripts/framework/bindings/data-title.js',
				'scripts/framework/bindings/data-show.js',
				'scripts/framework/bindings/data-hide.js',
				'scripts/framework/bindings/data-class.js',
				'scripts/framework/bindings/data-submit.js',
				'scripts/framework/bindings/data-click.js'
			],
			dest: 'scripts/framework.js'
		},
		application: {
			src: [
				'scripts/application/init.js',
				'scripts/application/services/auth.js',
				'scripts/application/services/search.js',
				
				'scripts/application/viewmodels/auth.js',
				'scripts/application/viewmodels/search.js',
				'scripts/application/viewmodels/question.js',
				'scripts/application/viewmodels/profile.js',
				'scripts/application/viewmodels/tag-cloud.js'
			],
			dest: 'scripts/application.js'
		}
	},
	uglify: {
		framework: {
			src: 'scripts/framework.js',
			dest: 'scripts/framework.min.js'
		},
		application: {
			src: 'scripts/application.js',
			dest: 'scripts/application.min.js'
		}
	}
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('default', ['concat', 'uglify']);

};