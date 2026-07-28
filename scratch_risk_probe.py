import requests

tests = [
    ("U003", "U007", 12000.0),
    ("U003", "U007", 18000.0),
    ("U003", "U007", 22000.0),
]
for f, t, a in tests:
    r = requests.post("http://localhost:8080/api/txn/initiate",
                      json={"fromUserId": f, "toUserId": t, "amount": a})
    if r.status_code != 200:
        print(f"U003->U007 amt={a}  HTTP {r.status_code}: {r.text[:120]}")
        continue
    d = r.json()
    rbs = ", ".join(f"[{x['rule']}]+{x['points']}" for x in d.get("riskBreakdown", []))
    print(f"amt={a}  risk={d.get('riskScore')}  status={d.get('status')}  routing={d.get('routingDecision')}  => {rbs}")
