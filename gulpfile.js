var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    fileinclude = require('gulp-file-include');

gulp.task('default', ['fileinclude'], function() {
  // place code for your default task here

  return gutil.log('Gulp is running!');
});

gulp.task('copy', function() {
//  gulp.src('src/*.html').pipe(gulp.dest('dist'));
});

gulp.task('fileinclude', function() {
  gulp.src('src/index.html')
  .pipe(fileinclude({
    prefix: '@@',
    basepath: '@file'
  }))
  .pipe(gulp.dest('dist'));
});
