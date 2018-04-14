'use struct';

//Example to run local test examples

//for production
//const cmdlets = require('cmdlets');

//for development
const cmdlets = require('./index.js');

//load examples
cmdlets.addModuleDir(__dirname + '/examples');

cmdlets.run();