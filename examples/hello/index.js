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
            
            run(){
                srv.message('Hello BAR!\n');
            }
        });

        srv.installCmd({
            name: "dummy",
            help: "async dummy demo",
            group: 'dummy', //explicit group name
            
            async run(){
                srv.message('dummy!\n');
            }
        });
    }
};