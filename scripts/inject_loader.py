import os
import re

public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public'))
injected_count = 0
already_present_count = 0
errors = []

for root, dirs, files in os.walk(public_dir):
    for f in files:
        if not f.endswith('.html'):
            continue
        if f.startswith('google') and f.endswith('.html'):
            continue
        
        full_path = os.path.join(root, f)
        rel_path = os.path.relpath(full_path, public_dir)
        
        try:
            with open(full_path, 'r', encoding='utf-8') as fp:
                content = fp.read()
            
            if 'dpg-loader.js' in content:
                already_present_count += 1
                continue
            
            # Find <head> or <head ...>
            head_match = re.search(r'(<head\b[^>]*>)', content, re.IGNORECASE)
            if not head_match:
                errors.append(f'No <head> found in {rel_path}')
                continue
            
            tag = head_match.group(1)
            replacement = tag + '\n  <!-- Universal DPGNotes Pre-loader (Loads before other scripts/styles) -->\n  <script src="/dpg-loader.js"></script>'
            
            new_content = content[:head_match.start()] + replacement + content[head_match.end():]
            
            with open(full_path, 'w', encoding='utf-8') as fp:
                fp.write(new_content)
            
            injected_count += 1
            print(f'Injected into: {rel_path}')
            
        except Exception as e:
            errors.append(f'Error processing {rel_path}: {e}')

print('--- Summary ---')
print(f'Successfully injected: {injected_count}')
print(f'Already present: {already_present_count}')
if errors:
    print(f'Errors ({len(errors)}):')
    for err in errors:
        print(f'  ! {err}')
