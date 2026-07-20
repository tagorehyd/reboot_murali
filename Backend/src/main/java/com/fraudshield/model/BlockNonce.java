package com.fraudshield.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Stores the block nonce counter. The single document has _id = BLOCK_NONCE_COUNTER.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "blockNonce")
public class BlockNonce {

    @Id
    private String id;   // always "BLOCK_NONCE_COUNTER"

    private long value;
    private Instant updatedAt;
}
