package com.fraudshield.controller;

import com.fraudshield.model.Alert;
import com.fraudshield.model.SuspiciousTransaction;
import com.fraudshield.repository.AlertRepository;
import com.fraudshield.repository.SuspiciousTransactionRepository;
import com.fraudshield.service.GlobalBeneficiaryLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AlertRepository alertRepository;
    private final SuspiciousTransactionRepository suspiciousTransactionRepository;
    private final GlobalBeneficiaryLimitService globalBeneficiaryLimitService;

    @GetMapping("/alerts")
    public ResponseEntity<List<Alert>> getAlerts(@RequestParam(defaultValue = "false") boolean resolved) {
        if (resolved) {
            return ResponseEntity.ok(alertRepository.findByResolvedOrderByDetectedAtDesc(true));
        }
        return ResponseEntity.ok(alertRepository.findByResolvedFalseOrderByDetectedAtDesc());
    }

    @GetMapping("/suspicious")
    public ResponseEntity<List<SuspiciousTransaction>> getSuspicious() {
        return ResponseEntity.ok(suspiciousTransactionRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/beneficiary-limit")
    public ResponseEntity<Map<String, Object>> getGlobalBeneficiaryLimit() {
        Map<String, Object> response = new HashMap<>();
        response.put("limitAmount", globalBeneficiaryLimitService.getLimitAmount());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/beneficiary-limit")
    public ResponseEntity<Map<String, Object>> updateGlobalBeneficiaryLimit(@RequestBody Map<String, Double> body) {
        Double updatedLimit = globalBeneficiaryLimitService.updateLimitAmount(
                body.containsKey("limitAmount") ? body.get("limitAmount") : null
        );
        Map<String, Object> response = new HashMap<>();
        response.put("limitAmount", updatedLimit);
        return ResponseEntity.ok(response);
    }
}
