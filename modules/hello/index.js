'use strict';

module.exports = {
    init(srv){
        srv.installCmd({
            name: "hello",
            help: "Say Hello World (DEMO)",
            
            run: (cb)=>{
                //access local config
                srv.message(`Hello ${srv.etc.hello.who}!\n`);
                cb();
            }
        });
    }
};