import sys

def check_syntax(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    bracket_stack = [] # { }
    paren_stack = []   # ( )
    lines = content.split('\n')
    
    in_quote = None
    
    for i, line in enumerate(lines):
        line_content = line
        char_idx = 0
        while char_idx < len(line_content):
            char = line_content[char_idx]
            if char == '\\':
                char_idx += 2
                continue
            if char in ["'", '"', '`']:
                if in_quote == char:
                    in_quote = None
                elif in_quote is None:
                    in_quote = char
                char_idx += 1
                continue
            if in_quote:
                char_idx += 1
                continue

            if char == '{':
                bracket_stack.append(('{', i + 1))
            elif char == '}':
                if not bracket_stack:
                    print(f"Extra '}}' found at line {i+1}")
                else:
                    bracket_stack.pop()
            
            if char == '(':
                paren_stack.append(('(', i + 1))
            elif char == ')':
                if not paren_stack:
                    print(f"Extra ')' found at line {i+1}")
                else:
                    paren_stack.pop()
            
            char_idx += 1
    
    if bracket_stack:
        for b, l in bracket_stack:
            print(f"Unclosed '{{' from line {l}")
    if paren_stack:
        for p, l in paren_stack:
            print(f"Unclosed '(' from line {l}")
    if in_quote:
        print(f"Unclosed quote: {in_quote}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_syntax(sys.argv[1])
