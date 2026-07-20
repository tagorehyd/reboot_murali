package com.fraudshield.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "txn_history")
public class TxnHistory {

    @Id
    private String id;           // same as TXN-uuid

    @Indexed
    private String userId;

    private String txnId;
    private String fromUserId;
    private String toUserId;
    private String fromUserName;
    private String toUserName;
    private String counterparty;
    private String counterpartyName;
    private String direction;    // IN | OUT
    private double amount;
    private String status;       // COMMITTED | REJECTED
    private int blockNumber;
    private String chainSource;  // alpha | beta | gamma
    private Instant timestamp;
}
