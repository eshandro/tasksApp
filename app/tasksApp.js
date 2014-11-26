var tasksApp = angular.module('tasksApp', ['ui.router']);


// UI Router routes
tasksApp.config(function($stateProvider, $urlRouterProvider) {
	// Set default view
	$urlRouterProvider.otherwise('/list');

	$stateProvider
		.state('list', {
			url: '/list',
			templateUrl: 'partials/list.html',
			controller: 'ListCtrl',
			resolve: {
				getTasks: ['TasksService', function(TasksService) {
					return TasksService.getTasks()
						.then(function(data) {
							console.log('data ', data);
							return data;
						});
				}]
			}
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

tasksApp.factory('TasksService', ['$q', function($q) {
	
	var tasksObj = {};

	tasksObj.tasks = [];

	tasksObj.db = '';

	// Load all tasks from IndexedDB
	// Test for IndexDB or Web SQL
	var indexedDB = window.indexedDB || window.webkitIndexedDB 
		|| window.mozIndexedDB || window.msIndexedDB || false;

	// Fake async for resolve on /list
	tasksObj.getTasks = function() {
		console.log('getTasks fired');
		tasksObj.loadTasks();
		var deferred = $q.defer();
		setTimeout(function() {
			deferred.resolve(tasksObj.tasks);
		},1500);
		return deferred.promise;
	};

	tasksObj.loadTasks = function(q) {

		console.log('loadTasks fired');
		if (tasksObj.db) {

			var query = q || '';
			var db = tasksObj.db;

			// Clear out tasks array before pushing all from DB
			var tasks = [];

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
					// console.log('loadTasks result ', result);
					// console.log('loadTasks result.value ', result.value);
					i++;
					tasks.push(result.value);
					// console.log('tasks after push ', tasks);
					result['continue'](); 	// Note use of ['continue'] here to 
													// avoid conflict with JS keyword continue
				};
				tx.oncomplete = function(e) {
					// if(i === 0) { createEmptyItem(query, taskList); }
					console.log('tasks ', tasks);
					tasksObj.tasks = tasks;
					console.log('tasksObj.tasks ', tasksObj.tasks);
					return tasks;
				};
			} else {
				alert('You have no DB support with this browser, sorry.');
				return;
			}

		} else {
			setTimeout(function() {
				tasksObj.loadTasks();
			}, 1000);
		}
	};

	tasksObj.deleteTask = function(id) {
		var db = tasksObj.db;
		
		var tx = db.transaction(['tasks'], 'readwrite');
		var objectStore = tx.objectStore('tasks');
		var request = objectStore['delete'](id);
		tx.oncomplete = tasksObj.loadTasks;	
	};

	tasksObj.updateTask = function(task) {
		var db = tasksObj.db;

		var tx = db.transaction(['tasks'], 'readwrite');
		var objectStore = tx.objectStore('tasks');
		var request = objectStore.put(task);
	};

	tasksObj.addTask = function(task) {
		var db = tasksObj.db;

		var tx = db.transaction(['tasks'], 'readwrite');
		var objectStore = tx.objectStore('tasks');
		var request = objectStore.add(task);
		tx.oncomplete = tasksObj.loadTasks;	
	};


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
		console.log('openDB fired');
		if(indexedDB) {
			var request = indexedDB.open('tasks', 1);
			var upgradeNeeded = ('onupgradeneeded' in request);
			request.onsuccess = function(e) {
				console.log('onsuccess in openDB fired');
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
						if (!TasksService.db) { TasksService.db = db; }
						// TasksService.loadTasks();
					};
				} else {
					if (!TasksService.db) { TasksService.db = db; }
					// TasksService.loadTasks();
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

tasksApp.controller('ListCtrl', ['$scope','TasksService', 'getTasks',
	function($scope, TasksService, getTasks) {
	
/*	$scope.load = function() {
		console.log('load fired');
		var deferred = $q.defer();
		deferred.promise.then(function() {
			var tasks = TasksService.loadTasks();
			console.log('tasks in load', tasks);
			return tasks;
		});
		deferred.resolve();
	};
	$scope.load();*/

	$scope.tasks = getTasks;
	// TasksService.loadTasks();
	$scope.run = function() {
		console.log('run fired');
		console.log(TasksService.loadTasks());
		$scope.test = TasksService.loadTasks();
	};
	$scope.test = '';


	$scope.changeCompleteStatus = function(task) {
		console.log('this in changeCompleteStatus ', this);
		var checkedStatus = $scope['chk_'+task.id];
		console.log('checkedStatus ', checkedStatus);
		var updatedTask = {
			id: task.id,
			desc: task.desc,
			descUpper: task.desc.toUpperCase(),
			due: task.due,
			complete: checkedStatus
		};
		console.log('updatedTask ', updatedTask);
		TasksService.updateTask(updatedTask);
	};	
	
	$scope.remove = function(id) {
		if (confirm('Deleting task. Are you sure?', 'Delete')) {
			TasksService.deleteTask(id);
		}
	};

	$scope.searchTasks = function() {
		var query = $scope.searchQuery;
		if(query.length > 0) {
			TasksService.loadTasks(query);
		} else {
			return;
		}
	};


}]);

tasksApp.controller('AddCtrl', ['$scope', 'TasksService', function($scope, TasksService) {
	$scope.desc = '';
	$scope.dueDate = '';

	$scope.addTaskForm = function() {
		console.log('add fired');
		if ($scope.desc.length > 0 && $scope.dueDate.length > 0) {
			console.log('if in add passed');
			var task = {
				id: new Date().getTime(),
				desc: $scope.desc,
				descUpper: $scope.desc.toUpperCase(),
				due: $scope.dueDate,
				complete: 0			
			};
			// Clear out form
			$scope.desc = '';
			$scope.dueDate = '';
			
			// Add task to DB which will call loadTasks
			TasksService.addTask(task);
			
			// redirect to list
/*			location.hash = '#list';
			$scope.changeButton('list');*/	
			
		}
		else {
			alert('Please fill out all fields', 'Add task error');
			return;
		}
	};
}]);

tasksApp.controller('SettingsCtrl', ['$scope', function($scope) {
	$scope.name = localStorage.getItem('name');
	$scope.colorScheme = localStorage.getItem('colorScheme') || 'Blue';

	// Drop entire indexedDB - called in resetSettings below
	var dropDatabase = function() {
		var indexedDB = window.indexedDB || window.webkitIndexedDB 
			|| window.mozIndexedDB || window.msIndexedDB || false;
		if(indexedDB) {
			var delDBRequest = indexedDB.deleteDatabase('tasks');
			delDBRequest.onsuccess = window.location.reload();
		}
	};

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
			if (confirm('This will delete all data. Are you sure?', 'Reset Data')) {
				if($scope.localStorageAvailable) {
					localStorage.clear();
				}
				// Reset to defaults an
				$scope.loadSettings();
				
				// location.hash = '#list';
				// $scope.changeButton('list');
				// Reset the indexedDB or WebSQL
				dropDatabase();
			}
		};

}]);
