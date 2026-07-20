package com.fraudshield.util;

import com.fraudshield.model.Block;

import java.util.ArrayList;
import java.util.List;

/**
 * Merkle tree utility.
 * Leaf nodes = SHA256 of each transaction's canonical string.
 * Parent nodes = SHA256(leftHash + rightHash).
 * If odd number of nodes, duplicate the last node.
 */
public final class MerkleUtil {

    private MerkleUtil() {}

    /**
     * Compute the merkle root from a list of block transactions.
     * Transactions must already be in canonical (sorted) order before calling this.
     */
    public static String computeMerkleRoot(List<Block.BlockTransaction> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return HashUtil.sha256("EMPTY");
        }

        List<String> hashes = new ArrayList<>();
        for (Block.BlockTransaction txn : transactions) {
            hashes.add(HashUtil.sha256(canonicalise(txn)));
        }

        return buildTree(hashes);
    }

    /**
     * Verify the merkle root of a block against its stored transactions.
     * Returns true if the computed root matches the stored root.
     */
    public static boolean verify(Block block) {
        if (block == null || block.getTransactions() == null) return false;
        String computed = computeMerkleRoot(block.getTransactions());
        return computed.equals(block.getMerkleRoot());
    }

    // ---- internals ----

    private static String buildTree(List<String> hashes) {
        if (hashes.size() == 1) return hashes.get(0);

        List<String> nextLevel = new ArrayList<>();
        for (int i = 0; i < hashes.size(); i += 2) {
            String left = hashes.get(i);
            String right = (i + 1 < hashes.size()) ? hashes.get(i + 1) : left; // duplicate last
            nextLevel.add(HashUtil.sha256(left + right));
        }
        return buildTree(nextLevel);
    }

    /**
     * Canonical string for a transaction — explicit field ordering ensures determinism.
     */
    private static String canonicalise(Block.BlockTransaction txn) {
        return "txnId=" + txn.getTxnId()
                + "|from=" + txn.getFrom()
                + "|to=" + txn.getTo()
                + "|amount=" + String.format("%.2f", txn.getAmount())
                + "|nonce=" + txn.getNonce()
                + "|timestamp=" + (txn.getTimestamp() != null ? txn.getTimestamp().toEpochMilli() : "0");
    }
}
