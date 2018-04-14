'use strict';

module.exports = {
    init(srv){
        srv.installCmd({
            name: 'add',
            group: 'math',
            help: 'addition, ex: add( a, b)=> a+b',
            async run(a, b){
                srv.message(`${a}+${b}=${(+a)+(+b)}`);
            }
        });

        srv.installCmd({
            name: 'sub',
            group: 'math',
            help: 'substraction, ex: sub( a: 2, b: 1)=> a-b',
            async run({a, b}){
                //srv.message(`${a}-${b}=${(+a)-(+b)}`);
                srv.message(`${a}-${b}=${a-b}`);
            }
        })
    }
}