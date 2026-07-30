import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request("http://37.59.99.86:3000/api/clients", headers={'User-Agent': 'Mozilla'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        if isinstance(data, dict) and 'data' in data:
             print(json.dumps(data['data'][:5], indent=2))
        else:
             print(json.dumps(data[:5], indent=2))
except Exception as e:
    print("Error:", e)
