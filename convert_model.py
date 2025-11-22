# convert_model.py
import h5py
import json
import tensorflow as tf
from tensorflow.keras.models import model_from_json

input_path = "25-737/asl_cnn_final_model.h5"
output_path = "25-737/asl_cnn_final_model_tf2.h5"

print("🔍 Extracting model_config...")

with h5py.File(input_path, "r") as f:
    model_config = f.attrs["model_config"]
    if isinstance(model_config, bytes):
        model_config = model_config.decode("utf-8")
    model_json = json.loads(model_config)

# ------------------------------------------------
# CLEAN OLD TF1 / KERAS ARGUMENTS
# ------------------------------------------------
def clean_layer_config(cfg):
    # Remove unsupported arguments safely
    keys_to_remove = [
        "batch_shape",
        "batch_input_shape",
        "dtype",
        "dtype_policy",
        "DTypePolicy",
        "ragged",
        "autocast",
        "native_config"
    ]
    for k in keys_to_remove:
        if k in cfg:
            cfg.pop(k, None)

print("🔧 Cleaning layer configs...")

for layer in model_json.get("config", {}).get("layers", []):
    cfg = layer.get("config", {})
    if isinstance(cfg, dict):
        clean_layer_config(cfg)

# ------------------------------------------------
# ENSURE THERE IS AN INPUT LAYER (so Conv2D has input shape)
# ------------------------------------------------
layers = model_json.get("config", {}).get("layers", [])
input_layer_exists = False
for layer in layers:
    class_name = layer.get("class_name", "").lower()
    if class_name in ("inputlayer", "input"):
        input_layer_exists = True
        break

if not input_layer_exists:
    print("⚠ No InputLayer found — inserting one with shape (None,64,64,3).")
    # create InputLayer entry
    input_layer = {
        "class_name": "InputLayer",
        "config": {
            "batch_input_shape": [None, 64, 64, 3],
            "dtype": "float32",
            "sparse": False,
            "name": "input_1"
        },
        "name": "input_1"
    }
    # Insert at the beginning of layers list
    model_json["config"]["layers"].insert(0, input_layer)

    # Also ensure inbound/outbound nodes reference the new input layer:
    # If model uses "inbound_nodes" at model level, many legacy models reference layers by index/name.
    # We will try to set the model's "input_layers" accordingly if present.
    if "input_layers" in model_json["config"]:
        model_json["config"]["input_layers"] = [["input_1", 0, 0]]
    else:
        model_json["config"]["input_layers"] = [["input_1", 0, 0]]

# ------------------------------------------------
# Rebuild cleaned model
# ------------------------------------------------
print("🏗 Rebuilding model with cleaned config (this may still fail if architecture uses custom objects)...")
try:
    model = model_from_json(json.dumps(model_json))
except Exception as e:
    print("ERROR during model_from_json:", e)
    raise

# ------------------------------------------------
# Load weights
# ------------------------------------------------
print("🔄 Loading weights...")
try:
    model.load_weights(input_path)
except Exception as e:
    print("ERROR loading weights:", e)
    raise

# ------------------------------------------------
# Save TF2 compatible model
# ------------------------------------------------
print("💾 Saving converted model to:", output_path)
model.save(output_path)
print("✅ Conversion complete!")
