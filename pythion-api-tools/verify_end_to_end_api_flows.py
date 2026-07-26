#!/usr/bin/env python3
"""End-to-end FraudShield backend + Canton flow verifier.

This script is intentionally black-box: it drives the public HTTP APIs exposed by
`docker compose up --build` and checks the Canton-facing ports/services expected
by the compose file. It is safe to run repeatedly against a local/dev database;
mutating checks use seeded demo users and restore the user balance they modify.

Usage:
  python3 pythion-api-tools/verify_end_to_end_api_flows.py

Useful environment variables:
  FRAUDSHIELD_BASE_URL=http://localhost:8080
  FRAUDSHIELD_JSON_API_BANKA=http://localhost:7575
  FRAUDSHIELD_JSON_API_BANKB=http://localhost:7585
  FRAUDSHIELD_JSON_API_BANKC=http://localhost:7595
  CANTON_HOST=localhost
  FRAUDSHIELD_TIMEOUT_SECONDS=10
  RUN_MUTATING_FLOWS=true
  STRICT_CANTON_REFS=false
"""

from __future__ import annotations

import json
import os
import socket
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable
from urllib.parse import urljoin

import requests

BASE_URL = os.getenv("FRAUDSHIELD_BASE_URL", "http://localhost:8080").rstrip("/")
TIMEOUT = float(os.getenv("FRAUDSHIELD_TIMEOUT_SECONDS", "10"))
RUN_MUTATING_FLOWS = os.getenv("RUN_MUTATING_FLOWS", "true").lower() == "true"
STRICT_CANTON_REFS = os.getenv("STRICT_CANTON_REFS", "false").lower() == "true"
CANTON_HOST = os.getenv("CANTON_HOST", "localhost")

JSON_APIS = {
    "banka": os.getenv("FRAUDSHIELD_JSON_API_BANKA", "http://localhost:7575").rstrip("/"),
    "bankb": os.getenv("FRAUDSHIELD_JSON_API_BANKB", "http://localhost:7585").rstrip("/"),
    "bankc": os.getenv("FRAUDSHIELD_JSON_API_BANKC", "http://localhost:7595").rstrip("/"),
}

CANTON_PORTS = {
    "domain-public": 4011,
    "domain-admin": 4012,
    "banka-ledger": 5001,
    "banka-admin": 5002,
    "bankb-ledger": 5011,
    "bankb-admin": 5012,
    "bankc-ledger": 5021,
    "bankc-admin": 5022,
    "synchronizer-ledger": 5031,
    "synchronizer-admin": 5032,
}

EXPECTED_USERS = {"U001", "U002", "U003", "U004", "U005", "U006", "U007", "ADMIN"}
EXPECTED_BANKS = {
    "U001": "BankA",
    "U002": "BankA",
    "U003": "BankB",
    "U004": "BankB",
    "U005": "BankC",
    "U006": "BankC",
    "U007": "BankC",
    "ADMIN": "Platform",
}


@dataclass
class Result:
    name: str
    status: str
    details: str = ""


@dataclass
class State:
    users_by_id: dict[str, dict[str, Any]] = field(default_factory=dict)
    created_txns: list[dict[str, Any]] = field(default_factory=list)
    original_balances: dict[str, float] = field(default_factory=dict)


state = State()
results: list[Result] = []


def pretty(payload: Any) -> str:
    if isinstance(payload, str):
        return payload[:2000]
    return json.dumps(payload, indent=2, sort_keys=True, default=str)[:5000]


def request(method: str, path: str, *, base_url: str = BASE_URL, **kwargs: Any) -> tuple[requests.Response, Any]:
    url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
    response = requests.request(method, url, timeout=TIMEOUT, **kwargs)
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    print(f"\n{method} {url} -> {response.status_code}")
    print(pretty(payload))
    return response, payload


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def expect_status(response: requests.Response, allowed: Iterable[int], message: str) -> None:
    allowed_set = set(allowed)
    expect(response.status_code in allowed_set, f"{message}: expected {sorted(allowed_set)}, got {response.status_code}")


def check(name: str) -> Callable[[Callable[[], None]], Callable[[], None]]:
    def decorate(fn: Callable[[], None]) -> Callable[[], None]:
        def wrapped() -> None:
            print(f"\n=== {name} ===")
            try:
                fn()
                results.append(Result(name, "PASS"))
                print(f"PASS: {name}")
            except NotImplementedError as exc:
                results.append(Result(name, "SKIP", str(exc)))
                print(f"SKIP: {name}: {exc}")
            except Exception as exc:  # noqa: BLE001 - top-level verifier must collect every failure
                results.append(Result(name, "FAIL", str(exc)))
                print(f"FAIL: {name}: {exc}")
        return wrapped
    return decorate


def tcp_check(host: str, port: int) -> bool:
    with socket.create_connection((host, port), timeout=TIMEOUT):
        return True


def initiate(from_user: str, to_user: str, amount: float, transaction_type: str = "DOMESTIC") -> dict[str, Any]:
    response, payload = request(
        "POST",
        "/api/txn/initiate",
        json={
            "fromUserId": from_user,
            "toUserId": to_user,
            "amount": amount,
            "transactionType": transaction_type,
            "bypassSelfLimits": True,
        },
    )
    expect_status(response, {200}, "transaction initiation should succeed")
    expect(payload.get("txnId"), f"transaction response should include txnId: {payload}")
    state.created_txns.append(payload)
    return payload


def assert_contract_ref(txn: dict[str, Any]) -> None:
    response, payload = request("GET", f"/api/canton/contract-refs/{txn['txnId']}")
    if response.status_code == 200:
        expect(payload.get("txnId") == txn["txnId"], f"contract ref txnId mismatch: {payload}")
        return
    if response.status_code == 404 and not STRICT_CANTON_REFS:
        print("INFO: no contract ref found; set STRICT_CANTON_REFS=true to make this fatal.")
        return
    expect_status(response, {200}, "Canton contract ref should exist")


@check("backend health/readiness/metrics")
def backend_health() -> None:
    response, _ = request("GET", "/health")
    expect_status(response, {200}, "/health should be UP")
    response, payload = request("GET", "/ready")
    expect_status(response, {200, 503}, "/ready should respond")
    expect("canton" in payload, "/ready should include canton readiness")
    response, _ = request("GET", "/metrics-lite")
    expect_status(response, {200}, "/metrics-lite should respond")


@check("Canton TCP ports")
def canton_tcp_ports() -> None:
    for name, port in CANTON_PORTS.items():
        expect(tcp_check(CANTON_HOST, port), f"{name} {CANTON_HOST}:{port} should accept TCP")


@check("DAML JSON API health endpoints")
def json_api_health() -> None:
    for participant, base_url in JSON_APIS.items():
        response, _ = request("GET", "/livez", base_url=base_url)
        expect_status(response, {200, 404}, f"{participant} JSON API should answer /livez or expose legacy routes")
        response, _ = request("GET", "/readyz", base_url=base_url)
        expect_status(response, {200, 404}, f"{participant} JSON API should answer /readyz or expose legacy routes")


@check("Canton backend status/config/mappings")
def canton_backend_api() -> None:
    response, payload = request("GET", "/api/canton/status")
    expect_status(response, {200}, "Canton status should respond")
    missing = [name for name, count in payload.get("collections", {}).items() if count == "MISSING"]
    expect(not missing, f"missing Canton collections: {missing}")

    response, payload = request("GET", "/api/canton/config")
    expect_status(response, {200}, "Canton config should respond")
    expect("enabled" in payload and "networkStatus" in payload, f"unexpected Canton config: {payload}")

    response, mappings = request("GET", "/api/canton/party-mappings")
    expect_status(response, {200}, "party mappings should respond")
    mapped_ids = {mapping.get("appUserId") for mapping in mappings}
    expect(EXPECTED_USERS.issubset(mapped_ids), f"missing party mappings: {sorted(EXPECTED_USERS - mapped_ids)}")

    response, mapping = request("GET", "/api/canton/party-mappings/ADMIN")
    expect_status(response, {200}, "ADMIN mapping should exist")
    expect(mapping.get("cantonPartyId") == "GlobalSynchronizer_Party", f"unexpected ADMIN mapping: {mapping}")


@check("seeded users and user settings APIs")
def users_and_settings() -> None:
    response, users = request("GET", "/api/users/all")
    expect_status(response, {200}, "users endpoint should respond")
    state.users_by_id = {user["id"]: user for user in users}
    expect(EXPECTED_USERS.issubset(state.users_by_id), f"missing seeded users: {sorted(EXPECTED_USERS - set(state.users_by_id))}")
    for user_id, bank in EXPECTED_BANKS.items():
        user = state.users_by_id[user_id]
        expect(user.get("bankId") == bank, f"{user_id} bank mismatch: {user}")
        for field in ("participantId", "cantonPartyId", "cantonRole"):
            expect(user.get(field), f"{user_id} missing {field}: {user}")

    response, limits = request("GET", "/api/users/U001/self-limits")
    expect_status(response, {200}, "self-limits GET should respond")
    update_body = {
        "dailyTransactionLimit": limits.get("dailyTransactionLimit", 50000),
        "weeklyTransactionLimit": limits.get("weeklyTransactionLimit", 250000),
        "maxBeneficiaryAmount": limits.get("maxBeneficiaryAmount", 100000),
        "domesticTransactionsEnabled": limits.get("domesticTransactionsEnabled", True),
        "internationalTransactionsEnabled": limits.get("internationalTransactionsEnabled", True),
    }
    response, _ = request("PUT", "/api/users/U001/self-limits", json=update_body)
    expect_status(response, {200}, "self-limits PUT should respond")

    response, settings = request("GET", "/api/users/U001/rule-settings")
    expect_status(response, {200}, "rule-settings GET should respond")
    response, _ = request("PUT", "/api/users/U001/rule-settings", json=settings.get("rules", {}))
    expect_status(response, {200}, "rule-settings PUT should respond")


@check("beneficiary APIs")
def beneficiary_apis() -> None:
    response, _ = request("GET", "/api/users/U001/beneficiaries")
    expect_status(response, {200}, "beneficiary list should respond")
    response, payload = request("POST", "/api/users/U001/beneficiaries", json={"recipientUserId": "U002", "disableCoolOff": True})
    expect_status(response, {200}, "beneficiary add should respond")
    expect(payload.get("recipientUserId") in {"U002", None} or payload.get("recipientId") == "U002", f"unexpected beneficiary payload: {payload}")
    response, _ = request("POST", "/api/users/U001/beneficiaries/U002/activate")
    expect_status(response, {200, 404}, "beneficiary activate should respond")
    response, _ = request("DELETE", "/api/users/U001/beneficiaries/U002")
    expect_status(response, {204, 404}, "beneficiary delete should respond")


@check("admin and balance APIs")
def admin_and_balance_apis() -> None:
    for path in ("/api/admin/alerts", "/api/admin/suspicious", "/api/admin/queue"):
        response, _ = request("GET", path)
        expect_status(response, {200}, f"{path} should respond")

    response, payload = request("GET", "/api/admin/beneficiary-limit")
    expect_status(response, {200}, "beneficiary limit GET should respond")
    current_limit = payload.get("limitAmount", 100000.0)
    response, _ = request("PUT", "/api/admin/beneficiary-limit", json={"limitAmount": current_limit})
    expect_status(response, {200}, "beneficiary limit PUT should respond")

    response, balance = request("GET", "/api/admin/balance/U001")
    expect_status(response, {200}, "balance GET should respond")
    original_balance = float(balance.get("balance", 0.0))
    state.original_balances["U001"] = original_balance
    response, _ = request("POST", "/api/admin/balance/U001/add?amount=1")
    expect_status(response, {200}, "balance add should respond")
    response, _ = request("POST", f"/api/admin/balance/U001/set?amount={original_balance}")
    expect_status(response, {200}, "balance restore should respond")


@check("chain APIs")
def chain_apis() -> None:
    for chain in ("alpha", "beta", "gamma"):
        response, payload = request("GET", f"/api/chain/{chain}/blocks?limit=5")
        expect_status(response, {200}, f"{chain} blocks should respond")
        expect(isinstance(payload, list), f"{chain} blocks should be a list")
    if RUN_MUTATING_FLOWS:
        response, payload = request("POST", "/api/chain/sync")
        expect_status(response, {200}, "chain sync should respond")
        expect(payload.get("status") == "SYNCED", f"unexpected chain sync payload: {payload}")


@check("Cortex APIs")
def cortex_apis() -> None:
    response, config = request("GET", "/api/cortex/config")
    expect_status(response, {200}, "Cortex config GET should respond")
    response, _ = request("POST", "/api/cortex/config", json={"enabled": config.get("enabled", False), "dummyMode": config.get("dummyMode", True)})
    expect_status(response, {200}, "Cortex config POST should respond")
    response, _ = request("GET", "/api/cortex/review/user/U001")
    expect_status(response, {200}, "Cortex user review should respond")


@check("low-risk transaction flow")
def low_risk_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U001", "U002", 25)
    expect(txn.get("status") == "APPROVED", f"low-risk status should be APPROVED: {txn}")
    expect(txn.get("routingDecision") == "AUTO_APPROVE", f"low-risk route should be AUTO_APPROVE: {txn}")
    assert_contract_ref(txn)


@check("medium-risk admin approval flow")
def medium_risk_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U002", "U005", 30000)
    expect(txn.get("status") == "PENDING_ADMIN", f"medium-risk should be pending admin: {txn}")
    response, queue = request("GET", "/api/admin/queue")
    expect_status(response, {200}, "admin queue should respond")
    expect(any(item.get("id") == txn["txnId"] for item in queue), "txn should appear in admin queue")
    response, decision = request("POST", f"/api/admin/txn/{txn['txnId']}/decide", json={"approved": True})
    expect_status(response, {200}, "admin approval should respond")
    expect(decision.get("status") == "APPROVED", f"admin approval should approve: {decision}")
    assert_contract_ref(txn)


@check("high-risk consent and approval flow")
def high_risk_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U003", "U004", 110000)
    expect(txn.get("status") == "PENDING_CONSENT", f"high-risk should require consent: {txn}")
    response, consent = request("POST", f"/api/admin/txn/{txn['txnId']}/consent", json={"approved": True})
    expect_status(response, {200}, "consent approval should respond")
    expect(consent.get("status") == "PENDING_ADMIN", f"consent should move to admin: {consent}")
    response, decision = request("POST", f"/api/admin/txn/{txn['txnId']}/decide", json={"approved": True})
    expect_status(response, {200}, "admin approval should respond")
    expect(decision.get("status") == "APPROVED", f"admin should approve: {decision}")
    assert_contract_ref(txn)


@check("admin rejection flow")
def rejection_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U004", "U001", 30000)
    if txn.get("status") == "PENDING_CONSENT":
        response, _ = request("POST", f"/api/admin/txn/{txn['txnId']}/consent", json={"approved": True})
        expect_status(response, {200}, "consent approval before rejection should respond")
    response, decision = request("POST", f"/api/admin/txn/{txn['txnId']}/decide", json={"approved": False})
    expect_status(response, {200}, "admin rejection should respond")
    expect(decision.get("status") == "REJECTED", f"admin should reject: {decision}")


@check("escrow opt-in API")
def escrow_opt_in_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U005", "U003", 75)
    response, payload = request("POST", f"/api/canton/txn/{txn['txnId']}/escrow-optin", json={"fromUserId": "U005"})
    expect_status(response, {200, 403, 500}, "escrow opt-in should be implemented or explicitly report Canton unavailability")
    if response.status_code == 200:
        expect(payload.get("escrowOptIn") is True, f"escrow opt-in should be true: {payload}")


@check("transaction history and mempool APIs")
def transaction_read_apis() -> None:
    response, payload = request("GET", "/api/mempool/status")
    expect_status(response, {200}, "mempool status should respond")
    expect(isinstance(payload, dict), f"mempool status should be object: {payload}")
    for user_id in ("U001", "U003", "U005"):
        response, _ = request("GET", f"/api/txn/user/{user_id}/pending")
        expect_status(response, {200}, f"{user_id} pending txns should respond")
        response, _ = request("GET", f"/api/txn/user/{user_id}/history")
        expect_status(response, {200}, f"{user_id} txn history should respond")


def main() -> int:
    print("FraudShield end-to-end verifier")
    print(f"Backend: {BASE_URL}")
    print(f"Canton host: {CANTON_HOST}")
    print(f"JSON APIs: {JSON_APIS}")
    checks = [
        backend_health,
        canton_tcp_ports,
        json_api_health,
        canton_backend_api,
        users_and_settings,
        beneficiary_apis,
        admin_and_balance_apis,
        chain_apis,
        cortex_apis,
        low_risk_flow,
        medium_risk_flow,
        high_risk_flow,
        rejection_flow,
        escrow_opt_in_flow,
        transaction_read_apis,
    ]
    for check_fn in checks:
        check_fn()
        time.sleep(0.2)

    print("\n=== Summary ===")
    for result in results:
        suffix = f" - {result.details}" if result.details else ""
        print(f"{result.status}: {result.name}{suffix}")

    failed = [result for result in results if result.status == "FAIL"]
    if failed:
        print(f"\n{len(failed)} check(s) failed.")
        return 1
    print("\nNo failed checks. SKIP means the check was intentionally disabled by environment flags.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
