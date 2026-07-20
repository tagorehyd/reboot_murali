package com.fraudshield.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRuleSettingsDto {
    private String userId;
    /** Rule name → enabled flag.  Missing entry means enabled. */
    private Map<String, Boolean> rules;
}
