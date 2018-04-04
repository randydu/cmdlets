'use strict';

module.exports = {
    init(srv){
        srv.installCmd({
            name: "hello",
            help: "Say Hello World",
            
            run(cb){
                srv.message('Hello World!\n');
                cb();
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
    }
};