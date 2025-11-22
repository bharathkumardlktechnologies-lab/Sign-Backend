# dump_h5_details.py
import h5py, json, os, sys

path = os.path.join("25-737", "asl_cnn_final_model.h5")
if not os.path.exists(path):
    print("ERROR: file not found:", path)
    sys.exit(1)

def show_attrs(name, obj):
    print("\n---", name, "---")
    for k, v in obj.attrs.items():
        try:
            val = v.decode() if isinstance(v, bytes) else v
        except Exception:
            val = repr(v)
        print(f"{k} = {val}")

print("Opening:", path)
with h5py.File(path, "r") as f:
    print("\nTop level keys:", list(f.keys()))
    print("\nListing model_weights layers and stored datasets:")
    if "model_weights" in f:
        for layer in f["model_weights"].keys():
            print("\n== LAYER:", layer, "==")
            layer_group = f["model_weights"][layer]
            for item in layer_group.keys():
                obj = layer_group[item]
                if isinstance(obj, h5py.Group):
                    print("  Subgroup:", item, "-> datasets:")
                    for ds in obj.keys():
                        d = obj[ds]
                        try:
                            shape = list(d.shape)
                        except Exception:
                            shape = "?"
                        print(f"    - {ds} : shape={shape}")
                else:
                    try:
                        shape = list(obj.shape)
                    except Exception:
                        shape = "?"
                    print(f"  - {item} : shape={shape}")
    else:
        print("No 'model_weights' group found")

    print("\n\nWalking every HDF5 object and showing attributes (may be long):")
    f.visititems(show_attrs)

print("\nDone.")
