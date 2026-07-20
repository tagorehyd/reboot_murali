package com.fraudshield.service;

import com.fraudshield.model.GlobalBeneficiaryLimitConfig;
import com.fraudshield.repository.GlobalBeneficiaryLimitConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class GlobalBeneficiaryLimitService {

    private static final String GLOBAL_LIMIT_ID = "GLOBAL_BENEFICIARY_LIMIT";

    private final GlobalBeneficiaryLimitConfigRepository repository;

    public Double getLimitAmount() {
        return repository.findById(GLOBAL_LIMIT_ID)
                .map(GlobalBeneficiaryLimitConfig::getLimitAmount)
                .orElse(null);
    }

    public Double updateLimitAmount(Double limitAmount) {
        if (limitAmount != null && limitAmount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "limitAmount must be greater than 0 when provided");
        }

        GlobalBeneficiaryLimitConfig config = repository.findById(GLOBAL_LIMIT_ID)
                .orElse(GlobalBeneficiaryLimitConfig.builder().id(GLOBAL_LIMIT_ID).build());

        config.setLimitAmount(limitAmount);
        config.setUpdatedAt(Instant.now());

        return repository.save(config).getLimitAmount();
    }
}
