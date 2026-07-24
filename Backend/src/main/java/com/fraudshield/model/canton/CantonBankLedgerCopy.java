package com.fraudshield.model.canton;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "cantonBankLedgerCopies")
public class CantonBankLedgerCopy {
    @Id private String id;
    @Indexed private String bankId;
    @Indexed private String txnId;
    private String eventId;
    private String blockLikeHash;
    private String previousHash;
    private Map<String, Object> projectionPayload;
    private Instant recordedAt;
}
