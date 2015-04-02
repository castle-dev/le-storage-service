'use strict'

var gulp = require('gulp');
var util = require('gulp-util');
var runSequence = require('run-sequence');
var mocha = require('gulp-mocha');

gulp.task('test:unit', function () {
  return gulp.src('test/unit/**/*.js', {read: false})
  .pipe(mocha({reporter: 'nyan'}))
  .on('error', util.log);
});

gulp.task('watch:unit', function () {
  gulp.watch(['app/**', 'test/**'], ['test:unit']);
})

gulp.task('tdd', function (done) {
  runSequence('test:unit', 'watch:unit', done)
});

