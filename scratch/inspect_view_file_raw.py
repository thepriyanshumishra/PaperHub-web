import json

log_file_path = "/Users/thedarkpcm/.gemini/antigravity/brain/abf05652-2720-4cd7-a911-c55f335d300d/.system_generated/logs/transcript.jsonl"

with open(log_file_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "view_file" in line:
            try:
                data = json.loads(line)
                print(f"Line {idx}: type={data.get('type')}, step_index={data.get('step_index')}")
                # Print keys or tool calls
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        print("  tool call:", tc.get("function", {}).get("name"), tc.get("function", {}).get("arguments"))
                elif "content" in data:
                    print("  content prefix:", data["content"][:200])
            except Exception as e:
                print(f"Error on line {idx}: {e}")
