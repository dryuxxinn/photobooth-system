import io
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.app.services.storage.database import get_db_service
from backend.app.api.auth import require_admin

router = APIRouter(prefix="/finance", tags=["Finance & Settlement"])


class SettlementRuleModel(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    basis: str = Field(default="PER_PHOTO")  # "PER_PHOTO" or "PER_SETTLEMENT"
    deduction_type: Optional[str] = None  # "FIXED" or "PERCENT"
    rule_type: Optional[str] = None  # alias: "percentage" or "fixed"
    value: float = Field(..., ge=0)
    min_threshold: Optional[float] = None
    min_gross_threshold: Optional[float] = None  # alias for min_threshold
    description: Optional[str] = None
    is_active: bool = True


class SettlementCalculateRequest(BaseModel):
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD
    custom_rules: Optional[List[SettlementRuleModel]] = None


def format_idr(num: float | int) -> str:
    """Format numeric value to standard Indonesian Rupiah notation."""
    val = round(num)
    return f"Rp {val:,}".replace(",", ".")


def calculate_settlement_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    custom_rules: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    db = get_db_service()
    all_sessions = db.list_recent_sessions(limit=500)
    operator_config = db.get_operator_config()
    session_price = int(operator_config.get("sessionPriceIdr") or 35000)

    # Filter sessions by date range if provided
    filtered_sessions: List[Dict[str, Any]] = []
    for s in all_sessions:
        started_at = s.get("started_at", "")
        # Date string extracted from ISO timestamp: YYYY-MM-DD
        session_day = started_at[:10] if len(started_at) >= 10 else ""

        if start_date and session_day and session_day < start_date:
            continue
        if end_date and session_day and session_day > end_date:
            continue
        filtered_sessions.append(s)

    # Sort chronological
    filtered_sessions.sort(key=lambda x: x.get("started_at", ""))

    completed_sessions = [
        s for s in filtered_sessions if s.get("status") == "COMPLETED"
    ]
    total_completed = len(completed_sessions)
    total_sessions_count = len(filtered_sessions)

    # Calculate Gross Revenue
    gross_revenue = total_completed * session_price
    total_prints = total_completed  # standard 1 strip per completed session

    # Resolve deduction rules
    if custom_rules is not None:
        raw_rules = custom_rules
    else:
        raw_rules = db.list_settlement_rules(only_active=True)

    # If no rules exist in database, provide standard photobooth defaults
    if not raw_rules:
        raw_rules = [
            {
                "id": "rule_paper",
                "name": "Biaya Kertas & Tinta (HPP)",
                "basis": "PER_PHOTO",
                "deduction_type": "FIXED",
                "value": 4500.0,
                "min_threshold": 0.0,
                "is_active": True,
            },
            {
                "id": "rule_qris_mdr",
                "name": "Biaya Transaksi QRIS (MDR Gateway)",
                "basis": "PER_PHOTO",
                "deduction_type": "PERCENT",
                "value": 0.7,
                "min_threshold": 0.0,
                "is_active": True,
            },
            {
                "id": "rule_revenue_share",
                "name": "Bagi Hasil Lokasi / Venue Share",
                "basis": "PER_SETTLEMENT",
                "deduction_type": "PERCENT",
                "value": 20.0,
                "min_threshold": 0.0,
                "is_active": True,
            },
        ]

    deductions_breakdown: List[Dict[str, Any]] = []
    total_deductions = 0.0

    for r in raw_rules:
        if not r.get("is_active", True):
            continue

        r_name = r.get("name", "Potongan")
        basis = str(r.get("basis", "PER_PHOTO")).upper()
        raw_dtype = str(r.get("deduction_type") or r.get("rule_type") or "FIXED").upper()
        dtype = "PERCENT" if raw_dtype in ("PERCENTAGE", "PERCENT", "%") else "FIXED"
        val = float(r.get("value", 0.0))
        min_thresh = float(r.get("min_threshold") if r.get("min_threshold") is not None else (r.get("min_gross_threshold") or 0.0))

        calculated_amount = 0.0
        desc = ""

        if basis == "PER_PHOTO":
            if dtype == "FIXED":
                calculated_amount = val * total_prints
                desc = f"{format_idr(val)} x {total_prints} lembar"
            else:  # PERCENT
                calculated_amount = (val / 100.0) * gross_revenue
                desc = f"{val}% dari omset kotor"
        elif basis == "PER_SETTLEMENT":
            if gross_revenue < min_thresh:
                calculated_amount = 0.0
                desc = f"Tidak berlaku (omset di bawah threshold {format_idr(min_thresh)})"
            else:
                if dtype == "FIXED":
                    calculated_amount = val
                    desc = f"Nominal tetap per settlement: {format_idr(val)}"
                else:  # PERCENT
                    calculated_amount = (val / 100.0) * gross_revenue
                    desc = f"{val}% dari omset kotor ({format_idr(gross_revenue)})"

        amount_rounded = round(calculated_amount)
        total_deductions += amount_rounded
        deductions_breakdown.append(
            {
                "id": r.get("id"),
                "name": r_name,
                "basis": basis,
                "deduction_type": dtype,
                "rule_type": dtype.lower() if dtype else "fixed",
                "rate": val,
                "value": val,
                "amount": amount_rounded,
                "calculated_amount": amount_rounded,
                "formatted_amount": format_idr(amount_rounded),
                "min_gross_threshold": r.get("min_gross_threshold", 0) or r.get("min_threshold", 0) or 0,
                "description": desc,
            }
        )

    net_profit = max(0.0, float(gross_revenue - total_deductions))
    net_margin_pct = (
        (net_profit / gross_revenue * 100.0) if gross_revenue > 0 else 0.0
    )

    # Simplified session details for export
    sessions_detail = []
    for s in filtered_sessions:
        is_done = s.get("status") == "COMPLETED"
        price = session_price if is_done else 0
        sessions_detail.append(
            {
                "session_id": s.get("session_id"),
                "customer_name": s.get("customer_name") or "-",
                "template_id": s.get("template_id") or "classic_strip_3",
                "status": s.get("status"),
                "photos_taken": s.get("photos_taken", 0),
                "started_at": s.get("started_at"),
                "completed_at": s.get("completed_at") or "-",
                "nominal_idr": price,
                "formatted_nominal": format_idr(price),
            }
        )

    summary_obj = {
        "gross_revenue": gross_revenue,
        "formatted_gross_revenue": format_idr(gross_revenue),
        "total_deductions": total_deductions,
        "formatted_total_deductions": format_idr(total_deductions),
        "net_profit": net_profit,
        "formatted_net_profit": format_idr(net_profit),
        "net_margin_percent": round(net_margin_pct, 1),
        "completed_sessions": total_completed,
        "total_photos_printed": total_prints,
        "total_sessions": total_sessions_count,
        "session_price_idr": session_price,
    }

    return {
        "period": {
            "start_date": start_date or (filtered_sessions[0]["started_at"][:10] if filtered_sessions else "-"),
            "end_date": end_date or (filtered_sessions[-1]["started_at"][:10] if filtered_sessions else "-"),
        },
        "session_price_idr": session_price,
        "total_sessions": total_sessions_count,
        "completed_sessions": total_completed,
        "total_prints": total_prints,
        "gross_revenue": gross_revenue,
        "formatted_gross_revenue": format_idr(gross_revenue),
        "total_deductions": total_deductions,
        "formatted_total_deductions": format_idr(total_deductions),
        "net_profit": net_profit,
        "formatted_net_profit": format_idr(net_profit),
        "net_margin_pct": round(net_margin_pct, 1),
        "net_margin_percent": round(net_margin_pct, 1),
        "summary": summary_obj,
        "applied_deductions": deductions_breakdown,
        "deductions_breakdown": deductions_breakdown,
        "sessions_detail": sessions_detail,
    }


@router.get("/rules")
def get_settlement_rules():
    """Retrieve all settlement & margin deduction rules."""
    rules = get_db_service().list_settlement_rules()
    if not rules:
        # Seed initial defaults
        db = get_db_service()
        defaults = [
            {
                "id": "rule_paper",
                "name": "Biaya Kertas & Tinta (HPP)",
                "basis": "PER_PHOTO",
                "deduction_type": "FIXED",
                "value": 4500.0,
                "min_threshold": 0.0,
                "is_active": True,
            },
            {
                "id": "rule_qris_mdr",
                "name": "Biaya Transaksi QRIS (MDR Gateway)",
                "basis": "PER_PHOTO",
                "deduction_type": "PERCENT",
                "value": 0.7,
                "min_threshold": 0.0,
                "is_active": True,
            },
            {
                "id": "rule_venue_share",
                "name": "Bagi Hasil Lokasi (Revenue Share)",
                "basis": "PER_SETTLEMENT",
                "deduction_type": "PERCENT",
                "value": 20.0,
                "min_threshold": 0.0,
                "is_active": True,
            },
        ]
        for d in defaults:
            db.save_settlement_rule(d)
        rules = db.list_settlement_rules()
    return {"rules": rules}


@router.post("/rules")
def save_settlement_rule(payload: SettlementRuleModel, request: Request):
    """Add or update a settlement deduction rule. Restricted to Admin."""
    require_admin(request)
    data = payload.model_dump()
    basis = str(payload.basis or "PER_PHOTO").upper()
    raw_dtype = str(payload.deduction_type or payload.rule_type or "FIXED").upper()
    dtype = "PERCENT" if raw_dtype in ("PERCENTAGE", "PERCENT", "%") else "FIXED"
    threshold = float(
        payload.min_threshold
        if payload.min_threshold is not None
        else (payload.min_gross_threshold or 0.0)
    )
    data["basis"] = basis
    data["deduction_type"] = dtype
    data["min_threshold"] = threshold
    if not data.get("id"):
        data["id"] = f"rule_{uuid.uuid4().hex[:8]}"
    saved = get_db_service().save_settlement_rule(data)
    return {"success": True, "rule": saved}


@router.delete("/rules/{rule_id}")
def delete_settlement_rule(rule_id: str, request: Request):
    """Delete a settlement rule. Restricted to Admin."""
    require_admin(request)
    deleted = get_db_service().delete_settlement_rule(rule_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aturan potongan '{rule_id}' tidak ditemukan.",
        )
    return {"success": True, "deleted_id": rule_id}


@router.post("/settlement-calculate")
def calculate_settlement(payload: SettlementCalculateRequest):
    """Calculate real-time settlement, deduction breakdown, and net profit margin."""
    rules_dict = (
        [r.model_dump() for r in payload.custom_rules]
        if payload.custom_rules is not None
        else None
    )
    result = calculate_settlement_data(
        start_date=payload.start_date,
        end_date=payload.end_date,
        custom_rules=rules_dict,
    )
    return {"success": True, "data": result, **result}


@router.post("/export/excel")
def export_excel(payload: SettlementCalculateRequest):
    """Export complete settlement report and transactions into an Excel (.xlsx) file."""
    rules_dict = (
        [r.model_dump() for r in payload.custom_rules]
        if payload.custom_rules is not None
        else None
    )
    data = calculate_settlement_data(
        start_date=payload.start_date,
        end_date=payload.end_date,
        custom_rules=rules_dict,
    )

    wb = openpyxl.Workbook()

    # 1. Sheet Ringkasan Eksekutif
    ws_summary = wb.active
    ws_summary.title = "Ringkasan Settlement"

    header_fill = PatternFill(start_color="FCECEE", end_color="FCECEE", fill_type="solid")
    primary_fill = PatternFill(start_color="FFE4E8", end_color="FFE4E8", fill_type="solid")
    accent_fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
    title_font = Font(name="Calibri", size=14, bold=True, color="3F3D56")
    bold_font = Font(name="Calibri", size=11, bold=True, color="3F3D56")
    regular_font = Font(name="Calibri", size=11, color="3F3D56")
    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0"),
    )

    ws_summary["A1"] = "SWEET STUDIO PHOTOBOOTH"
    ws_summary["A1"].font = title_font
    ws_summary["A2"] = "Laporan Settlement, Bagi Hasil & Margin Bersih"
    ws_summary["A2"].font = bold_font

    ws_summary["A4"] = "Periode Laporan:"
    ws_summary["B4"] = f"{data['period']['start_date']} s/d {data['period']['end_date']}"
    ws_summary["A5"] = "Tanggal Unduh:"
    ws_summary["B5"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for r in range(4, 6):
        ws_summary[f"A{r}"].font = bold_font
        ws_summary[f"B{r}"].font = regular_font

    # Ringkasan KPI
    ws_summary["A7"] = "METRIK KEUANGAN"
    ws_summary["B7"] = "NILAI"
    ws_summary["A7"].font = bold_font
    ws_summary["B7"].font = bold_font
    ws_summary["A7"].fill = header_fill
    ws_summary["B7"].fill = header_fill

    kpi_rows = [
        ("Total Sesi Tercatat", data["total_sessions"]),
        ("Sesi Selesai (Completed)", data["completed_sessions"]),
        ("Total Cetak Lembar Foto", data["total_prints"]),
        ("Harga Tiket Sesi (Tarif)", format_idr(data["session_price_idr"])),
        ("Omset Kotor (Gross Revenue)", data["formatted_gross_revenue"]),
        ("Total Biaya Potongan & Bagi Hasil", data["formatted_total_deductions"]),
        ("Laba Bersih Studio (Net Profit)", data["formatted_net_profit"]),
        ("Margin Keuntungan Bersih (%)", f"{data['net_margin_pct']}%"),
    ]

    cur_row = 8
    for label, val in kpi_rows:
        ws_summary[f"A{cur_row}"] = label
        ws_summary[f"B{cur_row}"] = val
        ws_summary[f"A{cur_row}"].font = bold_font if "Laba" in label or "Omset" in label else regular_font
        ws_summary[f"B{cur_row}"].font = bold_font if "Laba" in label or "Omset" in label else regular_font
        if "Laba" in label:
            ws_summary[f"A{cur_row}"].fill = accent_fill
            ws_summary[f"B{cur_row}"].fill = accent_fill
        ws_summary[f"A{cur_row}"].border = thin_border
        ws_summary[f"B{cur_row}"].border = thin_border
        cur_row += 1

    # Rincian Potongan
    cur_row += 2
    ws_summary[f"A{cur_row}"] = "RINCIAN POTONGAN & BAGI HASIL"
    ws_summary[f"B{cur_row}"] = "NOMINAL (RP)"
    ws_summary[f"C{cur_row}"] = "KETERANGAN FORMULA"
    for col in ["A", "B", "C"]:
        ws_summary[f"{col}{cur_row}"].font = bold_font
        ws_summary[f"{col}{cur_row}"].fill = primary_fill
        ws_summary[f"{col}{cur_row}"].border = thin_border
    cur_row += 1

    for d in data["deductions_breakdown"]:
        ws_summary[f"A{cur_row}"] = d["name"]
        ws_summary[f"B{cur_row}"] = d["formatted_amount"]
        ws_summary[f"C{cur_row}"] = d["description"]
        for col in ["A", "B", "C"]:
            ws_summary[f"{col}{cur_row}"].font = regular_font
            ws_summary[f"{col}{cur_row}"].border = thin_border
        cur_row += 1

    ws_summary.column_dimensions["A"].width = 34
    ws_summary.column_dimensions["B"].width = 25
    ws_summary.column_dimensions["C"].width = 45

    # 2. Sheet Detail Sesi
    ws_sessions = wb.create_sheet(title="Detail Transaksi")
    headers = ["Session ID", "Pelanggan", "Template", "Status", "Foto", "Waktu Mulai", "Waktu Selesai", "Nominal (Rp)"]
    for i, h in enumerate(headers, 1):
        cell = ws_sessions.cell(row=1, column=i, value=h)
        cell.font = bold_font
        cell.fill = header_fill
        cell.border = thin_border

    for row_idx, s in enumerate(data["sessions_detail"], 2):
        row_vals = [
            s["session_id"],
            s["customer_name"],
            s["template_id"],
            s["status"],
            s["photos_taken"],
            s["started_at"],
            s["completed_at"],
            s["formatted_nominal"],
        ]
        for col_idx, val in enumerate(row_vals, 1):
            c = ws_sessions.cell(row=row_idx, column=col_idx, value=val)
            c.font = regular_font
            c.border = thin_border

    ws_sessions.column_dimensions["A"].width = 30
    ws_sessions.column_dimensions["B"].width = 18
    ws_sessions.column_dimensions["C"].width = 18
    ws_sessions.column_dimensions["D"].width = 14
    ws_sessions.column_dimensions["E"].width = 10
    ws_sessions.column_dimensions["F"].width = 24
    ws_sessions.column_dimensions["G"].width = 24
    ws_sessions.column_dimensions["H"].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    file_bytes = buf.getvalue()

    filename = f"settlement_report_{data['period']['start_date']}_to_{data['period']['end_date']}.xlsx"
    return Response(
        content=file_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/pdf")
def export_pdf(payload: SettlementCalculateRequest):
    """Export executive settlement statement in formal PDF document format."""
    rules_dict = (
        [r.model_dump() for r in payload.custom_rules]
        if payload.custom_rules is not None
        else None
    )
    data = calculate_settlement_data(
        start_date=payload.start_date,
        end_date=payload.end_date,
        custom_rules=rules_dict,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#3F3D56"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#71717A"),
    )
    h2_style = ParagraphStyle(
        "ReportH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#3F3D56"),
    )
    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#27272A"),
    )
    cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#27272A"),
    )

    elements = []

    # Header
    elements.append(Paragraph("SWEET STUDIO PHOTOBOOTH", title_style))
    elements.append(
        Paragraph(
            "Laporan Resmi Settlement, Pembagian Hasil & Margin Penjualan",
            subtitle_style,
        )
    )
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#F472B6")))
    elements.append(Spacer(1, 12))

    # Meta Info Table
    meta_data = [
        [
            Paragraph("<b>Periode Settlement:</b>", cell_style),
            Paragraph(f"{data['period']['start_date']} s/d {data['period']['end_date']}", cell_style),
            Paragraph("<b>Tanggal Cetak:</b>", cell_style),
            Paragraph(datetime.now().strftime("%d/%m/%Y %H:%M"), cell_style),
        ],
        [
            Paragraph("<b>Total Sesi Tercatat:</b>", cell_style),
            Paragraph(f"{data['total_sessions']} Sesi", cell_style),
            Paragraph("<b>Sesi Selesai / Cetak:</b>", cell_style),
            Paragraph(f"{data['completed_sessions']} Lembar", cell_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[120, 140, 110, 150])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7F8")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#FCECEE")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(meta_table)
    elements.append(Spacer(1, 16))

    # Ringkasan Finansial Utama
    elements.append(Paragraph("1. Ringkasan Finansial Utama", h2_style))
    elements.append(Spacer(1, 6))

    kpi_data = [
        [
            Paragraph("Keterangan", cell_bold),
            Paragraph("Nilai / Formula", cell_bold),
        ],
        [
            Paragraph("Omset Kotor (Gross Revenue)", cell_style),
            Paragraph(f"<b>{data['formatted_gross_revenue']}</b>", cell_style),
        ],
        [
            Paragraph("Total Potongan & Bagi Hasil", cell_style),
            Paragraph(f"<b>{data['formatted_total_deductions']}</b>", cell_style),
        ],
        [
            Paragraph("Laba Bersih Studio (Net Profit)", cell_bold),
            Paragraph(f"<b>{data['formatted_net_profit']}</b>", cell_bold),
        ],
        [
            Paragraph("Margin Keuntungan Bersih (%)", cell_bold),
            Paragraph(f"<b>{data['net_margin_pct']}%</b>", cell_bold),
        ],
    ]
    kpi_table = Table(kpi_data, colWidths=[280, 240])
    kpi_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FCECEE")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#F0FDF4")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(kpi_table)
    elements.append(Spacer(1, 16))

    # Rincian Potongan
    elements.append(Paragraph("2. Rincian Potongan & Biaya Operasional", h2_style))
    elements.append(Spacer(1, 6))

    ded_data = [
        [
            Paragraph("Nama Potongan / Biaya", cell_bold),
            Paragraph("Basis", cell_bold),
            Paragraph("Tarif", cell_bold),
            Paragraph("Nominal Potongan", cell_bold),
        ]
    ]

    for d in data["deductions_breakdown"]:
        ded_data.append(
            [
                Paragraph(d["name"], cell_style),
                Paragraph(d["basis"], cell_style),
                Paragraph(d["description"], cell_style),
                Paragraph(f"<b>{d['formatted_amount']}</b>", cell_style),
            ]
        )

    ded_table = Table(ded_data, colWidths=[160, 90, 160, 110])
    ded_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FFE4E8")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(ded_table)
    elements.append(Spacer(1, 28))

    # Tanda Tangan
    sign_data = [
        [
            Paragraph("Diserahkan Oleh (Pihak Booth):<br/><br/><br/><br/>______________________<br/><b>Sweet Studio Operator</b>", cell_style),
            Paragraph("Diterima & Disetujui Oleh (Mitra):<br/><br/><br/><br/>______________________<br/><b>Pengelola Venue / Lokasi</b>", cell_style),
        ]
    ]
    sign_table = Table(sign_data, colWidths=[260, 260])
    sign_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(sign_table)

    doc.build(elements)
    pdf_bytes = buf.getvalue()

    filename = f"laporan_settlement_{data['period']['start_date']}_to_{data['period']['end_date']}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
