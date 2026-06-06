import json
import re

log_file_path = "/Users/thedarkpcm/.gemini/antigravity/brain/abf05652-2720-4cd7-a911-c55f335d300d/.system_generated/logs/transcript.jsonl"

def reconstruct_file(target_file_pattern, steps_list, output_path):
    chunks = {}
    with open(log_file_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                step_idx = data.get("step_index")
                if step_idx in steps_list and data.get("type") == "VIEW_FILE":
                    content = data.get("content", "")
                    lines = content.split('\n')
                    for l in lines:
                        match = re.match(r"^(\d+): (.*)$", l)
                        if match:
                            line_num = int(match.group(1))
                            line_text = match.group(2)
                            chunks[line_num] = line_text
            except Exception as e:
                pass
    
    if not chunks:
        print(f"No chunks found for {target_file_pattern}")
        return
        
    max_line = max(chunks.keys())
    print(f"Reconstructed {target_file_pattern}: max line = {max_line}, total collected = {len(chunks)}")
    
    # Check for missing lines
    missing = []
    reconstructed = []
    for i in range(1, max_line + 1):
        if i in chunks:
            reconstructed.append(chunks[i])
        else:
            missing.append(i)
            reconstructed.append("")
            
    if missing:
        print(f"Warning: Missing lines: {missing[:20]} ... (total {len(missing)} missing)")
    else:
        print("All lines successfully reconstructed with no gaps!")
        
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(reconstructed))

# We saw for app/tests/page.tsx:
# Step 4014 (lines 1 to 800)
# Step 4036 (lines 801 to 960)
print("Reconstructing app/tests/page.tsx...")
reconstruct_file("app/tests/page.tsx", [4014, 4036], "/Users/thedarkpcm/Desktop/Priyanshu/PaperHub-web/app/tests/page.tsx")

# For app/subjects/[subjectId]/page.tsx:
# Let's inspect step 4022 and 4211
print("\nReconstructing app/subjects/[subjectId]/page.tsx...")
reconstruct_file("app/subjects/[subjectId]/page.tsx", [4022, 4211], "/Users/thedarkpcm/Desktop/Priyanshu/PaperHub-web/app/subjects/[subjectId]/page.tsx")
