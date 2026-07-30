const Client = require('ssh2').Client;
const conn = new Client();

const HOST = 'vps-d95d2020.vps.ovh.net';
const PORT = 22;
const USERNAME = 'ubuntu';
const PASSWORD = 'Haoualizoosk260267 .';

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('sudo -n true', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD
});
