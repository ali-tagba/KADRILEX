const Client = require('ssh2').Client;
const conn = new Client();

const HOST = 'vps-d95d2020.vps.ovh.net';
const PORT = 22;
const USERNAME = 'ubuntu'; // ou root
const PASSWORD = 'Haoualizoosk260267 .';

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('uptime && uname -a', (err, stream) => {
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
}).on('error', (err) => {
  console.error('Connection Error:', err);
  // Try with root if ubuntu fails
  if (USERNAME === 'ubuntu') {
    console.log('Trying with root...');
    const connRoot = new Client();
    connRoot.on('ready', () => {
      console.log('Root Client :: ready');
      connRoot.exec('uptime && uname -a', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          connRoot.end();
        }).on('data', (data) => {
          console.log('ROOT STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('ROOT STDERR: ' + data);
        });
      });
    }).on('error', (err2) => {
      console.error('Root Connection Error:', err2);
    }).connect({ host: HOST, port: PORT, username: 'root', password: PASSWORD });
  }
}).connect({
  host: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD
});
