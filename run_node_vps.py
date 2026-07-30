import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('37.59.99.86', username='ubuntu', password='KadrilexSecure2026!')
    
    script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const clients = await prisma.client.findMany({
    where: { raisonSociale: { contains: 'star', mode: 'insensitive' } },
    select: { id: true, numeroClient: true, raisonSociale: true }
  });
  console.log('CLIENTS STAR:', clients);
}
main().catch(console.error);
"""
    
    sftp = client.open_sftp()
    with sftp.file('/home/ubuntu/app/test_db.js', 'w') as f:
        f.write(script)
    sftp.close()
    
    stdin, stdout, stderr = client.exec_command("sudo docker exec kadrilex-app node test_db.js")
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())

finally:
    client.close()
