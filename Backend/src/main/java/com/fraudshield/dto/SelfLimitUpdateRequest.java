package com.fraudshield.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class SelfLimitUpdateRequest {
    @JsonAlias({"dailyLimit", "dailyTransactionLimit"})
    private Double dailyTransactionLimit;

    @JsonAlias({"weeklyLimit", "weeklyTransactionLimit"})
    private Double weeklyTransactionLimit;

    @JsonAlias({"maxBeneficiary", "maxBeneficiaryAmount"})
    private Double maxBeneficiaryAmount;

    private Boolean domesticTransactionsEnabled;
    private Boolean internationalTransactionsEnabled;
}

