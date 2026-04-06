import json
import urllib.request
import urllib.error

URL = "http://127.0.0.1:5000/api/admin/login"

def call(payload):
    req = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body

ok_status, ok_body = call({"email": "admin@example.com", "password": "Admin@123"})
bad_status, bad_body = call({"email": "admin@example.com", "password": "WrongPass"})

print("VALID_LOGIN_STATUS", ok_status)
print("VALID_LOGIN_BODY", ok_body)
print("INVALID_LOGIN_STATUS", bad_status)
print("INVALID_LOGIN_BODY", bad_body)
