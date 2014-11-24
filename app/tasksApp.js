var tasksApp = angular.module('tasksApp', ['ui.router']);


// UI Router routes
tasksApp.config(function($stateProvider, $urlRouterProvider) {
	// Set default view
	$urlRouterProvider.otherwise('/list');

	$stateProvider
		.state('list', {
			url: '/list',
			templateUrl: 'partials/list.html',
			controller: 'MainCtrl'
		})
		.state('add', {
			url: '/add',
			templateUrl: 'partials/add.html'
			controller: 'MainCtrl'
		})
		.state('settings', {
			url: '/settings',
			templateUrl: 'partials/settings.html'
			controller: 'MainCtrl'
		})
});

tasksApp.controller('MainCtrl', []);
