package com.fraudshield.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "pendingConsent")
public class PendingConsent {

    @Id
    private String id;           // txnId

    private String userId;
    private double amount;
    private String toUserId;
    private int riskScore;
    private Instant createdAt;
    private Instant expiresAt;
    private String status;       // PENDING | APPROVED | REJECTED | EXPIRED
}
