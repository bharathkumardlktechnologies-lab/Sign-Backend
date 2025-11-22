import tensorflow as tf

model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(64,64,3)),
    tf.keras.layers.Conv2D(32,(3,3),activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Conv2D(64,(3,3),activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Conv2D(128,(3,3),activation='relu'),
    tf.keras.layers.MaxPooling2D(),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(256,activation='relu'),
    tf.keras.layers.Dropout(0.0),
    tf.keras.layers.Dense(36,activation='softmax')
])

for i, layer in enumerate(model.layers):
    print(i, layer.name, "weights =", len(layer.get_weights()))
