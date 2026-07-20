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
@Document(collection = "alerts")
public class Alert {

    @Id
    private String id;

    private String type;      // TAMPER_DETECTED | CONSENSUS_FAILURE | FREEZE_MODE | CHAIN_REPAIRED
    private String severity;  // INFO | WARNING | CRITICAL
    private String chain;     // alpha | beta | gamma | all
    private int blockNumber;
    private String message;
    private Instant detectedAt;
    private boolean resolved;
    private Instant resolvedAt;
}
