package com.fraudshield.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class HashUtil {

    public static final String STATIC_SECRET_KEY = "FRAUDSHIELD_DEMO_STATIC_KEY_V1";

    private HashUtil() {}

    /**
     * SHA-256 hash of an arbitrary string, returned as lowercase hex.
     */
    public static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /**
     * Block hash formula: SHA256(merkleRoot + nonce + STATIC_SECRET_KEY)
     */
    public static String computeBlockHash(String merkleRoot, long nonce) {
        return sha256(merkleRoot + nonce + STATIC_SECRET_KEY);
    }
}
