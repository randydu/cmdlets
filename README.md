cmdlets
=======

nodejs based cmdlet system

A simple command-oriented system

features:

- cmd execution order serial or parallel;
- cmd configuration;
- cmd timing;
- cmd parameters;
- cmd group;
- cmd delay / repeat;
- four types of cmd::run();

Example
-------

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
            sync: true, //sync version

            run(){ 
                srv.message('bar >>');
            }
        });

        srv.installCmd({
            name: 'zoo',
            help: 'demo of promise',

            run(){
                srv.message('zoo >>');
                return Promise.resolve();
            }
        });

        srv.installCmd({
            name: 'dummy',
            help: 'demo of async method',

            async run(){
                srv.message(' dummy >>');
                return 0;
            }
        });

        //explicitly specify group to override default one (foobar)
        srv.installCmd({
            name: 'add',
            group: 'math',
            help: 'addition, ex: add( a, b)=> a+b',
            async run(a, b){
                srv.message(`${a}+${b}=${a + b}`);
            }
        });

        srv.installCmd({
            name: 'sub',
            group: 'math',
            help: 'substraction, ex: sub( a: 2, b: 1)=> a-b',
            async run({a, b}){
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

- run cmd with named param list

```bash
node index "sub(a:1, b:2)"
```

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


ENVIRONMENT
-----------

- SHOW_HIDDEN_CMD (1|0*)
  if set to *1*, display all hidden cmds on the menu; default 0;

show hidden cmds:

```bash
SHOW_HIDDEN_CMD=1 node index
```