import tensorflow as tf
import numpy as np
from PIL import Image

model = tf.keras.models.load_model("25-737/asl_cnn_clean.h5")

print("Model loaded successfully!")

def preprocess(img_path):
    img = Image.open(img_path).resize((64, 64))
    img = np.array(img).astype("float32") / 255.0
    img = np.expand_dims(img, axis=0)
    return img

# Change the path to a real image
img = preprocess("uploads/image-1763121807505-844407245.jpg")

pred = model.predict(img)
label_index = np.argmax(pred)

print("Prediction:", label_index)
print("Confidence:", pred[0][label_index])
