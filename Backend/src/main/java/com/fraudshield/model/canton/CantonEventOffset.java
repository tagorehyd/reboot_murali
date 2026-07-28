package com.fraudshield.model.canton;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Document(collection = "cantonEventOffsets")
public class CantonEventOffset {
    @Id private String subscriberId;
    private String participantId;
    private String lastOffset;
    private Instant updatedAt;
}
