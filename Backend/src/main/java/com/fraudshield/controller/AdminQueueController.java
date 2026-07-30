package com.fraudshield.controller;

import com.fraudshield.canton.CantonCommandService;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.repository.MempoolRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.fraudshield.model.TxnHistory;
import com.fraudshield.repository.TxnHistoryRepository;
import com.fraudshield.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.Instant;

@Slf4j
@RestController
@RequestMapping("/api/admin")
public class AdminQueueController {

    @Autowired
    private MempoolRepository mempoolRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TxnHistoryRepository txnHistoryRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CantonCommandService cantonCommandService;

    /**
     * GET /api/admin/queue - Retrieve pending transactions for admin approval.
     * Includes Canton-driven statuses: HOLD_ACTIVE, PENDING_BANK_APPROVAL, PENDING_USER_APPROVAL, ESCROW_ACTIVE.
     */
    @GetMapping("/queue")
    public ResponseEntity<List<Map<String, Object>>> getAdminQueue() {
        List<String> pendingStatuses = List.of(
                "PENDING_ADMIN", "PENDING_CONSENT",
                "HOLD_ACTIVE", "PENDING_BANK_APPROVAL", "PENDING_USER_APPROVAL",
                "ESCROW_ACTIVE"
        );
        List<MempoolTransaction> queue = new java.util.ArrayList<>();
        for (String s : pendingStatuses) {
            queue.addAll(mempoolRepository.findByStatus(s));
        }
        queue.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));
        
        List<Map<String, Object>> responseList = new java.util.ArrayList<>();
        for (MempoolTransaction txn : queue) {
            Map<String, Object> map = objectMapper.convertValue(txn, new TypeReference<Map<String, Object>>() {});
            userRepository.findById(txn.getFromUserId()).ifPresent(user -> {
                map.put("fromUserDisplayName", user.getDisplayName());
            });
            userRepository.findById(txn.getToUserId()).ifPresent(user -> {
                map.put("toUserDisplayName", user.getDisplayName());
            });
            responseList.add(map);
        }
        
        return ResponseEntity.ok(responseList);
    }

    /**
     * POST /api/admin/txn/{txnId}/consent - Handle user consent for high-risk / medium-risk transactions.
     * Body: {"approved": true/false}
     * When approved, exercises the Canton user-approval choice then moves to PENDING_ADMIN (PENDING_BANK_APPROVAL).
     */
    @PostMapping("/txn/{txnId}/consent")
    public ResponseEntity<?> handleConsent(@PathVariable String txnId, @RequestBody Map<String, Object> body) {
        boolean approved = Boolean.TRUE.equals(body.get("approved"));
        String userId = body.containsKey("userId") ? String.valueOf(body.get("userId")) : "unknown";

        Optional<MempoolTransaction> txn = mempoolRepository.findById(txnId);
        if (txn.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("status", 404, "error", "Transaction not found", "txnId", txnId));
        }

        MempoolTransaction transaction = txn.get();

        if (approved) {
            // Exercise Canton user-approval choice
            try {
                cantonCommandService.exerciseUserConsent(txnId, transaction.getFromUserId());
            } catch (Exception e) {
                log.warn("[Canton] User consent exercise failed for txnId={}: {}", txnId, e.getMessage());
            }
            transaction.setStatus("PENDING_ADMIN");
            transaction.setRoutingDecision("ADMIN_REVIEW");
            mempoolRepository.save(transaction);
            return ResponseEntity.ok(Map.of(
                "txnId", txnId, "status", "PENDING_ADMIN",
                "message", "User consent granted. Transaction moved to admin review queue."
            ));
        } else {
            // NO Canton process for cancelled medium-risk transactions
            transaction.setStatus("REJECTED");
            transaction.setRoutingDecision("REJECTED_BY_USER");
            mempoolRepository.save(transaction);

            // Immediately save to TxnHistory for User Payment History
            TxnHistory hist = new TxnHistory();
            hist.setTxnId(transaction.getId());
            hist.setUserId(transaction.getFromUserId());
            hist.setFromUserId(transaction.getFromUserId());
            hist.setToUserId(transaction.getToUserId());
            hist.setAmount(transaction.getAmount());
            hist.setTimestamp(Instant.now());
            hist.setStatus("REJECTED");
            txnHistoryRepository.save(hist);

            return ResponseEntity.ok(Map.of(
                "txnId", txnId, "status", "REJECTED",
                "message", "User cancelled this transaction."
            ));
        }
    }

    /**
     * POST /api/admin/txn/{txnId}/decide - Admin approve/reject decision
     * Body: {"approved": true/false}
     */
    @PostMapping("/txn/{txnId}/decide")
    public ResponseEntity<?> handleAdminDecision(@PathVariable String txnId, @RequestBody Map<String, Boolean> body) {
        boolean approved = body.getOrDefault("approved", false);
        
        Optional<MempoolTransaction> txn = mempoolRepository.findById(txnId);
        if (txn.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "status", 404,
                "error", "Transaction not found",
                "txnId", txnId
            ));
        }

        MempoolTransaction transaction = txn.get();
        
        if (approved) {
            // Exercise Canton approval choice – releases hold and triggers settlement
            try {
                cantonCommandService.exerciseApproval(txnId, "ADMIN");
            } catch (Exception e) {
                log.warn("[Canton] Approval exercise failed for txnId={}: {}", txnId, e.getMessage());
            }
            transaction.setStatus("APPROVED");
            transaction.setRoutingDecision("ADMIN_APPROVED");
            mempoolRepository.save(transaction);
            return ResponseEntity.ok(Map.of(
                "txnId", txnId, "status", "APPROVED",
                "message", "Admin approved. Canton hold is released and escrow is settled when present before final commitment."
            ));
        } else {
            // Exercise Canton rejection choice
            try {
                cantonCommandService.exerciseRejection(txnId, "ADMIN");
            } catch (Exception e) {
                log.warn("[Canton] Rejection exercise failed for txnId={}: {}", txnId, e.getMessage());
            }
            transaction.setStatus("REJECTED");
            transaction.setRoutingDecision("REJECTED_BY_ADMIN");
            mempoolRepository.save(transaction);
            return ResponseEntity.ok(Map.of(
                "txnId", txnId, "status", "REJECTED",
                "message", "Admin rejected this transaction."
            ));
        }
    }
}
