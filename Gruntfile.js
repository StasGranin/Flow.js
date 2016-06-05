module.exports = function(grunt)
{
	grunt.initConfig(
	{
		pkg: grunt.file.readJSON('package.json'),
		meta:
		{
			banner : '/*!\n' +
			' * <%= pkg.title %> v<%= pkg.version %> - A small JavaScript callbacks synchronizer\n' +
			' * Copyright (c) <%= pkg.author.name %> - <%= pkg.homepage %>\n' +
			' * License: <%= pkg.license %>\n' +
			' */\n\n'
		},
		uglify:
		{
			options :
			{
				mangleProperties: {
			        regex: /^_/
			    },
				banner : '<%= meta.banner %>',
				report: 'gzip'
			},
			dist:
			{
				files:
				{
					'flow.min.js': ['flow.js']
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', ['uglify']);
};