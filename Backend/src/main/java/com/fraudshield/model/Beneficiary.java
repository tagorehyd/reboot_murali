package com.fraudshield.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "beneficiaries")
public class Beneficiary {

    @Id
    private String id; // ownerUserId:recipientUserId

    @Indexed
    private String ownerUserId;

    @Indexed
    private String recipientUserId;

    private String recipientName;
    private String status; // PENDING_ACTIVE | ACTIVE
    private Instant addedAt;
    private Instant activeAt;
    private boolean coolOffBypassed;
    private Double transactionLimit;
}
