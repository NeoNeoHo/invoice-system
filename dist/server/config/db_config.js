'use strict';
var mysql = require('mysql');

var mysql_config = {
	host: 'localhost',
	// host: 'vecsgardenia-db-ins.ccnj83jjx4cg.ap-northeast-1.rds.amazonaws.com',
	port: 3306,
	// user: 'BensonHo',
	// password: 'MaJaaup6',
	user: 'temp',
	password: 'temp',
	database: 'vecsgardenia2015',
	db_prefix: 'oc_',
	multipleStatements: true
};

var connection;

function handleDisconnect() {
	connection = mysql.createConnection(mysql_config); // Recreate the connection, since
																						// the old one cannot be reused.
	connection.connect(function(err) {              // The server is either down
		if(err) {                                     // or restarting (takes a while sometimes).
			console.log('error when connecting to db:', err);
			setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
		}                                     // to avoid a hot loop, and to allow our node script to
	});                                     // process asynchronous requests in the meantime.
											// If you're also serving http, display a 503 error.
	connection.ping(function (err) {
		if (err) throw err;
		console.log('Server responded to ping');
	})
	connection.on('error', function(err) {
		console.log('db error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') { // Connection to the MySQL server is usually
			console.log(err);
			handleDisconnect();                         // lost due to either server restart, or a
		} else {                                      // connnection idle timeout (the wait_timeout
			throw err;                                  // server variable configures this)
		}
	});
}
handleDisconnect();
exports.mysql_connection = connection;


var pool  = mysql.createPool(mysql_config);

exports.mysql_pool = pool;
