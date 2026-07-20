package com.fraudshield.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "globalConfigs")
public class GlobalBeneficiaryLimitConfig {

    @Id
    private String id;

    private Double limitAmount;
    private Instant updatedAt;
}
