package com.fraudshield.controller;

import com.fraudshield.dto.InitiateRequest;
import com.fraudshield.dto.InitiateResponse;
import com.fraudshield.dto.MempoolStatusResponse;
import com.fraudshield.model.MempoolTransaction;
import com.fraudshield.model.TxnHistory;
import com.fraudshield.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping("/txn/initiate")
    public ResponseEntity<InitiateResponse> initiate(@RequestBody InitiateRequest request) {
        return ResponseEntity.ok(transactionService.initiateTransaction(request));
    }

    @GetMapping("/mempool/status")
    public ResponseEntity<MempoolStatusResponse> mempoolStatus() {
        return ResponseEntity.ok(transactionService.getMempoolStatus());
    }

    @GetMapping("/txn/user/{userId}/pending")
    public ResponseEntity<List<MempoolTransaction>> userPending(@PathVariable String userId) {
        return ResponseEntity.ok(transactionService.getUserPendingTransactions(userId));
    }

    @GetMapping("/txn/user/{userId}/history")
    public ResponseEntity<List<TxnHistory>> userHistory(@PathVariable String userId) {
        return ResponseEntity.ok(transactionService.getUserTransactionHistory(userId));
    }
}
