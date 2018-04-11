'use strict';

module.exports = {
    init(srv){
        srv.installCmd({
            name: "hello",
            help: "Say Hello, hello(whom)",
            
            run(whom, cb){
                srv.message(`Hello ${whom}!\n`);
                cb();
            }
        });

        srv.installCmd({
            name: "welcome",
            help: "Say Welcome, welcome(name: 'randy')",
            
            async run( args ){
                srv.message(`Welcome ${args.name}!\n`);
            }
        });

        srv.installCmd({
            name: "foo",
            help: "Say FOO",
            
            run(){
                srv.message('Hello FOO!\n');
                return Promise.resolve() ;
            }
        });

        srv.installCmd({
            name: "bar",
            help: "Say BAR",
            sync: true, //sync version
            
            run(){
                srv.message('Hello BAR!\n');
            }
        });

        srv.installCmd({
            name: "dummy",
            help: "async dummy demo",
            
            async run(){
                srv.message('dummy!\n');
                return;
            }
        });
        //explicitly specify group to override default one (foobar)
        srv.installCmd({
            name: 'add',
            group: 'math',
            help: 'addition, ex: add( a, b)=> a+b',
            async run(a, b){
                srv.message(`${a}+${b}=${(+a) + (+b)}`);
            }
        });

        srv.installCmd({
            name: 'sub',
            group: 'math',
            help: 'substraction, ex: sub( a: 2, b: 1)=> a-b',
            async run({a, b}){
                srv.message(`${a}-${b}=${(+a) - (+b)}`);
            }
        })
    }
};