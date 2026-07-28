#!/usr/bin/env python3
"""
FraudShield end-to-end API flow verifier.

Covers the currently implemented backend scenarios through HTTP APIs:
- platform health/readiness
- Canton status, projection collections, party mappings
- low-risk auto approval
- medium-risk/admin-review path
- high-risk consent + admin approval path
- admin rejection path
- multi-bank user mapping checks
- current Canton contract-ref expectation for non-Canton-backed flows
- escrow scenario visibility as a planned/not-yet-backed path

Usage:
  python tools/verify_all_api_flows.py

Useful environment variables:
  FRAUDSHIELD_BASE_URL=http://localhost:8080
  FRAUDSHIELD_TIMEOUT_SECONDS=10
  STRICT_CANTON_REFS=false   # true requires contract refs to exist for created txns
  RUN_MUTATING_FLOWS=true    # false runs only read-only checks
"""

from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import urljoin

import requests

BASE_URL = os.getenv("FRAUDSHIELD_BASE_URL", "http://localhost:8080").rstrip("/")
TIMEOUT = float(os.getenv("FRAUDSHIELD_TIMEOUT_SECONDS", "10"))
STRICT_CANTON_REFS = os.getenv("STRICT_CANTON_REFS", "false").lower() == "true"
RUN_MUTATING_FLOWS = os.getenv("RUN_MUTATING_FLOWS", "true").lower() == "true"

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
class CheckResult:
    name: str
    status: str
    details: str = ""


@dataclass
class Context:
    created_txns: list[dict[str, Any]] = field(default_factory=list)
    users_by_id: dict[str, dict[str, Any]] = field(default_factory=dict)


results: list[CheckResult] = []
ctx = Context()


def pretty(payload: Any) -> str:
    if isinstance(payload, str):
        return payload
    return json.dumps(payload, indent=2, sort_keys=True, default=str)


def request(method: str, path: str, **kwargs: Any) -> tuple[requests.Response, Any]:
    url = urljoin(BASE_URL + "/", path.lstrip("/"))
    response = requests.request(method, url, timeout=TIMEOUT, **kwargs)
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    print(f"\n{method} {path} -> {response.status_code}")
    print(pretty(payload))
    return response, payload


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def expect_status(response: requests.Response, allowed: set[int], message: str) -> None:
    expect(response.status_code in allowed, f"{message}: expected {sorted(allowed)}, got {response.status_code}")


def check(name: str) -> Callable[[Callable[[], None]], Callable[[], None]]:
    def decorator(fn: Callable[[], None]) -> Callable[[], None]:
        def wrapper() -> None:
            print(f"\n=== {name} ===")
            try:
                fn()
                results.append(CheckResult(name, "PASS"))
                print(f"PASS: {name}")
            except NotImplementedError as exc:
                results.append(CheckResult(name, "SKIP", str(exc)))
                print(f"SKIP: {name}: {exc}")
            except Exception as exc:  # noqa: BLE001 - top-level test runner reports all failures
                results.append(CheckResult(name, "FAIL", str(exc)))
                print(f"FAIL: {name}: {exc}")
        return wrapper
    return decorator


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
    expect(payload.get("txnId"), "transaction response should include txnId")
    ctx.created_txns.append(payload)
    return payload


def assert_contract_ref_expectation(txn: dict[str, Any]) -> None:
    txn_id = txn["txnId"]
    response, _ = request("GET", f"/api/canton/contract-refs/{txn_id}")
    if response.status_code == 200:
        return
    if response.status_code == 404 and not STRICT_CANTON_REFS:
        print(
            "INFO: No Canton contract ref exists yet for this transaction. "
            "That is expected until the corresponding low/medium/high/escrow flow is moved from local state to Canton commands."
        )
        return
    expect_status(response, {200}, "Canton contract ref should exist when STRICT_CANTON_REFS=true")


@check("health and readiness APIs")
def health_and_readiness() -> None:
    response, _ = request("GET", "/health")
    expect_status(response, {200}, "/health should respond")
    response, payload = request("GET", "/ready")
    expect_status(response, {200, 503}, "/ready should respond even when Canton is down")
    expect("canton" in payload, "/ready should include a canton readiness object")


@check("Canton status and projection collections")
def canton_status() -> None:
    response, payload = request("GET", "/api/canton/status")
    expect_status(response, {200}, "/api/canton/status should respond")
    missing = [name for name, count in payload.get("collections", {}).items() if count == "MISSING"]
    expect(not missing, f"Canton projection collections are missing: {missing}")


@check("seeded users have Canton metadata")
def users_and_mappings() -> None:
    response, users = request("GET", "/api/users/all")
    expect_status(response, {200}, "/api/users/all should respond")
    ctx.users_by_id = {user["id"]: user for user in users}
    expect(EXPECTED_USERS.issubset(ctx.users_by_id), f"Missing users: {sorted(EXPECTED_USERS - set(ctx.users_by_id))}")
    for user_id in sorted(EXPECTED_USERS):
        user = ctx.users_by_id[user_id]
        expect(user.get("bankId") == EXPECTED_BANKS[user_id], f"{user_id} bankId mismatch: {user}")
        for field_name in ("participantId", "cantonPartyId", "cantonRole"):
            expect(user.get(field_name), f"{user_id} missing {field_name}: {user}")

    response, mappings = request("GET", "/api/canton/party-mappings")
    expect_status(response, {200}, "/api/canton/party-mappings should respond")
    mapped_ids = {mapping.get("appUserId") for mapping in mappings}
    expect(EXPECTED_USERS.issubset(mapped_ids), f"Missing party mappings: {sorted(EXPECTED_USERS - mapped_ids)}")


@check("multi-bank topology check")
def multi_bank_topology() -> None:
    if not ctx.users_by_id:
        users_and_mappings()
    banks = {user_id: ctx.users_by_id[user_id]["bankId"] for user_id in EXPECTED_USERS}
    expect(banks["U001"] == "BankA" and banks["U003"] == "BankB" and banks["U005"] == "BankC", f"Unexpected bank mapping: {banks}")
    response, mapping = request("GET", "/api/canton/party-mappings/ADMIN")
    expect_status(response, {200}, "ADMIN party mapping should exist")
    expect(mapping.get("cantonPartyId") == "GlobalSynchronizer_Party", f"Unexpected ADMIN mapping: {mapping}")


@check("low-risk AUTO_APPROVE flow")
def low_risk_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U001", "U002", 25)
    expect(txn.get("status") == "APPROVED", f"low-risk status should be APPROVED: {txn}")
    expect(txn.get("routingDecision") == "AUTO_APPROVE", f"low-risk routing should be AUTO_APPROVE: {txn}")
    assert_contract_ref_expectation(txn)


@check("medium-risk admin review flow")
def medium_risk_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U002", "U005", 30000)
    expect(txn.get("status") == "PENDING_ADMIN", f"medium-risk status should be PENDING_ADMIN: {txn}")
    expect(txn.get("routingDecision") == "ADMIN_REVIEW", f"medium-risk routing should be ADMIN_REVIEW: {txn}")
    response, queue = request("GET", "/api/admin/queue")
    expect_status(response, {200}, "admin queue should respond")
    expect(any(item.get("id") == txn["txnId"] for item in queue), "medium-risk txn should appear in admin queue")
    response, decision = request("POST", f"/api/admin/txn/{txn['txnId']}/decide", json={"approved": True})
    expect_status(response, {200}, "admin approval should respond")
    expect(decision.get("status") == "APPROVED", f"admin approval should approve txn: {decision}")
    assert_contract_ref_expectation(txn)


@check("high-risk consent plus admin approval flow")
def high_risk_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U003", "U004", 110000)
    expect(txn.get("status") == "PENDING_CONSENT", f"high-risk status should be PENDING_CONSENT: {txn}")
    expect(txn.get("routingDecision") == "CONSENT_REQUIRED", f"high-risk routing should be CONSENT_REQUIRED: {txn}")
    response, consent = request("POST", f"/api/admin/txn/{txn['txnId']}/consent", json={"approved": True})
    expect_status(response, {200}, "consent approval should respond")
    expect(consent.get("status") == "PENDING_ADMIN", f"consent approval should move to PENDING_ADMIN: {consent}")
    response, decision = request("POST", f"/api/admin/txn/{txn['txnId']}/decide", json={"approved": True})
    expect_status(response, {200}, "admin approval should respond")
    expect(decision.get("status") == "APPROVED", f"admin should approve high-risk txn: {decision}")
    assert_contract_ref_expectation(txn)


@check("admin rejection flow")
def admin_rejection_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U004", "U001", 30000)
    expect(txn.get("status") in {"PENDING_ADMIN", "PENDING_CONSENT"}, f"txn should be pending before rejection: {txn}")
    if txn.get("status") == "PENDING_CONSENT":
        request("POST", f"/api/admin/txn/{txn['txnId']}/consent", json={"approved": True})
    response, decision = request("POST", f"/api/admin/txn/{txn['txnId']}/decide", json={"approved": False})
    expect_status(response, {200}, "admin rejection should respond")
    expect(decision.get("status") == "REJECTED", f"admin should reject txn: {decision}")


@check("multi-bank transaction smoke flow")
def multi_bank_transaction_flow() -> None:
    if not RUN_MUTATING_FLOWS:
        raise NotImplementedError("RUN_MUTATING_FLOWS=false")
    txn = initiate("U005", "U003", 50)
    expect(txn.get("fromUserId") == "U005" and txn.get("toUserId") == "U003", f"unexpected multi-bank txn response: {txn}")
    expect(ctx.users_by_id.get("U005", {}).get("bankId") == "BankC", "U005 should be BankC")
    expect(ctx.users_by_id.get("U003", {}).get("bankId") == "BankB", "U003 should be BankB")


@check("escrow scenario coverage")
def escrow_scenario_coverage() -> None:
    response, payload = request("GET", "/api/canton/status")
    expect_status(response, {200}, "Canton status should respond")
    collections = payload.get("collections", {})
    expect("cantonEscrowProjections" in collections, "Escrow projection collection should exist")
    raise NotImplementedError(
        "No public escrow opt-in/initiation endpoint exists yet. Escrow projection collection coverage passed; "
        "add an escrow API test here when escrowOptIn is implemented."
    )


def main() -> int:
    print(f"FraudShield API flow verification against {BASE_URL}")
    checks = [
        health_and_readiness,
        canton_status,
        users_and_mappings,
        multi_bank_topology,
        low_risk_flow,
        medium_risk_flow,
        high_risk_flow,
        admin_rejection_flow,
        multi_bank_transaction_flow,
        escrow_scenario_coverage,
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
    print("\nNo failed checks. Skipped checks indicate planned/unimplemented API surfaces.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
