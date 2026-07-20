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
@Document(collection = "systemLocks")
public class SystemLock {

    @Id
    private String id;           // e.g. "MEMPOOL_LOCK" or "WRITE_LOCK"

    private boolean locked;
    private String reason;
    private Instant lockedAt;
    private Instant expiresAt;
}
