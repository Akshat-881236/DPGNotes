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
    if 'BCA' in c:
        return "BACHELOR OF COMPUTER APPLICATION"
    elif 'BBA' in c:
        return "BACHELOR OF BUSINESS ADMINISTRATION"
    elif 'MCA' in c:
        return "MASTER OF COMPUTER APPLICATION"
    elif 'MBA' in c:
        return "MASTER OF BUSINESS ADMINISTRATION"
    elif 'B.TECH' in c or 'BTECH' in c:
        return "BACHELOR OF TECHNOLOGY"
    elif 'M.TECH' in c or 'MTECH' in c:
        return "MASTER OF TECHNOLOGY"
    elif 'B.SC' in c or 'BSC' in c:
        return "BACHELOR OF SCIENCE"
    elif 'M.SC' in c or 'MSC' in c:
        return "MASTER OF SCIENCE"
    elif 'B.COM' in c or 'BCOM' in c:
        return "BACHELOR OF COMMERCE"
    elif 'M.COM' in c or 'MCOM' in c:
        return "MASTER OF COMMERCE"
    elif 'BA' in c:
        return "BACHELOR OF ARTS"
    elif 'MA' in c:
        return "MASTER OF ARTS"
    return "BACHELOR OF COMPUTER APPLICATION"

def generate_pdf(data, output_path, assets_dir=None):
    if assets_dir is None:
        # Default assets directory: public/AssignmentCoverPageGenerator
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        assets_dir = os.path.join(base_dir, "public", "AssignmentCoverPageGenerator")

    header_img_path = os.path.join(assets_dir, "Header_Image.jpg")
    center_logo_path = os.path.join(assets_dir, "Center_Logo.jpg")

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle(f"Assignment_{data.get('assignmentNo', '1')}_Cover_Page")
    c.setAuthor("DPGNotes Assignment Cover Page Generator")
    c.setSubject(f"{data.get('subjectName', '')} ({data.get('subjectCode', '')})")

    # 1. Header Banner Image
    # In template: width=507.48, height=77.88, centered on 595.28 pt page
    header_w = 507.48
    header_h = 77.88
    header_x = (PAGE_WIDTH - header_w) / 2.0
    header_y = PAGE_HEIGHT - 34.0 - header_h  # ~730 pt

    if os.path.exists(header_img_path):
        c.drawImage(header_img_path, header_x, header_y, width=header_w, height=header_h, preserveAspectRatio=True, mask='auto')

    # Typography setup: Times-Bold is standard PDF core font (supported in 100% of PDF readers)
    font_bold = "Times-Bold"
    font_regular = "Times-Roman"
    font_size_main = 13.0
    c.setFillColorRGB(0, 0, 0)

    # 2. Assignment Heading & Subject Info (Centered)
    # Positions mapped proportionally from template to A4 height:
    scale_y = PAGE_HEIGHT / 792.0

    num_val = str(data.get("assignmentNo", "1")).strip()
    sub_name = str(data.get("subjectName", "")).strip().upper()
    sub_code = str(data.get("subjectCode", "")).strip().upper()
    course_sec = str(data.get("courseSection", "")).strip().upper()
    session = str(data.get("session", "")).strip().upper()

    # Dynamic degree fulfillment
    degree_name = data.get("degreeName") or get_degree_name(course_sec)

    # Assignment -> {NUM}
    # Note: Use Unicode right arrow '➔' or '->' cleanly
    assign_line = f"ASSIGNMENT -> {num_val}"
    c.setFont(font_bold, font_size_main)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (122.0 * scale_y), assign_line)

    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (146.0 * scale_y), "OF")
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (170.0 * scale_y), sub_name)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (194.0 * scale_y), sub_code)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (218.0 * scale_y), course_sec)

    # Fulfillment statement (splits cleanly into 2 lines if needed)
    fulfillment_prefix = "IN PARTIAL FULLFILLMENT OF THE REQUIREMENT OF"
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (242.0 * scale_y), fulfillment_prefix)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (258.0 * scale_y), degree_name)

    # 3. Center Logo (MDU Emblem)
    logo_w = 134.76
    logo_h = 114.84
    logo_x = (PAGE_WIDTH - logo_w) / 2.0
    logo_y = PAGE_HEIGHT - (280.0 * scale_y) - logo_h

    if os.path.exists(center_logo_path):
        c.drawImage(center_logo_path, logo_x, logo_y, width=logo_w, height=logo_h, preserveAspectRatio=True, mask='auto')

    # 4. Session
    c.setFont(font_bold, font_size_main)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (406.0 * scale_y), f"SESSION: {session}")

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

    row1_y = PAGE_HEIGHT - (454.0 * scale_y)
    row2_y = PAGE_HEIGHT - (478.0 * scale_y)
    row3_y = PAGE_HEIGHT - (502.0 * scale_y)
    row4_y = PAGE_HEIGHT - (526.0 * scale_y)
    row5_y = PAGE_HEIGHT - (550.0 * scale_y)

    # Row 1: Headers
    c.setFont(font_bold, font_size_main)
    c.drawString(left_x, row1_y, "SUBMITTED TO")
    c.drawString(right_x, row1_y, "SUBMITTED BY")

    # Row 2: Names
    c.drawString(left_x, row2_y, prof_name)
    c.drawString(right_x, row2_y, stu_name)

    # Row 3: Designation / Father
    c.drawString(left_x, row3_y, designation)
    c.drawString(right_x, row3_y, f"{relation} {father_name}")

    # Row 4: Department / Student ID
    c.drawString(left_x, row4_y, f"DEPARTMENT OF {dept}" if not dept.startswith("DEPARTMENT") else dept)
    c.drawString(right_x, row4_y, f"STUDENT ID: {stu_id}")

    # Row 5: DPG STM / Course & Section
    c.drawString(left_x, row5_y, "DPG STM")
    c.drawString(right_x, row5_y, course_sec)

    # 6. Footer Section (Centered)
    date_val = str(data.get("date", "")).strip().upper()
    day_val = str(data.get("day", "")).strip().upper()
    
    footer_row1 = f"SUBMITTED ON {date_val} ({day_val})" if day_val else f"SUBMITTED ON {date_val}"
    footer_row2 = "MDU ROHTAK, HARYANA"

    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (692.0 * scale_y), footer_row1)
    c.drawCentredString(PAGE_WIDTH / 2.0, PAGE_HEIGHT - (716.0 * scale_y), footer_row2)

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
