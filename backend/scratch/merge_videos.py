import os
import subprocess

def run_cmd(cmd):
    print(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        raise Exception(f"Command failed with code {result.returncode}")
    return result.stdout

def main():
    video_dir = "/Users/chavdasamarth/Downloads/Untitled design"
    v1 = os.path.join(video_dir, "1.mp4")
    v2 = os.path.join(video_dir, "2.mp4")
    
    scaled1 = os.path.join(video_dir, "1_scaled.mp4")
    scaled2 = os.path.join(video_dir, "2_scaled.mp4")
    output = os.path.join(video_dir, "merged_onboarding.mp4")
    list_file = os.path.join(video_dir, "list.txt")
    
    print("Step 1: Scaling and padding video 1 to 1920x1080...")
    cmd1 = [
        "ffmpeg", "-y", "-i", v1,
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-r", "60",
        scaled1
    ]
    run_cmd(cmd1)
    
    print("Step 2: Scaling and padding video 2 to 1920x1080...")
    cmd2 = [
        "ffmpeg", "-y", "-i", v2,
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-r", "60",
        scaled2
    ]
    run_cmd(cmd2)
    
    print("Step 3: Creating concatenation list file...")
    with open(list_file, "w") as f:
        f.write(f"file '{scaled1}'\n")
        f.write(f"file '{scaled2}'\n")
        
    print("Step 4: Concatenating videos losslessly...")
    concat_cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file,
        "-c", "copy", output
    ]
    run_cmd(concat_cmd)
    
    print("Step 5: Cleaning up temporary files...")
    if os.path.exists(scaled1):
        os.remove(scaled1)
    if os.path.exists(scaled2):
        os.remove(scaled2)
    if os.path.exists(list_file):
        os.remove(list_file)
        
    print(f"🎉 Success! Merged video saved to: {output}")

if __name__ == "__main__":
    main()
