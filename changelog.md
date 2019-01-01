Changelog
=========

0.7.1: ( Dec. 31, 2018)

- Improve doc;
- change git repository from bitbucket to github;


0.7.0: ( Dec. 5, 2018)
-----------------------

Improve cmdlet parameter parsing to support simple parameter with ':'.

ex:  cmd(http://www.example.com:8080/);


0.6.0: ( Apr. 14, 2018)
-----------------------

* adds api getCmds(filter) to return a subset of installed commands.

  [SYNC] getCmds(filter): array of cmd object;

  filter := function(cmd): boolean;

  filter function returns true if cmd is to be included in the result.

  ```javascript
    cmdlets.getCmds(cmd => true); //all cmds
    cmdlets.getCmds(cmd => !cmd.hidden); //visible cmds
    cmdlets.getCmds(cmd => cmd.group === 'utility'); //cmds of group utility
  ```

* Hide hidden cmdlet' pre-run title, post-run feedback and timing summary.
* rewrite the core in modern style.
* Improves document;


0.5.0: ( Apr. 12, 2018)
-----------------------

  enhanced api run(), now it can be invoked as following:

* run(): executes process command line;
* run('cmd'): executes a single command;
* run(['cmd1', 'cmd2',...]): executes multiple cmds;


0.4.2: ( Apr. 10, 2018
-----------------------

  fix doc and git url issue;

0.4.1: ( Apr. 10, 2018)
-----------------------

* supports bash friendly cmdlet param delimiters.

  for bash, the '(', ')' is special characters so instead of add(1,2) we have to input "add(1,2)".
  now we can use add[1,2] as a workaround.

0.4.0: ( Apr. 4, 2018)
----------------------

* adds command parameters (param value list, named param list);

* adds command group;
