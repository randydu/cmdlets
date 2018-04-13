'use strict';

function delay(seconds){
    return new Promise(resolve => {
        setTimeout(resolve, seconds*1000);
    })
}

module.exports = {
    init(srv){
        // "cmd1 * delay(5) * cmd2"
        srv.installCmd({
            name: 'delay',
            help: 'delay cmd execution, delay(seconds)',
            
            async run(seconds){
                srv.message(`delay ${seconds} seconds...\n`);
                return delay(seconds) 
            }
        });

        // "cmd*repeat(3, 5)"
        srv.installCmd({
            name: 'repeat',
            help: 'repeat cmd execution, repeat(count, [interval=0])',

            pre_cc: null, //previous command caller { cmd, args }

            //one-time initialize
            init({ args, index, ccs }){
                if(index == 0){
                    console.warn("no previous cmd, loop cmd ignored.");
                }
                
                let count = args[0];
                if(count < 1){
                    throw new Error("loop's count must be >= 1");
                }

                this.pre_cc = ccs[index-1];
            },

            async run(count, interval){
                interval = typeof interval === 'undefined' ? 0 : +interval;
                let i = count-1; //the previous cmd has been executed before
                while(i > 0){
                    if(interval > 0) await delay(interval);
                    await srv.runCmd(this.pre_cc.cmd, this.pre_cc.args);
                    i--;
                }
            }
        });

        srv.installCmd({
            name: 'help',
            help: 'show sub-menu of a group, show top menu if no group specified. ex: help([grp_name])',

            run(grp_name){
                grp_name = grp_name || '';
                if(grp_name == '') return srv.showMenu();

                let cmds = srv.getCmds( cmd => cmd.group == grp_name );
                if (cmds.length == 0){
                    srv.message('no cmdlet in this group');
                    return;
                }

                srv.showGroupMenu(grp_name, cmds, true); //show hidden cmdlets
            }
        })
    }
}