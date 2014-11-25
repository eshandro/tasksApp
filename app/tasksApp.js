var tasksApp = angular.module('tasksApp', ['ui.router']);


// UI Router routes
tasksApp.config(function($stateProvider, $urlRouterProvider) {
	// Set default view
	$urlRouterProvider.otherwise('/list');

	$stateProvider
		.state('list', {
			url: '/list',
			templateUrl: 'partials/list.html',
			controller: 'ListCtrl'
		})
		.state('add', {
			url: '/add',
			templateUrl: 'partials/add.html',
			controller: 'AddCtrl'
		})
		.state('settings', {
			url: '/settings',
			templateUrl: 'partials/settings.html',
			controller: 'SettingsCtrl'
		});
});

tasksApp.factory('TasksService', [function() {
	
	var tasksObj = {};

	tasksObj.tasks = [];



	// Load all tasks from IndexedDB
		// Test for IndexDB or Web SQL
	var indexedDB = window.indexedDB || window.webkitIndexedDB 
		|| window.mozIndexedDB || window.msIndexedDB || false;
	var db;

	tasksObj.loadTasks = function(dbArg,q) {
		// var taskList = document.getElementById('task_list');
		console.log('loadTasks fired');
		if (dbArg) { db = dbArg };
		var query = q || '';
		// taskList.innerHTML = '';
		if (indexedDB) {
			var tx = db.transaction(['tasks'], 'readonly');
			var objectStore = tx.objectStore('tasks');
			var cursor;
			var i = 0;

			if (query.length > 0) {
				var index = objectStore.index('desc');
				var upperQ = query.toUpperCase();
				var keyRange = IDBKeyRange.bound(upperQ, upperQ+'z');
				cursor = index.openCursor(keyRange);
			} else {
				cursor = objectStore.openCursor();
			}

			cursor.onsuccess = function(e) {
				var result = e.target.result;
				if(result === null) return;
				console.log('loadTasks result ', result);
				console.log('loadTasks result.value ', result.value);
				i++;
				tasksObj.tasks.push(result.value);
				result['continue'](); 	// Note use of ['continue'] here to 
												// avoid conflict with JS keyword continue
			};
			tx.oncomplete = function(e) {
				// if(i === 0) { createEmptyItem(query, taskList); }
			};
		} else {
			alert('You have no DB support with this browser, sorry.');
		}
	};

	tasksObj.deleteTask = function(id) {
		var tx = db.transaction(['tasks'], 'readwrite');
		var objectStore = tx.objectStore('tasks');
		var request = objectStore['delete'](id);
		tx.oncomplete = tasksObj.loadTasks;	
	};

	tasksObj.updateTask = function(task) {
		var tx = db.transaction(['tasks'], 'readwrite');
		var objectStore = tx.objectStore('tasks');
		var request = objectStore.put(task);
	}


	return tasksObj; 
}]);

tasksApp.controller('MainCtrl', ['$scope', 'TasksService', function($scope, TasksService) {

	// Set initial active button based on url hash
	$scope.activeButton = location.hash.substring(2);
	// Change buttons on clicks
	$scope.changeButton = function(current) {
		$scope.activeButton = current;
	};

	// Establish if local storage is available
	$scope.localStorageAvailable = ('localStorage' in window);
	/**
	 * Load user settings from localStorage
	 * 
	 */
	$scope.loadSettings = function() {
		console.log('loadSettings called');
		if ($scope.localStorageAvailable) {
			var name = localStorage.getItem('name');
			var colorScheme = localStorage.getItem('colorScheme');
			var nameDisplay = document.getElementById('user_name');
			var doc = document.documentElement;
			if(name) {
				nameDisplay.innerHTML = name + '\'s';
			} else {
				nameDisplay.innerHTML = 'My';
			}
			if(colorScheme) {
				doc.className = colorScheme.toLowerCase();
			} else {
				doc.className = 'blue';
			}
		}
	};
	$scope.loadSettings();

	// Test for IndexDB or Web SQL
	var indexedDB = window.indexedDB || window.webkitIndexedDB 
		|| window.mozIndexedDB || window.msIndexedDB || false;
	var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange 
		|| window.mozIDBKeyRange || window.msIDBKeyRange || false;
	// var webSQLSupport = ('openDatabase' in window);

	// Connecting to and configuring database
	var db;

	var openDB = function() {
		if(indexedDB) {
			var request = indexedDB.open('tasks', 1);
			var upgradeNeeded = ('onupgradeneeded' in request);
			request.onsuccess = function(e) {
				db = e.target.result;
				if (!upgradeNeeded && db.version != '1') {
					var setVersionRequest = db.setVersion('1');
					setVersionRequest.onsuccess = function(e) {
						var objectStore = db.createObjectStore('tasks', {
							keyPath: 'id'
						});
						objectStore.createIndex('desc', 'descUpper', {
							unique: false
						});
						TasksService.loadTasks(db);
					};
				} else {
					TasksService.loadTasks(db);
				}
			};
			if(upgradeNeeded) {
				request.onupgradeneeded = function(e) {
					db = e.target.result;
					var objectStore = db.createObjectStore('tasks', {
						keyPath: 'id'
					});
					objectStore.createIndex('desc', 'descUpper', {
						unique: false
					});
				};
			}
		} else {
			alert('You have no DB support with this browser, sorry.');
		}
	};
	openDB();

}]);

tasksApp.controller('ListCtrl', ['$scope','TasksService', function($scope, TasksService) {
	$scope.tasks = TasksService.tasks;
	TasksService.loadTasks();

	$scope.changeCompleteStatus = function(task) {
		console.log('this in changeCompleteStatus ', this);
		var updatedTask = {
			id: task.id,
			desc: task.desc,
			descUpper: task.desc.toUpperCase(),
			due: task.due,
			complete: e.target.checked
		};
		console.log('updatedTask ', updatedTask);
		TasksService.updateTask(updatedTask);
	};	
	$scope.remove = function(e) {
		e.preventDefault();
		if (confirm('Deleting task. Are you sure?', 'Delete')) {
			TasksService.deleteTask(id);
		}
	};
}]);

tasksApp.controller('AddCtrl', ['$scope', function($scope) {

}]);

tasksApp.controller('SettingsCtrl', ['$scope', function($scope) {
	$scope.name = localStorage.getItem('name');
	$scope.colorScheme = localStorage.getItem('colorScheme') || 'Blue';

	$scope.saveSettings = function(e) {
		console.log('saveSettings fired');
		if($scope.localStorageAvailable) {
			var name = $scope.name;
			if (name.length > 0) {
				var colorScheme = $scope.colorScheme;

				localStorage.setItem('name', name);
				localStorage.setItem('colorScheme', colorScheme);
				// Update settings by calling loadSettings
				$scope.loadSettings();
				// Redirect to list view
				location.hash = '#list';
				$scope.changeButton('list');
			} else {
				alert('Please enter your name', 'Settings error');
			}
		} else {
			alert('Sorry, your browser does not support local storage', 'Settings error');
		}
	};
	$scope.resetSettings = function($event) {
			// e.preventDefault();
			console.log('this in resetSettings ', this);
			console.log('$event in resetSettings ', $event);
			if (confirm('This will delete all data. Are you sure?', 'Reset Data')) {
				if($scope.localStorageAvailable) {
					localStorage.clear();
				}
				// Reset to defaults and redirect to #list
				$scope.loadSettings();
				location.hash = '#list';
				$scope.changeButton('list');
				// Reset the indexedDB or WebSQL
				// dropDatabase();
			}
		};

}]);
