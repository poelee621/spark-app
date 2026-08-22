import base64, os, time, json, sys, urllib.request, urllib.error
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization

# read secrets from local file
secrets = {}
with open("apple_api_b64.txt") as f:
    for line in f:
        line = line.strip()
        if not line or "=" not in line:
            continue
        k, v = line.split("=", 1)
        secrets[k.strip()] = v.strip()

key_id = secrets["APPLE_API_KEY_ID"]
issuer = secrets["APPLE_API_ISSUER_ID"]
p8_b64 = secrets["APPLE_API_KEY_B64"]
p8_pem = base64.b64decode(p8_b64)

key = serialization.load_pem_private_key(p8_pem, password=None)

def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

now = int(time.time())
header = b64url(json.dumps({"alg": "ES256", "kid": key_id, "typ": "JWT"}).encode())
payload = b64url(json.dumps({"iss": issuer, "iat": now - 20, "exp": now + 600,
                             "aud": "appstoreconnect-v1"}).encode())
signing_input = f"{header}.{payload}".encode()
der = key.sign(signing_input, ec.ECDSA(hashes.SHA256()))
r, s = decode_dss_signature(der)
raw = r.to_bytes(32, "big") + s.to_bytes(32, "big")
jwt = f"{header}.{payload}.{b64url(raw)}"

def api_get(url):
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {jwt}", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)

try:
    apps = api_get("https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=com.coldtank.spark")
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}: {e.read().decode()[:500]}")
    sys.exit(1)

if not apps.get("data"):
    print("ERROR: no app record found for bundleId com.coldtank.spark under this API key's team")
    print("This means the API key belongs to a DIFFERENT team than the app you're viewing.")
    sys.exit(1)

app_id = apps["data"][0]["id"]
app_name = apps["data"][0]["attributes"]["name"]
print(f"APP: {app_name} (id={app_id})")

builds = api_get(
    f"https://api.appstoreconnect.apple.com/v1/builds?filter[app]={app_id}&sort=-uploadedDate&limit=10")
print("--- builds actually on Apple server (newest first) ---")
for b in builds.get("data", []):
    a = b["attributes"]
    print(f"  version={a.get('version')}  build={a.get('buildNumber')}  "
          f"state={a.get('processingState')}  uploaded={a.get('uploadedDate')}")
