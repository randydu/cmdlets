# cmdlets

nodejs based cmdlet system
==========================

A simple command-oriented system

features:

- flexible cmd execution order;
- cmd configuration;
- cmd timing;
- three types of cmd::run();


Example
=======

In this sample, we will develop a demo cmdlet in foobar sub-folder "foobar":

./foobar/index.js:
```
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

    }
}

```

./index.js
```
const cmdlets = require('cmdlets');

//install foobar module
cmdlets.loadModule('foobar', __dirname + '/foobar');

//parses & run cmds from command line
cmdlets.run();
```

Now we can invoke cmdlet "foo" and "bar" as following:

- show help menu
```
node index.js
```

- run a single cmd
```
node index.js foo
```
- run cmds one by one
```
node index.js foo*bar
```

- run cmds in parallel
```
node index.js foo bar
```
- run cmds in mixed order
```
node index.js foo*bar hello
```

