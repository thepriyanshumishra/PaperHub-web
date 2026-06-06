import json

log_file_path = "/Users/thedarkpcm/.gemini/antigravity/brain/abf05652-2720-4cd7-a911-c55f335d300d/.system_generated/logs/transcript.jsonl"

with open(log_file_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("step_index") == 4014:
                content = data.get("content", "")
                print(f"--- Step 4014 content (len={len(content)}, lines={len(content.splitlines())}) ---")
                print("\n".join(content.splitlines()[:30]))
                print("...")
                print("\n".join(content.splitlines()[-10:]))
                break
        except Exception as e:
            pass
