import json

log_file_path = "/Users/thedarkpcm/.gemini/antigravity/brain/abf05652-2720-4cd7-a911-c55f335d300d/.system_generated/logs/transcript.jsonl"

with open(log_file_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if ("app/tests/page.tsx" in line or "app/subjects/[subjectId]/page.tsx" in line) and ("write_to_file" in line or "replace_file_content" in line or "multi_replace_file_content" in line):
            try:
                data = json.loads(line)
                print(f"Line {idx}: type={data.get('type')}, step_index={data.get('step_index')}")
                if "tool_calls" in data:
                    for tc in data["tool_calls"]:
                        print("  tool name:", tc.get("name"))
                        args = tc.get("args", {})
                        print("  TargetFile:", args.get("TargetFile"))
                        # print length of CodeContent or ReplacementContent
                        if "CodeContent" in args:
                            print("    CodeContent length:", len(args["CodeContent"]))
                        if "ReplacementContent" in args:
                            print("    ReplacementContent length:", len(args["ReplacementContent"]))
            except Exception as e:
                print(f"Error parsing line {idx}: {e}")
