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

  grunt.initConfig(config);

  grunt.registerTask('serve', [ 'connect:main:keepalive' ]);

  grunt.registerTask('test', [ 'connect', 'qunit' ]);

  grunt.registerTask('dev', [ 'test', 'watch' ]);

  grunt.registerTask('default', 'test');
};
