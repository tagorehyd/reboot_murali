package com.fraudshield.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "isolation-forest")
public class IsolationForestProperties {

    /** Base URL of the Python Isolation Forest ML microservice. */
    private String baseUrl = "http://localhost:5001";

    /** Master switch to enable/disable Isolation Forest scoring. */
    private boolean enabled = true;

    /** Request timeout in milliseconds. */
    private int timeoutMs = 5000;

    /** Scaling weight factor for IF score contribution. */
    private double scoreWeight = 1.0;
}
