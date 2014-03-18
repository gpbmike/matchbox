module.exports = {
  options: {
    reporter: require('jshint-stylish')
  },
  src: {
    options: {
      jshintrc: '.jshintrc'
    },
    src: ['src/**/*.js']
  }
};
