import h5py
import numpy as np
import os

input_path = r"25-737/asl_cnn_final_model.h5"
output_path = r"25-737/asl_cnn_weights_only.npz"

print("🔍 Opening model H5 file:", input_path)

if not os.path.exists(input_path):
    print("❌ ERROR: File not found")
    exit(1)

with h5py.File(input_path, "r") as f:
    print("📁 Keys in H5:", list(f.keys()))

    if "model_weights" not in f:
        print("❌ ERROR: model_weights not found in H5! Cannot extract.")
        exit(1)

    weights_group = f["model_weights"]

    extracted_weights = {}

    print("\n🔧 Extracting weights layer-by-layer…")
    for layer in weights_group.keys():
        print("  ➜ Layer:", layer)
        layer_group = weights_group[layer]

        for wname in layer_group.keys():
            weight_path = f"model_weights/{layer}/{wname}"
            print("      -", weight_path)
            extracted_weights[f"{layer}/{wname}"] = np.array(layer_group[wname])

print("\n💾 Saving weights only →", output_path)
np.savez(output_path, **extracted_weights)

print("\n✅ DONE!")
print("You now have clean weights saved as:", output_path)
