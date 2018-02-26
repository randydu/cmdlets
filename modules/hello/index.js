'use strict';

module.exports = {
    init(srv){
        srv.installCmd({
            name: "hello",
            help: "Say Hello World (DEMO)",
            
            run: (srv, cb)=>{
                srv.message('Hello World!\n');
                cb();
            }
        });
    }
};