import numpy as np

data = np.load("25-737/asl_cnn_weights_only.npz", allow_pickle=True)
for k in data.files:
    print(k, data[k].shape)
