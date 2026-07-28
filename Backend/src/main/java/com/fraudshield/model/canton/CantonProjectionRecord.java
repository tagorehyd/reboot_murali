package com.fraudshield.model.canton;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CantonProjectionRecord {
    @Id
    private String id;
    @Indexed
    private String txnId;
    private String bankId;
    private String status;
    private String contractRef;
    private String eventId;
    private Map<String, Object> payload;
    private Instant effectiveAt;
    private Instant updatedAt;
}
