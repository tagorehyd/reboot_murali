package com.fraudshield.model;

import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Block stored in the chainAlpha collection.
 */
@Document(collection = "chainAlpha")
public class BlockAlpha extends Block {
}
