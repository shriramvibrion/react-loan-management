import requests
import time
import threading
import random

BASE_URL = "http://127.0.0.1:5000/api"

def login_user(email, password="Password123!"):
    res = requests.post(f"{BASE_URL}/user/login", json={"email": email, "password": password})
    if res.status_code == 200:
        return res.json().get("token")
    return None

def fetch_loans(email, token=None):
    res = requests.get(f"{BASE_URL}/user/loans?email={email}")
    return res

def fetch_loan_details(email, loan_id):
    res = requests.get(f"{BASE_URL}/user/loans/{loan_id}?email={email}")
    return res

def admin_login():
    res = requests.post(f"{BASE_URL}/admin/login", json={"email": "admin@example.com", "password": "admin"})
    return res

def admin_fetch_all_loans():
    res = requests.get(f"{BASE_URL}/admin/loans")
    return res

def simulate_user_session(email):
    print(f"[{email}] Simulating session...")
    start_time = time.time()
    
    # 1. Login
    token = login_user(email)
    
    # 2. Fetch Dashboard (loans)
    loans_res = fetch_loans(email)
    loans = []
    if loans_res.status_code == 200:
        loans = loans_res.json().get("loans", [])
    
    # 3. View specifics
    for loan in loans[:3]:
        fetch_loan_details(email, loan["loan_id"])
        time.sleep(random.uniform(0.1, 0.5))  # simulate think time

    # Log metrics
    duration = time.time() - start_time
    print(f"[{email}] Session complete in {duration:.2f}s. Fetched {len(loans)} loans.")

def run_simulation():
    # Attempt to fetch all users from DB directly to get emails, or we can just spam register locally
    # Since we can't easily fetch users without a backend route or db conn, let's connect to db directly
    import mysql.connector
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Shriram@123",
            database="reactloanmanagement"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM users LIMIT 20")
        users = [r[0] for r in cursor.fetchall()]
        conn.close()
    except Exception as e:
        print("Failed to get users directly:", e)
        users = []
        
    print(f"Starting simulation with {len(users)} concurrent users.")
    threads = []
    for email in users:
        t = threading.Thread(target=simulate_user_session, args=(email,))
        threads.append(t)
        t.start()
        time.sleep(0.05) # Ramp up
        
    for t in threads:
        t.join()
        
    print("Simulation complete.")

if __name__ == "__main__":
    run_simulation()
