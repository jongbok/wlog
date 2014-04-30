/*
 * @(#) app.js 1.0, 2014. 4. 17.
 * 
 * Copyright (c) 2014 Jong-Bok,Park  All rights reserved.
 */
/**
 * Module dependencies.
 */
var winston = require('winston');
var fs = require('fs');
var express = require('express');
var http = require('http');
var path = require('path');
var byline = require('byline');

global.nodes = [];
global.paths = {};
global.clients = {};
var logger = new (winston.Logger)({
	transports : [ new (winston.transports.Console)({
		level : 'info',
		handleExceptions: true,
		timestamp: true
	}), new (winston.transports.File)({
		filename : 'logs/console.log',
		level : 'debug',
		handleExceptions: true,
		maxsize: 1024 * 1024 * 1
	}) ]
});
var app = express();

global.timesize = {};
var data = fs.readFileSync('conf/server.conf','utf8');
global.config = JSON.parse(data);
logger.info('read server.conf!');
logger.debug(data);

var lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);
lastWeek.setHours(0, 0, 0, 0);
var tempFile = 'temp/timesize.json';
if(fs.existsSync(tempFile)){
	data = fs.readFileSync(tempFile);
	global.timesize = JSON.parse(data);
}

function FileWatcher(p){
	this.p = p;
	this.interval = 1000 * 60 * 5;
	this.watch = function(curr, prev){
		if(!global.timesize[p]){
			global.timesize[p] = [];
		}
		if(global.timesize[p].length > 0){
			var prevTime = global.timesize[p][global.timesize[p].length - 1].time;
			if(this.interval <= (curr.mtime.getTime() - prevTime.getTime())){
				global.timesize[p].push({time:curr.mtime, size:curr.size});
				logger.debug(p + ' - watch time size! ');
			}
		}else{
			global.timesize[p].push({time:curr.mtime, size:curr.size});
			logger.debug(p + ' - watch time size! ');
		}
	};
}

function PathWatcher(filePath, uid){
	this.filePath = filePath;
	this.uid = uid;
	this.watch = function(event, filename){
		if(event === 'rename' && filename){
			var p = this.filePath + '/' + filename;
			cid = this.uid + '_' + global.nodes.length;
			global.nodes.push({id:cid,
				parent:this.uid,
				text:filename,
				icon:'images/document.png'
			});
			global.paths[cid] = p;
			
			var stat = fs.statSync(p);
			global.timesize[p] = [];
			var watcher = new FileWatcher(p);
			var callback = watcher.watch.bind(watcher);
			fs.watchFile(p, callback);
			logger.info('new file - ' + p);
		}
	};
}

global.nodes = [];
global.paths = {};
var today = new Date().getDate();
for(var i=0;i<global.config.files.length; i++){
	var filePath = global.config.files[i].path;
	logger.debug('load file - ' + filePath);
	var uid = global.config.files[i].id;
	global.nodes.push({id:uid, parent:'#', text:global.config.files[i].name});
	var files = fs.readdirSync(filePath);
	var exp = new RegExp(global.config.files[i].filter);
	for(var j=0;j<files.length; j++){
		if(exp.test(files[j])){
			var p = filePath + '/' + files[j];
			var cid = uid + '_' + j;
			global.nodes.push({id:cid,
				parent:uid,
				text:files[j],
				icon:'images/document.png'
			});
			global.paths[cid] = p;
			
			var stat = fs.statSync(p);
			logger.debug('file date:' + stat.mtime.getDate() + ', today:' + today);
			if(stat.mtime.getDate() === today){
				if(global.timesize[p]){
					global.timesize[p].push({time: stat.mtime, size:stat.size});
					logger.debug(p + ' - add timesize!');
				}else{
					global.timesize[p] = [{time: stat.mtime, size:stat.size}];
					logger.debug(p + ' - first timesize! ');
				}
				
				var watcher = new FileWatcher(p);
				var callback = watcher.watch.bind(watcher);
				fs.watchFile(p, callback);
			}
		}
	}
	
	watcher = new PathWatcher(filePath, uid);
	callback = watcher.watch.bind(watcher);
	fs.watch(filePath, callback);
}
logger.info('files load end.');

var maxLine = global.config.maxLine || 1000;
logger.info('make nodes');
logger.debug(JSON.stringify(global.nodes));

// all environments
app.set('port', global.config.port || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set("jsonp callback", true);
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser(global.config.encryptKey || 'wlog$cookieParser$encrypt#key'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){
	if(req.session.user){
		res.redirect('/wlog');
	}else{
		res.render('index');
	}
});

app.post('/login', function(req, res){
	var id = req.param('id');
	var passWd = req.param('passWd');
	var ret = {sucess: false};
	for(var i=0; i<config.users.length; i++){
		var user = config.users[i];
		console.log(JSON.stringify(user));
		if(user.id === id
				&& user.passwd === passWd){
			ret.success = true;
			ret.userId = user.id;
			ret.userName = user.name;
			req.session.user = user;
			break;
		}
	}
	res.jsonp(ret);
});

app.get('/logout', function(req, res){
	req.session.user = null;
	res.redirect('/');
});

app.all('/wlog/*.json', function(req, res, next){
	if(req.session.user){
		next();
	}else{
		res.send(403);
	}
});

app.get('/wlog', function(req, res){
	if(req.session.user){
		res.render('wlog', {});
	}else{
		res.redirect('/');
	}
});

app.get('/wlog/nodes.json', function(req, res){
	res.json(global.nodes);
});

app.get('/wlog/nodeInfo.json', function(req, res){
	var id = req.param('id');
	var p = global.paths[id];
	var stat = fs.statSync(p);
	var timesize = global.timesize[p] || [];
	timesize.unshift({time: stat.ctime, size: 0});
	timesize.push({time: stat.mtime, size: stat.size});
	var ret = {
		"size": stat.size,
		"ctime": stat.ctime,
		"mtime": stat.mtime,
		"timesize": timesize
	};
	logger.debug('nodeInfo.json:' + p);
	res.jsonp(ret);
});

app.get('/wlog/getLog.json', function(req, res){
	var id = req.param('id');
	var startBytes = req.param('start') || 0;
	var stream = fs.createReadStream(global.paths[id], {start: startBytes < 3? 0:startBytes-2});
	stream.setEncoding('utf8');
	var chunk,
		obj = {},
		count = 0,
		isLine = startBytes === 0;
	obj.output = '';
	obj.bytes = startBytes-2;
	stream.on('readable',function(){
		while(null !== (chunk = stream.read(1))){
			var str = chunk.toString();
			if(startBytes < 3 || isLine){
				obj.output += str;
			}
			obj.bytes += Buffer.byteLength(str);
			if(str === '\n'){
				if(isLine){
					count++;
				}else{
					isLine = true;
				}
			}
			if(count >= maxLine){
				break;
			}
		}
		stream.close();
	})
	.on('close', function(){
		res.jsonp(obj);
	});
});

app.get('/health', function(req, res) {
	  res.send(new Buffer(JSON.stringify({
	    pid: process.pid,
	    memory: process.memoryUsage(),
	    uptime: process.uptime()
	  })));
	});

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.set('log level', 2);
server.listen(app.get('port'), function(){
  logger.info('Express server listening on port ' + app.get('port'));
});


function TailWatcher(socket){
	this.filePath = '';
	this.filterText = '';
	
	this.watch = function(curr, prev){
		logger.debug('tail - filePath:' + this.filePath);
		var exp, ret = '';
		logger.debug('tail - filterText:' + this.filterText);
		if(this.filterText !== ''){
			exp = new RegExp(this.filterText,'g');
		}
		var stream = byline(fs.createReadStream(this.filePath,{start:prev.size+1, end:curr.size}));
		stream.on('data', function(line){
			var str = line.toString();
			if(exp){
				if(exp.test(str)){
					ret += str + '\n';
				}
			}else{
				ret += str + '\n';
			}
		})
		.on('end', function(){
			socket.emit('tail', ret);
		});
	};
}

io.sockets.on('connection', function(socket) {
	var watcher = new TailWatcher(socket);
	var callback = watcher.watch.bind(watcher);
	logger.debug('connected - ' + socket.id);
	socket.on('watch', function(data) {
		var pt = global.paths[data.id];
		if(watcher.filePath){
			if(watcher.filePath === pt){
				return;
			}else{
				fs.unwatchFile(watcher.filePath, callback);
			}
		}
		fs.watchFile(pt, callback);
		watcher.filePath = pt;
		logger.debug('watch start - ' + pt);	
	});
	socket.on('unwatch', function(data) {
		fs.unwatchFile(watcher.filePath, callback);
		watcher.filePath = '';
		logger.debug('unwatch - ' + watcher.filePath);
	});
	socket.on('filter', function(data){
		logger.debug('filter:' + data.filterText);
		watcher.filterText = data.filterText;
	});
	socket.on('disconnect', function(){
		fs.unwatchFile(watcher.filePath, callback);
		logger.debug('disconnect - ' + socket.id);
	});
});

function shutdown(){
	for(var key in global.timesize){
		var tobj = global.timesize[key];
		if(!tobj || tobj.length < 1){
			delete global.timesize[key];
			continue;
		}

		var lastTime = new Date(tobj[tobj.length-1].time);
		if(lastTime.getTime() < lastWeek.getTime()){
			delete global.timesize[key];
		}
	}
	fs.writeFile(tempFile, JSON.stringify(global.timesize), function(err){
		if(err){
			logger.error('cannot write timesize! - ' + err);
		}

		logger.info('wlog server shutdown!');
		if(server){
			server.close();
		}
		process.exit();
	});
}

process.on('uncaughtException', shutdown);
process.on('SIGINT', shutdown);