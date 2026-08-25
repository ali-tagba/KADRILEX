const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Connected');
  const cmd = `cat << 'EOF' > /home/ubuntu/deploy.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd /home/ubuntu/app
npm run build > build_output.log 2>&1
pm2 restart all > pm2_output.log 2>&1
EOF
bash /home/ubuntu/deploy.sh`;
  conn.exec(cmd, (err, stream) => {
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
