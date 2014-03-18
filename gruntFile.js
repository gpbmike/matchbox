var matchdep = require('matchdep');
module.exports = function(grunt){

  matchdep.filterDev('grunt-*').forEach(grunt.loadNpmTasks);
  grunt.loadTasks('tasks');
  var config = require('load-grunt-config')(grunt, {
    configPath: __dirname + '/tasks/options',
    init: false
  });

  config.pkg = require('./package');
  config.env = process.env;

  // Metadata.
  config.banner = '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed MIT */\n';

  grunt.initConfig(config);

  grunt.registerTask('serve', [ 'connect:main:keepalive' ]);

  grunt.registerTask('test', [ 'jshint', 'connect', 'qunit' ]);

  grunt.registerTask('dev', [ 'test', 'watch' ]);

  grunt.registerTask('build', [ 'test', 'clean', 'concat', 'uglify' ]);

  grunt.registerTask('default', 'test');
};
