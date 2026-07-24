package com.fraudshield.model.canton;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "cantonTransactionLogs")
public class CantonTransactionLog {
    @Id private String id;
    @Indexed private String txnId;
    private String eventId;
    private String eventType;
    private String contractRef;
    private String actingParty;
    private Map<String, Object> payload;
    private Instant recordedAt;
}
