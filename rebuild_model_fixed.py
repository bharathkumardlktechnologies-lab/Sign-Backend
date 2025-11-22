import tensorflow as tf
import numpy as np
import h5py

print("Building clean model...")

model = tf.keras.Sequential([
    tf.keras.layers.Conv2D(32, (3,3), activation='relu', input_shape=(64,64,3)),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Conv2D(64, (3,3), activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Conv2D(128, (3,3), activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(256, activation='relu'),
    tf.keras.layers.Dropout(0.0),
    tf.keras.layers.Dense(36, activation='softmax')
])

print("Model built successfully!")

h5_path = "25-737/asl_cnn_final_model.h5"
print("Loading weights from:", h5_path)

with h5py.File(h5_path, "r") as f:
    w = f["model_weights"]

    # Layer 0 - conv2d
    model.layers[0].set_weights([
        w["conv2d/sequential/conv2d/kernel"][:],
        w["conv2d/sequential/conv2d/bias"][:]
    ])

    # Layer 2 - conv2d_1
    model.layers[2].set_weights([
        w["conv2d_1/sequential/conv2d_1/kernel"][:],
        w["conv2d_1/sequential/conv2d_1/bias"][:]
    ])

    # Layer 4 - conv2d_2
    model.layers[4].set_weights([
        w["conv2d_2/sequential/conv2d_2/kernel"][:],
        w["conv2d_2/sequential/conv2d_2/bias"][:]
    ])

    # Layer 7 - dense
    model.layers[7].set_weights([
        w["dense/sequential/dense/kernel"][:],
        w["dense/sequential/dense/bias"][:]
    ])

    # Layer 9 - dense_1 (output)
    model.layers[9].set_weights([
        w["dense_1/sequential/dense_1/kernel"][:],
        w["dense_1/sequential/dense_1/bias"][:]
    ])

print("Weights loaded successfully!")

model.save("25-737/asl_cnn_clean.h5")
print("🎉 Saved clean model → 25-737/asl_cnn_clean.h5")


