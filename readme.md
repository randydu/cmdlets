# cmdlets

nodejs based cmdlet system

A simple command-oriented system

features:

- cmd execution order: serial or parallel;
- cmd timing;
- cmd parameters;
- cmd group;
- cmd delay / repeat;
- four types of cmd::run();

For a cmdlet based console, please refer to npm package: [cmd-console](https://www.npmjs.com/package/cmd-console)

## Table of Contents

- [Cmdlet Module](#module)
- [Cmdlet Group](#group)
- [Cmdlet Object](#cmdlet)
- [Cmdlets API](#API)
- [Example](#Example) 
- [Environment](#env)
- [Built-in Cmdlet](#built-in-cmds)

## Cmdlet Module <a name="#module"></a>

A cmdlet module acts as a *physical* container for a group of related cmdlet objects.

It is bascially a plugin that can be downloaded, deployed and loaded at runtime by cmdlets.

Being a standard nodejs module that can be *required*, the **module.exports** must expose an **init()** function in which all local cmdlets can be installed:

```
my_module/
    index.js
```

```javascript

my_module/index.js:

module.exports = {
    init(cmdlets){
        //do any module-specific initial logic.
        ...
        
        cmdlets.installCmd({
            name: 'cmd1',
            help: 'demo 1',
            run(){}
        });

        cmdlets.installCmd({
            name: 'cmd2',
            help: 'demo 2',
            run(){}
        });

        ...
    }
}
```

A cmdlet module can be deployed under a common folder (for example, "plugins"):

```
plugins/
├── module_1
│   └── index.js
├── module_2
│   └── index.js
└── module_3
    └── index.js
```

And in your source code all of the plugin modules can be loaded as follows:

```javascript
cmdlets.addModuleDir(full_path_to_plugins);
```

Or you can also load an individual module by calling api:

```javascript
cmdlets.addModule(full_path_to_module, group_name);
```

According to your business requirement, extra meta data can be added to a module. For example, a manifest file in the package to define the group name, a version tag to help upgrade to the latest version, a download url to fetch the new releases.

## Cmdlet Group <a name="#group"></a>

A cmdlet group is a *virtual* container for a subset of related cmdlet objects, which are grouped and displayed together
on the help menu.

A cmdlet belongs to one and only one group;

A cmdlet is implemented and deployed in one and only one module;

A module can host cmdlets of different groups;

You can think of cmdlet group as a unique _namespace_ of modern OOP langurage, and cmdlet module is an code assembly or library to host cmdlets.


## Cmdlet Object <a name="#cmdlet"></a>

A cmdlet object has the following members:

- **name**: string, command name, must be unique in the installed commands; 
- **help**: string, long description displayed in the top menu;
- **group**: string [*optional*], the group this command belongs to. If not specified, the current module name is used.

- **hidden**: boolean [*optional*, default to __false__]

    A hidden cmdlet:
    1. will not appear on the help menu;
    2. no pre-run title, post-run feedback and timing summary;

    all built-in cmdlets are hidden.

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

To run a cmdlet programmatically in source code:

```javascript
cmdlets.getCmd('add').run(1,2);
```

or use the universal cmdlet running api as follows:

```javascript
//promise-style
cmdlets.run('add(1,2)').then(result =>...)

//new await-style
let result = await cmdlets.run('add(1,3)');
```

The first calling method looks simple but you have to ensure the calling protocol is matched to the run() function, because
it might accept parameters and works in async or sync workflow --- your calling site must have exact knowledge of what the cmdlet is doing.

However, the second calling method will *adapt* all cmdlet.run() method as a function returning a promise, so it is easier to call especially when the input is from end user, and you have no knowledge of how the cmdlet is implemented. 

## Cmdlets API

<a name="API"></a>

```javascript
const cmdlets = require("cmdlets");
```

1. [SYNC] cmdlets.__addModule(module_path, [group_name])__

   Loads a cmdlet module from a file path.

   Basically the module loading workflow is: __require__(module_path).__init__(cmdlets)

   The optional *group_name* is the default *group* name of the installed command when the module is being loaded, unless
   the group name is explicitly defined by the cmdlet object.

   If the *group_name* is not specified, the basename of the *module_path* is used as default group name.

   ```javascript
     //group name is "myapp.system"
     cmdlets.addModule('/opt/myapp/modules/sys', 'myapp.system');
     //group name is "sys"
     cmdlets.addModule('/opt/myapp/modules/sys');
   ```

2. [SYNC] cmdlets.__addModuleDir(path)__

   Loads all command modules under a path, it scans (non-recursively) the folder and calls *addModule* to load each module.

   When loading a module from a sub-folder, the *group name* is the sub-folder's basename by default, unless
   the it is explicitly specified by the cmdlet object being installed.

3. [SYNC] cmdlets.__installCmd(cmdlet)__

    Install a cmdlet object. It is usually called when the cmdlet's module is being loaded. You can also call it to add
    any cmdlet in your source code.

4. [SYNC] cmdlets.__getCmd(cmdlet_name): cmdlet__

   find cmdlet object by its name. return *null* if not found.

   ```javascript
   cmdlets.getCmd('hello').run('world');
   ```

5. [SYNC] cmdlets.__getCmds(filter)__: array of cmdlet object;

    return a subset of installed cmdlets.
 
    filter := function(cmd): boolean;

    filter function returns true if the cmd should be included in the result.

    ```javascript
        cmdlets.getCmds(cmd => true); //all cmds
        cmdlets.getCmds(cmd => !cmd.hidden); //visible cmds
        cmdlets.getCmds(cmd => cmd.group === 'utility'); //cmds of group utility
    ```

6. [ASYNC] cmdlets.__run([args])__

   Execute command(s), returns a *promise*. 
   
   it can be invoked as following:

- **run()**: executes process command line;

  the commands specified by the process command line are executed.

- **run(cmdlet_name)**: executes a single command;

    ```javascript
    cmdlets.run('hello(world)')
    ```

- **run([cmd1, cmd2, ...])**: executes multiple cmds in parallel;

    ```javascript
    cmdlets.run(['foo*bar', 'add(1,2)'])
    ```

7. Message output with different color scheme

- cmdlets.__message__(message);
- cmdlets.__warning__(message);
- cmdlets.__error__(message);
- cmdlets.__success__(message);


## Example

<a name="Example"></a>

In this sample, we will develop a demo cmdlet in foobar sub-folder "foobar":

./foobar/index.js:

```javascript

module.exports = {
    init(srv){
        //install commands (default group: 'foobar' specified in srv.addModule())
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
cmdlets.addModule(__dirname + '/foobar');

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

## Built-in Cmdlets <a name="built-in-cmds"></a>

1. __delay(seconds)__: delay a period of time before next cmdlet is executed.

    ```javascript
    cmdlets.run("foo * delay(5) * bar");
    ```

    Executes cmdlet foo first, then delay 5 seconds before cmdlet bar start running.


2. __repeat(times, [interval=0])__: repeat running a cmdlet multiple times with a time interval.

    ```bash
    node index "foo * repeat(100, 60)"
    ```

    Repeat running cmdlet foo 100 times with a 60 seconds delay in between.


3. __help([group_name])__: show help menu of a group.

    If *group_name* is not specified, the top menu is displayed. 

    ```bash
    # show top menu
    node index help

    # show sub-menu of system group
    node index help[system]
    ```
