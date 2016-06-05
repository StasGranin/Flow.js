/*!
 * Flow.js v1.0.0 - A small JavaScript callbacks synchronizer
 * Copyright (c) Stas Granin - https://github.com/StasGranin/Flow.js
 * License: MIT
 */

(function()
{
	var Flow = function (tasks, options)
	{
		var _this = this; // For some strange reason UglifyJS doesn't mangle 'this', therefore we have to assign it to a variable to optimize minimized output.

		_this._currentTaskIndex = 0;
		_this._batch = 0;
		_this._syncCounter = 0;
		_this._registeredSyncTask = null;
		_this._isAsyncRegistered = false;
		_this._isFlowRunning = false;
		_this._isFlowComplete = false;

		_this._tasks = tasks || [];
		_this._options = options = options || {};

		options.defaultSync = options.defaultSync || false;
		options.onProgress = options.onProgress || _noop;
		options.onFail = options.onFail || _noop;
		options.onComplete = options.onComplete || _noop;
	};

	Flow.prototype =
	{
		/* --- Private methods --- */

		_processNext: function(invokingBatch)
		{
			var _this = this;
			var task;

			if (_this._isFlowRunning && invokingBatch === _this._batch)
			{
				task = _this._tasks[++_this._currentTaskIndex];

				if (_this._currentTaskIndex === _this._tasks.length - 1)
				{
					_this._isFlowComplete = true;
				}

				if (task)
				{
					if ((_this._options.defaultSync && task.sync !== false || task.sync === true) && _this._syncCounter > 0)
					{
						_this._registeredSyncTask = task;
						_this._isAsyncRegistered = true;
					}
					else
					{
						_this._executeTask(task, undefined, invokingBatch);
					}
				}
			}
		},

		_executeTask: function(task, retry, invokingBatch)
		{
			var _this = this;
			var isRetrying = retry !== undefined;
			var fn;

			!isRetrying && _this._syncCounter++;

			if (retry === undefined)
			{
				retry = task.failRetries;
			}

			if (task.flow && task.flow instanceof Flow)
			{
				fn = function(success, fail)
				{
					return task.flow.restart(success, fail)
				};
			}
			else if (task.fn && typeof task.fn === 'function')
			{
				fn = task.fn;
			}

			fn(function() // Success callback
			{
				_this._successCallback(Array.prototype.slice.call(arguments, 0), task, retry, invokingBatch);
			}, function() // Fail callback
			{
				_this._failCallback(Array.prototype.slice.call(arguments, 0), task, retry, invokingBatch);
			});

			!isRetrying && _this._processNext(invokingBatch);
		},

		_successCallback: function(args, task, retry, invokingBatch)
		{
			var _this = this;
			var success = task.success || _noop;
			var result;

			if (_this._isFlowRunning && invokingBatch === _this._batch)
			{
				result = success.apply(null, args);

				if (result instanceof Error)
				{
					args.unshift(result);

					_this._failCallback(args, task, retry, invokingBatch);
				}
				else
				{
					_this._options.onProgress(result);

					_this._sync(invokingBatch);
				}
			}
		},

		_failCallback: function(args, task, retry, invokingBatch)
		{
			var _this = this;
			var fail = task.fail || _this._defaultFailCallback;
			var error;
			var retryInterval = task.retryInterval;

			if (_this._isFlowRunning && invokingBatch === _this._batch)
			{
				error = fail.apply(null, args);

				if (retry)
				{
					if (retryInterval)
					{
						if (typeof retryInterval === 'function')
						{
							retryInterval = retryInterval(retry);
						}

						setTimeout(function()
						{
							_this._executeTask(task, --retry, invokingBatch);
						}, parseInt(retryInterval) || 0);
					}
					else
					{
						_this._executeTask(task, --retry, invokingBatch);
					}
				}
				else
				{
					if (task.continueOnFail)
					{
						_this._sync(invokingBatch);
					}
					else
					{
						_this._isFlowRunning = false;
						_this._options.onFail(error);
						_this.executeFail && _this.executeFail(error);
					}
				}
			}
		},

		_sync: function(invokingBatch)
		{
			var _this = this;

			setTimeout(function()
			{
				if (_this._isFlowRunning && invokingBatch === _this._batch)
				{
					_this._syncCounter--;

					if (_this._syncCounter === 0)
					{
						if (_this._isAsyncRegistered)
						{
							_this._isAsyncRegistered = false;

							_this._executeTask(_this._registeredSyncTask, undefined, invokingBatch);
						}

						if (_this._isFlowComplete) // end of tasks
						{
							_this._flowComplete();
						}
					}
				}
			}, 0);
		},

		_flowComplete: function()
		{
			var _this = this;

			_this._isFlowRunning = false;

			_this._options.onComplete();
			_this.executeComplete && _this.executeComplete();
		},

		_defaultFailCallback: function(error)
		{
			return error;
		},


		/* --- Public methods --- */

		execute: function(success, fail)
		{
			var _this = this;

			if (!_this._isFlowRunning)
			{
				_this._batch++;
				_this._currentTaskIndex--;
				_this._isFlowComplete = false;
				_this._isFlowRunning = true;
				_this.executeComplete = success;
				_this.executeFail = fail;

				_this._processNext(_this._batch);
			}

			return _this;
		},

		restart: function(success, fail)
		{
			var _this = this;

			_this._currentTaskIndex = 0;
			_this._isFlowRunning = false;
			_this._syncCounter = 0;
			_this._registeredSyncTask = null;
			_this._isAsyncRegistered = false;
			_this._isFlowComplete = false;

			_this.execute(success, fail);

			return _this;
		},

		stop: function()
		{
			var _this = this;

			_this._isFlowRunning = false;
			_this._batch++;

			return _this;
		},

		push: function(tasks)
		{
			var _this = this;

			if (tasks instanceof Array)
			{
				Array.prototype.push.apply(_this._tasks, tasks);
			}
			else
			{
				_this._tasks.push(tasks);
			}

			return _this;
		},

		pushAndExecute: function(tasks, success, fail)
		{
			var _this = this;

			_this.push(tasks);
			_this.execute(success, fail);

			return _this;
		}
	};


	function _noop() {} // Empty function


	if (typeof exports !== 'undefined') // Node JS
	{
		if (typeof module !== 'undefined' && module.exports)
		{
			exports = module.exports = Flow;
		}

		exports.Flow = Flow;
	}
	else // Browser
	{
		if (this.Flow)
		{
			throw new Error('Flow variable is already assigned');
		}
		else
		{
			this.Flow = Flow;
		}
	}
}.call(this));
