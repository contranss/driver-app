angular.module('starter')

.factory('Routes', function($resource) {
  return $resource('http://46.101.249.46/api/routes/:id/', {
		id: '@_id'
	},{
		search: {
			method: 'GET',
			url: 'http://46.101.249.46/api/routes/?search=:search',
			params: {				
				// page: '@_page',
				search: '@_search'
			},
			headers: {
				'Content-Type': 'application/json'
			}
		}
	}, {
		stripTrailingSlashes: false
	});
});