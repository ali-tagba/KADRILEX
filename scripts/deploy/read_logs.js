const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('find / -name "npm" -type f -executable 2>/dev/null', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
    console.error('Error', err);
}).connect({
  host: '37.59.99.86',
  port: 22,
  username: 'ubuntu',
  password: 'KadrilexSecure2026!'
});
