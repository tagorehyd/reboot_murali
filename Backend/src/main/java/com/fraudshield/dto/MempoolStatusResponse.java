package com.fraudshield.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class MempoolStatusResponse {
    private long pendingCount;
    private long approvedCount;
    private long rejectedCount;
    private long totalCount;
    private int nextBlockInSeconds;
    private Instant timestamp;
}
