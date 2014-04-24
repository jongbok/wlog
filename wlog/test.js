/**
 * 
 */

var fs = require('fs');
var byline = require('byline');

/*
var stream = fs.createReadStream('logs/console_20140411.log',{start:640+5934+9998+3592+5304+4005+2048+2257+2048+2257+2048+2257});
stream.setEncoding('utf8');
var bytes = 0;

stream.on('readable', function(){
	var chunk;
	var lines = 0;
	var ret = '';
	var bytes = 0;
	while(null !== (chunk = stream.read(1))){
		var str = chunk.toString();
		ret += str;
		bytes += Buffer.byteLength(str);
		if(str === '\n'){
			lines++;
		}
		if(lines >= 10){
			break;
		}
	}
	console.log(ret);
	console.log(bytes);
});

var buf = new Buffer('A','utf8');
console.log(buf.length);
*/
/*
function watcher(name, file) {
	this.name = name;
	this.watch = function(curr, prev) {
		console.log(name + ',' + file + ',' + curr.size);
	};
}


var watcher1 = new watcher('watcher - 1','logs/console_20140411.log');
var watcher2 = new watcher('watcher - 2','logs/console_20140412.log');
fs.watchFile('logs/console_20140411.log', watcher1.watch);
fs.watchFile('logs/console_20140412.log', watcher2.watch);
*/

var files = ['logs/console_20140411.log', 'logs/console_20140412.log'];
for(var i=0; i<files.length; i++){
	fs.watchFile(files[i], function(curr, prev){
		console.log(curr);
	});
}