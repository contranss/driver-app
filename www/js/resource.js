angular.module('starter')

.factory('Routes', function($resource) {
  return $resource('http://46.101.249.46/api/routes/');
});