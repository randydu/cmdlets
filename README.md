cmdlets
=======

nodejs based cmdlet system

A simple command-oriented system

features:

- flexible cmd execution order;
- cmd configuration;
- cmd timing;
- three types of cmd::run();

Example
-------

In this sample, we will develop a demo cmdlet in foobar sub-folder "foobar":

./foobar/index.js:

```javascript

module.exports = {
    init(srv){
        //install commands
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
node index.js

Available commands are:

    hello: Say Hello World
    foo: Say FOO
    bar: Say BAR
    dummy: async dummy demo
```


- run a single cmd

```bash
node index.js foo
```

- run cmds one by one

```bash
node index.js foo*bar
```

- run cmds in parallel

```bash
node index.js foo bar
```

- run cmds in mixed order

```bash
node index.js foo*bar hello
```

ENVIRONMENT
-----------

- SHOW_HIDDEN_CMD (1*|0)
  if set to *1*, display all hidden cmds on the menu; default 0;

 