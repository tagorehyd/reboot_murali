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
@Document(collection = "audit_trail")
public class AuditTrailEvent {

    @Id
    private String id;

    @Indexed
    private String txnId;

    private String eventType;
    private String fromState;
    private String toState;
    private String actorId;
    private String damlContractRef;
    private String damlEventId;
    private String details;

    @Builder.Default
    private Instant timestamp = Instant.now();
}
