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
@Document(collection = "cantonContractRefs")
public class CantonContractRef {
    @Id
    private String id;
    @Indexed(unique = true)
    private String txnId;
    private String holdContractRef;
    private String approvalContractRef;
    private String escrowContractRef;
    private String settlementContractRef;
    private String cantonCommandId;
    private String correlationId;
    private String settlementEventId;
    private Instant updatedAt;
}
