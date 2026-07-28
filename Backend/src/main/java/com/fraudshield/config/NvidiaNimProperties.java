package com.fraudshield.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for NVIDIA NIM API integration.
 */
@Data
@Component
@ConfigurationProperties(prefix = "nvidia.nim")
public class NvidiaNimProperties {
    private String apiKey;
    private String url;
    private String model = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
    private int timeoutMs = 60000;
    private int maxTokens = 16384;
    private double temperature = 0.6;
}
