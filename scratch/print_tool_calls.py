import json

log_file_path = "/Users/thedarkpcm/.gemini/antigravity/brain/abf05652-2720-4cd7-a911-c55f335d300d/.system_generated/logs/transcript.jsonl"

with open(log_file_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "view_file" in line and "PLANNER_RESPONSE" in line:
            try:
                data = json.loads(line)
                print(f"Step {data.get('step_index')}: {data}")
                break
            except Exception as e:
                pass
