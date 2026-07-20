package com.fraudshield.model;

import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Block stored in the chainGamma collection.
 */
@Document(collection = "chainGamma")
public class BlockGamma extends Block {
}
