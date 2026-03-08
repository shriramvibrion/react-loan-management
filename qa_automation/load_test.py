import requests
import threading
import time

BASE_URL = "http://127.0.0.1:5000/api"
NUM_THREADS = 100
REQUESTS_PER_THREAD = 10

def stress_test(thread_id, results):
    success = 0
    start_time = time.time()
    for i in range(REQUESTS_PER_THREAD):
        try:
            # Hit the login endpoint continuously (heavy db read + bcrypt check)
            res = requests.post(f"{BASE_URL}/user/login", json={"email": "nonexistent@example.com", "password": "wrong"})
            if res.status_code in [200, 401, 404]:
                success += 1
        except Exception as e:
            pass
    duration = time.time() - start_time
    results[thread_id] = (success, duration)

def run_performance_test():
    print(f"Starting Stress Test: {NUM_THREADS} threads, {REQUESTS_PER_THREAD} reqs/thread")
    threads = []
    results = {}
    
    global_start = time.time()
    for i in range(NUM_THREADS):
        t = threading.Thread(target=stress_test, args=(i, results))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    global_dur = time.time() - global_start
    total_reqs = sum(r[0] for r in results.values())
    
    print(f"Stress Test Complete in {global_dur:.2f}s")
    print(f"Total Successful Requests (No Timeout/500): {total_reqs} out of {NUM_THREADS * REQUESTS_PER_THREAD}")
    print(f"Requests per second: {total_reqs / global_dur:.2f} rps")
    

def test_sql_injection():
    print("\nStarting Security Testing: SQL Injection")
    sqli_payload = "' OR 1=1 -- "
    # Try to login with SQL injection payload
    res = requests.post(f"{BASE_URL}/user/login", json={"email": sqli_payload, "password": "password"})
    print("SQLi Login Status Code (Expected 4xx):", res.status_code)
    
    # Try sqli on fetch loans
    res2 = requests.get(f"{BASE_URL}/user/loans?email={sqli_payload}")
    print("SQLi Fetch Loans Status Code (Expected 200 with empty list or 4xx):", res2.status_code)

if __name__ == "__main__":
    test_sql_injection()
    time.sleep(1)
    run_performance_test()
