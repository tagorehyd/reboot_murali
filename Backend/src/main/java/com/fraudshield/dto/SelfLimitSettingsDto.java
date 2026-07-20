package com.fraudshield.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelfLimitSettingsDto {
    private String userId;
    private Double dailyTransactionLimit;
    private Double weeklyTransactionLimit;
    private Double maxBeneficiaryAmount;
    private Boolean domesticTransactionsEnabled;
    private Boolean internationalTransactionsEnabled;

    private Double todaySpent;
    private Double weekSpent;

    private Double recommendedDailyLimit;
    private Double recommendedWeeklyLimit;
    private String riskIndicator; // LOW | MEDIUM | HIGH
}
