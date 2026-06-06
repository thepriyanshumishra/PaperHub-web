import json

log_file_path = "/Users/thedarkpcm/.gemini/antigravity/brain/abf05652-2720-4cd7-a911-c55f335d300d/.system_generated/logs/transcript.jsonl"

steps = {}

with open(log_file_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_idx = data.get("step_index")
            steps[step_idx] = data
        except Exception:
            pass

for idx, data in sorted(steps.items()):
    if data.get("type") == "VIEW_FILE":
        # Find path
        prev_idx = idx - 1
        path = "Unknown"
        start_line = None
        end_line = None
        while prev_idx >= 0:
            prev_step = steps.get(prev_idx)
            if prev_step and prev_step.get("type") == "PLANNER_RESPONSE":
                tool_calls = prev_step.get("tool_calls", [])
                for tc in tool_calls:
                    if tc.get("name") == "view_file":
                        args = tc.get("args", {})
                        path = args.get("AbsolutePath", "").strip('"')
                        start_line = args.get("StartLine")
                        end_line = args.get("EndLine")
                break
            prev_idx -= 1
        
        if "app/tests/page.tsx" in path or "app/subjects/[subjectId]/page.tsx" in path:
            content = data.get("content", "")
            num_lines = len(content.split('\n')) if content else 0
            print(f"Step {idx}: path={path}, start={start_line}, end={end_line}, lines={num_lines}")
