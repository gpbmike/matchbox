module.exports = {
  options: {
    banner: '<%= banner %>',
    stripBanners: true
  },
  dist: {
    src: ['src/**/*.js'],
    dest: 'dist/<%= pkg.name %>.js'
  }
};
