// Workflow grunt file
module.exports = function(grunt) {
	// Configure tasks
	grunt.initConfig({

		stylus: {
			build: {
				options: {
					linenos: false,
					compress: false
				},
				files: [
					{
						expand: true,
						cwd: 'site',
						src: [ '**/*.styl' ],
						dest: 'site',
						ext: '.css'
					}
				]
			}
		},

		jade: {
			compile: {
				options: {
					pretty: true,
					data: {}
				},
				files: [{
					expand: true,
					cwd: 'app',
					src: [ '*.jade', '**/*.jade'],
					dest: 'app',
					ext: '.html'
				}]
			}
		},

		watch: {
			stylesheets: {
				files: 'app/**/*.styl',
				tasks: [ 'stylus']
			},
			jade: {
				files: ['app/*.jade', 'app/**/*.jade'],
				tasks: [ 'jade']
			}
		},

	// grunt-express will serve the files from the folders listed in `bases`
	// on specified `port` and `hostname`
	express: {
		all: {
			options: {
				port: 9000,
				hostname: "0.0.0.0",
				bases: ['app'] // Don't use `.` or `..` in the path as Express
									// is likely to return 403 Forbidden responses
			}
		}
	},
 
	// grunt-open will open your browser at the project's URL
	open: {
		all: {
			// Gets the port from the connect configuration
			path: 'http://localhost:<%= express.all.options.port%>'
		}
	},


	});

	// Load tasks
	// Load Grunt tasks declared in the package.json file
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);


	// Define tasks

	// Task name: 'copy' - 
	grunt.registerTask(
		'copy',
		'Copies all the assets to the build folder',
		['clean', 'copy' ]
	);

	// Task name: 'compress'
	grunt.registerTask(
		'compress',
		'Compresses stylesheets and JS files.',
		[ 'cssmin', 'uglify' ]
	);

	// Task name: 'server'
	grunt.registerTask('server', [
		'express',
		'open',
		'express-keepalive'
	]);

};