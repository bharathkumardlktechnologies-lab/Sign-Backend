import tensorflow as tf
from tensorflow.keras.models import load_model

input_path = "25-737/asl_cnn_final_model.h5"
output_path = "25-737/asl_cnn_final_model_tf2_clean.h5"

print("🔍 Loading original model (allowing legacy args)...")

# IMPORTANT: allow legacy behavior
model = load_model(input_path, compile=False)

print("💾 Saving clean TF2 version...")
model.save(output_path)

print("✅ Done! New model saved at:", output_path)
