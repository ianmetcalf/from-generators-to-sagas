var path = require('path');

module.exports = function(grunt) {
  grunt.initConfig({
    bower: {
      install: {
        options: {
          targetDir: 'lib',
          layout: (type, pkg, src) => {
            switch(path.extname(src)) {
              case '.js':
                return 'js';
              case '.css':
                return 'css';
              case '.eot':
              case '.ttf':
              case '.woff':
              case '.woff2':
                return path.join('fonts', pkg);
              default:
                return '';
            }
          },
          cleanup: true,
        },
      },
    },

    connect: {
      server: {
        options: {
          port: grunt.option('port') || 8000,
          livereload: true,
          open: true,
        },
      },
    },

    watch: {
      html: {
        files: ['index.html', 'js/*.js', 'css/*.css'],
      },
      options: {
        livereload: true,
      },
    },
  });

  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('serve', ['connect','watch']);
};
