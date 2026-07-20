package com.fraudshield.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration for the Cortex AI (OpenAI-compatible) anomaly review service.
 * The API key is sourced from the CORTEX_API_KEY environment variable in
 * application.properties and must never be hardcoded in source control.
 */
@Data
@Component
@ConfigurationProperties(prefix = "cortex.api")
public class CortexProperties {
    private String baseUrl;
    private String key;
    private String model;
    private int timeoutMs = 30000;
    private boolean enabled = true;
}
