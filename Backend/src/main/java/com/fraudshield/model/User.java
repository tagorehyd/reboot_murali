package com.fraudshield.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class User {

    @Id
    private String id;           // e.g. U001

    private String username;
    private String displayName;
    private String accountNumber;
    private double balance;
    private List<String> trustedPayees; // list of user IDs
    private Double dailyTransactionLimit;
    private Double weeklyTransactionLimit;
    private Double maxBeneficiaryAmount;
    private Boolean domesticTransactionsEnabled;
    private Boolean internationalTransactionsEnabled;
    private Instant selfLimitsUpdatedAt;
    private Instant createdAt;
    private String role;         // USER or ADMIN
    /** Per-user fraud rule on/off flags.  Key = rule name (e.g. "LARGE_AMOUNT").
     *  Null or absent keys are treated as enabled. */
    private Map<String, Boolean> customRuleSettings;
}
