var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint');


gulp.task('default', ['copy'], function() {
  // place code for your default task here
  
  return gutil.log('Gulp is running!');
});

gulp.task('copy', function() {
  gulp.src('src/*.html').pipe(gulp.dest('dist'));
});
