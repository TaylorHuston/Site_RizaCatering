var gulp = require('gulp'),
    gutil = require('gulp-util');


gulp.task('default', function() {
  // place code for your default task here
  gulp.src('src/*.html').pipe(gulp.dest('dist'));
  return gutil.log('Gulp is running!');
});