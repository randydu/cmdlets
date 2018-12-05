'uses strict';

const path = require('path');
const fs = require("fs");
const colors = require("colors");
const JSON5 = require('json5');

//Event Listener
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}


//[private data]
const listener = new MyEmitter();
//current group being loaded
var cur_grp_name = '';
//plugins
var cmds = {};
//error messages
var errors = {}; 

//behavior
var opt = {
    exitOnError: true, //abort on command error
}

//[private functions]
function addError(cmdName, errMsg){
    var errs = errors[cmdName];
    if(typeof errs === 'undefined'){
        errs = [];
        errors[cmdName] = errs;
    }
    errs.push(errMsg);
};

//command warning
function warning(msg){
    console.log(msg.toString().yellow);
}
//command error
function error(msg){
    console.log(msg.toString().red);
}
//command success 
function success(msg){
    console.log(msg.red.toString().greenBG);
}
//command pre-run title
function preRunTitle(msg){
    console.log(msg.toString().rainbow);
}
function postRunTitle(msg){
    console.log(msg.toString().blueBG);
}
//command message
function message(msg){
    console.log(msg.toString());
}

//post-run summary
function summary(name, err, hidden){
    if(err){
        postRunTitle(`[${name}]: err = ${err}`);
        //Error dump
        for(var cmdName in errors){
            var errs = errors[cmdName];
            error(`${cmdName}: errors [ ${errs.length}]`);
            errs.forEach((err, i)=> error(`[${i}]: ${err}`));
        }
    }else{
        if(!hidden){
            postRunTitle(`[${name}]: OK`);
        }
    }
    if(!hidden) console.timeEnd(name);
};
 
//--- cmd management --------------------------

function installCmd(cmd){
    if(typeof cmd.group === 'undefined'){
        //cmd group node specified, fall back to default one (the current group name being loaded)
        cmd.group = cur_grp_name;
    }
    cmds[cmd.name] = cmd;

    listener.emit('cmd_added', cmd);
}

function getCmd(cmdName){
    for(var name in cmds){
        if ( name == cmdName ) return cmds[name];
    }
    return null;
}

//filter(cmd): boolean
function getCmds(filter){
    let result = [];

    for(var name in cmds){
        let cmd = cmds[name];
        if(filter(cmd)) result.push(cmd);
    }
    return result;
}
//call cmd with args
//if args is of an array, the cmd.run() assumes to accept param list;
//otherwise it is accepting null or object as command parameter; 
function runCmd(cmd, args){
    return new Promise((resolve, reject)=>{
        if(typeof cmd === 'string'){//call by name
            let my_cmd = getCmd(cmd);
            if(my_cmd === null) return reject(new Error(`Invalid command: ${cmd}`));

            cmd = my_cmd;
        }

        let my_done = false;
        let my_err = null;
        let my_rc = null;

        let my_cb = (err, rc) => {
            my_done = true;
            my_err = err;
            my_rc = rc;
        };

        function feedback(err, rc){
            if(err){
                error(`${cmd.name}: error ${err}`);
                //if(srv.exitOnError) process.exit(1);
            }else{
                if(!cmd.hidden) success(`${cmd.name}: done!`);
            }
        }

        try {
            let result = args instanceof Array ? cmd.run.apply(cmd, args.concat([ my_cb ])) : cmd.run(args, my_cb);
            if(my_done){ //classic callback-based async
                feedback(my_err, my_rc);
                return my_err ? reject(my_err) : resolve(my_rc);
            }

            if(result instanceof Promise){//async
                result.then(rc => { 
                    feedback(null, rc);
                    return resolve(rc);
                }).catch(err =>{
                    feedback(err);
                    return reject(err);
                });
            }else{//sync
                feedback(null, result);
                resolve(result);
            }
        }catch(err){
            feedback(err);
            reject(err);
        }
    });
};

function getTasks(call_cmds){
    return call_cmds.map(cc => runCmd.bind(null, cc.cmd, cc.args));
}

//cmds: array of cmd
function runCmdsCascade(call_cmds){
    return getTasks(call_cmds).reduce((p, task)=> p.then(task), Promise.resolve());
};

//input: array of cmdlet
//return: promise
function execArray(cmds){
    if(cmds.length == 0){//empty cmds, show menu
        showMenu();
        return Promise.resolve();
    }

    try {
        //parse cmdlet and returns { cmd, args }
        //valid format:
        //- fn : no param  => { cmd: fn, args: null }
        //- fn(): no param => { cmd: fn, args: null }
        //- fn('randy',20): param value list => { cmd: fn, args: ['randy', 20 ] }
        //- fn(name: 'randy', age: 20): named param list (JSON5 compatible)
        //  => { cmd: fn, args: { name: 'randy', age: 20 } }
        //
        // returns { cmd: null, args: null } if fn cannot be resolved.
        function parseCmd(cmdlet){
            //console.log('cmdlet: ' + cmdlet);
            let cmd_name = cmdlet;
            let args = null;

            //return true if func call is detected.
            function parseCall(leftDelimeter, rightDelimiter){
                let i = cmdlet.indexOf(leftDelimeter);
                if(i !== -1){
                    //fn() or fn(x,y, ...)
                    let j = cmdlet.length-1;
                    if( rightDelimiter !== cmdlet[j]) throw new Error(`parameter parsing error: no ending "${rightDelimiter}"`);

                    cmd_name = cmdlet.substr(0, i);

                    let params = cmdlet.substr(i+1, j-i-1).trim();

                    if(params.length === 0){//fn()
                    } else {// fn(x,y) or fn(name: 'x', age: y)
                        //the most simplified parsing, the limit is that
                        //the ':' should not exist in any value.
                        if( -1 === params.indexOf(':')){
                            args = params.split(',').map(x => x.trim());
                        } else {
                            try {
																//named parameters?
                                args = JSON5.parse(`{${params}}`);
                            }catch(ex){
                                //the worst case just return the splitted array.
															  //it can be useful to pass url parameter such as cmd(http://example.com:8080/).
                                args = params.split(',').map(x => x.trim());
                            }
                        }
                    }
                    return true;
                }
                return false;
            }

            parseCall('(', ')') /*fn(), fn(x,y)*/ || parseCall('[', ']'); /* fn[], fn[x,y] */ 

            if(cmd_name == '') throw new Error('cmdlet name is empty!');

            let cmd = getCmd(cmd_name);
            if(cmd === null){
                throw new Error(`Invalid command: ${cmd_name}`);
            }

            return  { cmd, args };
        }            

        let tasks = [];

        cmds.forEach(param => {
            //Cascade: cmd1 * cmd2 * cmd 3
            const cmdlets = param.split('*').map(e => e.trim()).filter(x => x !== '');
            if(cmdlets.length === 0) return; //' * ', no cmd to execute, ignore.

            if(cmdlets.length > 1){
                preRunTitle(`Running Batch Serial Cmds [${param}]...`);

                let call_cmds = cmdlets.map(cmdlet => parseCmd(cmdlet));

                //call cmd.init() if defined for inter-cmd settings
                call_cmds.forEach((cc, i) => {
                    let cmd = cc.cmd;
                    if(typeof cmd.init === 'function'){
                        cmd.init({
                            args: cc.args,
                            index: i,

                            ccs: call_cmds
                        });
                    }
                });

                console.time(param);
                
                tasks.push(runCmdsCascade(call_cmds)
                .then(()=> summary(param, null, false))
                .catch(err => summary(param, err, false)));
            }else{
                param = cmdlets[0];
                var call_cmd = parseCmd(param);
                let cmd = call_cmd.cmd;

                if(!cmd.hidden){
                    preRunTitle(`[${cmd.name}]: ${cmd.help}`);
                    console.time(param);
                } 
                
                tasks.push(runCmd(cmd, call_cmd.args)
                .then(()=> summary(param, null, cmd.hidden))
                .catch(err => summary(param, err, cmd.hidden)));
            }
        });

        return Promise.all(tasks);
    }catch(err){
        error(err);
        return Promise.reject(err);
    }
}

//------ Menu -----------

function showGroupMenu(grp_name, cmds, showHidden){
    if(cmds.length > 0){
        console.log('');
        console.log(`[${grp_name}]`.blueBG);

        //sort cmd by name
        cmds.sort((a,b)=> a.name.localeCompare(b.name));

        cmds.forEach(cmd => {
            if(showHidden || !cmd.hidden) console.log("    " + cmd.name.yellow + ": " + (cmd.help).green);
        });
    }
}

function showMenu(){
    console.log(`Format:  node ${path.basename(process.argv[1])} [cmd1, cmd2, ...]\n`);
    console.log("Available commands are:\n");

    let showHidden = Boolean(+process.env.SHOW_HIDDEN_CMD);

    //populate cmds by group
    let grps = {};
    let grp_names = [];
    
    for(let name in cmds){
        let cmd = getCmd(name);
        let grp_name = cmd.group;

        if(typeof grps[grp_name] === 'undefined'){
            grps[grp_name] = [];
            grp_names.push(grp_name);
        }

        if(showHidden || !cmd.hidden) grps[grp_name].push(cmd);
    }

    //sort group name
    grp_names.sort();

    grp_names.forEach(grp_name => {
        showGroupMenu(grp_name, grps[grp_name], showHidden);
    });
}

//----- PUBLIC ----------------------

const cmdlets = {
    //menu
    showMenu,
    showGroupMenu,

    //render
    warning,
    error,
    success,
    message,

    //Register Event Listener
    //event: 'cmd_added' => watcher(cmd)
    on(event, watcher){
        listener.on(event, watcher);
    },

    installCmd,
    getCmd,
    getCmds,

    runCmd, //undocemented

    //return promise
    run(args){
        let tp = typeof args;
        //execute cmds from process command line
        if (tp === 'undefined') return execArray(process.argv.slice(2));
        //single command
        if (tp === 'string') return execArray([args]);
        //array
        if(Array.isArray(args)) return execArray(args);

        return Promise.reject(new Error(`run([args]): invalid args type "${tp}"!`));
    },
    //---- Module Management ---------
    // load a module/plugin [DEPRECATED by addModule()]
    loadModule(grp_name, dir){
        console.warn('WARN: API loadModule will be deprecated by addModule!\n');

        this.addModule(dir, grp_name);
    },

    // load a module/plugin
    addModule(dir, grp_name){
        cur_grp_name = grp_name || path.basename(dir); //default group name, ref: installCmd()
        require(dir).init(this);
        cur_grp_name = '';
    },

    // load all modules under a directory (non-recursive)
    addModuleDir(dir){
        if(fs.existsSync(dir)){
            fs.readdirSync(dir).forEach( m => {
                this.addModule(dir + '/' + m, m);
            });
        }
    }
};

//export it!
module.exports = cmdlets;

//Loading built-in plugins in sub-folder "modules"
cmdlets.addModuleDir(__dirname + "/modules");

//Hide all built-in cmds so it won't be shown in cmd menu.
//However, they can still be executed by cmdlets.getCmd('hello');
for(var name in cmds){
    cmds[name].hidden = true;
}
