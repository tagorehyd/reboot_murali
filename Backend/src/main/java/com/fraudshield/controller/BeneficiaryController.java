package com.fraudshield.controller;

import com.fraudshield.dto.AddBeneficiaryRequest;
import com.fraudshield.model.Beneficiary;
import com.fraudshield.service.BeneficiaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/beneficiaries")
@RequiredArgsConstructor
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    @GetMapping
    public ResponseEntity<List<Beneficiary>> listBeneficiaries(@PathVariable String userId) {
        return ResponseEntity.ok(beneficiaryService.getBeneficiaries(userId));
    }

    @PostMapping
    public ResponseEntity<Beneficiary> addBeneficiary(
            @PathVariable String userId,
            @RequestBody AddBeneficiaryRequest request
    ) {
        return ResponseEntity.ok(beneficiaryService.addBeneficiary(userId, request));
    }

    @DeleteMapping("/{recipientUserId}")
    public ResponseEntity<Void> removeBeneficiary(
            @PathVariable String userId,
            @PathVariable String recipientUserId
    ) {
        beneficiaryService.removeBeneficiary(userId, recipientUserId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{recipientUserId}/activate")
    public ResponseEntity<Beneficiary> activateBeneficiaryNow(
            @PathVariable String userId,
            @PathVariable String recipientUserId
    ) {
        return ResponseEntity.ok(beneficiaryService.activateBeneficiaryNow(userId, recipientUserId));
    }
}
