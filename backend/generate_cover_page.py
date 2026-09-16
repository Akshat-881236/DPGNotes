# -*- coding: utf-8 -*-
"""
DPGNotes Assignment Cover Page Generator
Generates pixel-perfect A4 Assignment Cover Page PDFs matching the DPG School of Technology & Management template.
"""

import os
import sys
import json
import argparse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# A4 dimensions in points: 595.275590551181 x 841.8897637795276
PAGE_WIDTH, PAGE_HEIGHT = A4

def get_degree_name(course_str):
    c = (course_str or '').upper().strip()
    if 'BCA-CTIS' in c or 'CTIS' in c:
        return "BACHELOR OF COMPUTER APPLICATION (CLOUD TECH & INFO SECURITY)"
    elif 'BCA-DS' in c or 'DS' in c and 'BCA' in c:
        return "BACHELOR OF COMPUTER APPLICATION (DATA SCIENCE)"
    elif 'BCA' in c:
        return "BACHELOR OF COMPUTER APPLICATION"
    elif 'BBA-CAM' in c or 'CAM' in c:
        return "BACHELOR OF BUSINESS ADMINISTRATION (COMPUTER AIDED MANAGEMENT)"
    elif 'BBA-HM' in c or 'HOSPITAL' in c:
        return "BACHELOR OF BUSINESS ADMINISTRATION (HOSPITAL MANAGEMENT)"
    elif 'BBA' in c:
        return "BACHELOR OF BUSINESS ADMINISTRATION"
    elif 'B.TECH' in c or 'BTECH' in c:
        if 'CSE' in c or 'COMPUTER' in c:
            if 'AI' in c or 'ML' in c:
                return "BACHELOR OF TECHNOLOGY (CSE - ARTIFICIAL INTELLIGENCE & MACHINE LEARNING)"
            elif 'DATA' in c:
                return "BACHELOR OF TECHNOLOGY (CSE - DATA SCIENCE)"
            return "BACHELOR OF TECHNOLOGY (COMPUTER SCIENCE & ENGINEERING)"
        elif 'ECE' in c or 'ELECTRONIC' in c:
            return "BACHELOR OF TECHNOLOGY (ELECTRONICS & COMMUNICATION ENGINEERING)"
        elif 'ME' in c or 'MECHANICAL' in c:
            return "BACHELOR OF TECHNOLOGY (MECHANICAL ENGINEERING)"
        elif 'CIVIL' in c:
            return "BACHELOR OF TECHNOLOGY (CIVIL ENGINEERING)"
        elif 'EE' in c or 'ELECTRICAL' in c:
            return "BACHELOR OF TECHNOLOGY (ELECTRICAL ENGINEERING)"
        return "BACHELOR OF TECHNOLOGY"
    elif 'MCA' in c:
        return "MASTER OF COMPUTER APPLICATION"
    elif 'MBA' in c:
        return "MASTER OF BUSINESS ADMINISTRATION"
    elif 'M.TECH' in c or 'MTECH' in c:
        if 'CSE' in c:
            return "MASTER OF TECHNOLOGY (COMPUTER SCIENCE & ENGINEERING)"
        return "MASTER OF TECHNOLOGY"
    elif 'B.SC' in c or 'BSC' in c:
        if 'CS' in c or 'COMPUTER' in c:
            return "BACHELOR OF SCIENCE (COMPUTER SCIENCE)"
        elif 'IT' in c:
            return "BACHELOR OF SCIENCE (INFORMATION TECHNOLOGY)"
        elif 'BIOTECH' in c:
            return "BACHELOR OF SCIENCE (BIOTECHNOLOGY)"
        elif 'NON-MED' in c or 'NON MEDICAL' in c:
            return "BACHELOR OF SCIENCE (NON-MEDICAL)"
        elif 'MED' in c:
            return "BACHELOR OF SCIENCE (MEDICAL)"
        elif 'DATA' in c:
            return "BACHELOR OF SCIENCE (DATA ANALYTICS)"
        return "BACHELOR OF SCIENCE"
    elif 'M.SC' in c or 'MSC' in c:
        if 'CS' in c or 'COMPUTER' in c:
            return "MASTER OF SCIENCE (COMPUTER SCIENCE)"
        elif 'MATH' in c:
            return "MASTER OF SCIENCE (MATHEMATICS)"
        elif 'PHYSIC' in c:
            return "MASTER OF SCIENCE (PHYSICS)"
        elif 'CHEM' in c:
            return "MASTER OF SCIENCE (CHEMISTRY)"
        elif 'BIOTECH' in c:
            return "MASTER OF SCIENCE (BIOTECHNOLOGY)"
        return "MASTER OF SCIENCE"
    elif 'B.COM' in c or 'BCOM' in c:
        if 'HONS' in c or 'HONOURS' in c:
            return "BACHELOR OF COMMERCE (HONOURS)"
        return "BACHELOR OF COMMERCE"
    elif 'M.COM' in c or 'MCOM' in c:
        return "MASTER OF COMMERCE"
    elif 'B.A' in c or 'BA' in c:
        if 'LLB' in c or 'LL.B' in c:
            return "INTEGRATED BACHELOR OF ARTS & BACHELOR OF LAWS (B.A. LL.B)"
        elif 'ENG' in c:
            return "BACHELOR OF ARTS (HONOURS IN ENGLISH)"
        elif 'POL' in c:
            return "BACHELOR OF ARTS (HONOURS IN POLITICAL SCIENCE)"
        elif 'HIST' in c:
            return "BACHELOR OF ARTS (HONOURS IN HISTORY)"
        elif 'ECO' in c:
            return "BACHELOR OF ARTS (HONOURS IN ECONOMICS)"
        return "BACHELOR OF ARTS"
    elif 'M.A' in c or 'MA' in c:
        if 'ENG' in c:
            return "MASTER OF ARTS (ENGLISH)"
        elif 'ECO' in c:
            return "MASTER OF ARTS (ECONOMICS)"
        elif 'HIST' in c:
            return "MASTER OF ARTS (HISTORY)"
        elif 'POL' in c:
            return "MASTER OF ARTS (POLITICAL SCIENCE)"
        elif 'HINDI' in c:
            return "MASTER OF ARTS (HINDI)"
        return "MASTER OF ARTS"
    elif 'B.PHARM' in c or 'BPHARM' in c:
        return "BACHELOR OF PHARMACY"
    elif 'D.PHARM' in c or 'DPHARM' in c:
        return "DIPLOMA IN PHARMACY"
    elif 'B.ED' in c or 'BED' in c:
        return "BACHELOR OF EDUCATION"
    elif 'M.ED' in c or 'MED' in c:
        return "MASTER OF EDUCATION"
    elif 'LLB' in c or 'LL.B' in c:
        return "BACHELOR OF LAWS (LL.B)"
    elif 'LLM' in c or 'LL.M' in c:
        return "MASTER OF LAWS (LL.M)"
    elif 'BHMCT' in c or 'HOTEL' in c:
        return "BACHELOR OF HOTEL MANAGEMENT & CATERING TECHNOLOGY"
    elif 'BTTM' in c or 'TOURISM' in c:
        return "BACHELOR OF TOURISM & TRAVEL MANAGEMENT"
    elif 'BJMC' in c or 'JOURNALISM' in c:
        return "BACHELOR OF JOURNALISM & MASS COMMUNICATION"
    elif 'MJMC' in c:
        return "MASTER OF JOURNALISM & MASS COMMUNICATION"
    elif 'DIPLOMA' in c or 'POLYTECHNIC' in c:
        return "DIPLOMA IN ENGINEERING & TECHNOLOGY"
    return "BACHELOR OF COMPUTER APPLICATION"

def split_department_text(raw_dept):
    text = (raw_dept or '').strip()
    if text.upper().startswith("DEPARTMENT OF "):
        text = text[14:].strip()
    if len(text) <= 17:
        return f"DEPARTMENT OF {text.upper()}", None

    split_idx = -1
    max_first_line = min(len(text) - 1, 19)
    for i in range(max_first_line, 7, -1):
        if text[i] in (' ', '-'):
            split_idx = i
            break
    if split_idx == -1:
        split_idx = text.find(' ')
    if 0 < split_idx < len(text):
        return f"DEPARTMENT OF {text[:split_idx].strip().upper()}", text[split_idx:].strip().upper()
    else:
        return f"DEPARTMENT OF {text[:17].strip().upper()}", text[17:].strip().upper()

def generate_pdf(data, output_path, assets_dir=None):
    doc_type = str(data.get("docType", "assignment")).lower().strip()
    if not data.get("assignmentNo") and doc_type != "practical":
        if "practical" in str(data.get("subjectName", "")).lower() or "practical" in str(data.get("title", "")).lower():
            doc_type = "practical"

    if assets_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        folder_name = "PracticalCoverPageGenerator" if doc_type == "practical" else "AssignmentCoverPageGenerator"
        assets_dir = os.path.join(base_dir, "public", folder_name)
        if not os.path.exists(assets_dir):
            assets_dir = os.path.join(base_dir, "public", "AssignmentCoverPageGenerator")

    req_header = str(data.get("headerLogo") or "").strip()
    if "DPGSTM-2" in req_header or "2Header" in req_header or req_header == "DPGSTM-2HeaderImage.png":
        header_file = "DPGSTM-2HeaderImage.png"
    elif "DPGDegreeHeader" in req_header or "Degree" in req_header or req_header == "DPGDegreeHeader_Image.jpeg":
        header_file = "DPGDegreeHeader_Image.jpeg"
    else:
        header_file = "Header_Image.jpg"

    req_center = str(data.get("centerLogo") or "").strip()
    if "DPGDegreeCenter" in req_center or "Degree" in req_center or req_center == "DPGDegreeCenter_Logo.jpeg":
        center_logo_file = "DPGDegreeCenter_Logo.jpeg"
    else:
        center_logo_file = "Center_Logo.jpg"
    header_img_path = os.path.join(assets_dir, header_file)
    center_logo_path = os.path.join(assets_dir, center_logo_file)

    c = canvas.Canvas(output_path, pagesize=A4)
    if doc_type == "practical":
        c.setTitle(f"Practical_File_{data.get('subjectCode', 'Cover')}_Page")
        c.setAuthor("DPGNotes Academic Cover Page Generator")
    else:
        c.setTitle(f"Assignment_{data.get('assignmentNo', '1')}_Cover_Page")
        c.setAuthor("DPGNotes Academic Cover Page Generator")
    c.setSubject(f"{data.get('subjectName', '')} ({data.get('subjectCode', '')})")

    # 1. Header Banner Image
    header_w = 507.48
    header_h = 77.88
    header_x = (PAGE_WIDTH - header_w) / 2.0
    header_y = PAGE_HEIGHT - 34.0 - header_h

    if os.path.exists(header_img_path):
        c.drawImage(header_img_path, header_x, header_y, width=header_w, height=header_h, preserveAspectRatio=True, mask='auto')

    # Typography setup
    font_bold = "Times-Bold"
    font_regular = "Times-Roman"
    font_size_main = 10.5

    # 2. Heading & Subject Info (Centered)
    scale_y = PAGE_HEIGHT / 792.0

    num_val = str(data.get("assignmentNo", "1")).strip()
    sub_name = str(data.get("subjectName", "")).strip().upper()
    sub_code = str(data.get("subjectCode", "")).strip().upper()
    course_sec = str(data.get("courseSection", "")).strip().upper()
    session = str(data.get("session", "")).strip().upper()
    degree_name = str(data.get("degreeName") or get_degree_name(course_sec)).strip().upper()

    if doc_type == "practical":
        # Matches PracticalCoverPageTemplate.pdf - 'A' positioned at 130 to avoid touching header
        c.setFont(font_regular, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (130.0 * scale_y), "A")
        c.setFont(font_bold, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (149.0 * scale_y), "PRACTICAL FILE")
        c.setFont(font_regular, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (168.0 * scale_y), "OF")
        c.setFont(font_bold, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (188.0 * scale_y), sub_name)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (208.0 * scale_y), sub_code)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (228.0 * scale_y), course_sec)
        fulfillment_prefix = "IN PARTIAL FULLFILLMENT OF THE REQUIREMENT OF"
        c.setFont(font_regular, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (249.0 * scale_y), fulfillment_prefix)
        c.setFont(font_bold, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (268.0 * scale_y), degree_name)
    else:
        # Matches FrontpageTemplate.pdf
        assign_line = f"ASSIGNMENT -> {num_val}"
        c.setFont(font_bold, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (131.0 * scale_y), assign_line)
        c.setFont(font_regular, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (155.0 * scale_y), "OF")
        c.setFont(font_bold, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (179.0 * scale_y), sub_name)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (203.0 * scale_y), sub_code)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (226.0 * scale_y), course_sec)
        fulfillment_prefix = "IN PARTIAL FULLFILLMENT OF THE REQUIREMENT OF"
        c.setFont(font_regular, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (250.0 * scale_y), fulfillment_prefix)
        c.setFont(font_bold, font_size_main)
        c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (267.0 * scale_y), degree_name)

    # 3. Center Logo (MDU Emblem)
    logo_w = 134.76
    logo_h = 114.84
    logo_x = (PAGE_WIDTH - logo_w) / 2.0
    logo_y = PAGE_HEIGHT - (280.0 * scale_y) - logo_h

    if os.path.exists(center_logo_path):
        c.drawImage(center_logo_path, logo_x, logo_y, width=logo_w, height=logo_h, preserveAspectRatio=True, mask='auto')

    # 4. Session (Bold)
    c.setFont(font_bold, font_size_main)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (414.0 * scale_y), f"SESSION: {session}")

    # 5. Two Columns (Submitted To on Left, Submitted By on Right)
    left_x = 60.0
    right_x = 364.0

    prof_name = str(data.get("profName", "")).strip().upper()
    designation = str(data.get("designation", "")).strip().upper()
    dept = str(data.get("department", "")).strip().upper()
    stu_name = str(data.get("studentName", "")).strip().upper()
    father_name = str(data.get("fatherName", "")).strip().upper()
    relation = str(data.get("relation", "S/O")).strip().upper()
    stu_id = str(data.get("studentId", "")).strip().upper()

    row1_y = PAGE_HEIGHT - (462.0 * scale_y)
    row2_y = PAGE_HEIGHT - (486.0 * scale_y)
    row3_y = PAGE_HEIGHT - (510.0 * scale_y)
    row4_y = PAGE_HEIGHT - (534.0 * scale_y)
    row5_y = PAGE_HEIGHT - (558.0 * scale_y)
    row6_y = PAGE_HEIGHT - (582.0 * scale_y)

    # Row 1: Headers (Bold)
    c.setFont(font_bold, font_size_main)
    c.drawString(left_x, row1_y, "SUBMITTED TO")
    c.drawString(right_x, row1_y, "SUBMITTED BY")

    # Row 2: Names (Bold)
    c.drawString(left_x, row2_y, prof_name)
    c.drawString(right_x, row2_y, stu_name)

    # Row 3: Designation / Father (Regular)
    c.setFont(font_regular, font_size_main)
    c.drawString(left_x, row3_y, designation)
    c.drawString(right_x, row3_y, f"{relation} {father_name}")

    # Row 4, 5, 6: Department / Student ID / DPG STM / Course & Section
    dept_line1, dept_line2 = split_department_text(dept)
    if dept_line2:
        # When department character count crosses 17:
        # Row 4: Left = Department Part 1 (Regular), Right = Student ID (Regular)
        c.setFont(font_regular, font_size_main)
        c.drawString(left_x, row4_y, dept_line1)
        c.drawString(right_x, row4_y, f"STUDENT ID: {stu_id}")

        # Row 5: in place of DPG STM, write the rest part! (Regular), Right = Course & Section (Bold)
        c.drawString(left_x, row5_y, dept_line2)
        c.setFont(font_bold, font_size_main)
        c.drawString(right_x, row5_y, course_sec)

        # Row 6: DPG STM moves to the next line just below! (Bold)
        c.drawString(left_x, row6_y, "DPG STM")
    else:
        # Standard <= 17 characters
        c.setFont(font_regular, font_size_main)
        c.drawString(left_x, row4_y, dept_line1)
        c.drawString(right_x, row4_y, f"STUDENT ID: {stu_id}")

        c.setFont(font_bold, font_size_main)
        c.drawString(left_x, row5_y, "DPG STM")
        c.drawString(right_x, row5_y, course_sec)

    # 6. Footer Section (Centered - Regular)
    date_val = str(data.get("date", "")).strip().upper()
    day_val = str(data.get("day", "")).strip().upper()
    
    footer_row1 = f"SUBMITTED ON {date_val} ({day_val})" if day_val else f"SUBMITTED ON {date_val}"
    footer_row2 = "MDU ROHTAK, HARYANA"

    c.setFont(font_regular, font_size_main)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (701.0 * scale_y), footer_row1)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (725.0 * scale_y), footer_row2)

    # Finalize Page
    c.showPage()
    c.save()
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Assignment Cover Page PDF")
    parser.add_argument("--json", type=str, help="JSON string with assignment data")
    parser.add_argument("--input", type=str, help="Path to JSON file")
    parser.add_argument("--output", type=str, default="cover_page.pdf", help="Output PDF path")
    parser.add_argument("--test", action="store_true", help="Generate sample test PDF")

    args = parser.parse_args()

    if args.test:
        test_data = {
            "assignmentNo": "1",
            "subjectName": "DATA STRUCTURES AND ALGORITHMS",
            "subjectCode": "BCA-301",
            "courseSection": "BCA-3A",
            "session": "2025-2026",
            "profName": "DR. RAJESH KUMAR",
            "designation": "ASSISTANT PROFESSOR",
            "department": "COMPUTER SCIENCE & APPLICATIONS",
            "studentName": "AMAN SHARMA",
            "fatherName": "RAMESH SHARMA",
            "relation": "S/O",
            "studentId": "2112345678",
            "date": "25-09-2026",
            "day": "FRIDAY"
        }
        out = generate_pdf(test_data, args.output)
        print(f"Sample test PDF generated successfully at: {out}")
        sys.exit(0)

    data = {}
    if args.json:
        data = json.loads(args.json)
    elif args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        # Read from stdin if available
        raw = sys.stdin.read().strip()
        if raw:
            data = json.loads(raw)
        else:
            print("Error: No data provided. Use --test or pass --json.")
            sys.exit(1)

    out = generate_pdf(data, args.output)
    print(f"Generated PDF: {out}")
