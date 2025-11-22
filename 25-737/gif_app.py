import imageio
import os

letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
input_dir = r"R:\sandhiya\check\asl_dataset"  # path to your dataset
output_dir = "gifs"     # where GIFs will be saved
os.makedirs(output_dir, exist_ok=True)

for letter in letters:
    frames = []
    letter_folder = os.path.join(input_dir, letter)
    images = sorted(os.listdir(letter_folder))
    
    for img_name in images:
        img_path = os.path.join(letter_folder, img_name)
        frames.append(imageio.imread(img_path))
    
    gif_path = os.path.join(output_dir, f"{letter}.gif")
    imageio.mimsave(gif_path, frames, duration=0.3)  # 0.3s per frame
    print(f"Created GIF for {letter}: {gif_path}")
