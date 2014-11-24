(function() {
	var Tasks = function() {
		/**
		 * This function hides the browser toolbar on iOS devices to give 
		 * app extra room
		 * @return {[type]} [description]
		 */
		var nudge = function() {
			setTimeout(function() {
				window.scrollTo(0,0);
			}, 1000);
		};
		/**
		 * Uses value of location.hash to define the current view
		 * and calls the nudge function
		 * Note: jump is called when a new Tasks is created to check 
		 * the value of location.hash and set view accordingly
		 * @return {[type]} [description]
		 */
/*		var jump = function() {
			switch(location.hash) {
				case '#add' :
					document.body.className = 'add';
					break;
				case '#settings' : 
					document.body.className = 'settings';
					break;
				default : 
					document.body.className = 'list';
			}
			nudge();
		};
		jump();
		// Create event listener for hash changes that calls jump()
		window.addEventListener('hashchange', jump, false);*/
		// On orientation change call nudge to hide toolbar if possible
		window.addEventListener('orientationchange', nudge, false);

		var localStorageAvailable = ('localStorage' in window);
		/**
		 * Load user settings from localStorage
		 * 
		 */
		var loadSettings = function() {
			if (localStorageAvailable) {
				var name = localStorage.getItem('name');
				var colorScheme = localStorage.getItem('colorScheme');
				var nameDisplay = document.getElementById('user_name');
				var nameField = document.forms.settings.name;
				var doc = document.documentElement;
				var colorSchemeField = document.forms.settings.color_scheme;
				if(name) {
					nameDisplay.innerHTML = name + '\'s';
					nameField.value = name;
				} else {
					nameDisplay.innerHTML = 'My';
					nameField.value = '';
				}
				if(colorScheme) {
					doc.className = colorScheme.toLowerCase();
					colorSchemeField.value = colorScheme;
				} else {
					doc.className = 'blue';
					colorSchemeField.value = "Blue";
				}
			}
		};

		var saveSettings = function(e) {
			e.preventDefault();
			if(localStorageAvailable) {
				var name = document.forms.settings.name.value;
				if (name.length > 0) {
					var colorScheme = document.forms.settings.color_scheme.value;
					localStorage.setItem('name', name);
					localStorage.setItem('colorScheme', colorScheme);
					// Update settings by calling loadSettings
					loadSettings();
					// Redirect to list view
					location.hash = '#list';
				} else {
					alert('Please enter your name', 'Settings error');
				}
			} else {
				alert('Sorry, your browser does not support local storage', 'Settings error');
			}
		};

		var resetSettings = function(e) {
			e.preventDefault();
			if (confirm('This will delete all data. Are you sure?', 'Reset Data')) {
				if(localStorageAvailable) {
					localStorage.clear();
				}
				// Reset to defaults and redirect to #list
				loadSettings();
				location.hash = '#list';
				// Reset the indexedDB or WebSQL
				dropDatabase();
			}
		};


		// Make sure load user settings on page load 
		loadSettings();

		// Add event listeners to settings for saving and resetting
		document.forms.settings.addEventListener('submit', saveSettings, false);
		document.forms.settings.addEventListener('reset', resetSettings, false);

		// Test for IndexDB or Web SQL
		var indexedDB = window.indexedDB || window.webkitIndexedDB 
			|| window.mozIndexedDB || window.msIndexedDB || false;
		var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange 
			|| window.mozIDBKeyRange || window.msIDBKeyRange || false;
		var webSQLSupport = ('openDatabase' in window);

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
							loadTasks();
						};
					} else {
						loadTasks();
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
			} else if (webSQLSupport) {
				db = openDatabase('tasks', '1.0', 'Tasks database', (5*1024*1024));
				db.transaction(function(tx) {
					var sql = 'CREATE TABLE IF NOT EXISTS tasks (' + 
						'id INTEGER PRIMARY KEY ASC, ' + 
						'desc TEXT, ' + 
						'due DATETIME, ' + 
						'complete BOOLEAN' +
						')';
					tx.executeSql(sql, [], loadTasks);
				});
			}
		};
		openDB();

		// Dynamic list making for lists view
		/**
		 * Handles when no task items in db or when search yields no matches
		 * @param  {[type]} query    [description]
		 * @param  {[type]} taskList [description]
		 * @return {[type]}          [description]
		 */
		var createEmptyItem = function(query, taskList) {
			var emptyItem = document.createElement('li');
			if (query.length > 0) {
				emptyItem.innerHTML = '<div class="item_title">' + 
					'No tasks match your query <strong>'+query+'</strong>.' + 
					'</div>';
			} else {
				emptyItem.innerHTML = '<div class="item_title">' + 
					'No tasks to display. <a href="#add">Add one</a>?' + 
					'</div>';
			}
			taskList.appendChild(emptyItem);
		};

		/**
		 * Create a DOM element to display tasks
		 * @param  {[type]} task [description]
		 * @param  {[type]} list [description]
		 * @return {[type]}      [description]
		 */
		var showTask = function (task, list) {
			var newItem = document.createElement('li');
			var checked = (task.complete == 1) ? ' checked="checked"' : '';

			newItem.innerHTML = 
				'<div class="item_complete">'+
				'<input type="checkbox" name="item_complete" '+
				'id="chk_'+task.id+'"'+checked+'>'+
				'</div>'+
				'<div class="item_delete">'+
				'<a href="#" id="del_'+task.id+'">Delete</a>'+
				'</div>'+
				'<div class="item_title">'+task.desc+'</div>'+
				'<div class="item_due">'+task.due+'</div>';
			list.appendChild(newItem);

			var markAsComplete = function(e) {
				e.preventDefault();
				var updatedTask = {
					id: task.id,
					desc: task.desc,
					descUpper: task.desc.toUpperCase(),
					due: task.due,
					complete: e.target.checked
				};
				updateTask(updatedTask);
			};

			var remove = function(e) {
				e.preventDefault();
				if(confirm('Deleting task. Are you sure?', 'Delete')) {
					deleteTask(task.id);
				}
			};
			// Add event handlers to check box and remove button
			document.getElementById('chk_'+task.id).onchange = markAsComplete;
			document.getElementById('del_'+task.id).onclick = remove;
		};

		// Load all tasks from IndexedDB
		var loadTasks = function(q) {
			var taskList = document.getElementById('task_list');
			var query = q || '';
			taskList.innerHTML = '';

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
					i++;
					showTask(result.value, taskList);
					result['continue'](); 	// Note use of ['continue'] here to 
													// avoid conflict with JS keyword continue
				};
				tx.oncomplete = function(e) {
					if(i === 0) { createEmptyItem(query, taskList); }
				};
			} else if (webSQLSupport) {
				db.transaction(function(tx) {
					var sql, args = [];
					if(query.length > 0) {
						sql = 'SELECT * FROM tasks WHERE desc LIKE ?';
						args[0] = query +'%';
					} else {
						sql = 'SELECT * FROM tasks';
					}
					var iterateRows = function(tx, results) {
						var i = 0, len = results.rows.length;
						for(;i<len;i++) {
							showTask(results.rows.item(i), taskList);
						}
						if(len === 0) { createEmptyItem(query, taskList); }
					};
					tx.executeSql(sql, args, iterateRows);
				});
			}
		};

		// Function to search through tasks given a query
		var searchTasks = function(e) {
			e.preventDefault();
			var query = document.forms.search.query.value;
			if(query.length > 0) {
				loadTasks(query);
			} else {
				loadTasks();
			}
		};
		// Add event listener on submit of a search
		document.forms.search.addEventListener('submit', searchTasks, false);

		var insertTask = function(e) {
			e.preventDefault();
			var desc = document.forms.add.desc.value;
			var dueDate = document.forms.add.due_date.value;
			if (desc.length > 0 && dueDate.length > 0) {
				var task = {
					id: new Date().getTime(),
					desc: desc,
					descUpper: desc.toUpperCase(),
					due: dueDate,
					complete: false
				};

				if (indexedDB) {
					var tx = db.transaction(['tasks'], 'readwrite');
					console.log('tx ', tx);
					var objectStore = tx.objectStore('tasks');
					console.log('objectStore ', objectStore);
					var request = objectStore.add(task);
					tx.oncomplete = updateView;
				} else if (webSQLSupport) {
					db.transaction(function(tx) {
						var sql = 'INSERT INTO tasks (desc, due, complete) ' + 
									'VALUES(?,?,?)';
						var args = [task.desc, task.due, task.complete];
						tx.executeSql(sql, ars, updateView);
					});
				}
			} else {
				alert('Please fill out all fields', 'Add task error');
			}
		};

		// Clears out form and changes location.hash to #list
		function updateView() {
			loadTasks();
			alert('Task added successfully', 'Task Added');
			document.forms.add.desc.value = '';
			document.forms.add.due_date.value = '';
			location.hash = '#list';
		}
		// Event listener for submit of adding a task
		document.forms.add.addEventListener('submit', insertTask, false);

		/**
		 * updating and deleting tasks
		 */
		
		var updateTask = function(task) {
			if(indexedDB) {
				var tx = db.transaction(['tasks'], 'readwrite');
				var objectStore = tx.objectStore('tasks');
				var request = objectStore.put(task);
			} else if (webSQLSupport) {
				var complete = (task.complete) ? 1 : 0;
				db.transaction(function(tx) {
					var sql = 'UPDATE tasks SET complete = ? WHERE id = ?';
					var args = [complete, task.id];
					tx.executeSql(sql, args);
				});
			}
		};

		var deleteTask = function(id) {
			if(indexedDB) {
				var tx = db.transaction(['tasks'], 'readwrite');
				var objectStore = tx.objectStore('tasks');
				var request = objectStore['delete'](id);
				tx.oncomplete = loadTasks;
			} else if (webSQLSupport) {
				db.transaction(function(tx) {
					var sql = 'DELETE FROM tasks WHERE id = ?';
					var args = [id];
					tx.executeSql(sql, args,loadTasks);
				});
			}
		};

		// Drop the entire DB - called in resetSettings above
		var dropDatabase = function() {
			if(indexedDB) {
				var delDBRequest = indexedDB.deleteDatabase('tasks');
				delDBRequest.onsuccess = window.location.reload();
			} else if (webSQLSupport) {
				db.transaction(function(tx) {
					var sql = 'DELETE FROM tasks';
					tx.executeSql(sql, [], loadTasks);
				});
			}
		};

		/**
		 * Application caching settings - watches for changes to tasks.appcache file
		 */
		if('applicationCache' in window) {
			var appCache = window.applicationCache;
			appCache.addEventListener('updateready', function () {
				appCache.swapCache();
				if(confirm('App update is available. Update now?')) {
					window.location.reload();
				}
			}, false);
		}

	};


	/**
	 * On page load create new Tasks
	 */
	window.addEventListener('load', function() {
		new Tasks();
	}, false);

}) ();