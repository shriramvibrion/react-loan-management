import requests
import threading
import time
import random

BASE_URL = "http://127.0.0.1:5000/api"
NUM_THREADS = 20
REQUESTS_PER_THREAD = 10

def chaos_test(thread_id, results):
    success = 0
    start_time = time.time()
    for i in range(REQUESTS_PER_THREAD):
        try:
            # We hit the login endpoint which is light, but the app.py middleware will randomly
            # delay, 500, or 400. We want to see if the requests library handles it.
            # We add a low timeout to explicitly catch simulated network delays.
            res = requests.post(
                f"{BASE_URL}/user/login", 
                json={"email": "nonexistent@example.com", "password": "wrong"},
                timeout=3.0 # Strict timeout
            )
            # 200/401/404 are normal responses. 500/400 are chaos monkeys
            if res.status_code in [200, 401, 404]:
                success += 1
        except requests.exceptions.Timeout:
            print(f"[Thread {thread_id}] Chaos Monkey triggered: Timeout > 3s detected.")
        except Exception as e:
             # Can be proxy errors, connection resets (from partial corruption monkey)
             print(f"[Thread {thread_id}] Chaos Monkey triggered: exception {e}")
             
    duration = time.time() - start_time
    results[thread_id] = (success, duration)

def run_chaos_test():
    print(f"Starting Chaos Resilience Test: {NUM_THREADS} threads, {REQUESTS_PER_THREAD} reqs/thread")
    threads = []
    results = {}
    
    global_start = time.time()
    for i in range(NUM_THREADS):
        t = threading.Thread(target=chaos_test, args=(i, results))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    global_dur = time.time() - global_start
    total_success = sum(r[0] for r in results.values())
    total_reqs = NUM_THREADS * REQUESTS_PER_THREAD
    failure_rate = ((total_reqs - total_success) / total_reqs) * 100
    
    print(f"\nChaos Test Complete in {global_dur:.2f}s")
    print(f"Total Successful Requests (Evaded Chaos): {total_success} out of {total_reqs}")
    print(f"Chaos Impact Rate: {failure_rate:.1f}%")

if __name__ == "__main__":
    run_chaos_test()
