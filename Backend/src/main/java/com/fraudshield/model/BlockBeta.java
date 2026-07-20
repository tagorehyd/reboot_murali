package com.fraudshield.model;

import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Block stored in the chainBeta collection.
 */
@Document(collection = "chainBeta")
public class BlockBeta extends Block {
}
