package com.fraudshield.canton;

/**
 * DAML/Canton gateway abstraction for real ledger submissions.
 *
 * Implementations should call the Ledger API (submit-and-wait, completion,
 * and contract-id extraction) and return the resulting contract reference.
 */
public interface CantonDamlGateway {

    String createHold(String txnId, String userId, double amount, String commandId, String correlationId);

    String createApproval(String txnId, String userId, String approvalType, String commandId, String correlationId);

    String createEscrow(String txnId, String userId, double amount, String commandId, String correlationId);

    String createSettlement(String txnId, String userId, String commandId, String correlationId);

    void exerciseApproval(String approvalContractRef, String actingParty, String commandId, String correlationId);

    void exerciseRejection(String approvalContractRef, String actingParty, String commandId, String correlationId);

    void exerciseReleaseHold(String holdContractRef, String actingParty, String commandId, String correlationId);

    void exerciseSettleEscrow(String escrowContractRef, String actingParty, String commandId, String correlationId);
}
