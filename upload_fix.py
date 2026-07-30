import paramiko, os
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('37.59.99.86', username='ubuntu', password='KadrilexSecure2026!')
    sftp = client.open_sftp()
    
    # Files to upload
    files = [
        ('prisma/schema.prisma', '/home/ubuntu/app/prisma/schema.prisma'),
        ('lib/mock/invoices.ts', '/home/ubuntu/app/lib/mock/invoices.ts'),
        ('lib/server/schemas.ts', '/home/ubuntu/app/lib/server/schemas.ts'),
        ('app/api/invoices/route.ts', '/home/ubuntu/app/app/api/invoices/route.ts'),
        ('components/facturation/facture-form-dialog.tsx', '/home/ubuntu/app/components/facturation/facture-form-dialog.tsx'),
        ('components/dossiers/dossier-finance-section.tsx', '/home/ubuntu/app/components/dossiers/dossier-finance-section.tsx')
    ]
    
    for local_p, remote_p in files:
        sftp.put(local_p, remote_p)
    
    print("Files uploaded successfully.")
    sftp.close()
    
    # Start the build again
    print("Starting build...")
    stdin, stdout, stderr = client.exec_command('cd /home/ubuntu/app && sudo docker compose build --no-cache app && sudo docker compose up -d')
    # We will just start it, let it run
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
