package com.fraudshield.controller;

import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.repository.MempoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminQueueController {

    @Autowired
    private MempoolRepository mempoolRepository;

    /**
     * GET /api/admin/queue - Retrieve pending transactions for admin approval
     * Shows only PENDING_ADMIN and PENDING_CONSENT transactions
     */
    @GetMapping("/queue")
    public ResponseEntity<List<MempoolTransaction>> getAdminQueue() {
        List<MempoolTransaction> pendingAdmin = mempoolRepository.findByStatus("PENDING_ADMIN");
        List<MempoolTransaction> pendingConsent = mempoolRepository.findByStatus("PENDING_CONSENT");
        
        List<MempoolTransaction> queue = new java.util.ArrayList<>();
        queue.addAll(pendingAdmin);
        queue.addAll(pendingConsent);
        
        // Sort by createdAt ascending (oldest first)
        queue.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));
        
        return ResponseEntity.ok(queue);
    }

    /**
     * POST /api/admin/txn/{txnId}/consent - Handle user consent for high-risk transactions
     * Body: {"approved": true/false}
     */
    @PostMapping("/txn/{txnId}/consent")
    public ResponseEntity<?> handleConsent(@PathVariable String txnId, @RequestBody Map<String, Boolean> body) {
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
            // User approved: move from PENDING_CONSENT to PENDING_ADMIN
            transaction.setStatus("PENDING_ADMIN");
            transaction.setRoutingDecision("ADMIN_REVIEW");
            mempoolRepository.save(transaction);
            
            return ResponseEntity.ok(Map.of(
                "txnId", txnId,
                "status", "PENDING_ADMIN",
                "message", "User consent granted. Transaction moved to admin review queue."
            ));
        } else {
            // User rejected: mark as REJECTED
            transaction.setStatus("REJECTED");
            transaction.setRoutingDecision("REJECTED_BY_USER");
            mempoolRepository.save(transaction);
            
            return ResponseEntity.ok(Map.of(
                "txnId", txnId,
                "status", "REJECTED",
                "message", "User rejected this transaction."
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
            // Admin approved: mark as APPROVED
            transaction.setStatus("APPROVED");
            transaction.setRoutingDecision("ADMIN_APPROVED");
            mempoolRepository.save(transaction);
            
            return ResponseEntity.ok(Map.of(
                "txnId", txnId,
                "status", "APPROVED",
                "message", "Admin approved. Transaction will be committed to blockchain."
            ));
        } else {
            // Admin rejected: mark as REJECTED
            transaction.setStatus("REJECTED");
            transaction.setRoutingDecision("REJECTED_BY_ADMIN");
            mempoolRepository.save(transaction);
            
            return ResponseEntity.ok(Map.of(
                "txnId", txnId,
                "status", "REJECTED",
                "message", "Admin rejected this transaction."
            ));
        }
    }
}
