'uses strict';

const path = require('path');
const fs = require("fs");
const colors = require("colors");
const async = require("async");


const srv = {};

//export it!
module.exports = srv;

srv.rootDir = __dirname; //root of cmdlets

//global configuration
srv.etc = {};
srv.etc.sys = require("./etc/config.json");

srv.exitOnError = true; //abort on command error


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
  
srv.runCmd = function(cmd, cb){
    if(typeof cmd === 'string'){//call by name
        cmd = srv.getCmd(cmd);
    }

    if(cmd.sync){//sync version
        try {
            let rc = cmd.run();
            cb(null, rc);
        }catch(err){
            cb(err);
        }
    }else{//async
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

        let result = cmd.run(my_cb);
        //Promise support
        if(result instanceof Promise){
            result.then(rc => my_cb(null, rc)).catch(my_cb);
        }
    }
};

function getTasks(cmds){
    return cmds.map(cmd => srv.runCmd.bind(null, cmd));
}

//cmds: array of cmd
srv.runCmdsCascade = function(cmds, cb){
    async.series(getTasks(cmds), cb); 
};

srv.runCmdsParallel = function(cmds, cb){
    async.parallel(getTasks(cmds), cb); 
};

srv.run = function(){
    if(process.argv.length <= 2){
        console.log(`Format:  node ${path.basename(process.argv[1])} [cmd1, cmd2, ...]\n`);
        console.log("Available commands are:\n");
        let showHidden = Boolean(+process.env.SHOW_HIDDEN_CMD);
        for(var name in srv.cmds){
            let cmd = srv.cmds[name];
            if(showHidden || !cmd.hidden) console.log("    " + name.yellow + ": " + (cmd.help).green);
        }
    }else{
        process.argv.slice(2).forEach(param => {
            //Cascade: cmd1 * cmd2 * cmd 3
            var cmdNames = param.split('*').map(e => e.trim());
            if(cmdNames.length > 1){
                srv.title("Running Batch Cmds [" + param + "]...");

                console.time(param);
                srv.runCmdsCascade(cmdNames.map(name => srv.getCmd(name)), err => srv.summary(param, err));
            }else{
                var cmd = srv.getCmd(param);
                if(cmd){
                    srv.title("[" + cmd.name + "]: " + cmd.help);
                    console.time(param);
                    srv.runCmd(cmd, err => srv.summary(param, err));
                }else{
                    srv.warning("Warning: Invalid command name: [" + param + ']!'); 
                }
            }
        });
    }
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
    require(dir).init(srv);
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
