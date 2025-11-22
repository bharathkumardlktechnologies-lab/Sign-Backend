import tensorflow as tf
import numpy as np
import h5py

print("Building clean TF2 model...")

# === Rebuild architecture ===
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(64, 64, 3)),

    tf.keras.layers.Conv2D(32, (3,3), activation='relu'),   # index 1
    tf.keras.layers.MaxPooling2D(),

    tf.keras.layers.Conv2D(64, (3,3), activation='relu'),   # index 3
    tf.keras.layers.MaxPooling2D(),

    tf.keras.layers.Conv2D(128, (3,3), activation='relu'),  # index 5
    tf.keras.layers.MaxPooling2D(),

    tf.keras.layers.Flatten(),                              # index 7

    tf.keras.layers.Dense(256, activation='relu'),          # index 8
    tf.keras.layers.Dropout(0.0),                           # index 9
    tf.keras.layers.Dense(36, activation='softmax')         # index 10
])

print("Model built. Loading weights...")

h5_path = "25-737/asl_cnn_final_model.h5"
with h5py.File(h5_path, "r") as f:
    w = f["model_weights"]

    # Conv2D Layer 1 (index 1)
    model.layers[1].set_weights([
        w["conv2d/sequential/conv2d/kernel"][:],
        w["conv2d/sequential/conv2d/bias"][:]
    ])

    # Conv2D Layer 2 (index 3)
    model.layers[3].set_weights([
        w["conv2d_1/sequential/conv2d_1/kernel"][:],
        w["conv2d_1/sequential/conv2d_1/bias"][:]
    ])

    # Conv2D Layer 3 (index 5)
    model.layers[5].set_weights([
        w["conv2d_2/sequential/conv2d_2/kernel"][:],
        w["conv2d_2/sequential/conv2d_2/bias"][:]
    ])

    # Dense Layer 1 (index 8)
    model.layers[8].set_weights([
        w["dense/sequential/dense/kernel"][:],
        w["dense/sequential/dense/bias"][:]
    ])

    # Dense Layer 2 (index 10)
    model.layers[10].set_weights([
        w["dense_1/sequential/dense_1/kernel"][:],
        w["dense_1/sequential/dense_1/bias"][:]
    ])

print("Weights loaded successfully!")
model.save("25-737/asl_cnn_clean.h5")
print("🎉 Clean model saved: 25-737/asl_cnn_clean.h5")
