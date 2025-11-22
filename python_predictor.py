# -*- coding: utf-8 -*-
# print("PYTHON STARTED", flush=True)

import sys
import os
import json
import numpy as np
from PIL import Image
import warnings

# Debug log file
DEBUG_LOG = r"C:\Users\ASUS\Desktop\DLK\Sign Language\Sign-language-backend-main\Sign-language-backend-main\python_debug_log.txt"

def debug(msg):
    with open(DEBUG_LOG, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")

warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Import TensorFlow normally (NO redirection!)
try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    from absl import logging
    logging.set_verbosity(logging.ERROR)
except Exception as e:
    debug("TF IMPORT ERROR: " + str(e))
    print(json.dumps({"success": False, "error": "TensorFlow import failed"}))
    sys.exit(1)

tf.get_logger().setLevel('ERROR')

LABELS = [
    "A","B","C","D","E","F","G","H","I","J",
    "K","L","M","N","O","P","Q","R","S","T",
    "U","V","W","X","Y","Z",
    "0","1","2","3","4","5","6","7","8","9"
]

def load_asl_model():
    try:
        model_path = os.path.join(
            os.path.dirname(__file__),   # <--- FIXED
            "25-737",
            "asl_cnn_clean.h5"
        )

        if not os.path.exists(model_path):
            return None, f"Model not found at: {model_path}"

        debug("Loading CLEAN model: " + model_path)
        model = load_model(model_path)
        debug("Model loaded OK")

        return model, None

    except Exception as e:
        debug("Model load failed: " + str(e))
        return None, f"Model load failed: {str(e)}"



def preprocess_image(image_path):
    try:
        debug("Preprocessing image: " + image_path)
        img = Image.open(image_path).convert("RGB")
        img = img.resize((64, 64))
        arr = np.array(img) / 255.0
        arr = np.expand_dims(arr, axis=0)
        return arr, None
    except Exception as e:
        debug("PREPROCESS ERROR: " + str(e))
        return None, f"Image preprocess failed: {str(e)}"


def predict_asl(model, image_path):
    try:
        arr, err = preprocess_image(image_path)
        if err:
            return None, err

        debug("Predicting...")
        preds = model.predict(arr, verbose=0)

        idx = int(np.argmax(preds[0]))
        conf = float(preds[0][idx])
        letter = LABELS[idx]

        debug(f"PRED: {letter} ({conf})")

        # ✔ return usable JSON
        return {
            "success": True,
            "predictions": [letter],
            "confidences": [conf]
        }, None

    except Exception as e:
        debug("PREDICT ERROR: " + str(e))
        return None, f"Prediction failed: {str(e)}"


def main():
    # print("MAIN STARTED", flush=True)

    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "Usage error"}))
        return

    image_path = sys.argv[1]

    if not os.path.exists(image_path):
        print(json.dumps({"success": False, "error": "Image not found"}))
        return

    model, err = load_asl_model()
    if err:
        print(json.dumps({"success": False, "error": err}))
        return

    result, err = predict_asl(model, image_path)

    if err:
        print(json.dumps({"success": False, "error": err}))
    else:
        print(json.dumps(result))


if __name__ == "__main__":
    main()
