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
		level : 'debug',
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

function loadFileList(){
	function FileWatcher(p){
		this.p = p;
		this.watch = function(curr, prev){
			if(!global.timesize[p]){
				global.timesize[p] = [];
			}
			global.timesize[p].push({time:curr.mtime, size:curr.size});
			logger.debug(p + ' - watch time size! ');
		};
	}
	
	global.nodes.length = 0;
	var today = new Date().getDate();
	for(var i=0;i<global.config.files.length; i++){
		logger.debug('load file - ' + global.config.files[i].path);
		var uid = global.config.files[i].id;
		global.nodes.push({id:uid, parent:'#', text:global.config.files[i].name});
		var files = fs.readdirSync(global.config.files[i].path);
		var exp = new RegExp(global.config.files[i].filter);
		for(var j=0;j<files.length; j++){
			if(exp.test(files[j])){
				var p = global.config.files[i].path + '/' + files[j];
				var cid = uid + '_' + j;
				global.nodes.push({id:cid,
					parent:uid,
					text:files[j],
					icon:'images/document.png'
				});
				global.paths[cid] = p;
				
				fs.unwatchFile(p);
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
					fs.watchFile(p, { persistent: true, interval: 1000 * 60 * 5}, watcher.watch);
				}
			}
		}
	}
	logger.info('files load end.');
}
loadFileList();
setInterval(loadFileList, global.config.fileReloadTime || 1000 * 60 * 60 * 6);

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
	var ret = {
		size: stat.size,
		ctime: stat.ctime,
		mtime: stat.mtime,
		times: global.timesize[p] || []
	};
	logger.debug('nodeInfo.json:' + p + ' - ' + global.timesize[p]);
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

var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


function Watcher(socket){
	var p;
	this.socket = socket;
	var filterText = '';
	this.watch = function(curr, prev){
		var exp, ret = '';
		console.log('filterText:' + filterText);
		if(filterText !== ''){
			exp = new RegExp(filterText,'g');
		}
		var stream = byline(fs.createReadStream(p,{start:prev.size, end:curr.size}));
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
	this.setFilterText = function(text){
		filterText = text;
	};
	this.setPath = function(pt){
		p = pt;
	};
}

io.sockets.on('connection', function(socket) {
	var watcher = new Watcher(socket);
	socket.on('watch', function(data) {
		watcher.setPath(global.paths[data.id]);
		fs.watchFile(global.paths[data.id], watcher.watch);
	});
	socket.on('unwatch', function(data) {
		fs.unwatchFile(global.paths[data.id], watcher.watch);
	});
	socket.on('filter', function(data){
		console.log('filter:' + data.filterText);
		watcher.setFilterText(data.filterText);
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