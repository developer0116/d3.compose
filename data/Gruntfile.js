module.exports = function(grunt) {
  // load-grunt-config does the following automatically
  // - load tasks/options into config
  // - load grunt-* npm tasks in package.json
  var config = require('load-grunt-config')(grunt, {
    configPath: require('path').join(process.cwd(), 'tasks/options'),
    init: false,
    loadGruntTasks: {
      pattern: 'grunt-*',
      config: require('./package.json'),
      scope: 'devDependencies'
    }
  });

  config.env = process.env;
  config.pkg = grunt.file.readJSON('package.json');
  config.meta = {
    banner: '/*! <%= pkg.name %> - v<%= pkg.version %>\n' +
      ' * <%= pkg.homepage %>\n' +
      ' * License: <%= pkg.license %>\n' +
      ' */\n'
  };
  grunt.initConfig(config);

  grunt.loadTasks('tasks');
  this.registerTask('default', ['test']);
  
  this.registerTask('release', 'Builds a new release of the library', [
    'test',
    'uglify',
    'jshint:build',
    'jasmine:build'
  ]);
  
  this.registerTask('test', 'Lint and run specs', [
    'jshint:src',
    'jshint:specs', 
    'jasmine:src'
  ]);

  this.registerTask('example', 'Run example (at http://localhost:4010)', [
    'connect:example'
  ]);
};