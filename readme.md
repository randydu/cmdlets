# cmdlets

nodejs based cmdlet system

A simple command-oriented system

features:

- cmd execution order serial or parallel;
- cmd timing;
- cmd parameters;
- cmd group;
- cmd delay / repeat;
- four types of cmd::run();


## Table of Contents

1. [API](#API) 
2. [Example](#Example) 
3. [Environment](#env)

## API

<a name="API"></a>

```javascript
const cmdlets = require('cmdlets');
```

1. (SYNC) cmdlets.__loadModule(module_name, module_path)__

   Loads a command module from a file path, it is a sync api. 

   Basically the module loading logic is: __require__(module_path).__init__(cmdlets)

   The *module_name* is the default *group* name of the installed command when the module is being loaded, unless
   the group name is explicitly specified in the command object.

2. (SYNC) cmdlets.__installCmd(command_object)__

    Install a command object.

    A command object has the following members:

    - **name**: string, command name, must be unique in the installed commands; 
    - **help**: string, long description displayed in the top menu;
    - **group**: string [*optional*], the group this command belongs to. If not specified, the current module name is used.
    - **run**: function, the function to be executed when the command is invoked.

      run() can be implemented in 4 ways:

      1. sync function;

        ```javascript
         run(whom){ console.log('hello ' + whom); }
        ```
      2. async function with classic callback;

        ```javascript
         run(callback){ do_something_complex(callback); }
        ```
      3. async function returns a promise;
      
        ```javascript
         run(loops){ return do_something_complex(loops) .then(console.log); }
        ```

      4. async function with new __async__ keyword; 
        ```javascript
         async run(){ return await do_something_complex(); }
        ```

3. (SYNC) cmdlets.__getCmd(command_name)__

   find command object by its name. return *null* if not found.

   ```javascript
   cmdlets.getCmd('hello').run('world');
   ```

4. (ASYNC) cmdlets.__run([args])__

   Execute command(s), returns a *promise*. 
   
   it can be invoked as following:

- **run()**: executes process command line;

  the commands specified by the process command line are executed.

- **run(cmd_name)**: executes a single command;

    ```javascript
    cmdlets.run('hello(world)')
    ```

- **run([cmd1, cmd2, ...])**: executes multiple cmds in parallel;

    ```javascript
    cmdlets.run(['foo*bar', 'add(1,2)'])
    ```



## Example

<a name="Example"></a>

In this sample, we will develop a demo cmdlet in foobar sub-folder "foobar":

./foobar/index.js:

```javascript

module.exports = {
    init(srv){
        //install commands (default group: 'foobar' specified in srv.loadModule())
        srv.installCmd({
            name: 'foo',
            help: 'demo of async-callback',

            run(cb){ //classic async callback
                srv.message('foo >>');
                cb();
            }
        });

        srv.installCmd({
            name: 'bar',
            help: 'demo of sync',
            run(){//sync 
                srv.message('bar >>');
            }
        });

        srv.installCmd({
            name: 'zoo',
            help: 'demo of promise',

            run(){//return promise
                srv.message('zoo >>');
                return Promise.resolve();
            }
        });

        srv.installCmd({
            name: 'dummy',
            help: 'demo of async method',

            async run(){//new async grammar
                srv.message(' dummy >>');
                return 0;
            }
        });

        //explicitly specify group to override default one (foobar)
        srv.installCmd({
            name: 'add',
            group: 'math',
            help: 'addition, ex: add( a, b)=> a+b',
            run(a, b){
                srv.message(`${a}+${b}=${(+a) + (+b)}`);
            }
        });

        srv.installCmd({
            name: 'sub',
            group: 'math',
            help: 'substraction, ex: sub( a: 2, b: 1)=> a-b',
            run({a, b}){
                srv.message(`${a}-${b}=${a - b}`);
            }
        })
    }
}

```

./index.js

```javascript

const cmdlets = require('cmdlets');

//install foobar module
cmdlets.loadModule('foobar', __dirname + '/foobar');

//parses & run cmds from command line
cmdlets.run();
```

Now we can invoke cmdlet "foo" and "bar" as following:

- show help menu

```bash
node index
```

The output will be grouped by group name and sorted by cmd name:

```
Available commands are:

[foobar]
    bar: Say BAR
    dummy: async dummy demo
    foo: Say FOO
    hello: Say Hello World
    zoo: demo of promise

[math]
    add: addition, ex: add( a, b)=> a+b
    sub: substraction, ex: sub( a: 2, b: 1)=> a-b
```


- run a single cmd

```bash
node index foo
```

- run cmds one by one

```bash
node index foo*bar
```

- run cmds in parallel

```bash
node index foo bar
```

- run cmds in mixed order

```bash
node index foo*bar hello
```

- run cmd with param list

```bash
node index "add(1,2)"
```

or

```bash
node index add[1,2]
```

the output is:

> 1+2=3

- run cmd with named param list

```bash
node index "sub(a:1, b:2)"
```

or

```bash
node index sub[a:1, b:2]
```

the output is:

> 1-2=-1

- repeat cmd

Repeat cmd "foo" three times with 5 seconds interval:

```bash
node index "foo * repeat(3, 5)"
```

Repeat cmd "bar" three times without delay (internal = 0):

```bash
node index "foo * repeat(3)"
```

- delay cmd

runs "foo" first, delays 10 seconds, then runs "bar" next.

```bash
node index "foo * delay(10) * bar"
```



## ENVIRONMENT 

<a name="env"></a>

- SHOW_HIDDEN_CMD (1|0*)
  if set to *1*, display all hidden cmds on the menu; default 0;

show hidden cmds:

```bash
SHOW_HIDDEN_CMD=1 node index
```

