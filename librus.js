/**
 * librus module for Concierge
 *
 * Written by:
 * 		p0358
 *
 * License:
 *		GNU Affero General Public License v3.0
 */
//var schedule = require('node-schedule');
//var apis;
//var CronJob = require('cron').CronJob;
var startNewDayJob;
var szczesliwyNumerekDailyJob;
//var startNewDayJob /*= startNewDayJob*/ = new CronJob({cronTime: '00 00 7 * 1-6,9-12 1-5', onTick: startNewDay, start: true});


var cron = require('node-cron'); // Eventually turned out to be the best (I mean working!)


/*var job = new CronJob('* * * * * *', function() {
   //console.debug(Object.keys(apis)); //CRITICAL ERROR
   console.debug(Object.keys(exports.platform.getIntegrationApis())); //undefined 
  }, function () {
    //This function is executed when the job stops
  },
  true//, // Start the job right now 
  //timeZone // Time zone of this job. 
);*/
var moment = require("moment");
var request = require("request");
var chrono = require('chrono-node');
//var defer = require("promise").defer;
//var deferred = defer();
//var promise = new Promise();

var librusConfig;
//var isUnloading = false;
const prefix = '[librus] ';
var global_token;

var librusConfigLoad = function(variable, def) {
    if (!exports.config["librusConfig"]){
        exports.config["librusConfig"] = {};
    }
    if (!exports.config["librusConfig"][variable]) {
        exports.config["librusConfig"][variable] = def;
    }
    return exports.config["librusConfig"][variable];
}

/*var loadIntegrationNamesFromConfig = function() {
    if (!exports.config["threads"]){
        exports.config["threads"] = {};
        exports.config["threads"]["integrationName"] = ["threadID1", "threadID2", "..."];
        if (exports.platform.getIntegrationApis()["test"]) {
            //console.debug("lololo");
            if (!exports.config["threads"]["test"]) {
                exports.config["threads"]["test"] = ["1"];
            } else {
                exports.config["threads"]["test"].push("1");
            }
        }
        console.log('Looks like you have "test" integration enabled - sending mail notifications to it is now enabled! Edit config to disable.');
    }
    var integrationNames = [];
    for (var integrationName in exports.config["threads"]) {
        //console.log("integrationName = " + integrationName);
        //console.log("exports.config[\"threads\"][integrationName] = " + exports.config["threads"][integrationName]);
        if (integrationName != "integrationName") {
            integrationNames.push("" + integrationName);
        }
    }
    //console.log(integrationNames);
    return integrationNames;
}

var loadIntegrationRooms = function(integrationName) {
    loadIntegrationNamesFromConfig();
    if(!exports.config["threads"][integrationName]) {
        exports.config["threads"][integrationName] = []; 
    }
    return exports.config["threads"][integrationName];
}*/

exports.load = function() {
    moment.locale('pl');
    /*var facebookAPI = exports.platform.getIntegrationApis()["facebook"];
    facebookAPI.sendMessage("test", "roomidhere");*/ //- result of this was error as well
    librusConfig = {
        username: librusConfigLoad("username", "NAZWA UŻYTKOWNIKA"),
        password: librusConfigLoad("password", "HASŁO"),
        notifyRoom: librusConfigLoad("notifyRoom", 'ID KONWERSACJI DO POWIADOMIEŃ - możesz je wziąć z URLa na messenger.com'),
        startNewDayCron: librusConfigLoad("startNewDayCron", '0 30 6 * 1-6,9-12 1-5'),
        szczesliwyNumerekDailyCron: librusConfigLoad("szczesliwyNumerekDailyCron", '10 1 18 * 1-6,9-12 0-4')
    };

    if(librusConfig.username == "NAZWA UŻYTKOWNIKA" && librusConfig.password == "HASŁO") {
        // FIRST RUN, module unconfigured, notify user and don't run mail listener
        let message = '\n\n';
        message += '***************************************************\n\n';
        message += 'Zainstalowano moduł librusa - wyłącz bota i skonfiguruj nazwę użytkownika oraz hasło.\n\n';
        message += '***************************************************\n\n';
        console.critical(message);
    } else {
        // Not a first run, module configured
            
            // Tak jest na górze tam:
            // var startNewDayJob;
            // var szczesliwyNumerekDailyJob;
            //startNewDayJob = cron.schedule('0 0 7 * 1-6,9-12 1-5', startNewDay);
            startNewDayJob = cron.schedule(librusConfigLoad("startNewDayCron", '0 30 6 * 1-6,9-12 1-5'), startNewDay);
            szczesliwyNumerekDailyJob = cron.schedule(librusConfigLoad("szczesliwyNumerekDailyCron", '10 1 18 * 1-6,9-12 0-4'), szczesliwyNumerekDaily);
            console.debug(prefix + 'Crony powinny zostać ustawione.');
        
    } // end else
} // end exports.load

var startNewDay = function() {
    console.debug(prefix + "startNewDay");
    var api = exports.platform.getIntegrationApis()["facebook"];
    if (api) {
        console.debug(prefix + "got the API");
        librusAutoLoginCallbackArgs(librusApiCallArgs, {api: api, room: librusConfigLoad("notifyRoom", ''), apiCallPath: '/2.0/Timetables', apiCallCallback: daySummaryLessons, addNumber: 0, addType: 'days'});
    }
}

var szczesliwyNumerekDaily = function() {
    console.debug(prefix + "startNewDay");
    var api = exports.platform.getIntegrationApis()["facebook"];
    if (api) {
        console.debug(prefix + "got the API");
        librusAutoLoginCallbackArgs(librusApiCallArgs, {api: api, room: librusConfigLoad("notifyRoom", ''), apiCallPath: '/2.0/LuckyNumbers', apiCallCallback: szczesliwyNumerek});
    }
}

function print_r(o)
{
    function f(o, p, s)
    {
        for(x in o)
        {
            if ('object' == typeof o[x])
            {
                s += p + x + ' obiekt: \n';
                pre = p + '\t';
                s = f(o[x], pre, s);
            }
            else
            {
                s += p + x + ': ' + o[x] + '\n';
            }
        }
        return s;
    }
    return f(o, '', '');
}

var librusLogin = function(user, pass) {
    var token = 'NO_TOKEN';
    var options = {
        url: 'https://api.librus.pl/OAuth/Token',
        headers: {
            'Connection': 'Keep-Alive'
        },
        auth: {
            'username': '16',
            'password': '903bfcb998e3d4fac348371109fba86e'
        },
        form:{username:user, password:pass, grant_type:'password'}
    };
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.debug(prefix + 'zalogowano?');
            var json = JSON.parse(body);
            console.debug(prefix + 'Token: ' + json.access_token);
            global_token = json.access_token;
            token = json.access_token;
        } else {
            var json = JSON.parse(body);
            var err = '...';
            err = json.error;
            if (json.error) {
                err = json.error;
            } else {
               err = '(nieznany)'; 
            }
            console.critical(prefix + response.statusCode + ' Błąd logowania do Librusa! Komunikat: ' + err);
            console.log(response.statusCode);
            console.log(body);
        }
    }
    request.post(options, callback);
  //deferred.when(request.post(options, callback)).then(console.log(token));
   /* var timeout = (new Date()).getTime() + 30000;
    while ( token = 'NO_TOKEN' ) {
        if ( (new Date()).getTime() >= timeout ) {
            console.critical('Request timed out');
        }
    }*/
  
  //return token;
}

var librusAutoLogin = function() { // DO USUNIĘCIA
    var token = librusLogin(librusConfigLoad("username", "NAZWA UŻYTKOWNIKA"), librusConfigLoad("password", "HASŁO"));
    return token;
}

var librusLoginCallback = function(user, pass, callback) {
    return librusLoginCallbackArgs(user, pass, callback, null);
}

var librusLoginCallbackArgs = function(user, pass, callback, args) {
    var token = 'NO_TOKEN';
    var options = {
        url: 'https://api.librus.pl/OAuth/Token',
        headers: {
            'Connection': 'Keep-Alive'
        },
        auth: {
            'username': '16',
            'password': '903bfcb998e3d4fac348371109fba86e'
        },
        form:{username:user, password:pass, grant_type:'password'}
    };
    function requestCallback(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.debug(prefix + 'zalogowano?'); // Show the HTML for the Google homepage.
            var json = JSON.parse(body);
            console.debug(prefix + 'Token: ' + json.access_token);
            token = json.access_token;
            global_token = token;
            if (args) {
                args.token = token;
                console.debug('args: ' + args.toString());
            }
            if (callback) {
                callback(args);
            }
        } else {
            var err = '...';
            try {
                var json = JSON.parse(body);
            }
            finally {}
            //err = json.error;
            if (json.error) {
                err = json.error;
            } else {
               err = '(nieznany)'; 
            }
            if (err == '(nieznany)' && json.Status) {
                err = json.Status;
            }
            var statusCode = '';
            if (response.statusCode) {
                statusCode = '' + response.statusCode + ' ';
            }
            console.critical(prefix + statusCode + 'Błąd logowania do Librusa! Komunikat: ' + err);
            //console.log(response.statusCode);
            console.log(prefix + 'Odpowiedź serwera: ' + body);
        }
    }
    request.post(options, requestCallback);
  //deferred.when(request.post(options, callback)).then(console.log(token));
   /* var timeout = (new Date()).getTime() + 30000;
    while ( token = 'NO_TOKEN' ) {
        if ( (new Date()).getTime() >= timeout ) {
            console.critical('Request timed out');
        }
    }*/
  
  //return token;
}

var librusAutoLoginCallback = function(callback) {
    return librusLoginCallback(librusConfigLoad("username", "NAZWA UŻYTKOWNIKA"), librusConfigLoad("password", "HASŁO"), callback);
}

var librusAutoLoginCallbackArgs = function(callback, args) {
    return librusLoginCallbackArgs(librusConfigLoad("username", "NAZWA UŻYTKOWNIKA"), librusConfigLoad("password", "HASŁO"), callback, args);
}

var librusApiCall = function(path, token, args) {
    return librusApiCallCallback(path, token, args.apiCallCallback, args)    
}

var librusApiCallArgs = function(args) {
    return librusApiCallCallback(args.apiCallPath, args.token, args.apiCallCallback, args)    
}

var librusApiCallCallback = function(path, token, callback, args) {
    //var URL = 'https://api.librus.pl' + path;
    var address;
    if (args.apiCallFullPath && args.apiCallFullPath != '') {
        address = args.apiCallFullPath;
    } else {
        address = 'https://api.librus.pl' + path;
    }
    var options = {
        url: address,
        auth: {
            'bearer': '' + token
        }
        /*headers: {
            'Authentication': 'Bearer ' + token
        },*/
    };
    function requestCallback(error, response, body) {
        if (!error && response.statusCode == 200) {
            if (args) {
                args.body = body;
            }
            if (callback) {
                callback(args);
            }
        } else {
            //var json = JSON.parse(body);
            /*var err = '...';
            err = json.error;
            if (json.error) {
                err = json.error;
            } else {
               err = '(nieznany)'; 
            }*/
            var errorr = '';
            if (error) {
                errorr = ' ' + error;
            }
            console.critical(prefix /*+ response.statusCode*/ + errorr + ' Błąd pobierania danych z Librusa! Otrzymano odpowiedź: ' + body);
            console.log(response.statusCode);
            console.log(body);
        }
    }
  request.get(options, requestCallback);
}

var librusGetJSON = function(path) {
    return JSON.parse(librusApiCall(path, librusAutoLogin()));
}

var librusGet = function(path) {
    return librusApiCall(path, librusAutoLogin());
}

exports.unload = function() {
    //isUnloading = true;
    //mailListener.stop();
    //mailListener = null;
    try {
        szczesliwyNumerekDailyJob.destroy();
    } finally {}
    try {
        startNewDayJob.destroy();
    } finally {}
    //startNewDayJob.stop();
}

// match and run are needed for module to load correctly
/*
	Method that is called to determine if a message should result in this module being run.
	text is the body of the message. commandPrefix is the prefix that should be used for
	static commands (commands that will always be available given the same text is typed)
	on a particular platform (eg, skype, slack, facebook...) - usually this is the string
	"/" or "!".
	Returns true if the module should run, false otherwise.
*/
exports.match = function(event, commandPrefix) {
    //return false;
    console.log(event.body);
    if (event.body.startsWith(commandPrefix + 'sn')) {
        return true;
    }
    if (event.body.startsWith(commandPrefix + 'jutro')) {
        return true;
    }
    if (event.body.startsWith(commandPrefix + 'dzisiaj')) {
        return true;
    }
    if (event.body.startsWith(commandPrefix + 'terminarz')) {
        return true;
    }
    if (event.body.startsWith(commandPrefix + 'librustest')) {
        return true;
    }
    return false;
};

/*
	Method that provides help strings for use with this module.
	Refer to documentation for notes about which strings refer to what help.
*/
//exports.help = function() {
//    return [[this.commandPrefix + 'helloworld','Says "hello world"','Provides a useful example to demonstrate the creation of a Kassy Module. Says "hello world".']];
//};


var szczesliwyNumerek = function(args/*{api, --token,-- room}*/) {
//var szczesliwyNumerek = function(api, token, room) {
    //var URL = 'https://api.librus.pl' + path;
    /*var options = {
        url: 'https://api.librus.pl/2.0/LuckyNumbers',
        auth: {
            'bearer': '' + token
        }
    };*/
 //   function callback(error, response, body) {
 //       if (!error && response.statusCode == 200) {
 //           //return body;
            var json;
            json = JSON.parse(args.body);
            args.api.sendMessage('Szczęśliwy numerek dla dnia ' + json.LuckyNumber.LuckyNumberDay + ' to: ' + json.LuckyNumber.LuckyNumber, args.room);
 //       } else {
            //var json = JSON.parse(body);
            /*var err = '...';
            err = json.error;
            if (json.error) {
                err = json.error;
            } else {
               err = '(nieznany)'; 
            }*/
 /*           var errorr = '';
            if (error) {
                errorr = ' ' + error;
            }
 //           console.critical(prefix + response.statusCode + errorr + ' Błąd pobierania danych z Librusa! Otrzymano odpowiedź: ' + body);
            console.log(response.statusCode);
            console.log(body);
        }
    }
  request.get(options, callback);
 */
}

var daySummaryLessons = function(args) {
            var json;
            json = JSON.parse(args.body);
            var jutroLekcjeArray = [];
            var date = moment().locale(/*($$.getLocale() || 'en')*/'pl').add(args.addNumber, args.addType).format('YYYY-MM-DD');
            var firstLessonHour = '';
            var isJutroDateArray = false;
            try {
                var isJutroDateArray = json['Timetable']['' + date].length >= 1;
            }
            catch (e) {
                isJutroDateArray = false;
            }
            if (isJutroDateArray) {
                for (var i in json['Timetable']['' + date]) {
                   if (json['Timetable']['' + date][i]/*[0]*/.length > 0) {
                       try {
                        if (json['Timetable']['' + date][i][0]['Subject']['Name']) {     
                            //console.debug(json['Timetable']['' + jutroDate][i][0]['Subject']['Name']);
                            jutroLekcjeArray.push(json['Timetable']['' + date][i][0]['Subject']['Name']);
                            if (firstLessonHour == '') {
                                firstLessonHour = json['Timetable']['' + date][i][0]['HourFrom'];
                            }
                            if(json['Timetable']['' + date][i][0]['IsCanceled'] == true) {
                                args.api.sendMessage('Uwaga! Lekcja ' + json['Timetable']['' + date][i][0]['Subject']['Name'] + ' została odwołana!', args.room);
                            }
                            if(json['Timetable']['' + date][i][0]['IsSubstitutionClass'] == true) {
                                args.api.sendMessage('Uwaga! Na lekcji ' + json['Timetable']['' + date][i][0]['Subject']['Name'] + ' jest zastępstwo! Nauczyciel: ' + json['Timetable']['' + date][i][0]['Teacher']['FirstName'] + ' ' + json['Timetable']['' + date][i][0]['Teacher']['LastName'], args.room);
                            }
                        } else {
                            //console.debug(prefix + 'Pusty przedmiot!');
                        }
                       } catch(e) {}
                   } 
                }
                if (jutroLekcjeArray.length === 0) {
                    jutroLekcjeArray = ['(brak lekcji)'];
                }
                var jutroLekcjeString = /*'Jutrzejsze lekcje: '*/ moment(date + ' ' + firstLessonHour).locale('pl').calendar() + ': ' + jutroLekcjeArray.join(', ');
                /*if (firstLessonHour != '') {
                    jutroLekcjeString += '\nZaczynamy o ' + firstLessonHour;
                }*/
                args.api.sendMessage(jutroLekcjeString, args.room);
            } else {
                if (args.daySummaryRetry) {
                    args.daySummaryRetry = null;
                    args.api.sendMessage('Nie ma jutra :( Jeżeli to jest weekend, spróbuj sprawdzić ponownie w niedzielę.', args.room);
                } else {
                    args.daySummaryRetry = true;
                    // librusAutoLoginCallbackArgs(librusApiCallArgs, {api: api, room: event.thread_id, apiCallPath: '/2.0/Timetables', apiCallCallback: daySummaryLessons, addNumber: 1, addType: 'days'});
                    args.apiCallFullPath = json['Pages']['Next'];
                    args.apiCalCallback = daySummaryLessons;
                    librusApiCallArgs(args);
                }
            }
}

var terminarzCallback1 = function(args) {
    console.debug(prefix + 'terminarzCallback1 start');
    try {
        args.terminarzHomeWorks = JSON.parse(args.body);
    } catch (e) {
        args.api.sendMessage('Błąd! :(', args.event.thread_id);
    }
    args.apiCallPath = '/2.0/HomeWorks/Categories';
    args.apiCallCallback = terminarzCallback2;
    librusApiCallArgs(args);
    console.debug(prefix + 'terminarzCallback1 end');
}

var terminarzCallback2 = function(args) {
    console.debug(prefix + 'terminarzCallback2 start');
    try {
        args.terminarzHomeWorksCategories = JSON.parse(args.body);
    } catch (e) {
        args.api.sendMessage('Błąd! :(', args.event.thread_id);
    }
    args.apiCallPath = '/2.0/Users';
    args.apiCallCallback = terminarzCallback3;
    librusApiCallArgs(args);
    console.debug(prefix + 'terminarzCallback2 end');
}

var terminarzCallback3 = function(args) {
    console.debug(prefix + 'terminarzCallback3 start');
    try {
        args.terminarzUsers = JSON.parse(args.body);
    } catch (e) {
        args.api.sendMessage('Błąd! :(', args.event.thread_id);
    }
    args.apiCallPath = '/2.0/Timetables';
    args.apiCallCallback = terminarzCallback4;
    librusApiCallArgs(args);
    console.debug(prefix + 'terminarzCallback3 end');
}

var terminarzCallback4 = function(args) {
    console.debug(prefix + 'terminarzCallback4 start');
    try {
        args.timetable1 = JSON.parse(args.body);
    } catch (e) {
        args.api.sendMessage('Błąd! :(', args.event.thread_id);
    }
    args.apiCallFullPath = args.timetable1.Pages.Next;
    args.apiCallCallback = terminarzCallback5;
    librusApiCallArgs(args);
    console.debug(prefix + 'terminarzCallback4 end');
}

var terminarzCallback5 = function(args) {
    console.debug(prefix + 'terminarzCallback5 start');
    try {
        args.timetable2 = JSON.parse(args.body);
    } catch (e) {
        args.api.sendMessage('Błąd! :(', args.event.thread_id);
    }
    args.apiCallFullPath = args.timetable1.Pages.Next;
    args.apiCallCallback = terminarzCallback6;
    librusApiCallArgs(args);
    console.debug(prefix + 'terminarzCallback5 end');
}

var terminarzCallback6 = function(args) {
    console.debug(prefix + 'terminarzCallback6 start');
    try {
        args.timetable3 = JSON.parse(args.body);
    } catch (e) {
        args.api.sendMessage('Błąd! :(', args.event.thread_id);
    }
    args.apiCallFullPath = null;
    // mamy terminarz i 2 plany lekcji, obecny tydzień i następny tydzień
    
    console.debug(prefix + 'categories check start');
    var homeWorkCategories = {};
    for (var i in args.terminarzHomeWorksCategories.Categories) {
        homeWorkCategories[args.terminarzHomeWorksCategories.Categories[i].Id] = args.terminarzHomeWorksCategories.Categories[i].Name;
    }
    
    var users = {};
    for (var i in args.terminarzUsers.Users) {
        users[args.terminarzUsers.Users[i].Id] = args.terminarzUsers.Users[i].FirstName + ' ' + args.terminarzUsers.Users[i].LastName;
        //console.debug(args.terminarzUsers.Users[i].FirstName + ' ' + args.terminarzUsers.Users[i].LastName);
    }
    
    console.debug(prefix + 'kolejny start');
    var messageGlobal = '';
    for (var i in args.terminarzHomeWorks.HomeWorks) { // Pętla do wpisów w terminarzu
        console.debug(prefix + 'robimy ' + /*print_r(*/JSON.stringify(args.terminarzHomeWorks.HomeWorks[i]));
        if (moment(args.terminarzHomeWorks.HomeWorks[i].Date, "YYYY-MM-DD").toDate() > moment().toDate()) {
            console.debug(prefix + 'waruneczek spełniony');
            // wpis w terminarzu znajduje się w przyszłości, to oznacza że możemy o nim poinformować (co nas interesują nieaktualne wpisy, c'nie?)
            var lessonName = '???';
                // TYDZIEŃ 1
                for (var ii in args.timetable1['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date]) { // Pętla sprawdzająca daty w planie lekcji
                   if (args.timetable1['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii]/*[0]*/.length > 0) { // W tablicy planu lekcji coś się znajduje
                       try {
                        if (args.timetable1['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['Subject']['Name']) { // Czy mamy nazwę przedmiotu we wpisie?
                            if (args.timetable1['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['LessonNo'] == args.terminarzHomeWorks.HomeWorks[i].LessonNo) { // Czy numer przedmiotu zgadza się z numerem w terminarzu?
                                // Bingo! No to ustawiamy nazwę przedmiotu!
                                lessonName = args.timetable1['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['Subject']['Name'];
                            }
                            //console.debug(json['Timetable']['' + jutroDate][i][0]['Subject']['Name']);
                            //jutroLekcjeArray.push(json['Timetable']['' + date][i][0]['Subject']['Name']);
                        } else {
                            //console.debug(prefix + 'Pusty przedmiot!');
                        }
                       } catch(e) {}
                   } 
                }
                // TYDZIEŃ 2
                if (lessonName == '???') {
                    for (var ii in args.timetable2['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date]) { // Pętla sprawdzająca daty w planie lekcji
                        if (args.timetable2['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii]/*[0]*/.length > 0) { // W tablicy planu lekcji coś się znajduje
                            try {
                                if (args.timetable2['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['Subject']['Name']) { // Czy mamy nazwę przedmiotu we wpisie?
                                    if (args.timetable2['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['LessonNo'] == args.terminarzHomeWorks.HomeWorks[i].LessonNo) { // Czy numer przedmiotu zgadza się z numerem w terminarzu?
                                        // Bingo! No to ustawiamy nazwę przedmiotu!
                                        lessonName = args.timetable2['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['Subject']['Name'];
                                    }
                                    //console.debug(json['Timetable']['' + jutroDate][i][0]['Subject']['Name']);
                                    //jutroLekcjeArray.push(json['Timetable']['' + date][i][0]['Subject']['Name']);
                                } else {
                                    //console.debug(prefix + 'Pusty przedmiot!');
                                }
                            } catch(e) {}
                        } 
                    }
                }
                // TYDZIEŃ 3
                if (lessonName == '???') {
                    for (var ii in args.timetable3['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date]) { // Pętla sprawdzająca daty w planie lekcji
                        if (args.timetable3['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii]/*[0]*/.length > 0) { // W tablicy planu lekcji coś się znajduje
                            try {
                                if (args.timetable3['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['Subject']['Name']) { // Czy mamy nazwę przedmiotu we wpisie?
                                    if (args.timetable3['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['LessonNo'] == args.terminarzHomeWorks.HomeWorks[i].LessonNo) { // Czy numer przedmiotu zgadza się z numerem w terminarzu?
                                        // Bingo! No to ustawiamy nazwę przedmiotu!
                                        lessonName = args.timetable3['Timetable']['' + args.terminarzHomeWorks.HomeWorks[i].Date][ii][0]['Subject']['Name'];
                                    }
                                    //console.debug(json['Timetable']['' + jutroDate][i][0]['Subject']['Name']);
                                    //jutroLekcjeArray.push(json['Timetable']['' + date][i][0]['Subject']['Name']);
                                } else {
                                    //console.debug(prefix + 'Pusty przedmiot!');
                                }
                            } catch(e) {}
                        } 
                    }
                }
         // Powinniśmy w tym punkcie mieć nazwę lekcji do naszego wpisu w terminarzu
         var message = '';
         if (args.terminarzDate) { // Jeżeli użytkownik sprezyzował datę, to podajemy mu dokładne info w osobnych wiadomościach
             if (args.terminarzHomeWorks.HomeWorks[i].Date == args.terminarzDate) {
                 message += '--------------------------------\n';
                 message += '' + args.terminarzHomeWorks.HomeWorks[i].Content + '\n';
                 message += 'Data: ' + args.terminarzHomeWorks.HomeWorks[i].Date + ' (' + moment(args.terminarzHomeWorks.HomeWorks[i].Date, "YYYY-MM-DD").locale('pl').calendar() + ' - ' + moment(args.terminarzHomeWorks.HomeWorks[i].Date, "YYYY-MM-DD").locale('pl').fromNow() +  ')\n';
                 message += 'Typ: ' + homeWorkCategories[args.terminarzHomeWorks.HomeWorks[i].Category.Id] + '\n'
                 message += 'Przewidywana lekcja: ' + lessonName + '\n';
                 message += 'Nauczyciel: ' + users[args.terminarzHomeWorks.HomeWorks[i].CreatedBy.Id] + '\n';
                 message += '--------------------------------';
                 args.api.sendMessage(message, args.room);
             }
         } else { // a jeżeli nie, to mu wysyłamy wszystko, ale cały wpis robimy w jednej linijce, a wszystko w jednej wiadomości, aby nie spamować, i aby nic nas za spam nie zablokowało...
             messageGlobal += args.terminarzHomeWorks.HomeWorks[i].Date + ' (' + moment(args.terminarzHomeWorks.HomeWorks[i].Date, "YYYY-MM-DD").locale('pl').calendar() + '): ' + args.terminarzHomeWorks.HomeWorks[i].Content + ' (' + homeWorkCategories[args.terminarzHomeWorks.HomeWorks[i].Category.Id] + '; ~~' + lessonName + '; ' + users[args.terminarzHomeWorks.HomeWorks[i].CreatedBy.Id] + ')';
             if (i == (args.terminarzHomeWorks.HomeWorks.length-1)) {
                 args.api.sendMessage(messageGlobal, args.room);
             } else {
                 messageGlobal += '\n' + '---' + '\n';
             }
         }
        }
    }
}

/*
	The main entry point of the module. This will be called by Kassy whenever the match function
	above returns true. In this basic example it simply replies with "hello world".
*/
exports.run = function(api, event) {
	//api.sendMessage("Sorry, to jeszcze nie działa :(", event.thread_id);
    console.log(prefix + 'run');
    api.sendTyping(event.thread_id);
    //szczesliwyNumerek(api, global_token, event.thread_id);
    if (event.body.startsWith(api.commandPrefix + 'sn')) {
        librusAutoLoginCallbackArgs(librusApiCallArgs, {api: api, room: event.thread_id, apiCallPath: '/2.0/LuckyNumbers', apiCallCallback: szczesliwyNumerek});
    }
    if (event.body.startsWith(api.commandPrefix + 'jutro')) {
        librusAutoLoginCallbackArgs(librusApiCallArgs, {api: api, room: event.thread_id, apiCallPath: '/2.0/Timetables', apiCallCallback: daySummaryLessons, addNumber: 1, addType: 'days'});
    }
    if (event.body.startsWith(api.commandPrefix + 'dzisiaj')) {
        librusAutoLoginCallbackArgs(librusApiCallArgs, {api: api, room: event.thread_id, apiCallPath: '/2.0/Timetables', apiCallCallback: daySummaryLessons, addNumber: 0, addType: 'days'});
    }
    if (event.body.startsWith(api.commandPrefix + 'terminarz')) {
        var chronoString = '';
        for (var i in event.arguments) {
            if (chronoString == '') {
                if (event.arguments[i] != api.commandPrefix + 'terminarz') {
                    chronoString += event.arguments[i];
                }
            } else {
                chronoString += ' ' + event.arguments[i];
            }
        }
        var args = {api: api, room: event.thread_id, apiCallPath: '/2.0/HomeWorks', apiCallCallback: terminarzCallback1};
        if (chronoString != '') {
            try {
                var terminarzDate = moment(chrono.parseDate(chronoString)).format('YYYY-MM-DD');
            } catch (e) {
                api.sendMessage('Sprecyzowano niepoprawną datę! Sprecyzuj poprawną datę albo nie precyzuj jej wcale! (po angielsku musi być...)', event.thread_id);
            }
            args.terminarzDate = terminarzDate;
        }
        librusAutoLoginCallbackArgs(librusApiCallArgs, args);
    }
    if (event.body.startsWith(api.commandPrefix + 'librustest')) {
        // Tu można testować różne rzeczy...
        //startNewDay();
    }
};