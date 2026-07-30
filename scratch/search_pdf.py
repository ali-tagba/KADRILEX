import fitz  # PyMuPDF
import sys
import re

pdf_path = r"C:\Users\USER\Documents\Kadrilex\Guide-d-application-du-SYSCOHADA (1).pdf"
terms_to_search = ["421", "445", "401", "571", "411", "706", "honoraires", "avances", "retenue à la source"]

try:
    doc = fitz.open(pdf_path)
    print(f"Opened {pdf_path} with {len(doc)} pages.")
    
    # We'll just look through the first 100 pages or table of accounts if possible.
    # Actually, let's search all pages but limit output.
    results = {term: [] for term in terms_to_search}
    
    for page_num in range(min(150, len(doc))): # Search first 150 pages for plan comptable
        text = doc[page_num].get_text()
        for term in terms_to_search:
            for line in text.split('\n'):
                if re.search(r'\b' + term + r'\b', line, re.IGNORECASE):
                    if len(results[term]) < 5:
                        results[term].append(f"Page {page_num}: {line.strip()}")
                        
    for term, matches in results.items():
        print(f"\n--- Matches for '{term}' ---")
        for match in matches:
            print(match)
            
except Exception as e:
    print(f"Error: {e}")
