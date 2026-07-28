package com.fraudshield.controller;

import com.fraudshield.model.User;
import com.fraudshield.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import com.fraudshield.repository.MempoolRepository;
import com.fraudshield.model.MempoolTransaction;

/**
 * Admin endpoint to adjust user balances for demo/testing purposes only.
 * NOT for production use.
 */
@RestController
@RequestMapping("/api/admin/balance")
public class AdminBalanceController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MempoolRepository mempoolRepository;

    /**
     * Add balance to a user account (demo-only endpoint).
     * POST /api/admin/balance/{userId}/add?amount=5000
     */
    @PostMapping("/{userId}/add")
    public ResponseEntity<Map<String, Object>> addBalance(
            @PathVariable String userId,
            @RequestParam(value = "amount", required = true) double amount) {

        if (amount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        double oldBalance = user.getBalance();
        user.setBalance(oldBalance + amount);
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", userId);
        response.put("username", user.getUsername());
        response.put("oldBalance", oldBalance);
        response.put("addedAmount", amount);
        response.put("newBalance", user.getBalance());
        response.put("message", "Balance updated successfully (DEMO ONLY)");

        return ResponseEntity.ok(response);
    }

    /**
     * Set balance to exact amount (demo-only endpoint).
     * POST /api/admin/balance/{userId}/set?amount=100000
     */
    @PostMapping("/{userId}/set")
    public ResponseEntity<Map<String, Object>> setBalance(
            @PathVariable String userId,
            @RequestParam(value = "amount", required = true) double amount) {

        if (amount < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount cannot be negative");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        double oldBalance = user.getBalance();
        user.setBalance(amount);
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", userId);
        response.put("username", user.getUsername());
        response.put("oldBalance", oldBalance);
        response.put("newBalance", user.getBalance());
        response.put("message", "Balance set to exact amount (DEMO ONLY)");

        return ResponseEntity.ok(response);
    }

    /**
     * Get current user balance.
     * GET /api/admin/balance/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getBalance(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<MempoolTransaction> pendingTxns = mempoolRepository.findByFromUserIdAndStatusInOrderByCreatedAtDesc(
            userId,
            List.of("PENDING_ADMIN", "PENDING_CONSENT", "APPROVED",
                    "HOLD_ACTIVE", "PENDING_USER_APPROVAL",
                    "PENDING_BANK_APPROVAL", "ESCROW_ACTIVE")
        );
        double holdAmount = pendingTxns.stream().mapToDouble(MempoolTransaction::getAmount).sum();
        double usableBalance = user.getBalance() - holdAmount;

        Map<String, Object> response = new HashMap<>();
        response.put("userId", userId);
        response.put("username", user.getUsername());
        response.put("displayName", user.getDisplayName());
        response.put("balance", user.getBalance());
        response.put("holdAmount", holdAmount);
        response.put("usableBalance", usableBalance);
        response.put("accountNumber", user.getAccountNumber());

        return ResponseEntity.ok(response);
    }
}
