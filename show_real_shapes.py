import h5py

path = "25-737/asl_cnn_final_model.h5"

with h5py.File(path, "r") as f:
    print("🔍 Reading REAL weight datasets...\n")

    model_weights = f["model_weights"]

    for layer in model_weights:
        layer_group = model_weights[layer]

        # Skip empty layers
        if "sequential" not in layer_group:
            continue

        print(f"\n=== LAYER: {layer} ===")

        seq = layer_group["sequential"]

        for name in seq:
            obj = seq[name]

            # Skip subgroups like conv2d/
            if isinstance(obj, h5py.Group):
                # Go deeper
                for sub in obj:
                    sub_obj = obj[sub]
                    if isinstance(sub_obj, h5py.Dataset):
                        print(f"{layer}/{name}/{sub} -> shape {sub_obj.shape}")
                continue

            # Dataset directly inside sequential
            if isinstance(obj, h5py.Dataset):
                print(f"{layer}/{name} -> shape {obj.shape}")
