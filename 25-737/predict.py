import streamlit as st
import cv2
import numpy as np
from tensorflow.keras.models import load_model
from PIL import Image

# Load trained model
model_path = r"./asl_cnn_final_model.h5"
model = load_model(model_path)

# Classes (0-9 + a-z)
classes = [str(i) for i in range(10)] + [chr(i) for i in range(ord('a'), ord('z')+1)]

st.title("ASL Detection Web App")
st.write("Predict ASL signs via  **Image Upload**.")

# Tabs for two modes
mode = st.radio("Select Mode", ["Upload Image"])

# --------------------------
# MODE 1: Upload Image
# --------------------------
if mode == "Upload Image":
    uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])
    if uploaded_file is not None:
        img = Image.open(uploaded_file)
        st.image(img, caption='Uploaded Image', use_column_width=True)
        
        # Preprocess image
        img_array = np.array(img.resize((64,64))) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        # Prediction
        prediction = model.predict(img_array)
        class_index = np.argmax(prediction)
        predicted_class = classes[class_index]
        confidence = prediction[0][class_index]
        
        st.write(f"**Predicted ASL Sign:** {predicted_class} ({confidence*100:.2f}%)")

