use crate::models::catalog::Course;
use brotli::enc::BrotliEncoderParams;
use std::{collections::HashMap, io::Cursor};

pub fn compress_catalog(catalog: &HashMap<String, Course>) -> Vec<u8> {
    let json = serde_json::to_vec(catalog).expect("Failed to serialize catalog");
    let mut compressed = Vec::new();
    let params = BrotliEncoderParams {
        quality: 5,
        ..Default::default()
    };
    brotli::BrotliCompress(&mut Cursor::new(&json), &mut compressed, &params)
        .expect("Brotli compression failed");
    compressed
}
