import os

file_path = 'afac.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the first </html> after line 6300 (approx 380,000 bytes)
# Or just find the FIRST </html> in the whole file and trim there.
# Wait, if there are multiple, the first one is the one we want to keep?
# Let's look for the first </html> after the "PREMIUM COMMAND SYSTEM" string.

premium_str = '// ── PREMIUM COMMAND SYSTEM ──'
start_index = content.find(premium_str)
if start_index != -1:
    end_tag = '</html>'
    index = content.find(end_tag, start_index)
    if index != -1:
        new_content = content[:index + 7]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully trimmed afac.html after premium command system")
    else:
        print("Could not find </html> after premium command system")
else:
    print("Could not find Premium Command System string")
