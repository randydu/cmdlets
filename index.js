'uses strict';

const path = require('path');
const fs = require("fs");
const colors = require("colors");
const async = require("async");
const JSON5 = require('json5');


const srv = {};

//export it!
module.exports = srv;

srv.rootDir = __dirname; //root of cmdlets

//global configuration
srv.etc = {};
srv.etc.sys = require("./etc/config.json");

srv.exitOnError = true; //abort on command error

//current module name being loaded
var cur_module_name = '';

//capture system environments used in the build
let sys_envs = {};
srv.etc.sys.envs.value.forEach(e=>{
    //Unix-style
	if(process.env[e]) sys_envs[e] = process.env[e].replace(/\\/g, '/');
});

//built-in args
sys_envs.ROOTDIR = srv.rootDir;

//%ARG% replacement
function replace_sysenv(str){
  let x = str;
  Object.keys(sys_envs).forEach(y => x = x.replace(new RegExp(`%${y}%`, 'gi'), sys_envs[y]));
  return x;
}

//replace all object's properties recursively
function replace_object_sysenv(obj){
  Object.getOwnPropertyNames(obj).forEach(e => {
    if (typeof obj[e] === 'string'){
      obj[e] = replace_sysenv(obj[e]);
    }else if ((typeof obj[e] === 'object') && !Array.isArray(obj[e])){
      replace_object_sysenv(obj[e]);
    }
  });
}

replace_object_sysenv(srv.etc);

//plugins
srv.cmds = {};

//error messages
srv.errors = {};

srv.addError = function(cmdName, errMsg){
    var errs = srv.errors[cmdName];
    if(typeof errs == 'undefined'){
        errs = [];
        srv.errors[cmdName] = errs;
    }
    errs.push(errMsg);
};
      
  
srv.installCmd = function(cmd){
    if(typeof cmd.group === 'undefined'){
        //cmd group node specified, fall back to default one (the current module name being loaded)
        cmd.group = cur_module_name;
    }

    srv.cmds[cmd.name] = cmd;
};

srv.getCmd = function(cmdName){
    for(var name in srv.cmds){
        if ( name == cmdName ) return srv.cmds[name];
      }
    return null;
};

//command warning
srv.warning = function(msg){
    console.log(msg.toString().yellow);
};
//command error
srv.error = function(msg){
    console.log(msg.toString().red);
};
  
//command success 
srv.success = function(msg){
    console.log(msg.red.toString().greenBG);
};
  
//command title
srv.title = function(msg){
    console.log(msg.toString().rainbow);
};

//command message
srv.message = function(msg){
    console.log(msg.toString());
};
  
srv.summary = function(name, err){
    if(err){
        let msg = "[" + name + "]: err = " + err;
        console.log(msg.blueBG);
        //Error dump
        for(var cmdName in this.errors){
            var errs = this.errors[cmdName];
            var s = cmdName + ': errors [' + errs.length + ']';
            console.log(s.red);
    
            for( var i in errs){
                console.log(("[" + i + "]: ").red);
                console.log(errs[i].red);
            }
        }
    }else{
        let msg = "[" + name + "]: OK";
        console.log(msg.blueBG);
    }
    console.timeEnd(name);
};
  
srv.logfile = function(filename){
    var fd = fs.openSync(filename, 'w'); 
    var f = function(msg){
      fs.writeSync(fd, msg, 0, msg.length);
    };
    f.close = function(){ fs.closeSync(fd); };
    return f;
};

//call cmd with args
//if args is of an array, the cmd.run() assumes to accept param list;
//otherwise it is accepting null or object as command parameter; 
srv.runCmd = function(cmd, args, cb){
    if(typeof cmd === 'string'){//call by name
        let my_cmd = srv.getCmd(cmd);
        if(my_cmd === null) throw new Error(`Invalid command: ${cmd}`);

        cmd = my_cmd;
    }

    let my_cb = (err, rc) => {
        if(err){
            srv.error(cmd.name + ": error " + err);
            if(cb) cb(err, rc);
            if(srv.exitOnError) process.exit(1);
        }else{
            srv.success(cmd.name + ": done!");
            if(cb) cb(null, rc);
        }
    };

    if(cmd.sync){//sync version
        try {
            let rc = args instanceof Array ? cmd.run.apply(cmd, args) : cmd.run(args);
            my_cb(null, rc);
        }catch(err){
            my_cb(err);
        }
    }else{//async
        let result = args instanceof Array ? cmd.run.apply(cmd, args.concat([ my_cb ])) : cmd.run(args, my_cb);
        //Promise support
        if(result instanceof Promise){
            result.then(rc => my_cb(null, rc)).catch(my_cb);
        }
    }
};

function getTasks(call_cmds){
    return call_cmds.map(cc => srv.runCmd.bind(null, cc.cmd, cc.args));
}

//cmds: array of cmd
srv.runCmdsCascade = function(call_cmds, cb){
    async.series(getTasks(call_cmds), cb); 
};

srv.runCmdsParallel = function(cmds, cb){
    async.parallel(getTasks(cmds), cb); 
};

srv.showMenu = function(){
    console.log(`Format:  node ${path.basename(process.argv[1])} [cmd1, cmd2, ...]\n`);
    console.log("Available commands are:\n");

    let showHidden = Boolean(+process.env.SHOW_HIDDEN_CMD);

    //populate cmds by group
    let grps = {};
    let grp_names = [];
    
    for(let name in srv.cmds){
        let cmd = srv.getCmd(name);
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
        let cmds = grps[grp_name];
        if(cmds.length > 0){
            console.log('');
            console.log(`[${grp_name}]`.blueBG);

            //sort cmd by name
            cmds.sort((a,b)=> a.name.localeCompare(b.name));

            cmds.forEach(cmd => {
                if(showHidden || !cmd.hidden) console.log("    " + cmd.name.yellow + ": " + (cmd.help).green);
            });
        }
    });
}

//input: array of cmdlet
srv.execArray = function(cmds){
    if(cmds.length == 0){//empty cmds, show menu
        return srv.showMenu();
    }

    try {
        cmds.forEach(param => {
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
                console.log('cmdlet: ' + cmdlet);
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
                                args = JSON5.parse(`{${params}}`);
                            }
                        }
                        return true;
                    }
                    return false;
                }

                parseCall('(', ')') /*fn(), fn(x,y)*/ || parseCall('[', ']'); /* fn[], fn[x,y] */ 

                if(cmd_name == '') throw new Error('cmdlet name is empty!');

                let cmd = srv.getCmd(cmd_name);
                if(cmd === null){
                    throw new Error(`Invalid command: ${cmd_name}`);
                }

                return  { cmd, args };
            }            

            //Cascade: cmd1 * cmd2 * cmd 3
            const cmdlets = param.split('*').map(e => e.trim()).filter(x => x !== '');
            if(cmdlets.length === 0) return; //' * ', no cmd to execute, ignore.

            if(cmdlets.length > 1){
                srv.title("Running Batch Cmds [" + param + "]...");

                let call_cmds = cmdlets.map(cmdlet => parseCmd(cmdlet));
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
                srv.runCmdsCascade(call_cmds, err => srv.summary(param, err));
            }else{
                param = cmdlets[0];
                var call_cmd = parseCmd(param);
                let cmd = call_cmd.cmd;

                srv.title("[" + cmd.name + "]: " + cmd.help);
                console.time(param);
                srv.runCmd(cmd, call_cmd.args, err => srv.summary(param, err));
            }
        });
    }catch(err){
        srv.error(err);
    }
}

srv.run = function(args){
    let tp = typeof args;
    //execute cmds from process command line
    if (tp === 'undefined') return srv.execArray(process.argv.slice(2));
    //single command
    if (tp === 'string') return srv.execArray([args]);
    //array
    if(Array.isArray(args)) return srv.execArray(args);

    throw new Error(`run([args]): invalid args type "${tp}"!`);
};

// load a module/plugin
srv.loadModule = function(name, dir){
    //load cmdlet's local configuration
    let cfg = dir + "/config.json";
    if(fs.existsSync(cfg)) srv.etc[name] = require(cfg);
    else {
        cfg = dir + "/etc/config.json";
        if(fs.existsSync(cfg)) srv.etc[name] = require(cfg);
    }
    //install cmds
    cur_module_name = name; //default group name, ref: installCmd()
    require(dir).init(srv);
    cur_module_name = '';
};

//Loading built-in plugins in sub-folder "modules"
let local_module_dir = __dirname + "/modules/";
if(fs.existsSync(local_module_dir)){
    fs.readdirSync(local_module_dir).forEach( m => {
        srv.loadModule(m, local_module_dir + m);
    });
}


//Hide all built-in cmds so it won't be shown in cmd menu.
//However, they can still be executed by srv.getCmd('hello');
for(var m in srv.cmds){
    srv.cmds[m].hidden = true;
}