package com.fraudshield.model.canton;

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
@Document(collection = "cantonPartyMappings")
public class CantonPartyMapping {
    @Id
    private String id;
    @Indexed(unique = true)
    private String appUserId;
    private String bankId;
    private String participantId;
    private String cantonPartyId;
    private String cantonRole;
    private Instant createdAt;
}
