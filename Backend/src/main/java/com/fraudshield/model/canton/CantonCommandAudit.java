package com.fraudshield.model.canton;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "cantonCommandAudit")
public class CantonCommandAudit {
    @Id private String id;
    @Indexed private String commandId;
    @Indexed private String correlationId;
    private String participantId;
    private String submittingParty;
    private String commandType;
    private String status;
    private Map<String, Object> metadata;
    private Instant submittedAt;
    private Instant completedAt;
}
