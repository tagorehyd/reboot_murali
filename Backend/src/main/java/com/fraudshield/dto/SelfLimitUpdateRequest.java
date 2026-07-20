package com.fraudshield.dto;

import lombok.Data;

@Data
public class SelfLimitUpdateRequest {
    private Double dailyTransactionLimit;
    private Double weeklyTransactionLimit;
    private Double maxBeneficiaryAmount;
    private Boolean domesticTransactionsEnabled;
    private Boolean internationalTransactionsEnabled;
}
