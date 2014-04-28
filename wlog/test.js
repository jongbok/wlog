/**
 * New node file
 */
var fs = require('fs');

fs.watchFile('D:/workspace/test/logs/console.log', { persistent: true, interval: 500 }, function(curr, prev){
	console.log('watch file~');
});