import os, re
from bs4 import BeautifulSoup

"""
Configuration
"""
# Folder containing the saved HTML files
folder_path = "./html-pages/"
# Assuming the first page is named something like 'Page 1 - Exam.html'
first_page_pattern = re.compile(r"Page 1.*\.html$")
# Output file
output_file = "combined_page.html"


"""
Main script
"""
print(f"Folder path: {folder_path}")
print(f"First page pattern: {first_page_pattern.pattern}")
print(f"Output file: {output_file}")
input("Press Enter to continue...")

# Ensure the folder exists
if not os.path.isdir(folder_path):
    print("\033[91m" + f"Folder {folder_path} not found." + "\033[0m")
    exit()

first_page_file = None

# Find the first page file
for file_name in os.listdir(folder_path):
    if first_page_pattern.search(file_name):
        first_page_file = file_name
        break

# Ensure the first page was found
if not first_page_file:
    print(
        "\033[91m"
        + f"First page not found using pattern {first_page_pattern.pattern}."
        + "\033[0m"
    )
    exit()

# Read and parse the first page
with open(os.path.join(folder_path, first_page_file), "r", encoding="utf-8") as file:
    combined_soup = BeautifulSoup(file, "html.parser")

# Find the insertion point in the first page
insertion_point = combined_soup.select_one(".questions-container")

# Ensure the insertion point was found
if not insertion_point:
    print(
        "\033[91m"
        + f"HTML insertion point not found, check selector {insertion_point}."
        + "\033[0m"
    )
    exit()

if insertion_point:
    for file_name in os.listdir(folder_path):
        if file_name.endswith(".html") and file_name != first_page_file:
            with open(
                os.path.join(folder_path, file_name), "r", encoding="utf-8"
            ) as file:
                soup = BeautifulSoup(file, "html.parser")
                questions = soup.select(".exam-question-card")
                for question in questions:
                    insertion_point.append(question)

# Save the combined content
with open(os.path.join(folder_path, output_file), "w", encoding="utf-8") as file:
    file.write(str(combined_soup))

print(f"Combined file created: {output_file}")
