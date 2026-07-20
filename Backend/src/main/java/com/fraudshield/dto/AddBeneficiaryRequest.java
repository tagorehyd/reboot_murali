package com.fraudshield.dto;

import lombok.Data;

@Data
public class AddBeneficiaryRequest {
    private String recipientUserId;
    private String recipientId;
    private Boolean disableCoolOff;
}
