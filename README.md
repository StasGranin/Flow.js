# Flow
Flow is a small yet powerfull callback syncronizer for browsers and Node JS.
A powerful alternative to Promise based structure, Flow offers you greater control, cleaner syntax and consistency across 
various platforms, all in a tiny package with virtually no overhead.


```javascript
new Flow(
[
    {fn: loadTemplate, success: parseTemplate},
    {fn: getUserData, success: processUserData},
    {fn: rederUI, sync: true},
    {fn: getUserAlbums, success: processUserAlbums},
    {fn: getAlbumImages, success: renderAlbumImages, sync: true}
]).execute();
```

## Contents
* [Tasks](#tasks)
    * [Anatomy of a task](#anatomyOfTheTask)   
    * [Task properties](#taskProperties) 
        * [fn](#fn)
        * [flow](#flowProp)
        * [success](#success)
        * [fail](#fail)
        * [sync](#sync)
        * [failRetries](#failRetries)
        * [retryInterval](#retryInterval)
        * [continueOnFail](#continueOnFail)
* [Options](#options)
* [Methods](#methods)
    * [execute()](#execute)
    * [push()](#push)
    * [pushAndExecute()](#pushAndExecute)
    * [stop()](#stop)
    * [restart()](#restart)
* [Examples](#examples)
    * [Simple images pre-loading](#imagesPreloading)
* [Contributors](#contributors)
* [License](#license)


<br/>
## Tasks <a name="tasks"></a>
When creating a new Flow object you provide it with an `array` of tasks. 
A task can be a function with callbacks (an AJAX call for example) or another sub-flow.
Flow is not a queue - tasks in the flow will execute in **parallel** by [default](#sync). 


#### Anatomy of a task <a name="anatomyOfTheTask"></a>
A task is an `object` with a number of attributes that define its behavior.
Example:
```javascript
{fn: getUserAlbums, success: processUserAlbums, fail: onError}
```

#### Task properties <a name="taskProperties"></a>

| Property | Description | Accepts | Default |
| --- | --- | --- | --- |
| [`fn`](#fn) | A function to be executed. | `function` | N/A |
| [`flow`](#flowProp) | A sub-flow to be executed. If provided, `fn` will be ignored. | `new Flow()` | N/A |
| [`success`](#success) | A callback function to execute when the task is to be completed. | `function` | Empty `function(){}` |
| [`fail`](#fail) | A callback function to execute when if the task fails for any reason. Under default conditions executing `fail()` will stop the flow. | `function` | Empty `function(){}` |
| [`sync`](#sync) | If set as `true` will cause the task to await the completion of all previous tasks in the flow before executing. | `boolean` | `false` or `true` if `defaultSync` options is used |
| [`failRetries`](#failRetries) | The number of times to repeat the task in case of failing. | `integer` | `0` |
| [`retryInterval`](#retryInterval) | An interval (in miliseconds) betwin retry attempts. Used in conjunction with `failRetries`. | `integer` or `function` | `0` |
| [`continueOnFail`](#continueOnFail) | If set as `true` the failing of the task will not cause the entire flow to fail. | `boolean` | `false` |


</br>
- **fn** <a name="fn"></a>

    > *Accepts:* `function(success, fail)`

    A function to be executed. The function receives a mandatory [`success`](#success) and an optional [`fail`](#fail) functions.
    ```javascript
    function myFunction(success)
    {
        setTimeout(function()
        {
            success('Completed', 1, true);
        }, 1000);
    }
    
    new Flow(
    [
        {fn: myFunction}
    ]);
    
    // Log: 
    // Completed 1 true
    ```
    
    As we can see from the example above, after 1000 milliseconds we execute the `success` function with attributes we want it to receive.
    
    **Please note:** Execution of the `success` or `fail` function is **mandatory**, otherwise the task will not finish and the flow will never be completed.
    
    Let's see another example using [*jQuery*](http://jquery.com) to get AJAX data.
    
    ```javascript
    function getUserAlbums(success, fail)
    {
        $.ajax(
        {
            url: '/get-user-albums'
            success: success,
            fail: fail
        });
    }
    
    new Flow(
    [
        {fn: getUserAlbums}
    ]);
    ```
    
    In this example we assign our `success` and `fail` functions as parameters of the `$.ajax()` function. As stated above, the `fail` function is optional.
    
    **Please note:** Unless stated [otherwise](#continueOnFail) execution of the `fail` function will cause the flow to stop and trigger the [`onFail`](#options) function.
    
    
</br>
- **flow** <a name="flowProp"></a>
    
    > *Accepts:* `new Flow()`

    As an alternative to executing an [`fn`](#fn) function, we can give the task a sub-flow to execute instead. If `flow` is defined, `fn` value will be ignored.
    
    ```javascript
    function myFunction(success)
    {
        setTimeout(function()
        {
            success('Completed', 1, true);
        }, 1000);    
    }
    
    function myFunctionSuccess(param1, param2, param3)
    {
        console.log(param1, param2, param3);
    }
    
    function subFlowSuccess()
    {
        console.log('Sub-flow complete!');
    }
    
    var subFlow = new Flow(
    [
        {fn: myFunction, success: myFunctionSuccess}
    ]);
    
    new Flow(
    [
        {flow: subFlow, success: subFlowSuccess}
    ]);
    
    // Log: 
    // Completed  1  true
    // Sub-flow complete!
    ```
    
    
</br>
- **success** (optional) <a name="success"></a>
    
    > *Accepts:* `function(attributes)`
    
    A callback function that is passed as the first parameter of the [`fn`](#fn) function of the task. Executing it will successfully finish the task and trigger the [`onProgress`](#options) function, unless `new Error()` is returned. This function is optional (if not defined, an empty function will be passed instead) and can receive any number of parameters.

    ```javascript
    function myFunction(success)
    {
        setTimeout(function()
        {
            success('Completed', 1, true); // myFunctionSuccess() function is executed with parameters
        }, 1000);    
    }
    
    function myFunctionSuccess(param1, param2, param3)
    {
        console.log(param1, param2, param3);
    }
    
    new Flow(
    [
        {fn: myFunction, success: myFunctionSuccess}
    ]);
    
    // Log: 
    // Completed  1  true
    ```

    
    * Returning `new Error()` by the function is equal to executing the [`fail`](#fail) function.
    * The [`onProgress`](#options) function will receive anything returned by `success`.
  
    
</br>    
- **fail** (optional) <a name="fail"></a>

    > *Accepts:* `function(error)`
    
    A callback function that is passed as the second parameter of the [`fn`](#fn) function of the task. Executing it will cause the task to fail and under default conditions fail the flow and trigger the [`onFail`](#options) function. This function is optional. Any result returned by this function will be passed to the `onFail` function.
    
    ```javascript
    function myFunction(success, fail)
    {
        setTimeout(function()
        {
            fail('Something went wrong!');
        }, 1000);    
    }
    
    function logError(error)
    {
        console.log(error)
    }
    
    new Flow(
    [
        {fn: myFunction, fail: logError}
    ]).execute();
    
    // Log: 
    // Something went wrong!
    ```
  
  
</br>    
- **sync** (optional) <a name="sync"></a>

    > *Accepts:* `boolean`
    >
    > *Default:* `false` or `true` if [`defaultSync`](#defaultSync) options is used.
    
    
    When the task is set as 'sync', its execution will be delayed until all the tasks before it had completed.
    
    ```javascript
    
    function test1(success)
    {
        setTimeout(function()
        {
            success('Test1 complete');
        }, 2000);    
    }
    
    function test2(success)
    {
        setTimeout(function()
        {
            success('Test2 complete');
        }, 1000);    
    }
    
    function test3(success)
    {
        success('Test3 complete');  
    }
    
    function logResult(result)
    {
        console.log(result);
    }
    
    // No sync is used
    new Flow(
    [
        {fn: test1, success: logResult},
        {fn: test2, success: logResult},
        {fn: test3, success: logResult}
    ]).execute();
    
    // Log:
    // Test3 complete
    // Test2 complete
    // Test1 complete
    
    
    // The last task is defined as sync
    new Flow(
    [
        {fn: test1, success: logResult},
        {fn: test2, success: logResult},
        {fn: test3, success: logResult, sync: true}
    ]).execute();
    
    // Log:
    // Test2 complete
    // Test1 complete
    // Test3 complete
    ```
    
    
</br>    
- **failRetries** (optional) <a name="failRetries"></a>

    > *Accepts:* `integer`
    >
    > *Default:* `0`
    
    
    When we want to give the task a second chance to complete successfully after failing,  we can use `failRetries` to define how many times we want it to retry the task. It is important to note that the number represents a number of times to retry the task *after* the task has failed the first time (i.e. setting `failRetries: 2` will cause the task to execute additional two times).
    
    ```javascript
    var num = 0;
    
    function myFunction(success, fail)
    {
        num++;
        
        if (num % 3 > 0)
        {
            fail(num + ' is not divisible by 3');
        }
        else
        {
            success('Great success! ' + num + ' is divisible by 3');
        }
    }
    
    function logSuccess(result)
    {
        console.log(result);
    }
    
    function logError(error)
    {
        console.log(error);
    }
    
    
    new Flow(
    [
        // Give the task another 2 attempts to succeed
        {fn: myFunction, success: logSuccess, fail: logErrors, failRetries: 2} 
    ]);
    
    // Log: 
    // 1 is not divisible by 3
    // 2 is not divisible by 3
    // Great success! 3 is divisible by 3
    ```
    
    
</br>    
- **retryInterval** (optional) <a name="retryInterval"></a>

    > *Accepts:* `integer` or `function`
    >
    > *Default:* `0`
    
    
   Used in conjunction with [`failRetries`](#failRetries), we can delay the execution of another retry by a defined amount of milliseconds. We can instead pass a function to dynamically modify the delay time (this function must return a number).
   
   ```javascript
    var num = 0;
    
    function myFunction(success, fail)
    {
        num++;
        
        if (num % 3 > 0)
        {
            fail(num + ' is not divisible by 3');
        }
        else
        {
            success('Great success! ' + num + ' is divisible by 3');
        }
    }
    
    function setRetryInterval()
    {
        return num * 1000;
    }
    
    function logSuccess(result)
    {
        console.log(result);
    }
    
    function logError(error)
    {
        console.log(error);
    }
    
    
    new Flow(
    [
        // Dynamically set the retry interval
        {fn: myFunction, success: logSuccess, fail: logErrors, failRetries: 2, retryInterval: setRetryInterval} 
    ]);
    
    // Log: 
    // 1 is not divisible by 3
    //
    // (After 1000ms)
    // 2 is not divisible by 3
    //
    // (After 2000ms)
    // Great success! 3 is divisible by 3
    ```
    
    
</br>    
- **continueOnFail** (optional) <a name="continueOnFail"></a>

    > *Accepts:* `boolean`
    >
    > *Default:* `false`
    
    
    Setting this as `true` will not cause a failed task to fail the entire flow. If ['failRetries'](#failRetries) is used, the task will still attempt to perform retries.
    
    
    ```javascript
    
    function test1(success)
    {
        setTimeout(function()
        {
            success('Test1 complete');
        }, 2000);    
    }
    
    function test2(success, fail)
    {
        setTimeout(function()
        {
            fail('Test2 had failed!');
        }, 1000);  
    }
    
    function test3(success)
    {
        success('Test3 complete') ; 
    }
    
    function logResult(result)
    {
        console.log(result);
    }
    
    function logError(error)
    {
        console.log(error);
    }
    
    // This flow will not be completed, failing on test2
    new Flow(
    [
        {fn: test1, success: logResult},
        {fn: test2, success: logResult, fail: logError},
        {fn: test3, success: logResult, sync: true}
    ]).execute();
    
    // Log:
    // Test2 had failed!
    
    
    // This flow will be completed even though test2 is set to fail
    new Flow(
    [
        {fn: test1, success: logResult},
        {fn: test2, success: logResult, fail: logError, continueOnFail: true},
        {fn: test3, success: logResult, sync: true}
    ]).execute();
    
    // Log:
    // Test2 had failed!
    // Test1 complete
    // Test3 complete
    ```
    
<br/>    
## Options <a name="options"></a>
Options is the second parameter you can provide to the Flow constructor to define general callbacks and certain behaviors of your flow.
```javascript
new Flow([...], 
{
    onComplete: function()
    {
        console.log('Flow has completed successfully'),
    }, 
    onFail: function(error)
    {
        console.log('Flow has failed:', error);
    }, 
    onProgress: function(result)
    {
        console.log('Task returned result:', result);
    }
}).execute();
```

| Option | Description | Accepts | Default |
| --- | --- | --- | --- |
| [`onComplete`](#onComplete) | A callback function to be executed after each successful execution of the flow. | `function` | N/A |
| [`onFail`](#onFail) | A callback function to be executed each time the entire flow fails. If the [`fail`](#fail) function of the failed task returns a value, this value will be passed to the `onFail` function | `function` | N/A |
| [`onProgress`](#onProgress) |  A callback function that will execute each time a task completes successfully. If the [`success`](#success) function of the task returns any value except `new Error()`, this value will be passed to the `onProgress` function. | `function` | N/A |
| [`defaultSync`](#defaultSync) | If set as `true`, `defaultSync` will cause all tasks to become [sync](#sync) by default. | `boolean` | `false` |


<br/>
## Methods <a name="methods"></a>
Methods are functions used to execute, stop or add tasks to the flow. Methods can be chained.

| Method | Description | Parameters |
| --- | --- | --- |
| [`execute()`](#execute) | Starts the execution of the flow. | Accepts two optional functions for complete and fail callbacks. |
| [`push(tasks)`](#push) | Pushes tasks to the end of the task list. | Can accept a single task object or an array of tasks. |
| [`pushAndExecute(tasks)`](#pushAndExecute) | A shorthand method, equals `flow.push(tasks).execute()`. | Accepts tasks as a first parameter and optional callbacks as second and third. |
| [`stop()`](#stop) | Stops the execution of the flow and prevents the execution of callbacks of currently executing tasks. | N/A |
| [`restart()`](#restart) | Restarts the execution of the flow. | Accepts two optional functions for complete and fail callbacks. |

- **execute()** <a name="execute"></a>

    > *Optional:* `complete` and `fail` callback functions

    This method starts the execution of the flow.
    
    **Please note:** The optional `complete` and `fail` callbacks will execute in addition to the `onComplete` and `onError` functions we define in the [options]('#options'). The main difference is that `execute(complete, fail)` callbacks will execute only once, while the ones we set in the options will execute every time the flow completes or fails.
    
    ```javascript
    function onExecuteComplete()
    {
        console.log('Flow execution was completed');
    }
    
    var flow = new Flow([...], 
    {
        onComplete: function()
        {
            console.log('Done and done'),
        }
    });
    
    flow.execute(onExecuteComplete);
    
    // Log:
    // Done and done
    // Flow execution was completed
    ```
   
   **Please note:** It is not advised to use `execute()` on a flow that was stopped by the [`stop()`](#stop) method or by previously [failing](#fail). This is because there is no reliable way to determine the exact stopping point in the tasks list. Use `execute()` only on flows that were completed and after [pushing](#push) additional tasks, otherwise use [`restart()`](#restart).
   
  
<br/>    
- **push()** <a name="push"></a>

    > *Required:* a task `object` or `array` of tasks

    This method is used to add additional tasks to the end of the tasks list of the flow.
    
    ```javascript
    var flow = new Flow([...]);
    
    flow.push({fn: test1}).push(
    [
        {fn: test2},
        {fn: test3},
        {fn: test4}
    ]).execute();
    ```
   
  
<br/>    
- **pushAndExecute()** <a name="pushAndExecute"></a>

    > *Required:* a task `object` or `array` of tasks
    >
    > *Optional:* `complete` and `fail` callback functions

    This is a shorthand method, equals `flow.push(...).execute()`.
   
    
<br/>    
- **stop()** <a name="stop"></a>

    This method will stop the execution of the flow and prevent any currently executing tasks from executing their callbacks.


<br/>      
- **restart()** <a name="restart"></a>

    > *Optional:* `complete` and `fail` callback functions

    Use this method to restart the flow from the first task.
    
    
<br/>
## Examples <a name="examples"></a>
- **Simple images pre-loading** <a name="imagesPreloading"></a>

    ```javascript
    
    var loadedImages = [];
    
    function loadImage(imageUrl, success, fail)
    {
        var image = new Image();

        image.onload = success;
        image.onerror = fail;
        image.src = imageUrl;
    }

    function addLoadedImageToArray(event)
    {
        loadedImages.push(event.target); // Push the loaded image to the loadedImages array for later use
    }

    function imageLoader(imageUrls)
    {
        var tasks = [];

        if (imageUrls && imageUrls.length)
        {
            // Create our tasks list by looping over the imageUrls array
            for (var i= 0, l=imageUrls.length; i<l; i++)
            {
                tasks.push(
                {
                    fn: loadImage.bind(null, imageUrls[i]), // We'll use function.bind to bind imageUrl attribute to the fn
                    success: addLoadedImageToArray,
                    continueOnFail: true // We do not want to fail the entire loading cycle if one of our images fails to load
                });
            }

            new Flow(tasks,
            {
                onComplete: function(a)
                {
                    // For the sake of this example, we'll add our loaded images to the BODY element
                    for (var i=0, l=loadedImages.length; i<l; i++)
                    {
                        document.body.appendChild(loadedImages[i]);
                    }
                }
            }).execute();
        }
    }

    // Lets load some images
    imageLoader(['images/1.jpg', 'images/2.jpg', 'images/3.jpg', 'images/4.jpg', 'images/5.jpg']);
    ```    

    
<br/>
## Contributors <a name="contributors"></a>
Special tanks to [Shane Goodson](https://github.com/Shane-IL) for helping me write this README and testing.

    
<br/>
## License <a name="license"></a>
This project is licensed under the MIT License - see the [LICENSE.txt](https://github.com/StasGranin/flow/blob/master/LICENSE.txt) file for details.
  
